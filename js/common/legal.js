/* Terms, privacy and accessibility panels, opened from the footer links (data-legal="..."). */
const LEGAL={
 terms:{t:'Terms & Conditions',b:`
<h4>Who we are</h4>
<p>${SITE_NAME}, Dubai, United Arab Emirates. Contact us on Instagram at @fitosoups.</p>
<h4>Reservations</h4>
<p>Reserving a box or a soupscription on this site is free and is not yet an order. Before your delivery date we send you a payment link by email and WhatsApp, and your order is confirmed once it is paid. You can cancel a reservation at any time by messaging us.</p>
<h4>Ordering</h4>
<p>A pack contains four frozen soup cubes, about two servings. Prices are in UAE dirhams and include VAT where it applies. An order is confirmed once we accept it; if we cannot fulfil a flavour we will contact you and offer a swap or a refund.</p>
<h4>Subscriptions</h4>
<p>Subscription boxes are delivered every four weeks on the slot you choose. You can skip a delivery, change flavours or cancel at any time before your box is cooked, which is three days before the delivery date. Early subscriber pricing holds for as long as the subscription stays active.</p>
<h4>Delivery</h4>
<p>Delivery costs AED 15 a box. For our first fifty subscribers it is free on every box, for as long as they stay subscribed. For now we deliver only within Dubai. Orders with a delivery address outside Dubai will be cancelled and refunded in full. We deliver in a freezer vehicle, inside the two hour slot you select. Someone must be there to receive the box and put it straight into a freezer. If nobody is available and the soup cannot be handed over, we cannot replace it free of charge.</p>
<h4>Refunds</h4>
<p>Food is perishable, so we do not accept returns. If anything arrives damaged, defrosted or not as described, message us within twenty four hours with a photo and we will replace it or refund it.</p>
<h4>Allergens</h4>
<p>Ingredients are listed for every flavour. Soups are cooked in a kitchen that also handles dairy and wheat, so we cannot guarantee the absence of traces.</p>
<h4>Law</h4>
<p>These terms are governed by the laws of the United Arab Emirates.</p>`},
 privacy:{t:'Privacy Policy',b:`
<h4>What we collect</h4>
<p>Your name, delivery address, phone number, email address and what you ordered. Nothing else.</p>
<h4>Why</h4>
<p>To cook the right soup, deliver it to the right door, and tell you when your next box is coming. If you join the early subscriber list we will email you about the launch, and you can unsubscribe from any message.</p>
<h4>Payment</h4>
<p>When card payments go live they will be handled by Stripe, a licensed payment provider. Your card details go straight to Stripe, and FITO never sees or stores them.</p>
<h4>Sharing</h4>
<p>We do not sell your data. We share only what a delivery needs, and only with a delivery partner if we use one. Payment details are handled by Stripe under its own privacy policy.</p>
<h4>Keeping it</h4>
<p>Reservations are kept in a private spreadsheet that only FITO can open. We keep order records while your account is active and for as long as UAE tax rules require after that.</p>
<h4>Your choices</h4>
<p>Message us on Instagram at @fitosoups to see, correct or delete the information we hold about you.</p>`},
 access:{t:'Accessibility',b:`
<h4>What we aim for</h4>
<p>This site is built to be usable with a keyboard, with a screen reader, and at large text sizes, working towards WCAG 2.1 level AA.</p>
<h4>What is in place</h4>
<ul>
<li>Every control can be reached and operated with a keyboard.</li>
<li>Images that carry meaning have text descriptions.</li>
<li>Text sits on backgrounds chosen for contrast, and the layout reflows on small screens and at 200% zoom.</li>
<li>Headings follow a logical order so a screen reader can skim the page.</li>
</ul>
<h4>Known gaps</h4>
<p>The scrolling band of customer messages moves on its own. It pauses on hover and on focus, and the same messages are available as plain text on request.</p>
<h4>Tell us</h4>
<p>If something on this site is hard to use, message @fitosoups and we will fix it.</p>`}
};
const legalPanel=document.getElementById('legal');
function openLegal(k){
  const L=LEGAL[k]; if(!L) return;
  document.getElementById('legalTitle').textContent=L.t;
  document.getElementById('legalBody').innerHTML=L.b;
  legalPanel.classList.add('is-open'); scrim.classList.add('is-open');
  legalPanel.setAttribute('aria-hidden','false');
}
function closeLegal(){legalPanel.classList.remove('is-open');scrim.classList.remove('is-open');legalPanel.setAttribute('aria-hidden','true');}
document.querySelectorAll('[data-legal]').forEach(a=>{
  a.addEventListener('click',e=>{e.preventDefault();openLegal(a.getAttribute('data-legal'));});
});
document.getElementById('lclose').onclick=closeLegal;
