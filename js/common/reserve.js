/* Reservations: early sign-ups, no payment taken.
   Used by the cart drawer (reserve the box you built) and the early-subscriber form.

   Where reservations go is set once, in site.config.json, as WAITLIST_URL:
   the Google Sheet web app URL (see google-sheet-script.gs), a form service such as Formspree,
   or the FITO back end once it exists.
   Each reservation is sent as one flat JSON object, so any service can list it or email it.
   While WAITLIST_URL is empty the site is in preview mode: reservations stay in this browser only. */
const AREA_CHOICES=[['dubai','Dubai'],['abu-dhabi','Abu Dhabi'],['sharjah','Sharjah'],['other-uae','Another emirate'],['outside-uae','Outside the UAE']];
const areaLabel=v=>(AREA_CHOICES.find(a=>a[0]===v)||['',v])[1];
/* Delivery areas in Dubai, picked from a list so every address can be routed. */
const DUBAI_AREAS=['Al Barari','Al Barsha','Al Furjan','Al Jaddaf','Al Karama','Al Quoz','Al Safa','Al Sufouh','Al Wasl','Arabian Ranches','Bur Dubai','Business Bay','City Walk','Damac Hills','Deira','DIFC','Discovery Gardens','Downtown Dubai','Dubai Creek Harbour','Dubai Hills Estate','Dubai Marina','Dubai Silicon Oasis','Dubai Sports City','Emirates Hills','International City','JBR','JLT','JVC','Jumeirah','Jumeirah Golf Estates','Meadows','Meydan','Mirdif','Motor City','Mudon','Nad Al Sheba','Oud Metha','Palm Jumeirah','Satwa','Sobha Hartland','Springs','The Greens','The Lakes','The Views','Tilal Al Ghaf','Town Square','Umm Suqeim'];
const escHtml=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* Only the real site (SITE_URL) sends reservations. Previews, such as the copy in Claude or a file
   opened on a laptop, keep them in the browser, so test clicks never land in the sheet. */
const ON_LIVE_SITE=(()=>{try{const h=s=>s.replace(/^www\./,'');return h(location.hostname)===h(new URL(SITE_URL).hostname);}catch(_){return false;}})();

function sendReservation(fields){
  const data={...fields,submitted_at:new Date().toISOString(),page:location.pathname};
  if(!WAITLIST_URL||!ON_LIVE_SITE){
    try{const all=JSON.parse(localStorage.getItem('fito_reservations')||'[]');all.push(data);localStorage.setItem('fito_reservations',JSON.stringify(all));}catch(_){}
    return Promise.resolve({preview:true});
  }
  // A Google Sheet (Apps Script web app) takes a plain-text body and does not answer cross-site,
  // so the request is sent blind: it only fails if the network does.
  if(/script\.google\.com/.test(WAITLIST_URL))
    return fetch(WAITLIST_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(data)}).then(()=>({preview:false}));
  return fetch(WAITLIST_URL,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)})
    .then(r=>{if(!r.ok) throw new Error('HTTP '+r.status); return {preview:false};});
}

/* The box as flat fields: one column per flavour, easy to count up for the kitchen or investors. */
function boxFields(b){
  const f={reservation:b.mode==='sub'?'Soupscription, every 4 weeks':'One-time box',packs:b.packs};
  FLAVOURS.forEach(x=>{f[x.name]=b.items[x.id]||0;});
  TOPPINGS.forEach(t=>{f[t.name]=(b.tops||{})[t.id]||0;});
  f.price_per_box_aed=Math.round(b.total*100)/100;
  f.first_delivery=fmt(new Date(b.first)); f.time_slot=b.slot||'';
  return f;
}

/* Shows the reservation form in the cart drawer, for the box in the cart. */
function showReserveForm(){
  if(!box) return;
  const body=document.getElementById('dbody'), foot=document.getElementById('dfoot');
  const sub=box.mode==='sub';
  foot.hidden=true;
  body.innerHTML=`<form class="reserve-form" id="reserveForm">
    <div>
      <p class="reserve-form__title">Reserve your ${sub?'soupscription':'box'}</p>
      <p class="reserve-form__box">${box.packs} packs · ${money(box.total)}${sub?' every 4 weeks':''} · ${sub?'first box':'delivered'} ${fmt(new Date(box.first))}, ${box.slot}</p>
    </div>
    <label class="reserve-form__field">Full name<input id="rName" autocomplete="name" required></label>
    <label class="reserve-form__field">Phone (WhatsApp)<input id="rPhone" type="tel" autocomplete="tel" placeholder="+971 5X XXX XXXX" required></label>
    <label class="reserve-form__field"><span>Email <small>(your payment link goes here)</small></span><input id="rEmail" type="email" autocomplete="email" required></label>
    <label class="reserve-form__field">Area<select id="rArea" required><option value="" disabled selected>Choose your area in Dubai</option>${DUBAI_AREAS.map(a=>`<option>${a}</option>`).join('')}<option value="other">Another area in Dubai</option><option value="outside">Outside Dubai</option></select></label>
    <label class="reserve-form__field">Address<input id="rAddress" autocomplete="street-address" placeholder="Building or villa, flat number, street" required></label>
    <button class="site-btn reserve-form__submit" type="submit">Reserve, pay later</button>
    <p class="site-smallprint">No payment today. When we are ready to deliver, we'll email you a secure payment link and send it on WhatsApp too. Your ${sub?'first ':''}delivery date is held until then.</p>
    <button class="site-btn site-btn--line reserve-form__back" type="button" id="rBack">Back to my box</button>
  </form>`;
  body.querySelector('#rBack').onclick=updateCart;
  const form=body.querySelector('#reserveForm');
  form.onsubmit=e=>{
    e.preventDefault();
    const btn=form.querySelector('.reserve-form__submit');
    const name=form.rName.value.trim(), area=form.rArea.value, inDubai=area!=='outside';
    btn.disabled=true; btn.textContent='Reserving…';
    sendReservation({source:'Box builder',name,phone:form.rPhone.value.trim(),email:form.rEmail.value.trim(),
      lives_in:inDubai?'Dubai':'Outside Dubai',area:area==='other'?'Other Dubai area':area==='outside'?'':area,address:form.rAddress.value.trim(),...boxFields(box)})
      .then(()=>{
        box.reserved=true; saveBox();
        const first=name.split(' ')[0];
        body.innerHTML=`<div class="reserve-done"><p class="reserve-done__title">You're on the list${first?', '+escHtml(first):''}.</p><p>${inDubai
          ? `We've saved your ${sub?'soupscription':'box'} for ${fmt(new Date(box.first))}, ${box.slot}. Before then we'll email you a payment link and send it on WhatsApp. Nothing is charged until you pay it.`
          : `We only deliver in Dubai for now, so we've saved your box and will tell you as soon as FITO reaches you.`}</p></div>`;
      })
      .catch(()=>{btn.disabled=false;btn.textContent='Reserve, pay later';toast("That didn't go through. Please try again.");});
  };
  form.rName.focus();
}
