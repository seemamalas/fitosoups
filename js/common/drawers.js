/* Slide-in panels (cart and legal) and the dimmed backdrop behind them. */
const scrim=document.getElementById('scrim'),drawer=document.getElementById('drawer');
function openDrawer(){drawer.classList.add('is-open');scrim.classList.add('is-open');drawer.setAttribute('aria-hidden','false');}
function closeDrawer(){drawer.classList.remove('is-open');scrim.classList.remove('is-open');drawer.setAttribute('aria-hidden','true');}
document.getElementById('cartOpen').onclick=()=>{updateCart(true);openDrawer();};
document.getElementById('dclose').onclick=closeDrawer;
scrim.onclick=function(){closeDrawer();closeLegal();};
addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
