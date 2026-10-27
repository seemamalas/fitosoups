/* Booking and paying. Used by the cart drawer: the visitor books the box they built, then pays
   on The CO Kitchens' Stripe page (PAY_URL in config.js), with their email and booking reference filled in.

   Where reservations go is set once, in site.config.json, as WAITLIST_URL:
   the Google Sheet web app URL (see google-sheet-script.gs), a form service such as Formspree,
   or the FITO back end once it exists.
   Each reservation is sent as one flat JSON object, so any service can list it or email it.
   While WAITLIST_URL is empty the site is in preview mode: reservations stay in this browser only. */
/* Delivery areas in Dubai, picked from a list so every address can be routed. */
const DUBAI_AREAS=['Al Barari','Al Barsha','Al Furjan','Al Jaddaf','Al Karama','Al Quoz','Al Safa','Al Sufouh','Al Wasl','Arabian Ranches','Bur Dubai','Business Bay','City Walk','Damac Hills','Deira','DIFC','Discovery Gardens','Downtown Dubai','Dubai Creek Harbour','Dubai Hills Estate','Dubai Marina','Dubai Silicon Oasis','Dubai Sports City','Emirates Hills','International City','JBR','JLT','JVC','Jumeirah','Jumeirah Golf Estates','Meadows','Meydan','Mirdif','Motor City','Mudon','Nad Al Sheba','Oud Metha','Palm Jumeirah','Satwa','Sobha Hartland','Springs','The Greens','The Lakes','The Views','Tilal Al Ghaf','Town Square','Umm Suqeim'];
const escHtml=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* Only the real site (SITE_URL) sends reservations. Previews, such as the copy in Claude or a file
   opened on a laptop, keep them in the browser, so test clicks never land in the sheet. */
const ON_LIVE_SITE=(()=>{try{const h=s=>s.replace(/^www\./,'');return h(location.hostname)===h(new URL(SITE_URL).hostname);}catch(_){return false;}})();

/* Where the visitor came from, such as ?ref=card on the printed business cards.
   Remembered in this browser for 30 days, so a reservation made on a later visit still counts. */
const VISIT_REF=(()=>{try{
  const r=(new URLSearchParams(location.search).get('ref')||'').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,30);
  if(r){localStorage.setItem('fito_ref',JSON.stringify({ref:r,at:Date.now()}));return r;}
  const saved=JSON.parse(localStorage.getItem('fito_ref')||'null');
  return saved&&Date.now()-saved.at<30*864e5?saved.ref:'';
}catch(_){return '';}})();

/* Asks the Google Sheet a question. First as a normal request (the sheet answers with plain JSON
   that any website may read); if the browser refuses or it's too slow, again with a <script> tag
   (JSONP). Counts and yes/no answers only, never names. Fails if neither answers within `ms` each. */
function askSheet(params,ms=12000){
  if(!WAITLIST_URL) return Promise.reject(new Error('no sheet'));
  const within=(pr,ms)=>Promise.race([pr,new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),ms))]);
  const viaFetch=()=>fetch(WAITLIST_URL+'?'+new URLSearchParams({...params,t:Date.now()}),{cache:'no-store'})
    .then(r=>{if(!r.ok) throw new Error('HTTP '+r.status); return r.json();});
  const viaScript=()=>new Promise((resolve,reject)=>{
    const cb='fitoCb'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
    const s=document.createElement('script');
    const done=()=>{window[cb]=()=>{};s.remove();};
    window[cb]=d=>{done();resolve(d);};
    s.onerror=()=>{done();reject(new Error('network'));};
    s.src=WAITLIST_URL+'?'+new URLSearchParams({...params,callback:cb,t:Date.now()});
    s.async=true; document.head.appendChild(s);
  });
  return within(viaFetch(),ms).catch(err=>{console.warn('FITO: sheet request failed, trying again another way:',err&&err.message);return within(viaScript(),ms);});
}
/* How many deliveries each day and slot already has, e.g. {"2026-11-07|8:00 to 10:00": 6}. */
function fetchSlotCounts(days){
  return askSheet({action:'slots',dates:days.join(',')}).then(d=>{ if(!d||!d.counts) throw new Error('no counts'); return d; });
}

/* Sends a reservation and finds out what happened: 'booked', 'full' (the slot filled up first),
   'unavailable' (that day or time can't be booked), or 'unknown' if the sheet didn't say. */
function sendReservation(fields){
  const rid=Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const data={...fields,ref:VISIT_REF,submitted_at:new Date().toISOString(),page:location.pathname};
  if(!WAITLIST_URL||!ON_LIVE_SITE){
    try{const all=JSON.parse(localStorage.getItem('fito_reservations')||'[]');all.push(data);localStorage.setItem('fito_reservations',JSON.stringify(all));}catch(_){}
    return Promise.resolve({preview:true,status:'booked'});
  }
  // A Google Sheet (Apps Script web app) takes a plain-text body and does not answer cross-site,
  // so the reservation is sent blind, then the sheet is asked how it went.
  if(/script\.google\.com/.test(WAITLIST_URL)){
    const ask=()=>askSheet({action:'status',rid},7000).then(r=>(r&&r.status)||'unknown').catch(()=>'unknown');
    return fetch(WAITLIST_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...data,rid})})
      .then(ask)
      .then(st=>st==='unknown'?new Promise(r=>setTimeout(r,1500)).then(ask):st)
      .then(st=>{ if(st==='error'||st==='busy') throw new Error(st); return {preview:false,status:st}; });
  }
  return fetch(WAITLIST_URL,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)})
    .then(r=>{if(!r.ok) throw new Error('HTTP '+r.status); return {preview:false,status:'booked'};});
}

/* Exact amount to pay: whole dirhams when it is round, otherwise with fils, so it matches what they type. */
const payMoney=money;
/* A short booking reference, e.g. FITO-K3X9Q2, sent to the sheet and to Stripe so each payment matches its booking. */
const newBookingRef=()=>'FITO-'+(Date.now().toString(36).slice(-5)+Math.random().toString(36).slice(2,4)).toUpperCase();
/* This customer's own copy of the payment link: their email and exact amount filled in, and the booking reference attached.
   Stripe takes the amount in fils (AED x 100) through prefilled_amount. */
function payLinkFor(email,ref,amount){
  if(!PAY_URL) return '';
  try{const u=new URL(PAY_URL); if(email) u.searchParams.set('prefilled_email',email); if(ref) u.searchParams.set('client_reference_id',ref);
    const fils=Math.round((Number(amount)||0)*100); if(fils>0) u.searchParams.set('prefilled_amount',String(fils));
    return u.toString();}catch(_){return PAY_URL;}
}
/* The panel with the amount and the Pay button, shown after booking and again in the Box drawer. */
function payPanel(p){
  if(!p||!p.link) return '';
  return `<div class="reserve-pay"><p class="reserve-pay__amount">${escHtml(p.amount)}</p><p class="reserve-pay__what">${escHtml(p.what)}</p>
    <a class="site-btn reserve-pay__btn" href="${escHtml(p.link)}" target="_blank" rel="noopener">Pay ${escHtml(p.amount)} now</a>
    <p class="site-smallprint">Secure payment by The CO Kitchens, where FITO is made, so you'll see their name on your statement.</p></div>`;
}

/* The box as flat fields: one column per flavour, easy to count up for the kitchen or investors. */
function boxFields(b){
  // The sheet counts anything starting "Soupscription" as a subscriber (slots, First 50), so keep that word first.
  const pp=planOf(b), pre=b.mode==='sub'&&pp.boxes>0;
  const f={reservation:b.mode!=='sub'?'One-time box':pre?`Soupscription, ${pp.boxes} boxes prepaid`:'Soupscription, every 4 weeks',packs:b.packs};
  FLAVOURS.forEach(x=>{f[x.name]=b.items[x.id]||0;});
  TOPPINGS.forEach(t=>{f[t.name]=(b.tops||{})[t.id]||0;});
  f.price_per_box_aed=Math.round(b.total*100)/100;
  if(b.mode==='sub'){ f.plan=pre?`Prepay ${pp.boxes} boxes (extra ${Math.round(pp.extra*100)}% off)`:'Pay as you go (minimum 2 boxes)';
    f.prepaid_boxes=pre?pp.boxes:0; f.prepaid_total_aed=pre?b.prepaid:0; }
  f.first_delivery=fmtLong(new Date(b.first)); f.first_delivery_iso=isoDay(new Date(b.first)); f.time_slot=b.slot||'';
  return f;
}

/* What the visitor typed, kept if they have to go back and pick another time. */
let typed={};

/* Shows the reservation form in the cart drawer, for the box in the cart.
   skipCheck: they said they already hold this time, so don't stop them on the fresh slot check. */
function showReserveForm(skipCheck){
  if(!box||box.packs<MIN) return;
  const body=document.getElementById('dbody'), foot=document.getElementById('dfoot');
  const sub=box.mode==='sub', v=k=>escHtml(typed[k]||''), pp=planOf(box), pre=sub&&pp.boxes>0;
  foot.hidden=true;
  body.innerHTML=`<form class="reserve-form" id="reserveForm">
    <div>
      <p class="reserve-form__title">Reserve your ${sub?'soupscription':'box'}</p>
      <p class="reserve-form__box">${pre?`${box.packs} packs a box · ${pp.boxes} boxes, ${money(box.prepaid)} up front`:`${box.packs} packs · ${money(box.total)}${sub?' every 4 weeks':''}`} · ${sub?'first box':'delivered'} ${fmtLong(new Date(box.first))}, ${box.slot}</p>
    </div>
    <label class="reserve-form__field">Full name<input id="rName" autocomplete="name" value="${v('name')}" required></label>
    <label class="reserve-form__field">Phone (WhatsApp)<input id="rPhone" type="tel" autocomplete="tel" placeholder="+971 5X XXX XXXX" value="${v('phone')}" required></label>
    <label class="reserve-form__field"><span>Email <small>(for your receipt)</small></span><input id="rEmail" type="email" autocomplete="email" value="${v('email')}" required></label>
    <label class="reserve-form__field">Area<select id="rArea" required><option value="" disabled selected>Choose your area in Dubai</option>${DUBAI_AREAS.map(a=>`<option>${a}</option>`).join('')}<option value="other">Another area in Dubai</option><option value="outside">Outside Dubai</option></select></label>
    <label class="reserve-form__field">Address<input id="rAddress" autocomplete="street-address" placeholder="Building or villa, flat number, street" value="${v('address')}" required></label>
    <button class="site-btn reserve-form__submit" type="submit">Book and pay</button>
    <p class="reserve-form__wait" id="rWait" role="status" hidden>This takes a few seconds. Please keep this page open.</p>
    <p class="site-smallprint">Next, you pay securely by card or Apple Pay${pre?`, one payment for all ${pp.boxes} boxes`:sub?' for your first box':''}.${sub?' Minimum 2 boxes.':''}</p>
    <button class="site-btn site-btn--line reserve-form__back" type="button" id="rBack">Back to my box</button>
  </form>`;
  body.querySelector('#rBack').onclick=()=>updateCart(true);
  const form=body.querySelector('#reserveForm');
  if(typed.area) form.rArea.value=typed.area;
  form.addEventListener('input',()=>{typed={name:form.rName.value,phone:form.rPhone.value,email:form.rEmail.value,area:form.rArea.value,address:form.rAddress.value};});

  // Fresh check: has this time filled up since the page loaded? (The sheet checks again on submit.)
  if(!skipCheck&&!box.reserved&&WAITLIST_URL&&ON_LIVE_SITE){
    const days=slotDays(box.mode,new Date(box.first)).map(isoDay), s=box.slot;
    fetchSlotCounts(days).then(d=>{
      if(document.getElementById('reserveForm')!==form) return;
      if(days.some(x=>(d.counts[x+'|'+s]||0)>=(d.limit||SLOT_LIMIT))) showSlotFull('full',false);
    }).catch(()=>{});
  }

  form.onsubmit=e=>{
    e.preventDefault();
    const btn=form.querySelector('.reserve-form__submit');
    const name=form.rName.value.trim(), area=form.rArea.value, inDubai=area!=='outside';
    const bookingRef=newBookingRef(), email=form.rEmail.value.trim();
    btn.disabled=true;
    const first=name.split(' ')[0];
    const when=`${fmtLong(new Date(box.first))}, ${box.slot}`;
    const pp=planOf(box), pre=sub&&pp.boxes>0;
    const due=pre?box.prepaid:box.total;
    // What they pay now: the prepaid total, or this box (a soupscription paid box by box pays its first box).
    const pay=inDubai&&PAY_URL?{amount:payMoney(due),what:pre?`for all ${pp.boxes} boxes`:sub?'for your first box':'for your box',ref:bookingRef,link:payLinkFor(email,bookingRef,due)}:null;
    const fields={source:'Box builder',booking_ref:bookingRef,name,phone:form.rPhone.value.trim(),email,
      lives_in:inDubai?'Dubai':'Outside Dubai',area:area==='other'?'Other Dubai area':area==='outside'?'':area,address:form.rAddress.value.trim(),...boxFields(box)};
    // No waiting: the payment page opens straight away in a new tab (it has to open inside the click,
    // or the browser blocks it), and the booking is saved to the sheet in the background on this page.
    let opened=null;
    if(pay){ try{ opened=window.open(pay.link,'_blank'); if(opened) opened.opener=null; }catch(_){} }
    const booked={...box,items:{...box.items},tops:{...(box.tops||{})}}, keptTyped={...typed};
    typed={};
    body.innerHTML=`<div class="reserve-done"><p class="reserve-done__title">${inDubai?"You're booked":"You're on the list"}${first?', '+escHtml(first):''}.</p>${!inDubai
      ? `<p>We only deliver in Dubai for now, so we've saved your box and will tell you as soon as FITO reaches you.</p>`
      : `<p>Your ${sub?'soupscription':'box'} for ${when} is saved. ${opened?'Your secure payment page has opened in a new tab.':'Pay now to confirm it.'}</p>${payPanel(pay)}`}</div>`;
    // Booked, so the box is no longer "in the basket": remember what they booked (and how to pay), then empty it.
    const summary=sub?`Soupscription, ${booked.packs} packs${pre?`, ${pp.boxes} boxes prepaid`:' every 4 weeks'}. First box ${when}.`:`One-time box, ${booked.packs} packs, ${when}.`;
    try{localStorage.setItem('fito_reserved',JSON.stringify({summary,first:booked.first,at:Date.now(),pay,payOpened:!!opened,outside:!inDubai}));}catch(_){}
    box=null; saveBox(); document.getElementById('cartN').textContent=0;
    document.dispatchEvent(new CustomEvent('fito:box-emptied'));
    // Save it, trying again a few times if Google is slow or busy.
    const attempt=n=>sendReservation(fields).catch(err=>{ if(n>=3) throw err; return new Promise(r=>setTimeout(r,[2000,5000,9000][n])).then(()=>attempt(n+1)); });
    attempt(0).then(res=>{
      if(res.status==='full'||res.status==='unavailable'){
        // Someone took the last place a moment earlier (rare): give the box back and let them pick another time.
        try{localStorage.removeItem('fito_reserved');}catch(_){}
        box=booked; typed=keptTyped; saveBox(); document.getElementById('cartN').textContent=box.packs;
        showSlotFull(res.status,true);
      }
    }).catch(()=>{
      try{localStorage.setItem('fito_unsaved',JSON.stringify({...fields,saved_late:true}));}catch(_){}
      toast("We couldn't save your booking just now. Please message us on WhatsApp and we'll sort it.");
    });
  };
  form.rName.focus();
}

/* The time they picked is taken (or can no longer be booked): say so, and send them back to the calendar. */
function showSlotFull(why,afterSubmit){
  const body=document.getElementById('dbody'); document.getElementById('dfoot').hidden=true;
  const first=new Date(box.first), when=`${box.slot} on ${fmtLong(first)}`;
  const text=why==='unavailable'
    ? `${when} can't be booked any more. Deliveries need to be booked at least a week ahead.`
    : `${when} ${afterSubmit?'filled up just before you. If you already paid, your payment covers the new time you pick.':'has just filled up.'}`;
  body.innerHTML=`<div class="reserve-full" role="alert">
    <p class="reserve-full__title">${why==='unavailable'?'That time is no longer open.':'That time is now full.'}</p>
    <p>${escHtml(text)} Please pick another day or time, then reserve again. Anything you've typed is kept.</p>
    <button class="site-btn reserve-full__pick" type="button" id="pickAgain">Pick another day or time</button>
    ${afterSubmit||why!=='full'?'':'<button class="reserve-full__mine" type="button" id="alreadyMine">I already have this time booked</button>'}
  </div>`;
  body.querySelector('#pickAgain').onclick=()=>{closeDrawer();document.dispatchEvent(new CustomEvent('fito:pick-slot',{detail:{day:isoDay(first),slot:box.slot}}));};
  const mine=body.querySelector('#alreadyMine'); if(mine) mine.onclick=()=>showReserveForm(true);
}

/* A booking that couldn't be saved last time (Google was down): try again quietly on the next visit. */
(()=>{try{const u=JSON.parse(localStorage.getItem('fito_unsaved')||'null'); if(!u||!ON_LIVE_SITE) return;
  sendReservation(u).then(()=>localStorage.removeItem('fito_unsaved')).catch(()=>{});}catch(_){}})();
