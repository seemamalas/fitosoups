/* Home page: flavour cards, the box builder (soupscription or one-time box),
   the mobile box dock, customer messages and the early-subscriber waitlist.
   Uses the shared helpers from js/common/ (catalog, art, cart, drawers, toast). */

let mode='sub',freq=4,firstIdx=0,
    qty=Object.fromEntries(FLAVOURS.map(f=>[f.id,0])),
    tops=Object.fromEntries(TOPPINGS.map(t=>[t.id,0]));

// The delivery calendar. Every delivery day (rules in catalog.js) from a week after today,
// never before launch day, for the next four weeks.
function deliveryDays(){
  const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+LEAD_DAYS);
  if(d<LAUNCH_DAY) d.setTime(LAUNCH_DAY.getTime());
  const end=new Date(d); end.setDate(end.getDate()+BOOK_AHEAD_DAYS-1);
  const out=[];
  for(const x=new Date(d);x<=end;x.setDate(x.getDate()+1)) if(DAY_SLOTS[x.getDay()]) out.push(new Date(x));
  return out;
}
const DAYS=deliveryDays();
function scheduleDates(){
  const start=DAYS[firstIdx], out=[start];
  for(let i=1;i<3;i++){ const d=new Date(start); d.setDate(d.getDate()+freq*7*i); out.push(d); }
  return out;
}
let slot=DAY_SLOTS[DAYS[0].getDay()][0];

// Each time slot takes SLOT_LIMIT deliveries. On the live site the sheet reports how many are
// already booked. A soupscription needs room on its first day and when it comes back 4 and 8 weeks
// later; a day with every slot full is crossed out. The sheet makes the final check when someone reserves.
let slotCounts={}, slotLimit=SLOT_LIMIT;
// On the live site, times can't be picked until the sheet has said which are free ('loading').
// If the sheet can't be reached at all ('failed'), booking still works: the sheet checks again when they reserve.
let slotsState=(WAITLIST_URL&&ON_LIVE_SITE)?'loading':'ok';
function slotLeft(i,label){
  const d=DAYS[i]; if(!DAY_SLOTS[d.getDay()].includes(label)) return 0;
  return Math.min(...slotDays(mode,d).map(x=>slotLimit-(slotCounts[isoDay(x)+'|'+label]||0)));
}
const dayOpen=i=>DAY_SLOTS[DAYS[i].getDay()].some(l=>slotLeft(i,l)>0);
const monthOf=d=>new Date(d.getFullYear(),d.getMonth(),1);
let calMonth=monthOf(DAYS[0]);

// Keeps the picked day and time on something still free, then redraws.
function applySlots(){
  if(!dayOpen(firstIdx)){ // the next open day after the one they had, or else the first open one
    let n=DAYS.findIndex((_,i)=>i>firstIdx&&dayOpen(i)); if(n<0) n=DAYS.findIndex((_,i)=>dayOpen(i));
    if(n>=0){ firstIdx=n; calMonth=monthOf(DAYS[n]); } }
  const labels=DAY_SLOTS[DAYS[firstIdx].getDay()];
  if(!labels.includes(slot)||slotLeft(firstIdx,slot)<=0) slot=labels.find(l=>slotLeft(firstIdx,l)>0)||labels[0];
  drawCalendar(); drawTimes(); render();
}
function drawCalendar(){
  const y=calMonth.getFullYear(), m=calMonth.getMonth();
  const lead=(new Date(y,m,1).getDay()+6)%7, dim=new Date(y,m+1,0).getDate();
  const firstM=monthOf(DAYS[0]), lastM=monthOf(DAYS[DAYS.length-1]);
  let cells='';
  for(let i=0;i<lead;i++) cells+='<span class="cal__cell"></span>';
  for(let n=1;n<=dim;n++){
    const d=new Date(y,m,n), i=DAYS.findIndex(x=>x.getTime()===d.getTime());
    if(i<0){ cells+=`<span class="cal__cell cal__day is-off">${n}</span>`; continue; }
    const open=dayOpen(i), on=i===firstIdx;
    cells+=`<button type="button" class="cal__cell cal__day${on?' is-selected':''}${open?'':' is-full'}" data-day="${i}"${open?'':' disabled'} aria-pressed="${on}" aria-label="${fmtLong(d)}${open?'':', full'}">${n}</button>`;
  }
  document.getElementById('cal').innerHTML=`<div class="cal__head">
      <button type="button" class="cal__nav" data-nav="-1"${calMonth<=firstM?' disabled':''} aria-label="Previous month">‹</button>
      <span class="cal__month">${calMonth.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</span>
      <button type="button" class="cal__nav" data-nav="1"${calMonth>=lastM?' disabled':''} aria-label="Next month">›</button>
    </div>
    <div class="cal__grid">${['M','T','W','T','F','S','S'].map(w=>`<span class="cal__wd" aria-hidden="true">${w}</span>`).join('')}${cells}</div>`;
}
function drawTimes(){
  const labels=DAY_SLOTS[DAYS[firstIdx].getDay()];
  document.getElementById('dayPicked').textContent=DAYS[firstIdx].toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const checking=slotsState==='loading';
  document.getElementById('times').innerHTML=(checking?'<p class="cal-checking">Checking which times are still free…</p>':'')+labels.map(l=>{
    const left=slotLeft(firstIdx,l), full=left<=0, on=l===slot&&!full&&!checking;
    return `<button type="button" class="cal-time${on?' is-selected':''}" data-slot="${l}" role="radio" aria-checked="${on}"${full||checking?' disabled':''}>
      <span>${l}</span>${checking?'':full?'<small>Full</small>':left<=2?`<small>${left} left</small>`:''}</button>`;
  }).join('');
}
document.getElementById('cal').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b||b.disabled) return;
  if(b.dataset.nav){ calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()+ +b.dataset.nav,1); drawCalendar(); return; }
  firstIdx=+b.dataset.day; applySlots();
});
document.getElementById('times').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b||b.disabled) return;
  slot=b.dataset.slot; drawTimes(); render();
});
function loadSlots(){
  if(!WAITLIST_URL||!ON_LIVE_SITE) return Promise.resolve();
  const days=[...new Set(DAYS.flatMap(d=>slotDays('sub',d)).map(isoDay))];
  return fetchSlotCounts(days).then(d=>{ slotCounts=d.counts; if(d.limit) slotLimit=d.limit; slotsState='ok'; applySlots(); })
    .catch(err=>{ console.warn('FITO: could not load which times are free:',err&&err.message);
      if(slotsState==='loading'&&!loadSlots.retried){ loadSlots.retried=true; return loadSlots(); }
      if(slotsState==='loading'){ slotsState='failed'; applySlots(); } });
}
// Fresh counts whenever someone comes back to the tab (not while the reservation form is open).
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&!drawer.classList.contains('is-open')) loadSlots(); });
// The reservation form found the time full: take them back to the calendar with that time crossed out.
document.addEventListener('fito:pick-slot',e=>{
  const {day,slot:s}=e.detail||{};
  if(day&&s) slotCounts[day+'|'+s]=Math.max(slotCounts[day+'|'+s]||0,slotLimit);
  applySlots();
  const sch=document.getElementById('schedule');
  sch.scrollIntoView({behavior:'smooth',block:'center'});
  sch.classList.remove('is-flash'); void sch.offsetWidth; sch.classList.add('is-flash');
  loadSlots();
});

document.getElementById('eqArt').innerHTML=
  `<div class="pack-explainer__cubes">${[0,1,2,3].map(()=>cube('#DB7814',44)).join('')}</div>
   <span class="pack-explainer__sign">=</span>
   <div class="pack-explainer__result">${bowl('#DB7814',84)}${bowl('#DB7814',84)}</div>`;
// Second line of the explainer: four packs (one of each flavour, mixed) make a box.
function packTile(c){const sq=(x,y,f)=>`<rect x="${x}" y="${y}" width="15" height="15" rx="3" fill="${f}" stroke="${INK}" stroke-width="1.6"/>`;
  return `<svg class="pack-explainer__pack" viewBox="0 0 44 44" aria-hidden="true"><rect x="1.5" y="1.5" width="41" height="41" rx="8" fill="#fff" stroke="${INK}" stroke-opacity=".45" stroke-width="1.4"/>
    ${sq(5.5,5.5,shade(c,22))}${sq(23.5,5.5,c)}${sq(5.5,23.5,c)}${sq(23.5,23.5,shade(c,-18))}</svg>`;}
function boxGlyph(){const kraft='#E4CFA6', inside=shade('#E4CFA6',-22), cs=['#DB7814','#819C35','#C0662B','#DB7814'];
  const pk=(x,c)=>`<rect x="${x}" y="12" width="23" height="40" rx="4" fill="#fff" stroke="${INK}" stroke-width="1.6"/><rect x="${x+4}" y="17" width="6.5" height="6.5" rx="1.5" fill="${c}"/><rect x="${x+12.5}" y="17" width="6.5" height="6.5" rx="1.5" fill="${c}"/><rect x="${x+4}" y="25.5" width="6.5" height="6.5" rx="1.5" fill="${c}"/><rect x="${x+12.5}" y="25.5" width="6.5" height="6.5" rx="1.5" fill="${c}"/>`;
  return `<svg class="pack-explainer__box" viewBox="0 0 140 108" aria-hidden="true">
    <path d="M14 30 H126 V50 H14 Z" fill="${inside}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M14 30 L4 20 L30 16 L40 30" fill="${kraft}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M126 30 L136 20 L110 16 L100 30" fill="${kraft}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    ${cs.map((c,i)=>pk(20+i*26,c)).join('')}
    <rect x="10" y="44" width="120" height="60" rx="5" fill="${kraft}" stroke="${INK}" stroke-width="1.8"/>
    <rect x="42" y="62" width="56" height="24" rx="5" fill="#FBF7F0" stroke="${INK}" stroke-opacity=".5" stroke-width="1.2"/>
    <text x="70" y="80" text-anchor="middle" font-family="Funflare, sans-serif" font-size="15" letter-spacing=".5" fill="${INK}">FITO</text></svg>`;}
document.getElementById('boxEqArt').innerHTML=
  `<div class="pack-explainer__cubes pack-explainer__cubes--packs">${['#DB7814','#819C35','#C0662B','#DB7814'].map(packTile).join('')}</div>
   <span class="pack-explainer__sign">=</span>
   <div class="pack-explainer__result">${boxGlyph()}</div>`;

document.getElementById('flavCards').innerHTML=FLAVOURS.map(f=>`
  <article class="flavour-card">
    <div class="flavour-card__body">
      <div class="flavour-card__mascot">${CUBEIMG[f.c]?`<img src="${CUBEIMG[f.c]}" alt="${f.name} soup cube character" width="120" height="120">`:''}</div>
      <div class="flavour-card__tag">${f.tag}</div>
      <div class="flavour-card__name" style="color:${shade(f.c,-38)}">${nameArt(f)}</div>
      <div class="flavour-card__sub">${f.sub}${f.ar?` <span class="flavour-card__arabic" lang="ar">· ${f.ar}</span>`:''}</div>
      <p>${f.desc}</p>
      ${f.ing?`<div class="flavour-card__ingredients">
        <div class="flavour-card__ing-label">Ingredients</div>
        <p>${f.ing}</p>
        <div class="flavour-card__diet">${f.diet.map(d=>`<span>${d}</span>`).join('')}${f.note?`<span class="flavour-card__diet-warn">${f.note}</span>`:''}</div>
      </div>`:`<div class="flavour-card__ingredients"><p class="flavour-card__soon">Recipe still being finalised. Ingredients will be listed before launch.</p></div>`}
    </div>
  </article>`).join('');

let prevTops=0;
let prevQty={};
function cubeGroup(c){const top=shade(c,30),right=shade(c,-24);
  const one=`<svg viewBox="18 18 84 88" aria-hidden="true"><g stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"><path d="M60 22 L98 43 L60 64 L22 43 Z" fill="${top}"/><path d="M22 43 L60 64 L60 102 L22 81 Z" fill="${c}"/><path d="M98 43 L98 81 L60 102 L60 64 Z" fill="${right}"/></g></svg>`;
  return one+one+one+one;}
function renderBox(){
  const host=document.getElementById('boxArt'); if(!host) return;
  const avail=FLAVOURS.filter(f=>f.avail);
  const total=avail.reduce((a,f)=>a+qty[f.id],0);
  const tcount=TOPPINGS.reduce((a,t)=>a+(tops[t.id]||0),0);
  const rows=avail.filter(f=>qty[f.id]>0).map(f=>{
    const n=qty[f.id], before=prevQty[f.id]||0, grew=n>before;
    const groups=Array.from({length:n},(_,i)=>`<span class="box-art__pack${i>=before?' is-new':''}" style="${i>=before?`animation-delay:${(i-before)*60}ms`:''}">${cubeGroup(f.c)}</span>`).join('');
    return `<div class="box-art__row"><div class="box-art__main"><div class="box-art__name" style="color:${shade(f.c,-38)}">${nameArt(f)}</div><div class="box-art__packs">${groups}</div></div>
      <div class="box-art__count"><b>${n}</b> pack${n>1?'s':''}</div></div>`;
  }).join('');
  const tBefore=prevTops||0;
  const topRow=tcount?`<div class="box-art__row box-art__row--toppings"><div class="box-art__main"><div class="box-art__name">Croutons</div><div class="box-art__packs">${Array.from({length:tcount},(_,i)=>`<span class="box-art__bag${i>=tBefore?' is-new':''}">${miniBag(22)}</span>`).join('')}</div></div><div class="box-art__count"><b>${tcount}</b> bag${tcount>1?'s':''}</div></div>`:'';
  // empty slots still to fill: up to the minimum, then up to the next subscriber saving
  const tiersUp=[...TIERS].sort((a,b)=>a.min-b.min);
  const nextT=tiersUp.find(t=>t.min>total);
  let need=0, label='';
  if(total<MIN){ need=MIN-total; label=total===0?'Fill 4 to start':`${need} more to go`; }
  else if(mode==='sub'&&nextT){ need=nextT.min-total; label=`${need} more for ${Math.round(nextT.pct*100)}% off`; }
  const ghosts=need?`<div class="box-art__row box-art__row--ghost"><div class="box-art__main"><div class="box-art__packs">${Array.from({length:Math.min(need,8)},()=>'<span class="box-art__pack box-art__pack--ghost"></span>').join('')}</div></div>
      <div class="box-art__count box-art__count--ghost">${label}</div></div>`:'';
  host.innerHTML = `<div class="box-art__box"><div class="box-art__lineup">${rows}${topRow}${ghosts}</div></div>`+
    (total||tcount?`<div class="box-art__total"><span>Your box</span><span><b>${total}</b> pack${total===1?'':'s'}${tcount?` · ${tcount} bag${tcount>1?'s':''} of croutons`:''}</span></div>`:'');
  const da=document.getElementById('dockArt');
  if(da) da.innerHTML = avail.filter(f=>qty[f.id]>0).map(f=>`<span class="box-dock__chip${(qty[f.id]>(prevQty[f.id]||0))?' is-hopping':''}"><img src="${CUBEIMG[f.c]||''}" alt=""><i>${qty[f.id]}</i></span>`).join('') || '<span class="box-dock__empty">Empty</span>';
  prevQty=Object.fromEntries(avail.map(f=>[f.id,qty[f.id]])); prevTops=tcount;
}
function renderSizes(){
  const n=Object.values(qty).reduce((a,b)=>a+b,0);
  const el=document.getElementById('sizeRow'); if(!el) return;
  const tiers=[...TIERS].sort((a,b)=>a.min-b.min);
  const top=tiers[tiers.length-1].min;
  const pts=[[0,0]].concat(tiers.map((t,i)=>[t.min,16+i*(68/(tiers.length-1))]));
  const pos=v=>{ if(v>=top) return Math.min(94,pts[pts.length-1][1]+(v-top)*1.2);
    for(let i=1;i<pts.length;i++){const[a,pa]=pts[i-1],[b,pb]=pts[i]; if(v<=b) return pa+(v-a)/(b-a)*(pb-pa);} return 84; };
  const sub=mode==='sub';
  const shown=sub?tiers:tiers.slice(0,1);
  const stops=shown.map((t,i)=>`<div class="savings-track__stop${n>=t.min?' is-reached':''}" style="left:${pts[i+1][1]}%"><i></i><span><b>${t.min}${t.min===top?'+':''}</b>${sub?`<br>${Math.round(t.pct*100)}% off`:'<br>minimum'}</span></div>`).join('');
  const next=tiers.find(t=>t.min>n);
  let msg;
  if(n<MIN) msg=n===0?'Add at least 4 packs to start.':`Add ${MIN-n} more pack${MIN-n>1?'s':''} to reach the minimum.`;
  else if(!sub) msg=`${n} packs. Add as many as you like.`;
  else if(next) msg=`${next.min-n} more for ${Math.round(next.pct*100)}% off.`;
  else msg=`Top saving, ${Math.round(tiers[tiers.length-1].pct*100)}% off. Add as many as you like.`;
  el.innerHTML=`<div class="savings-track__rail"><div class="savings-track__line"></div><div class="savings-track__fill" style="width:${pos(n)}%"></div>${stops}
    <div class="savings-track__marker" style="left:${Math.max(pos(n),5)}%">${n} in box</div></div>
    <div class="savings-track__message${n>=MIN?' is-ok':''}">${msg}</div>`;
}

document.getElementById('picker').innerHTML=FLAVOURS.map(f=>f.avail?`
  <div class="box-picker-row">
    <div class="box-picker-row__thumb">${cube(f.c,64)}</div>
    <div>
      <div class="box-picker-row__name" style="color:${shade(f.c,-38)}">${nameArt(f)}</div>
      <div class="box-picker-row__meta">${money(PRICE).replace(' ','&nbsp;')} a&nbsp;pack · ${CUBES}&nbsp;cubes · ${SERV}&nbsp;bowls</div>
      <details class="ingredients-toggle"><summary>Ingredients</summary><p>${f.ing}<br><em>${f.diet.join(' · ')}${f.note?' · '+f.note:''}</em></p></details>
    </div>
    <div class="qty-stepper">
      <button data-m="${f.id}" aria-label="One less ${f.name}">−</button>
      <span class="qty-stepper__count" id="q-${f.id}">0</span>
      <button data-p="${f.id}" aria-label="One more ${f.name}">+</button>
    </div>
  </div>`:`
  <div class="box-picker-row box-picker-row--soon">
    <div class="box-picker-row__thumb">${cube(f.c,64)}</div>
    <div>
      <div class="box-picker-row__name" style="color:${shade(f.c,-38)}">${nameArt(f)}</div>
      <div class="box-picker-row__meta">${f.sub} · arriving for Ramadan</div>
      ${f.ing?`<details class="ingredients-toggle"><summary>Ingredients</summary><p>${f.ing}<br><em>${f.diet.join(' · ')}</em></p></details>`:''}
    </div>
    <span class="box-picker-row__soon-tag">Coming soon</span>
  </div>`).join('');

document.getElementById('toppings').innerHTML=`<h3 class="box-addons__title">Add-ons</h3>`+TOPPINGS.map(t=>`
  <div class="box-picker-row box-picker-row--addon">
    <div class="box-picker-row__thumb">${croutonArt(64)}</div>
    <div>
      <div class="box-picker-row__name"><span class="brand-word">${t.name}</span></div>
      <div class="box-picker-row__meta">${money(t.price)} a bag</div>
      <details class="ingredients-toggle"><summary>Ingredients</summary><p>${t.note}<br><em>${t.allerg}</em></p></details>
    </div>
    <div class="qty-stepper">
      <button data-tm="${t.id}" aria-label="One less ${t.name}">−</button>
      <span class="qty-stepper__count" id="t-${t.id}">0</span>
      <button data-tp="${t.id}" aria-label="One more ${t.name}">+</button>
    </div>
  </div>`).join('');

document.getElementById('picker').addEventListener('click',e=>{
  const p=e.target.dataset.p,m=e.target.dataset.m;
  if(p) qty[p]++; if(m&&qty[m]>0) qty[m]--;
  if(p||m) render();
});
document.getElementById('toppings').addEventListener('click',e=>{
  const p=e.target.dataset.tp,m=e.target.dataset.tm;
  if(p) tops[p]++; if(m&&tops[m]>0) tops[m]--;
  if(p||m) render();
});
document.getElementById('tSub').onclick=()=>{mode='sub';setSeg();applySlots();};
document.getElementById('tOne').onclick=()=>{mode='one';setSeg();applySlots();};
function setSeg(){
  document.getElementById('tSub').setAttribute('aria-pressed',mode==='sub');
  document.getElementById('tOne').setAttribute('aria-pressed',mode==='one');
  document.getElementById('segNote').textContent = mode==='sub'
    ? 'Your soupscription: a box every 4 weeks. Skip, pause or cancel up to 3 days before a delivery.'
    : 'A single delivery. No commitment, no discount.';
  document.getElementById('dayLabel').textContent = mode==='sub' ? 'First delivery' : 'Delivery day';
}
function render(){
  const n=Object.values(qty).reduce((a,b)=>a+b,0);
  FLAVOURS.filter(f=>f.avail).forEach(f=>{
    document.getElementById('q-'+f.id).textContent=qty[f.id];
    document.querySelector(`[data-m="${f.id}"]`).disabled=qty[f.id]===0;
  });
  let topTotal=0,topCount=0;
  TOPPINGS.forEach(t=>{
    document.getElementById('t-'+t.id).textContent=tops[t.id];
    document.querySelector(`[data-tm="${t.id}"]`).disabled=tops[t.id]===0;
    topTotal+=tops[t.id]*t.price; topCount+=tops[t.id];
  });
  const sub=n*PRICE,pct=mode==='sub'?discountFor(n):0,save=sub*pct,del=n?delFor(mode):0,total=sub-save+topTotal+del;
  document.getElementById('capLine').textContent=n
    ?`${n} pack${n>1?'s':''} · ${n*CUBES} cubes · about ${n*SERV} bowls`+(topCount?` · ${topCount} add-on${topCount>1?'s':''}`:'')
    :'Nothing in it yet';
  const mc=document.getElementById('mixCount');
  if(mc) mc.textContent='';
  const ml=document.getElementById('mixList');
  const chosen=FLAVOURS.filter(f=>qty[f.id]>0);
  const tchosen=TOPPINGS.filter(t=>tops[t.id]>0);
  if(chosen.length||tchosen.length){
    ml.hidden=false;
    ml.innerHTML=chosen.map(f=>`<li><span class="box-summary__mix-dot" style="background:${f.c}"></span>${f.name}<span class="box-summary__mix-count">${qty[f.id]}</span></li>`).join('')
      +tchosen.map(t=>`<li><span class="box-summary__mix-dot" style="background:#D9B36A"></span>${t.name}<span class="box-summary__mix-count">${tops[t.id]}</span></li>`).join('');
  } else ml.hidden=true;
  document.getElementById('sSub').textContent=money(sub);
  document.getElementById('sSaveRow').hidden=pct===0;
  document.getElementById('sPct').textContent=pct?`(${Math.round(pct*100)}%)`:'';
  document.getElementById('sSave').textContent='−'+money(save);
  document.getElementById('sTopRow').hidden=topCount===0;
  document.getElementById('sTop').textContent=money(topTotal);
  document.getElementById('sDel').textContent=mode==='sub'?'Free for early subscribers':money(DELIVERY);
  document.getElementById('sTotal').textContent=money(total);
  document.getElementById('sPer').textContent=n?money((sub-save)/(n*SERV))+' a bowl':'';
  const btn=document.getElementById('addBtn');
  if(n<MIN){btn.disabled=true;btn.textContent=n===0?'Add four packs to start':`Add ${MIN-n} more to continue`;}
  else if(slotsState==='loading'){btn.disabled=true;btn.textContent='Checking free times…';}
  else{btn.disabled=false;btn.textContent=mode==='sub'?'Reserve my soupscription':'Reserve this box';}
  renderSizes();
  renderBox();
  syncBox();
  const dc=document.getElementById('dockCount'), ds2=document.getElementById('dockSub'), db=document.getElementById('dockBtn');
  if(dc){
    dc.textContent = n ? `${n} pack${n>1?'s':''}` : 'Your box is empty';
    ds2.textContent = n===0 ? 'Minimum 4 packs' : n<MIN ? `Add ${MIN-n} more to continue` : `${money(total)} · about ${n*SERV} bowls`;
    db.textContent = n>=MIN ? 'Reserve' : 'See box';
  }
  const ff=document.getElementById('founderFlag'); if(ff) ff.hidden = mode!=='sub';
  const sl=document.getElementById('schedLine');
  if(mode==='sub'){
    const ds=scheduleDates();
    sl.hidden=false;
    sl.innerHTML=`First box <b>${fmt(ds[0])}</b>, ${slot}. Then <b>${fmt(ds[1])}</b> and <b>${fmt(ds[2])}</b>. A reminder goes out three days before each delivery, and you can skip it or change the flavours.`;
  } else { sl.hidden=false; sl.innerHTML=`Delivered <b>${fmt(DAYS[firstIdx])}</b>, ${slot}.`; }
  const nudge=document.getElementById('nudge');
  const next=TIERS.filter(t=>t.min>n).sort((a,b)=>a.min-b.min)[0];
  if(mode==='sub'&&n>=MIN&&n<6){
    nudge.hidden=false;
    nudge.textContent=`Add ${6-n} more pack${6-n>1?'s':''} and your saving rises to 12%.`;
  }else if(mode==='sub'&&next&&n>=MIN){
    nudge.hidden=false;
    nudge.textContent=`Add ${next.min-n} more pack${next.min-n>1?'s':''} and your saving goes from ${Math.round(pct*100)}% to ${Math.round(next.pct*100)}%.`;
  }else nudge.hidden=true;
  document.getElementById('terms').textContent=mode==='sub'?'No payment today. Then a box every 4 weeks: skip, pause or cancel up to 3 days before a delivery.':'No payment today. One box, delivered once.';
}
(function(){
  const dock=document.getElementById('dock'), sec=document.getElementById('build'), sum=document.getElementById('summary');
  if(!dock||!sec||!('IntersectionObserver' in window)) return;
  let inSec=false, sumVis=false;
  const upd=()=>dock.classList.toggle('is-visible', inSec && !sumVis);
  new IntersectionObserver(es=>{ inSec=es[0].isIntersecting; upd(); },{threshold:0}).observe(sec);
  new IntersectionObserver(es=>{ sumVis=es[0].isIntersecting; upd(); },{threshold:0.15}).observe(sum);
  document.getElementById('dockBtn').onclick=()=>sum.scrollIntoView({behavior:'smooth',block:'start'});
})();
// The cart always mirrors the builder, so the Box count in the header goes up and down with every tap.
// A reservation already made stays marked only while the box is exactly the same.
function syncBox(){
  const n=Object.values(qty).reduce((a,b)=>a+b,0);
  const tt=TOPPINGS.reduce((a,t)=>a+tops[t.id]*t.price,0);
  if(!n&&!tt){ if(box){box=null;saveBox();} updateCart(); return; }
  const pct=mode==='sub'?discountFor(n):0, del=delFor(mode);
  const next={mode,items:{...qty},tops:{...tops},packs:n,del,total:n*PRICE*(1-pct)+tt+del,pct,freq,slot,first:DAYS[firstIdx].toISOString()};
  if(box&&box.reserved&&JSON.stringify({...box,reserved:undefined})===JSON.stringify(next)) next.reserved=true;
  box=next; saveBox(); updateCart();
}
document.getElementById('addBtn').onclick=()=>{
  const n=Object.values(qty).reduce((a,b)=>a+b,0);
  if(n<MIN) return;
  syncBox();openDrawer();showReserveForm();
};
// The early subscriber button opens the builder on a soupscription, since the perks come with one.
document.getElementById('earlyCta').addEventListener('click',()=>{mode='sub';setSeg();render();});

const REVIEWS=[
  ["I am literally just sitting down having my bowl of Fito. And omg. I have no notes.","Derv"],
  ["The soup is amazing. No notes. It's delicious. And flavors are poppin.","Sarah"],
  ["It's sooooo good. I can have it every day. We're obsessed, once a week.","Dalia"],
  ["Caramel is a 1000/10. Insanely good, and I'm usually not a fan of these flavours.","Tiffany"],
  ["This is my favourite flavour combo of all time. Jamie also LOVES it.","Derv"],
  ["Had the Green Goddess for lunch, sooooooo good!!! And easy. And quick.","Haya"],
  ["UNREALLLLL. Wow wow.","Diala"],
  ["YUUUUUUMMMM. Currently inhaling this.","Talya"],
  ["When can we order more?","Derv"],
  ["Caramel feels like a warm hug. Green Goddess lifts the appetite.","Rae"],
  ["Didn't think I would love the green one. I loved it.","Dalia"]
];
const track=document.getElementById('track');
if(track){
  const cards=REVIEWS.map(([q,w])=>`<figure class="review-card"><p>“${q}”</p><figcaption class="review-card__who">${w}</figcaption></figure>`).join('');
  // The moving strip needs the cards twice to loop. Where visitors swipe instead, show each card once.
  const swipe=matchMedia('(prefers-reduced-motion:reduce),(hover:none),(pointer:coarse)').matches;
  track.innerHTML=swipe?cards:cards+cards;
}

// When the visitor empties their box from the cart drawer, reset the builder too.
document.addEventListener('fito:box-emptied',()=>{
  qty=Object.fromEntries(FLAVOURS.map(f=>[f.id,0]));tops=Object.fromEntries(TOPPINGS.map(t=>[t.id,0]));
  render();
});

// Restore a box saved earlier in this browser (cart.js has already loaded it).
if(box&&box.items){
  qty={...qty,...box.items};if(box.tops)tops={...tops,...box.tops};mode=box.mode||'sub';
  const fi=DAYS.findIndex(d=>isoDay(d)===isoDay(new Date(box.first)));
  if(fi>=0){ firstIdx=fi; calMonth=monthOf(DAYS[fi]); if(box.slot) slot=box.slot; }
}
setSeg();applySlots();updateCart();loadSlots();
