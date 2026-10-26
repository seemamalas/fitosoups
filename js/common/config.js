/* Site settings, generated from site.config.json by build.mjs.
   To rename the site, edit SITE_NAME in site.config.json and run the build.
   Do not edit the value here: it is overwritten on every build. */
const SITE_NAME = "FITO Soups";
const SITE_URL = "https://fitosoups.com";
/* Where early reservations are sent (see js/common/reserve.js). Empty = preview mode. */
/* Card and Apple Pay checkout: The CO Kitchens' Stripe payment link (the customer types the amount).
   Each customer gets their own copy with their email and booking reference added (see reserve.js). */
const PAY_URL = "https://payments.thecokitchens.com/b/00w5kEffjc9mfPNcCffw50a";
const WAITLIST_URL = "https://script.google.com/macros/s/AKfycbx-CN903lkPbO2yXMGGQ22BQ9b5lyvQwjCmlWtKP15uNa69neJlCp6YQuztqn1mmpZU/exec";
/* Link to the home page from any page ('' on the home page itself). */
const HOME_URL = document.documentElement.dataset.home || '';
