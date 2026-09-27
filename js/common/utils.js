/* Small helpers shared by every page. */
const INK='#3A2E22';

/* Lighten (amt > 0) or darken (amt < 0) a #RRGGBB colour. */
function shade(hex,amt){
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt;
  r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));
  return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
}

const money=n=>'AED '+n.toLocaleString('en-AE',{maximumFractionDigits:0});
const fmt=d=>d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
/* Full date for sentences, e.g. "Saturday 7 November 2026". */
const fmtLong=d=>d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
