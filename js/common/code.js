/* Update 54: FitR codes ("Have a code?" on the box builder).
   FitR members unlock single-use codes in the FitR app. The code is checked by the Google Sheet
   (the "FitR codes" tab) when they press Apply, and again, for good, when they book.
   One code per order, saved on the box as box.code = {code, reward, id, packs, text}.
     first  First order     1 free pack (our pick) with a first box of 4 packs or more. New customers only.
     sub    Subscription    2 free packs (our pick) with a first Soupscription box. New subscribers only.
     box    Free FITO box   a free one-time box of 4 packs, AED 0, delivery included. No subscription. */

/* Whether the code works with this box. Returns '' when it does, otherwise why not ('fit'). */
function codeFits(c,b){
  if(!c||!b) return 'none';
  if((b.packs||0)<MIN) return 'fit';
  if(c.id==='first') return '';
  if(c.id==='sub') return b.mode==='sub'?'':'fit';
  if(c.id==='box'){ const tops=Object.values(b.tops||{}).reduce((a,n)=>a+n,0); return b.mode!=='sub'&&b.packs===4&&!tops?'':'fit'; }
  return 'fit';
}
const codeOn=b=>!!(b&&b.code&&!codeFits(b.code,b));
const codeIsFreeBox=b=>codeOn(b)&&b.code.id==='box';

/* Update 55: what to do next so the code works on this box, in plain words ('' when it already works). */
function codeHint(c,b){
  const n=b.packs||0, tops=Object.values(b.tops||{}).reduce((a,x)=>a+x,0), more=k=>`${k} more pack${k>1?'s':''}`;
  if(c.id==='box'){
    if(b.mode==='sub') return 'Your free box is a one-time box. Choose One-time box above to use your code.';
    if(n<4) return n?`Pick ${more(4-n)} for your free box: 4 packs, any flavours.`:'Now pick any 4 packs for your free box.';
    if(n>4) return `Your free box holds 4 packs. Take out ${n-4} to use your code.`;
    if(tops) return "Crunch isn't part of the free box. Take it out to use your code.";
    return '';
  }
  if(c.id==='sub'){
    if(b.mode!=='sub') return 'Your 2 free packs come with a Soupscription. Choose Soupscription above to use your code.';
    if(n<MIN) return n?`Pick ${more(MIN-n)} to start your Soupscription.`:`Now pick at least ${MIN} packs for your Soupscription.`;
    return '';
  }
  return n<MIN?(n?`Pick ${more(MIN-n)} to use your code.`:`Now pick at least ${MIN} packs to use your code.`):'';
}
/* What the code gives, in a few words, for the box summary and the cart. */
function codeGift(c){
  return c.id==='box'?'Free FITO box':c.id==='sub'?'2 free packs':'1 free pack';
}

/* Short, friendly messages. The visitor can always book without the code. */
function codeMessage(why,c){
  const id=c&&c.id;
  switch(why){
    case 'unknown': return "We don't recognise that code. Check it and try again, or book without it.";
    case 'used': return 'That code has already been used. You can still book without it.';
    case 'expired': return 'That code has expired. You can still book without it.';
    case 'new': return id==='sub'
      ? "This code is for new subscribers, and we found an earlier Soupscription with your phone or email. You can still book without it."
      : "This code is for a first FITO order, and we found an earlier order with your phone or email. You can still book without it.";
    case 'fit': return id==='sub' ? 'This code works with a Soupscription. Choose Soupscription to use it, or book without it.'
      : id==='box' ? 'This code is for a one-time box of 4 packs, without add-ons. Set your box to that to use it.'
      : 'This code needs a box of 4 packs or more.';
    case 'dubai': return 'FitR codes are for deliveries in Dubai.';
    case 'once': return "FitR codes are one per person, and we found an earlier FitR order with your phone or email. You can still book without it.";
    default: return "We couldn't check your code just now. Please try again in a moment.";
  }
}

/* Asks the sheet about a code. Resolves {ok:true, code, reward, id, packs, text} or {ok:false, why}. */
function checkCode(raw){
  const code=String(raw||'').trim().toUpperCase().replace(/\s+/g,'').slice(0,40);
  if(!code) return Promise.resolve({ok:false,why:'unknown'});
  return askSheet({action:'code',code},8000)
    .then(d=>d&&d.ok?{ok:true,code:d.code||code,reward:d.reward,id:d.id,packs:d.packs,text:d.text}:{ok:false,why:(d&&d.why)||'error'})
    .catch(()=>({ok:false,why:'error'}));
}
