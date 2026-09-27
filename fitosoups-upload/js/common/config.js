/* Site settings, generated from site.config.json by build.mjs.
   To rename the site, edit SITE_NAME in site.config.json and run the build.
   Do not edit the value here: it is overwritten on every build. */
const SITE_NAME = "FITO Soups";
const SITE_URL = "https://fitosoups.com";
/* Where early reservations are sent (see js/common/reserve.js). Empty = preview mode. */
const WAITLIST_URL = "https://script.google.com/macros/s/AKfycbx-CN903lkPbO2yXMGGQ22BQ9b5lyvQwjCmlWtKP15uNa69neJlCp6YQuztqn1mmpZU/exec";
/* Link to the home page from any page ('' on the home page itself). */
const HOME_URL = document.documentElement.dataset.home || '';
