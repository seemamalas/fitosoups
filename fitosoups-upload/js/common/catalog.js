/* Products, prices and delivery rules. Shared by the box builder and the cart. */
const PRICE=45, MIN=4, CUBES=4, SERV=2, DELIVERY=15;
// Delivery: free for early subscribers (the first fifty), AED 15 on every other box.
const delFor=m=>m==='sub'?0:DELIVERY;

const FLAVOURS=[
  {id:'caramel',name:'Caramel',c:'#D3803C',sub:'Sweet potato & butternut squash',tag:'Best seller',avail:true,
   desc:'Velvety and naturally sweet, warmed through with cinnamon and nutmeg.',
   ing:'Sweet potato, butternut squash, red onion, honey, cinnamon, nutmeg, olive oil, salt, black pepper.',
   diet:['Vegetarian','No gluten'],note:'Contains honey',ar:''},
  {id:'green',name:'Green Goddess',c:'#6F7B4F',sub:'Pea, courgette & broccoli',tag:'Fan favourite',avail:true,
   desc:'Bright and green, finished with a lift of lemon that keeps it fresh.',
   ing:'Peas, zucchini, broccoli, leek, white onion, shallots, olive oil, salt, black pepper, lemon juice.',
   diet:['Vegan','No gluten'],note:'',ar:''},
  {id:'addas',name:"B'addass",c:'#AD7A22',sub:'Red lentil with cumin',tag:'TETA LOVES THIS',avail:true,
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
