'use strict';
/* Coffee Break visual layer: every screen gets a material colour and an architectural line drawing.
   Today = sage, Follow-ups = terracotta, Library = walnut, Materials = ochre stone, People = teal.
   Loaded last; it only decorates what app.js and features.js render. */

const SCREEN_OF = { today: 'today', followups: 'followups', library: 'library', board: 'library', materials: 'library', people: 'people', site: 'site', design: 'design' };

/* line drawings from the trade: plan, lamp and chair, arched window, swatch fan, house */
const art = (d) => `<svg class="motif" viewBox="0 0 160 120" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const MOTIF = {
  today: art(`<rect class="f" x="12" y="14" width="56" height="40" rx="2"/><rect x="8" y="10" width="144" height="100" rx="3"/>
    <path d="M8 62h50M76 10v30M76 60v50M98 62h54M98 62V44"/><path d="M76 40a20 20 0 0 1 20 20"/><path d="M58 62a18 18 0 0 0 18-18" stroke-dasharray="3 3"/>
    <rect x="18" y="20" width="36" height="16" rx="3"/><rect x="18" y="38" width="16" height="10" rx="2"/><circle cx="36" cy="86" r="11"/><path d="M28 86h16M36 78v16"/>
    <rect x="108" y="74" width="34" height="26" rx="3"/><rect class="f" x="112" y="78" width="12" height="18" rx="2"/><path d="M104 20h40v16h-40z"/><path d="M116 20v16M128 20v16"/>`),
  followups: art(`<path d="M96 0v26"/><path class="f" d="M74 44a22 22 0 0 1 44 0z"/><path d="M74 44a22 22 0 0 1 44 0z"/><path d="M90 52h12"/>
    <path d="M30 112V84h46v28"/><path class="f" d="M30 84h46V70a8 8 0 0 0-8-8H38a8 8 0 0 0-8 8z"/><path d="M30 84h46V70a8 8 0 0 0-8-8H38a8 8 0 0 0-8 8z"/><path d="M34 112v-8M72 112v-8"/>
    <path d="M118 112V90h26v22M114 90h34"/><circle class="f" cx="131" cy="80" r="9"/><circle cx="131" cy="80" r="9"/><path d="M8 112h146"/>`),
  library: art(`<path class="f" d="M48 112V54a32 32 0 0 1 64 0v58z"/><path d="M44 112V54a36 36 0 0 1 72 0v58z"/><path d="M80 18v94M44 70h72"/>
    <path d="M132 112c0-18 4-30 10-40M142 72c-8 2-14 8-16 16M138 82c6 0 12 4 14 10M136 94c-6-2-12 0-14 6"/><path d="M124 112h22l-3-12h-16z"/>
    <path d="M14 112V82h18v30M12 82h22"/><path d="M8 112h146"/>`),
  materials: art(`<g transform="rotate(-18 80 104)"><rect class="f" x="62" y="18" width="36" height="86" rx="4"/><rect x="62" y="18" width="36" height="86" rx="4"/></g>
    <g transform="rotate(0 80 104)"><rect x="62" y="18" width="36" height="86" rx="4"/><path d="M62 84h36"/></g>
    <g transform="rotate(18 80 104)"><rect class="f2" x="62" y="18" width="36" height="86" rx="4"/><rect x="62" y="18" width="36" height="86" rx="4"/></g>
    <circle cx="80" cy="96" r="3"/><path d="M14 112h132"/>`),
  people: art(`<path class="f" d="M36 112V66l44-34 44 34v46z"/><path d="M30 70 80 30l50 40M36 112V66M124 112V66"/><path d="M68 112V84h24v28"/>
    <rect x="46" y="76" width="14" height="14" rx="1"/><rect x="100" y="76" width="14" height="14" rx="1"/>
    <path d="M128 40c0-9 7-16 16-16s16 7 16 16c0 12-16 26-16 26s-16-14-16-26z"/><circle class="f2" cx="144" cy="40" r="5"/><path d="M8 112h146"/>`),
};
MOTIF.design = art(`<path class="f" d="M80 18 128 44 80 70 32 44z"/><path d="M80 18 128 44v48L80 118 32 92V44z"/><path d="M32 44l48 26 48-26M80 70v48"/>
    <path d="M24 50v48M20 50h8M20 98h8" /><path d="M86 122l42-24M84 118l4 7M126 94l4 7"/><circle cx="140" cy="22" r="10"/><path d="M140 6v8M140 30v8M124 22h8M148 22h8"/>`);
MOTIF.site = MOTIF.today;

/* room icons for decisions */
const ri = d => `<svg class="room-ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ROOM_IC = {
  Living: ri('<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 12a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z"/><path d="M5 17v2M19 17v2"/>'),
  Dining: ri('<path d="M4 9h16M6 9v10M18 9v10"/><path d="M8 5h8"/><path d="M12 5v4"/>'),
  Kitchen: ri('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12h16M12 12v8"/><circle cx="8.5" cy="8" r="1.4"/><circle cx="15.5" cy="8" r="1.4"/>'),
  'Master bedroom': ri('<path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.8"/>'),
  'Bedroom 2': ri('<path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.8"/>'),
  'Kids room': ri('<path d="M4 18V9M4 15h16v3M20 15v-3H10v3"/><path d="M15 6l1 2 2 .3-1.5 1.4.4 2.1L15 10.8l-1.9 1 .4-2.1L12 8.3l2-.3z"/>'),
  Pooja: ri('<path d="M12 4c2 2.5 2 4.5 0 6-2-1.5-2-3.5 0-6z"/><path d="M6 14h12a6 4 0 0 1-12 0z"/><path d="M9 20h6M12 18v2"/>'),
  Foyer: ri('<rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="15" cy="12" r="1"/>'),
  Bathrooms: ri('<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M6 12V6a2 2 0 0 1 4 0"/><path d="M7 19l-1 2M17 19l1 2"/>'),
  'Whole home': ri('<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-6h4v6"/>'),
};

/* a stable material tint per site, so a follow-up shows which home it belongs to */
const SITE_TINTS = ['#7f9a84', '#b8613e', '#c99a3b', '#6b4a33', '#3f7f7f', '#8a6f9a', '#5d7896'];
const siteTint = id => {
  const i = S.sites.findIndex(s => s.id === id);
  return i < 0 ? '' : SITE_TINTS[i % SITE_TINTS.length];
};

function decorate() {
  const name = (location.hash.slice(1).split('?')[0] || 'today').split('/')[0];
  const screen = SCREEN_OF[name] || 'today';
  document.body.dataset.screen = screen;
  const view = $('#view');

  // coloured header band with the screen's drawing
  const head = $('.hero', view) || $('.title-row', view);
  if (head && !head.closest('.band')) {
    const band = document.createElement('div');
    band.className = 'band';
    head.before(band);
    const back = band.previousElementSibling && band.previousElementSibling.classList.contains('back') ? band.previousElementSibling : null;
    if (back) band.append(back);
    band.append(head);
    // the strip on Today belongs in the band too
    const strip = $('.strip', head);
    band.insertAdjacentHTML('beforeend', MOTIF[screen] || '');
    if (strip) band.append(strip);
  }

  // site colour on follow-up rows and site rows
  $$('.fu', view).forEach(row => {
    const btn = $('[data-act="wa"],[data-act="outcome"],[data-act="editF"]', row);
    const f = btn && S.followups.find(x => x.id === btn.dataset.id);
    const t = f && siteTint(f.siteId);
    if (t) row.style.setProperty('--site', t);
  });
  $$('.site-row', view).forEach(a => {
    const id = a.getAttribute('href').split('/')[1];
    const t = siteTint(id);
    if (t) a.style.setProperty('--site', t);
  });

  // room icons on the decisions list
  $$('.room', view).forEach(h => {
    if (h.querySelector('.room-ic')) return;
    const ic = ROOM_IC[h.textContent.trim()] || ROOM_IC['Whole home'];
    h.insertAdjacentHTML('afterbegin', ic);
  });
}

/* run after every render */
const plainRender = render;
render = function (focusId) { plainRender(focusId); decorate(); };
document.addEventListener('DOMContentLoaded', decorate);
