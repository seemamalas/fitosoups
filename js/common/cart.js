/* The cart: the box a visitor has put together, kept in their browser (localStorage)
   and shown in the slide-in drawer from the "Box" button in the header.
   Pages that build boxes (the home page) set `box` and call saveBox() / updateCart().
   When the visitor empties the box, a 'fito:box-emptied' event lets the page reset itself. */
let box=null;

function saveBox(){try{localStorage.setItem('fito_box',JSON.stringify(box));}catch(_){}}
function loadBox(){
  try{const r=localStorage.getItem('fito_box'); if(r) box=JSON.parse(r);}catch(_){box=null;}
  return box;
}

function updateCart(){
  document.getElementById('cartN').textContent=box?box.packs:0;
  const body=document.getElementById('dbody'),foot=document.getElementById('dfoot');
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
    +`<div class="cart-item cart-item--plain"><div class="cart-item__label"><div class="cart-item__label-title">Delivery</div><div class="cart-item__meta">${box.mode==='sub'?'Free for early subscribers':'Anywhere in Dubai'}</div></div><div class="cart-item__price">${box.del?money(box.del):'Free'}</div></div>`
    +`<button class="site-btn site-btn--line cart-clear" id="clearBox">Empty the box</button>`;
  document.getElementById('dTotal').textContent=money(box.total);
  document.getElementById('dTerms').textContent=box.mode==='sub'
    ? `${money(box.total)} every 4 weeks · first box ${fmt(new Date(box.first))}, ${box.slot||''} · cancel anytime`
    : 'One-time box · no commitment';
  if(box.reserved) document.getElementById('dTerms').textContent='Reserved. Your payment link comes by email and WhatsApp before delivery.';
  const short=box.packs<MIN, co=document.getElementById('checkout');
  co.disabled=short;
  co.textContent=short?`Add ${MIN-box.packs} more pack${MIN-box.packs>1?'s':''} to reserve`:box.reserved?'Update my reservation':'Reserve, pay later';
  if(short) document.getElementById('dTerms').textContent='Four packs minimum, then as many as you like.';
  body.querySelector('#clearBox').onclick=()=>{
    box=null;
    saveBox();
    document.dispatchEvent(new CustomEvent('fito:box-emptied'));
    updateCart();toast('Box emptied');
  };
}

document.getElementById('checkout').onclick=showReserveForm;

loadBox();
updateCart();
