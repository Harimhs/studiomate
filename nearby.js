'use strict';
/* "Near you" on Today: her own saved vendors close by first, then shops from OpenStreetMap
   (furniture, hardware, paint, tiles, lighting, curtains…) within 2 km. Free, no key.
   Only runs when she has allowed location; the location is sent to OpenStreetMap's Overpass service. */

const SHOP_KINDS = {
  furniture: 'Furniture', hardware: 'Hardware', doityourself: 'Hardware', paint: 'Paint', interior_decoration: 'Decor',
  tiles: 'Tiles', lighting: 'Lighting', curtain: 'Curtains', carpet: 'Carpets', bathroom_furnishing: 'Bath fittings',
  kitchen: 'Kitchens', houseware: 'Homeware', glaziery: 'Glass', flooring: 'Flooring', electrical: 'Electricals', fabric: 'Fabric',
};
const NEAR_R = 2000;   // metres

async function nearbyShops(lat, lng) {
  const key = `near:${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = LS.get(key, null);
  if (cached && Date.now() - cached.at < 6 * 3600e3) return cached.list;
  const kinds = Object.keys(SHOP_KINDS).join('|');
  const q = `[out:json][timeout:15];(node(around:${NEAR_R},${lat},${lng})[shop~"^(${kinds})$"][name];way(around:${NEAR_R},${lat},${lng})[shop~"^(${kinds})$"][name];);out center 60;`;
  // the public OpenStreetMap servers get busy, so try two of them
  let j = null;
  for (const ep of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(12000) });
      if (r.ok) { j = await r.json(); break; }
    } catch { /* try the next one */ }
  }
  if (!j) throw new Error('shop map busy');
  const list = (j.elements || []).map(e => {
    const p = { lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon };
    return { name: e.tags.name, kind: SHOP_KINDS[e.tags.shop] || 'Shop', lat: p.lat, lng: p.lng, d: km({ lat, lng }, p) };
  }).filter(x => x.lat != null).sort((a, b) => a.d - b.d).slice(0, 12);
  LS.set(key, { at: Date.now(), list });
  return list;
}

function nearCard(x, mine) {
  return `<a class="near-row" href="${dirUrl(x)}" target="_blank" rel="noopener">
    <span class="near-k ${mine ? 'mine' : ''}">${esc(mine ? (x.category || 'Saved') : x.kind)}</span>
    <span class="near-main"><b>${esc(x.name)}</b><small>${fmtKm(x.d)} away${mine && x.rating ? ' · ' + '★'.repeat(x.rating) : ''}</small></span>
    <span class="near-go">${I.nav}</span></a>`;
}

async function fillNearby(box) {
  let me;
  try { me = await getLoc(); } catch { box.innerHTML = '<p class="hint">Location is blocked. Allow it for this site in Chrome to see shops near you.</p>'; return; }
  const mine = S.contacts.filter(c => c.lat != null).map(c => ({ ...c, d: km(me, c) })).filter(c => c.d <= 3).sort((a, b) => a.d - b.d).slice(0, 4);
  box.innerHTML = (mine.length ? mine.map(c => nearCard(c, true)).join('') : '') + '<p class="hint near-wait">Looking for shops nearby…</p>';
  try {
    const shops = await nearbyShops(me.lat, me.lng);
    const names = new Set(mine.map(c => c.name.toLowerCase()));
    const rest = shops.filter(s => !names.has(s.name.toLowerCase())).slice(0, 8 - mine.length);
    box.innerHTML = (mine.map(c => nearCard(c, true)).join('') + rest.map(s => nearCard(s, false)).join('')) ||
      '<p class="hint">No furniture, hardware or tile shops found within 2 km.</p>';
  } catch {
    // fall back to Google Maps searches around her, which always work
    const kinds = ['Furniture shop', 'Hardware store', 'Tile showroom', 'Laminate dealer', 'Lighting store', 'Paint shop'];
    box.innerHTML = mine.map(c => nearCard(c, true)).join('') +
      `<div class="find">${kinds.map(k => `<a class="btn" href="${mapSearch(k, me)}" target="_blank" rel="noopener">${I.search}${k}</a>`).join('')}</div>
       <p class="hint">Opens Google Maps with what is near you.</p>`;
  }
}

/* Today: a Calendar link under the counts, and the "Near you" section */
const todayBeforeNear = views.today;
views.today = el => {
  todayBeforeNear(el);
  if (!S.followups.length && !S.contacts.length && !S.sites.length) return;   // first-run welcome screen
  const strip = $('.strip', el);
  if (strip && !$('.cal-link', el)) strip.insertAdjacentHTML('afterend', `<button class="btn cal-link" data-act="openCalendar">${I.cal}See your calendar</button>`);
  const html = `<h2 class="sec">Near you <span class="count">within 2 km</span></h2><div class="near" id="nearBox">${LS.get('useLoc', false)
    ? '<p class="hint">Finding where you are…</p>'
    : `<div class="empty"><p>See your trusted vendors and furniture, hardware, tile and lighting shops close to wherever you are.</p><button class="btn primary" data-act="nearOn">${I.pin}Use my location</button></div>`}</div>`;
  const anchor = $('.site-list', el) || $('.swatch-row', el);
  (anchor ? anchor : el.lastElementChild).insertAdjacentHTML('afterend', html);
  if (LS.get('useLoc', false)) fillNearby($('#nearBox', el));
};
ACT.nearOn = () => { LS.set('useLoc', true); render(); };
