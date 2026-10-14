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
    body.innerHTML=`<div class="cart-empty cart-reserved"><p class="cart-reserved__title">You're on the list.</p><p>${escHtml(r.summary)}</p><p>We'll send your payment link by email and WhatsApp before then. To change anything, <a href="https://wa.me/971556058152">message us on WhatsApp</a>.</p></div>`;
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
      <div><div class="cart-item__name"><span class="brand-word">${t.name}</span></div><div class="cart-item__meta">${box.tops[t.id]} bag${box.tops[t.id]>1?'s':''}</div></div>
      <div class="cart-item__price">${money(box.tops[t.id]*t.price)}</div>
    </div>`).join('')
    +(box.pct?`<div class="cart-item cart-item--plain"><div class="cart-item__label"><div class="cart-item__label-title cart-item__label-title--saving">Subscriber saving</div><div class="cart-item__meta">${Math.round(box.pct*100)}% off ${box.packs} packs</div></div><div class="cart-item__price cart-item__price--saving">−${money(box.packs*PRICE*box.pct)}</div></div>`:'')
    +(box.mode==='sub'&&planOf(box).boxes?`<div class="cart-item cart-item--plain"><div class="cart-item__label"><div class="cart-item__label-title cart-item__label-title--saving">Prepay ${planOf(box).boxes} deliveries</div><div class="cart-item__meta">${money(box.total)} a box, extra ${Math.round(planOf(box).extra*100)}% off</div></div><div class="cart-item__price">${money(box.prepaid)}</div></div>`:'')
    +`<div class="cart-item cart-item--plain"><div class="cart-item__label"><div class="cart-item__label-title">Delivery</div><div class="cart-item__meta">${box.mode==='sub'?'Free for early subscribers':'Anywhere in Dubai'}</div></div><div class="cart-item__price">${box.del?money(box.del):'Free'}</div></div>`
    +`<button class="site-btn site-btn--line cart-clear" id="clearBox">Empty the box</button>`;
  const pp=planOf(box), pre=box.mode==='sub'&&pp.boxes>0;
  document.getElementById('dTotal').textContent=money(pre?box.prepaid:box.total);
  document.getElementById('dTerms').textContent=box.mode!=='sub' ? 'One-time box · no commitment'
    : pre ? `${pp.boxes} boxes, paid up front · first box ${fmt(new Date(box.first))}, ${box.slot||''} · pause up to ${PREPAY_PAUSES}`
    : `${money(box.total)} every 4 weeks · first box ${fmt(new Date(box.first))}, ${box.slot||''} · minimum 2 boxes, then skip or cancel up to 3 days before`;
  if(box.reserved) document.getElementById('dTerms').textContent='Reserved. Your payment link comes by email and WhatsApp before delivery.';
  const short=box.packs<MIN, co=document.getElementById('checkout');
  co.disabled=short;
  co.textContent=short?`Add ${MIN-box.packs} more pack${MIN-box.packs>1?'s':''} to reserve`:box.chosen===false?'Choose Soupscription or One-time box':box.reserved?'Update my reservation':'Reserve, pay later';
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
