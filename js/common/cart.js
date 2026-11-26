/* The cart: the box a visitor has put together, kept in their browser (localStorage)
   and shown in the slide-in drawer from the "Box" button in the header.
   Pages that build boxes (the home page) set `box` and call saveBox() / updateCart().
   When the visitor empties the box, a 'fito:box-emptied' event lets the page reset itself. */
let box=null;

function saveBox(){try{localStorage.setItem('fito_box',JSON.stringify(box));}catch(_){}}
/* After a reservation the box is emptied (so the header goes back to 0), and a one-line note of
   what they reserved is kept, so the Box drawer can remind them until the first delivery. */
function lastReservation(){
  try{const r=JSON.parse(localStorage.getItem('fito_reserved')||'null'); if(!r) return null;
    const day=new Date(r.first); day.setDate(day.getDate()+1); return day>=new Date()?r:null;}catch(_){return null;}
}
/* Adds to the saved booking, e.g. {payOpened:true} once the payment page has been opened, or {paid:true}. */
function updateReservation(patch){
  try{const r=JSON.parse(localStorage.getItem('fito_reserved')||'null'); if(!r) return; Object.assign(r,patch); localStorage.setItem('fito_reserved',JSON.stringify(r));}catch(_){}
}
/* Personal payment links sent on WhatsApp look like fitosoups.com/?pay=FITO-XXXX&a=16560&e=name@mail.com
   (a = the amount in fils). The page notes whose payment it is on this phone, then goes straight on to the
   Stripe page with the amount and email filled in. When Stripe sends them back (?paid=...), the sheet is told
   to tick that booking_ref as paid, the same way as bookings made on the site. */
(()=>{try{const q=new URLSearchParams(location.search); if(!q.has('pay')) return;
  const ref=(q.get('pay')||'').trim().toUpperCase(), fils=parseInt(q.get('a')||'',10), email=(q.get('e')||'').trim();
  if(!/^FITO-[A-Z0-9]{4,12}$/.test(ref)||!(fils>=100&&fils<=1000000)) return;
  try{localStorage.setItem('fito_paylink',JSON.stringify({ref,at:Date.now()}));}catch(_){}
  const p=new URLSearchParams(); if(/^[^@\s]+@[^@\s]+$/.test(email)) p.set('prefilled_email',email);
  p.set('client_reference_id',ref); p.set('prefilled_amount',String(fils));
  location.replace(PAY_URL+'?'+p.toString());
}catch(_){}})();
/* Back from Stripe: the payment link sends paying customers to fitosoups.com/?paid=... (set by The CO Kitchens),
   so the booking shows as paid here and the Pay button doesn't come back. */
/* Update 50: tells the sheet a payment went through. Saved on this phone first, then sent, and tried
   again (after 3, 10 and 30 seconds, then on the next visits for 7 days) until the sheet answers. */
function fitoReportPaid(report){
  const KEY='fito_paid_report';
  try{ if(report) localStorage.setItem(KEY,JSON.stringify(report)); else report=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  if(!report||!report.at||Date.now()-report.at>7*864e5){ try{localStorage.removeItem(KEY);}catch(_){} return; }
  if(typeof askSheet!=='function'||typeof ON_LIVE_SITE==='undefined'||!ON_LIVE_SITE) return;
  const waits=[3000,10000,30000];
  const send=n=>askSheet({action:'paid',ref:report.ref||'',session:report.session||''})
    .then(()=>{ try{localStorage.removeItem(KEY);}catch(_){} })
    .catch(()=>{ if(n<waits.length) setTimeout(()=>send(n+1),waits[n]); });
  send(0);
}
(()=>{try{const q=new URLSearchParams(location.search); if(!q.has('paid')){ fitoReportPaid(null); return; }
  updateReservation({paid:true,paidAt:Date.now()});
  // Tell the sheet, so the paid box ticks itself. A read-only request: a sheet script without the
  // 'paid' step just ignores it, so nothing can be overwritten.
  // Update 50: always tell the sheet, even when this browser doesn't know the booking (booked in
  // Instagram, paid in Safari). The sheet then matches it, or emails Seema. Kept on this phone and
  // sent again until the sheet answers, so a weak signal can't lose a payment.
  let ref='';
  try{const r=JSON.parse(localStorage.getItem('fito_reserved')||'null'); ref=(r&&r.pay&&r.pay.ref)||'';
    // A personal link opened on this phone in the last 3 days is the payment that just went through.
    const pl=JSON.parse(localStorage.getItem('fito_paylink')||'null');
    if(pl&&pl.ref&&Date.now()-pl.at<3*864e5) ref=pl.ref;
    localStorage.removeItem('fito_paylink');}catch(_){}
  fitoReportPaid({ref:String(ref||''),session:(q.get('paid')||'').slice(0,90),at:Date.now()});
  history.replaceState(null,'',location.pathname+location.hash);
  window.addEventListener('load',()=>setTimeout(()=>toast('Thank you, your payment went through. See you on delivery day!'),500));
}catch(_){}})();
/* Pressing a Pay button counts as opening the payment page. */
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('.reserve-pay__btn,.js-paylink')) updateReservation({payOpened:true}); });
function loadBox(){
  try{const r=localStorage.getItem('fito_box'); if(r) box=JSON.parse(r);}catch(_){box=null;}
  return box;
}

/* Redraws the drawer. While the reservation form (or a "that time is full" message) is showing,
   only the count in the header changes, so nothing typed is lost; pass force to redraw anyway. */
function updateCart(force){
  document.getElementById('cartN').textContent=box?box.packs:0;
  const body=document.getElementById('dbody'),foot=document.getElementById('dfoot');
  if(force!==true&&body.querySelector('#reserveForm,.reserve-full,.reserve-done')) return;
  if(!box&&lastReservation()){
    const r=lastReservation();
    // Paid: just a thank you. Payment page already opened: a thank you, with a small link in case it didn't go through.
    // Otherwise the full Pay panel.
    if(r.outside){
      body.innerHTML=`<div class="cart-empty cart-reserved"><p class="cart-reserved__title">You're on the list.</p><p>${escHtml(r.summary)}</p><p>We only deliver in Dubai for now. We'll tell you as soon as FITO reaches you.</p><p>Questions? <a href="https://wa.me/971556058152">Message us on WhatsApp</a>.</p></div>`;
      foot.hidden=true; return;
    }
    const payPart=r.paid?`<p class="cart-reserved__paid">Paid. Thank you, there's nothing more to do.</p>`
      :r.pay&&r.payOpened?`<p>Thank you! Once your payment has gone through, there's nothing more to do.</p><p class="site-smallprint">Payment didn't go through? <a class="js-paylink" href="${escHtml(r.pay.link)}" target="_blank" rel="noopener">Pay ${escHtml(r.pay.amount)} here</a>.</p>`
      :r.pay?`${payPanel(r.pay)}<p>Already paid? Thank you, there's nothing more to do.</p>`
      :r.free?`<p>Nothing to pay: your box is on FitR.</p>`
      :`<p>We'll send your payment link by email and WhatsApp before then.</p>`;
    body.innerHTML=`<div class="cart-empty cart-reserved"><p class="cart-reserved__title">${r.paid?"You're booked and paid.":"You're booked."}</p><p>${escHtml(r.summary)}</p>${payPart}<p>To change anything, <a href="https://wa.me/971556058152">message us on WhatsApp</a>.</p></div>`;
    foot.hidden=true; return;
  }
  if(!box){
    body.innerHTML=`<div class="cart-empty"><p>Your box is empty.</p><a class="site-btn site-btn--line" href="${HOME_URL}#build" id="goBuild">Build a box</a></div>`;
    foot.hidden=true; body.querySelector('#goBuild').onclick=closeDrawer; return;
  }
  foot.hidden=false;
  body.innerHTML=FLAVOURS.filter(f=>box.items[f.id]>0).map(f=>`
    <div class="cart-item">
      <div class="cart-item__thumb">${cube(f.c,46)}</div>
      <div><div class="cart-item__name" style="color:${shade(f.c,-38)}">${nameArt(f)}</div><div class="cart-item__meta">${box.items[f.id]} pack${box.items[f.id]>1?'s':''} · about ${box.items[f.id]*SERV} bowls</div></div>
      <div class="cart-item__price">${money(box.items[f.id]*PRICE)}</div>
    </div>`).join('')
    +TOPPINGS.filter(t=>(box.tops||{})[t.id]>0).map(t=>`
    <div class="cart-item">
      <div class="cart-item__thumb">${croutonArt(46)}</div>
      <div><div class="cart-item__name"><span class="brand-word">${t.label||t.name}</span></div><div class="cart-item__meta">${box.tops[t.id]} bag${box.tops[t.id]>1?'s':''} of croutons</div></div>
      <div class="cart-item__price">${money(box.tops[t.id]*t.price)}</div>
    </div>`).join('')
    +(box.pct?`<div class="cart-item cart-item--plain"><div class="cart-item__label"><div class="cart-item__label-title cart-item__label-title--saving">Subscriber saving</div><div class="cart-item__meta">${Math.round(box.pct*100)}% off ${box.packs} packs</div></div><div class="cart-item__price cart-item__price--saving">−${money(box.packs*PRICE*box.pct)}</div></div>`:'')
    +(box.mode==='sub'&&planOf(box).boxes?`<div class="cart-item cart-item--plain"><div class="cart-item__label"><div class="cart-item__label-title cart-item__label-title--saving">Prepay ${planOf(box).boxes} boxes</div><div class="cart-item__meta">${money(box.total)} a box, extra ${Math.round(planOf(box).extra*100)}% off</div></div><div class="cart-item__price">${money(box.prepaid)}</div></div>`:'')
    +`<div class="cart-item cart-item--plain"><div class="cart-item__label"><div class="cart-item__label-title">Delivery</div><div class="cart-item__meta">${box.mode==='sub'?'Free for early subscribers':'Anywhere in Dubai'}</div></div><div class="cart-item__price">${box.del?money(box.del):'Free'}</div></div>`
    // Update 54: the FitR code, and what it gives (or why it doesn't apply to this box).
    +(box.code?(()=>{const on=codeOn(box);return `<div class="cart-item cart-item--plain"><div class="cart-item__label"><div class="cart-item__label-title">${on&&box.code.id==='box'?'Free FITO box':'FitR code'}</div><div class="cart-item__meta">${escHtml(box.code.code)} · ${escHtml(on?box.code.text:codeMessage('fit',box.code))}</div></div><div class="cart-item__price${on?' cart-item__price--free':''}">${on?(box.code.id==='box'?'−'+money(box.free):'Free'):''}</div></div>`;})():'')
    +`<button class="site-btn site-btn--line cart-clear" id="clearBox">Empty the box</button>`;
  const pp=planOf(box), pre=box.mode==='sub'&&pp.boxes>0;
  document.getElementById('dTotal').textContent=money(pre?box.prepaid:box.total);
  document.getElementById('dTerms').textContent=codeIsFreeBox(box) ? 'Free FITO box from FitR · nothing to pay' : box.mode!=='sub' ? 'One-time box · no commitment'
    : pre ? `${pp.boxes} boxes, paid up front · first box ${fmt(new Date(box.first))}, ${box.slot||''} · pause up to ${PREPAY_PAUSES}`
    : `${money(box.total)} every 4 weeks · first box ${fmt(new Date(box.first))}, ${box.slot||''} · minimum 2 boxes, then skip or cancel up to 3 days before`;
  if(box.reserved) document.getElementById('dTerms').textContent='Booked. To change anything, message us on WhatsApp.';
  const short=box.packs<MIN, co=document.getElementById('checkout');
  co.disabled=short;
  co.textContent=short?`Add ${MIN-box.packs} more pack${MIN-box.packs>1?'s':''} to book`:box.chosen===false?'Choose Soupscription or One\u2011time box':box.reserved?'Update my booking':codeIsFreeBox(box)?'Book my free box':'Book and pay';
  if(short) document.getElementById('dTerms').textContent='Four packs minimum, then as many as you like.';
  body.querySelector('#clearBox').onclick=()=>{
    box=null;
    saveBox();
    document.dispatchEvent(new CustomEvent('fito:box-emptied'));
    updateCart();toast('Box emptied');
  };
}

document.getElementById('checkout').onclick=()=>{
  // They haven't picked Soupscription or One-time box yet: send them back to choose.
  if(box&&box.chosen===false){ closeDrawer(); document.dispatchEvent(new CustomEvent('fito:choose-mode')); return; }
  showReserveForm();
};

loadBox();
updateCart();
