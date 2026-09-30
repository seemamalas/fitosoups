/* Reservations: early sign-ups, no payment taken.
   Used by the cart drawer: the visitor reserves the box they built.

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

/* The box as flat fields: one column per flavour, easy to count up for the kitchen or investors. */
function boxFields(b){
  const f={reservation:b.mode==='sub'?'Soupscription, every 4 weeks':'One-time box',packs:b.packs};
  FLAVOURS.forEach(x=>{f[x.name]=b.items[x.id]||0;});
  TOPPINGS.forEach(t=>{f[t.name]=(b.tops||{})[t.id]||0;});
  f.price_per_box_aed=Math.round(b.total*100)/100;
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
  const sub=box.mode==='sub', v=k=>escHtml(typed[k]||'');
  foot.hidden=true;
  body.innerHTML=`<form class="reserve-form" id="reserveForm">
    <div>
      <p class="reserve-form__title">Reserve your ${sub?'soupscription':'box'}</p>
      <p class="reserve-form__box">${box.packs} packs · ${money(box.total)}${sub?' every 4 weeks':''} · ${sub?'first box':'delivered'} ${fmtLong(new Date(box.first))}, ${box.slot}</p>
    </div>
    <label class="reserve-form__field">Full name<input id="rName" autocomplete="name" value="${v('name')}" required></label>
    <label class="reserve-form__field">Phone (WhatsApp)<input id="rPhone" type="tel" autocomplete="tel" placeholder="+971 5X XXX XXXX" value="${v('phone')}" required></label>
    <label class="reserve-form__field"><span>Email <small>(your payment link goes here)</small></span><input id="rEmail" type="email" autocomplete="email" value="${v('email')}" required></label>
    <label class="reserve-form__field">Area<select id="rArea" required><option value="" disabled selected>Choose your area in Dubai</option>${DUBAI_AREAS.map(a=>`<option>${a}</option>`).join('')}<option value="other">Another area in Dubai</option><option value="outside">Outside Dubai</option></select></label>
    <label class="reserve-form__field">Address<input id="rAddress" autocomplete="street-address" placeholder="Building or villa, flat number, street" value="${v('address')}" required></label>
    <button class="site-btn reserve-form__submit" type="submit">Reserve, pay later</button>
    <p class="site-smallprint">No payment today. When we are ready to deliver, we'll email you a secure payment link and send it on WhatsApp too. Your ${sub?'first ':''}delivery date is held until then.</p>
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
    btn.disabled=true; btn.textContent='Reserving…';
    sendReservation({source:'Box builder',name,phone:form.rPhone.value.trim(),email:form.rEmail.value.trim(),
      lives_in:inDubai?'Dubai':'Outside Dubai',area:area==='other'?'Other Dubai area':area==='outside'?'':area,address:form.rAddress.value.trim(),...boxFields(box)})
      .then(res=>{
        if(res.status==='full'||res.status==='unavailable'){ showSlotFull(res.status,true); return; }
        box.reserved=true; saveBox(); typed={};
        const first=name.split(' ')[0];
        const when=`${fmtLong(new Date(box.first))}, ${box.slot}`;
        body.innerHTML=`<div class="reserve-done"><p class="reserve-done__title">You're on the list${first?', '+escHtml(first):''}.</p><p>${!inDubai
          ? `We only deliver in Dubai for now, so we've saved your box and will tell you as soon as FITO reaches you.`
          : res.status==='unknown'
          ? `Thanks, we have your details for ${when}. We'll confirm your delivery time on WhatsApp and email you a payment link before then. Nothing is charged until you pay it.`
          : `We've saved your ${sub?'soupscription':'box'} for ${when}. Before then we'll email you a payment link and send it on WhatsApp. Nothing is charged until you pay it.`}</p></div>`;
      })
      .catch(()=>{btn.disabled=false;btn.textContent='Reserve, pay later';toast("That didn't go through. Please try again.");});
  };
  form.rName.focus();
}

/* The time they picked is taken (or can no longer be booked): say so, and send them back to the calendar. */
function showSlotFull(why,afterSubmit){
  const body=document.getElementById('dbody'); document.getElementById('dfoot').hidden=true;
  const first=new Date(box.first), when=`${box.slot} on ${fmtLong(first)}`;
  const text=why==='unavailable'
    ? `${when} can't be booked any more. Deliveries need to be booked at least a week ahead.`
    : `${when} ${afterSubmit?'filled up just before you, so nothing has been booked.':'has just filled up.'}`;
  body.innerHTML=`<div class="reserve-full" role="alert">
    <p class="reserve-full__title">${why==='unavailable'?'That time is no longer open.':'That time is now full.'}</p>
    <p>${escHtml(text)} Please pick another day or time, then reserve again. Anything you've typed is kept.</p>
    <button class="site-btn reserve-full__pick" type="button" id="pickAgain">Pick another day or time</button>
    ${afterSubmit||why!=='full'?'':'<button class="reserve-full__mine" type="button" id="alreadyMine">I already have this time booked</button>'}
  </div>`;
  body.querySelector('#pickAgain').onclick=()=>{closeDrawer();document.dispatchEvent(new CustomEvent('fito:pick-slot',{detail:{day:isoDay(first),slot:box.slot}}));};
  const mine=body.querySelector('#alreadyMine'); if(mine) mine.onclick=()=>showReserveForm(true);
}
