/* Products, prices and delivery rules. Shared by the box builder and the cart. */
const PRICE=45, MIN=4, CUBES=4, SERV=2, DELIVERY=15;
// How a soupscription is paid. 'go': box by box, at least SUB_MIN_BOXES boxes.
// 'p6': six boxes paid up front, with an extra saving on top of the subscriber saving.
// legal.js has the same rules in the terms.
const SUB_MIN_BOXES=2, PREPAY_PAUSES=2;
const PLANS={go:{boxes:0,extra:0},p6:{boxes:6,extra:.05}};
const planOf=b=>PLANS[(b&&b.plan)||'go']||PLANS.go;
const round2=x=>Math.round(x*100)/100;
// Deliveries per time slot. The sheet sends the live number back, so it can change there too.
const SLOT_LIMIT=4;
// Delivery days and their time slots (0 = Sunday ... 6 = Saturday). Saturdays and Sundays have all three;
// Mondays, Wednesdays and Thursdays the evening only; no deliveries on Tuesdays or Fridays.
// google-sheet-script.gs has the same rules and refuses anything else.
const SLOT_TIMES=['8:00 to 10:00','13:00 to 15:00','19:00 to 21:00'];
const DAY_SLOTS={6:SLOT_TIMES,0:SLOT_TIMES,1:['19:00 to 21:00'],3:['19:00 to 21:00'],4:['19:00 to 21:00']};
// Nothing before launch day, always at least a week after the day someone books, and up to 4 weeks ahead.
const LAUNCH_DAY=new Date(2026,10,7), LEAD_DAYS=7, BOOK_AHEAD_DAYS=28;
// The days a booking takes a place in its slot: a soupscription comes back every 4 weeks,
// so it needs room then too (the sheet checks the same three).
const slotDays=(mode,first)=>Array.from({length:mode==='sub'?3:1},(_,k)=>{const d=new Date(first);d.setDate(d.getDate()+28*k);return d;});
// Delivery: free for early subscribers (the first fifty), AED 15 on every other box.
const delFor=m=>m==='sub'?0:DELIVERY;

const FLAVOURS=[
  {id:'caramel',name:'Caramel',c:'#DB7814',sub:'Sweet potato & butternut squash',tag:'Best seller',avail:true,
   desc:'Velvety and naturally sweet, warmed through with cinnamon and nutmeg.',
   ing:'Butternut squash, water, sweet potato, red onion, honey, olive oil, salt, cinnamon, nutmeg, black pepper.',
   diet:['Vegetarian','No gluten'],note:'Contains honey',ar:''},
  {id:'green',name:'Green Goddess',c:'#819C35',sub:'Pea, broccoli & basil',tag:'Fan favourite',avail:true,
   desc:'Bright and green: sweet peas, broccoli and fresh basil. Best with a squeeze of lemon.',
   ing:'Peas, water, white onion, broccoli, courgette, olive oil, basil, salt, black pepper.',
   diet:['Vegan','No gluten'],note:'',ar:''},
  {id:'addas',name:"B'addass",c:'#C0662B',sub:'Red lentil with cumin',tag:'TETA LOVES THIS',avail:true,
   desc:'Red lentils, carrot and cumin, with a little rice for body.',
   ing:'Water, red onion, red lentils, carrot, rice, olive oil, salt, cumin, white pepper, black pepper.',
   diet:['Vegan','No gluten'],note:'',ar:'عدس'}
];
const TOPPINGS=[
  // name stays 'Croutons': it is the column in the sheet. label is what customers see.
  {id:'croutons',name:'Croutons',label:'Crunch',desc:'Sourdough parmesan croutons',price:15,sub:'Homemade, per bag',
   note:'Sourdough bread (wheat flour, water, salt), olive oil, parmesan cheese (milk), salt, black pepper',allerg:'Contains wheat (gluten) and milk'}
];
// Subscriber savings: the bigger the box, the bigger the discount.
const TIERS=[{min:16,pct:.18},{min:10,pct:.15},{min:6,pct:.12},{min:4,pct:.08}];
const discountFor=n=>{for(const t of TIERS) if(n>=t.min) return t.pct; return 0;};
