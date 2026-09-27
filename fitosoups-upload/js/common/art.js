/* Illustrations: cube characters, flavour name artwork and small SVG drawings.
   Shared by the home page and the cart drawer. */

// Cube character per flavour colour, and the Funflare flavour-name artwork per flavour id.
const CUBEIMG={
  '#D3803C':'assets/images/cubes/caramel.webp',
  '#6F7B4F':'assets/images/cubes/green-goddess.webp',
  '#AD7A22':'assets/images/cubes/baddass.webp'
};
const NAMEIMG={
  addas:'assets/images/names/baddass.webp',
  green:'assets/images/names/green-goddess.webp',
  caramel:'assets/images/names/caramel.webp'
};
const nameArt=f=>NAMEIMG[f.id]?`<img class="flavour-name-img" src="${NAMEIMG[f.id]}" alt="${f.name}">`:f.name;

function cube(c,s){
  if(CUBEIMG[c]) return `<svg viewBox="0 0 120 120" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><image href="${CUBEIMG[c]}" x="0" y="0" width="120" height="120" preserveAspectRatio="xMidYMid meet"/></svg>`;
  const top=shade(c,30), right=shade(c,-24);
  return `<svg viewBox="0 0 120 120" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g stroke="${INK}" stroke-width="1.9" stroke-linejoin="round">
      <path d="M60 22 L98 43 L60 64 L22 43 Z" fill="${top}"/>
      <path d="M22 43 L60 64 L60 102 L22 81 Z" fill="${c}"/>
      <path d="M98 43 L98 81 L60 102 L60 64 Z" fill="${right}"/>
    </g>
    <path d="M34 47 L46 54" stroke="${shade(c,58)}" stroke-width="2.6" stroke-linecap="round" opacity=".6"/>
  </svg>`;
}
function bowl(c,s){
  const seed=shade(c,-58);
  return `<svg viewBox="0 0 200 200" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="100" cy="100" r="94" fill="none" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="100" cy="100" r="78" fill="${c}"/>
    <g fill="${seed}" opacity=".55">
      <ellipse cx="66" cy="76" rx="4" ry="2.6" transform="rotate(-24 66 76)"/>
      <ellipse cx="134" cy="80" rx="4" ry="2.6" transform="rotate(18 134 80)"/>
      <ellipse cx="124" cy="132" rx="4" ry="2.6" transform="rotate(-40 124 132)"/>
      <ellipse cx="74" cy="128" rx="3.6" ry="2.3" transform="rotate(32 74 128)"/>
    </g>
  </svg>`;
}
function miniBag(w){
  const c='#D9B36A';
  const sq=(x,y,s,f,r)=>`<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="3" fill="${f}" stroke="${INK}" stroke-width="1.6" transform="rotate(${r} ${x+s/2} ${y+s/2})"/>`;
  return `<svg viewBox="0 0 90 108" width="${w}" height="${w*108/90}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M14 16 H76 L82 101 A4 4 0 0 1 78 105 H12 A4 4 0 0 1 8 101 Z" fill="#FBF8F1" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M14 16 L19 5 H71 L76 16 Z" fill="${shade(c,26)}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M12 42 H78" stroke="${INK}" stroke-width="1.4" opacity=".4"/>
    ${sq(23,54,21,c,-12)}
    ${sq(46,50,21,shade(c,18),9)}
    ${sq(36,74,19,shade(c,-14),14)}
  </svg>`;
}
function croutonArt(s){
  const c='#D9B36A';
  return `<svg viewBox="0 0 120 110" width="${s}" height="${s*0.92}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g stroke="${INK}" stroke-width="1.8" stroke-linejoin="round">
      <rect x="18" y="52" width="30" height="30" rx="5" fill="${c}" transform="rotate(-12 33 67)"/>
      <rect x="50" y="44" width="30" height="30" rx="5" fill="${shade(c,18)}" transform="rotate(9 65 59)"/>
      <rect x="72" y="62" width="28" height="28" rx="5" fill="${shade(c,-16)}" transform="rotate(-6 86 76)"/>
      <rect x="40" y="70" width="26" height="26" rx="5" fill="${shade(c,8)}" transform="rotate(16 53 83)"/>
    </g>
  </svg>`;
}
