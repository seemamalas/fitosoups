/* Products, prices and delivery rules. Shared by the box builder and the cart. */
const PRICE=45, MIN=4, CUBES=4, SERV=2, DELIVERY=15;
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
   ing:'Butternut squash, sweet potato, red onion, honey, cinnamon, nutmeg, olive oil, salt, black pepper.',
   diet:['Vegetarian','No gluten'],note:'Contains honey',ar:''},
  {id:'green',name:'Green Goddess',c:'#418344',sub:'Pea, courgette & broccoli',tag:'Fan favourite',avail:true,
   desc:'Bright and green, finished with a lift of lemon that keeps it fresh.',
   ing:'Peas, courgette, broccoli, leek, white onion, shallots, olive oil, salt, black pepper, lemon juice.',
   diet:['Vegan','No gluten'],note:'',ar:''},
  {id:'addas',name:"B'addass",c:'#C0662B',sub:'Red lentil with cumin',tag:'TETA LOVES THIS',avail:true,
   desc:'Red lentils, carrot and cumin, with a little rice for body.',
   ing:'Red lentils, red onion, carrot, rice, olive oil, cumin, white pepper, black pepper, salt.',
   diet:['Vegan','No gluten'],note:'',ar:'عدس'}
];
const TOPPINGS=[
  {id:'croutons',name:'Croutons',price:15,sub:'Homemade, per bag',
   note:'Sourdough, olive oil, salt, black pepper, parmesan',allerg:'Contains wheat and dairy'}
];
// Subscriber savings: the bigger the box, the bigger the discount.
const TIERS=[{min:16,pct:.18},{min:10,pct:.15},{min:6,pct:.12},{min:4,pct:.08}];
const discountFor=n=>{for(const t of TIERS) if(n>=t.min) return t.pct; return 0;};
