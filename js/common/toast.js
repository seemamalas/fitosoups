/* Short confirmation message at the bottom of the screen. */
let toastTimer;
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('is-visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('is-visible'),2600);}
