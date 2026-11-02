'use strict';

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const z = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
const hhmm = d => `${z(d.getHours())}:${z(d.getMinutes())}`;
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((new Date(a + 'T00:00') - new Date(b + 'T00:00')) / 864e5);
const fmtLong = s => new Date(s + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fmtDate = s => {
  const d = diffDays(s, today());
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d < 0) return `${-d} days late`;
  return fmtLong(s);
};
const fmtNum = n => Number(n).toLocaleString('en-IN');
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'link'; } };

const LS = {
  get(k, d) { try { const v = localStorage.getItem('sm.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sm.' + k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ================= constants ================= */
const CATS = ['Carpenter', 'Plywood / Laminate', 'Hardware', 'Furniture', 'Tiles & Stone', 'Lighting', 'Electrician', 'Painter', 'Fabric & Curtains', 'Plumber', 'Other'];
const MTYPES = ['Laminate', 'Veneer', 'Plywood', 'Tile', 'Stone', 'Fabric', 'Paint', 'Wallpaper', 'Hardware', 'Lighting', 'Other'];
const UNITS = ['sheet', 'sq ft', 'running ft', 'metre', 'piece', 'litre', 'roll', 'box'];
const LIB_TAGS = {
  Room: ['Living', 'Bedroom', 'Kitchen', 'Wardrobe', 'Pooja', 'Dining', 'Bathroom', 'Kids', 'TV unit', 'Foyer', 'Balcony', 'Ceiling', 'Study'],
  Style: ['Contemporary', 'Modern', 'Classic Indian', 'Minimal', 'Luxury', 'Boho', 'Scandinavian', 'Industrial'],
  Look: ['Wood', 'Walnut', 'Oak', 'Marble', 'Brass', 'Cane', 'Fluted', 'Matte', 'Glossy', 'Beige', 'White', 'Grey', 'Green', 'Blue', 'Pastel', 'Dark'],
};
const MAT_TAGS = {
  Colour: ['White', 'Beige', 'Grey', 'Black', 'Walnut', 'Oak', 'Teak', 'Green', 'Blue', 'Pink', 'Terracotta', 'Pastel'],
  Look: ['Matte', 'Glossy', 'Suede', 'Textured', 'Fluted', 'Stone look', 'Wood grain', 'Metallic', 'Plain'],
};
const MAPQ = ['Carpenter', 'Plywood shop', 'Laminate dealer', 'Hardware store', 'Furniture shop', 'Tile showroom', 'Lighting store', 'Electrician', 'Painter', 'Curtain fabric shop'];

/* one outline icon set: 24-unit grid, 1.6 stroke, drawn for this app */
const svg = d => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  today: svg('<path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M10 20v-5h4v5"/>'),
  bell: svg('<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
  image: svg('<rect x="3.5" y="4.5" width="17" height="15" rx="1"/><path d="m4 17 5-5 4 4 2.5-2.5L20 18"/><circle cx="15.5" cy="9" r="1.4"/>'),
  swatch: svg('<rect x="4" y="3.5" width="9" height="17" rx="1"/><path d="M13 7.5 19 6l1.5 12.5L13 20"/><path d="M4 15.5h9"/>'),
  pin: svg('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  mic: svg('<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>'),
  camera: svg('<path d="M4 8h3.2l1.6-2.5h6.4L16.8 8H20v11H4z"/><circle cx="12" cy="13.2" r="3.3"/>'),
  play: svg('<path d="M8 5.5v13l10.5-6.5z"/>'),
  cog: svg('<circle cx="12" cy="12" r="2.8"/><path d="M10.3 3.5h3.4l.5 2.4 1.7 1 2.3-.8 1.7 3-1.8 1.6v2l1.8 1.6-1.7 3-2.3-.8-1.7 1-.5 2.4h-3.4l-.5-2.4-1.7-1-2.3.8-1.7-3 1.8-1.6v-2L3.9 9.1l1.7-3 2.3.8 1.7-1z"/>'),
  phone: svg('<path d="M5 4.5h3.5l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z"/>'),
  chat: svg('<path d="M4.5 19.5 5.6 16A7.5 7.5 0 1 1 8.4 18.6z"/>'),
  nav: svg('<path d="m4 11 16-7-7 16-1.8-7.2z"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  cal: svg('<rect x="4" y="5.5" width="16" height="14.5" rx="1"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'),
  clock: svg('<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>'),
  link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  user: svg('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'),
  heart: svg('<path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
  cube: svg('<path d="M12 3.5 19.5 7.7v8.6L12 20.5l-7.5-4.2V7.7z"/><path d="M4.5 7.7 12 12l7.5-4.3M12 12v8.5"/>'),
};

const STAR = '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 17l-5.4 3 1.2-6-4.5-4.2 6.1-.7z"/></svg>';

/* ================= storage (IndexedDB) ================= */
const STORES = ['contacts', 'sites', 'followups', 'library', 'materials', 'sessions', 'inbox', 'meta', 'decisions', 'boards', 'designs'];
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('studiomate', 3);
      r.onupgradeneeded = () => { for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  st(s, m = 'readonly') { return this.db.transaction(s, m).objectStore(s); },
  req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  all(s) { return this.req(this.st(s).getAll()); },
  get(s, id) { return this.req(this.st(s).get(id)); },
  put(s, v) { return this.req(this.st(s, 'readwrite').put(v)); },
  del(s, id) { return this.req(this.st(s, 'readwrite').delete(id)); },
};
const S = {};
async function load() { for (const s of STORES) S[s] = await DB.all(s); }
async function save(s, o) {
  await DB.put(s, o);
  const i = S[s].findIndex(x => x.id === o.id);
  if (i >= 0) S[s][i] = o; else S[s].push(o);
}
async function remove(s, id) { await DB.del(s, id); S[s] = S[s].filter(x => x.id !== id); }
const contact = id => S.contacts.find(c => c.id === id);
const site = id => S.sites.find(s => s.id === id);

/* images */
const urls = new Map();
function img(o) {
  if (!o.blob) return '';
  const k = o.id + ':' + o.blob.size;
  if (!urls.has(k)) urls.set(k, URL.createObjectURL(o.blob));
  return urls.get(k);
}
async function compress(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file);
    const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(b => r(b || file), 'image/jpeg', 0.82));
  } catch { return file; }
}
function pickFiles({ multiple = true, camera = false } = {}) {
  return new Promise(res => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = 'image/*'; i.multiple = multiple;
    if (camera) i.capture = 'environment';
    i.onchange = () => res([...i.files]);
    i.click();
  });
}

/* location */
let myLoc = null;
function getLoc() {
  if (myLoc && Date.now() - myLoc.at < 5 * 60e3) return Promise.resolve(myLoc);
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('Location not available'));
    navigator.geolocation.getCurrentPosition(
      p => { myLoc = { lat: p.coords.latitude, lng: p.coords.longitude, at: Date.now() }; res(myLoc); },
      e => rej(e), { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  });
}
function km(a, b) {
  const r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
const fmtKm = k => k < 1 ? Math.round(k * 1000) + ' m' : k.toFixed(1) + ' km';
const dirUrl = o => `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`;
const mapSearch = (q, near) => 'https://www.google.com/maps/search/' + encodeURIComponent(near ? `${q} near ${near.lat.toFixed(5)},${near.lng.toFixed(5)}` : `${q} near me`);

/* phone / whatsapp */
function normPhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = '91' + d;
  return d;
}
const waUrl = (phone, text) => `https://wa.me/${normPhone(phone)}${text ? '?text=' + encodeURIComponent(text) : ''}`;

/* ================= follow-up logic ================= */
const isOpen = f => f.status !== 'done';
function bucket(f) {
  const d = diffDays(f.due, today());
  return d < 0 ? 'overdue' : d === 0 ? 'today' : d <= 7 ? 'week' : 'later';
}
const byDue = (a, b) => (a.due + (a.time || '')).localeCompare(b.due + (b.time || ''));
const openFollowups = () => S.followups.filter(isOpen).sort(byDue);
function record(cid) {
  const done = S.followups.filter(f => f.contactId === cid && f.status === 'done' && f.firstDue && f.doneAt);
  if (done.length < 2) return null;
  const avg = done.reduce((s, f) => s + Math.max(0, diffDays(f.doneAt, f.firstDue)), 0) / done.length;
  return { n: done.length, avg };
}
function recordText(cid) {
  const r = record(cid);
  if (!r) return '';
  const d = Math.round(r.avg);
  return d === 0 ? 'Usually on time' : `Usually ~${d} day${d === 1 ? '' : 's'} late`;
}
function message(f, lang) {
  const c = contact(f.contactId), s = site(f.siteId);
  const name = c ? c.name.split(' ')[0] : '';
  const late = diffDays(f.due, today()) < 0 ? fmtLong(f.due) : '';
  const urgent = (f.attempts || []).length >= 2;
  if (lang === 'ta') {
    return `வணக்கம்${name ? ' ' + name : ''}, ${s ? s.name + ' சைட்டுக்கான ' : ''}${f.title} பற்றி கேட்கிறேன். ` +
      `${late ? late + ' அன்று வர வேண்டியது. ' : ''}${urgent ? 'இது கொஞ்சம் அவசரம். ' : ''}தயவுசெய்து நிலவரம் சொல்லுங்கள். நன்றி!`;
  }
  if (lang === 'tg') {
    return `Hi${name ? ' ' + name : ''}, ${s ? s.name + ' site ku ' : ''}${f.title} pathi follow-up. ` +
      `${late ? late + ' ku vara vendiyadhu. ' : ''}${urgent ? 'Konjam urgent. ' : ''}Update sollunga please. Thanks!`;
  }
  return `Hi${name ? ' ' + name : ''}, following up on ${f.title}${s ? ' for the ' + s.name + ' site' : ''}. ` +
    `${late ? `It was expected on ${late}. ` : ''}${urgent ? 'This is a bit urgent. ' : ''}Please share an update. Thanks!`;
}
async function logEvent(f, what) {
  f.log = (f.log || []).concat({ at: Date.now(), what });
  await save('followups', f);
}

/* reminders */
function dueNow(f, now = new Date()) {
  if (!isOpen(f)) return false;
  const t = ymd(now);
  if (f.due < t) return true;
  if (f.due > t) return false;
  return (f.time || '00:00') <= hhmm(now);
}
async function checkReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const t = today();
  const meta = (await DB.get('meta', 'notified')) || { id: 'notified', map: {} };
  let changed = false;
  for (const f of S.followups) {
    if (!dueNow(f)) continue;
    const k = f.due < t ? `${f.id}|late|${t}` : `${f.id}|${f.due}|${f.time || ''}`;
    if (meta.map[k]) continue;
    const c = contact(f.contactId);
    reg.showNotification(f.title, {
      body: (c ? c.name + ' · ' : '') + (f.due < t ? 'Overdue since ' + fmtLong(f.due) : 'Follow up now'),
      tag: f.id, icon: 'icon-192.png', badge: 'icon-192.png', data: { id: f.id },
    });
    meta.map[k] = Date.now(); changed = true;
  }
  if (changed) {
    const cutoff = Date.now() - 30 * 864e5;
    for (const k in meta.map) if (meta.map[k] < cutoff) delete meta.map[k];
    await DB.put('meta', meta);
  }
}

/* voice */
function listen(lang, onText, btn) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) { toast('Voice typing needs Chrome on Android'); return; }
  const r = new R();
  r.lang = lang; r.interimResults = false; r.maxAlternatives = 1;
  btn && btn.classList.add('listen');
  r.onresult = e => onText(e.results[0][0].transcript);
  r.onerror = e => toast(e.error === 'no-speech' ? 'Didn’t catch that, try again' : 'Voice: ' + e.error);
  r.onend = () => btn && btn.classList.remove('listen');
  r.start();
}
function parseVoice(t) {
  const low = t.toLowerCase();
  let due = null;
  if (/\b(today|indru)\b|இன்று/.test(low)) due = today();
  else if (/tomorrow|naalai|நாளை/.test(low)) due = addDays(today(), 1);
  else {
    ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].forEach((d, i) => {
      if (low.includes(d)) due = addDays(today(), ((i - new Date().getDay()) + 7) % 7 || 7);
    });
    const m = low.match(/in (\d+) days?/);
    if (m) due = addDays(today(), +m[1]);
  }
  const first = s => s.toLowerCase().split(/\s+/)[0];
  const contactHit = S.contacts.find(c => c.name && first(c.name).length >= 3 && low.includes(first(c.name)));
  const siteHit = S.sites.find(s => s.name && first(s.name).length >= 3 && low.includes(first(s.name)));
  return { title: t.charAt(0).toUpperCase() + t.slice(1), due, contactId: contactHit?.id, siteId: siteHit?.id };
}

/* ================= sheet (bottom modal) ================= */
let sheetOpen = false;
function openSheet(html, mount) {
  const sh = $('#sheet'), card = $('.sheet-card', sh);
  card.innerHTML = '<div class="grab"></div><button class="icon-btn sheet-x" data-act="closeSheet" aria-label="Close">' + I.x + '</button>' + html;
  sh.classList.remove('hidden');
  document.body.classList.add('noscroll');
  if (!sheetOpen) history.pushState({ sheet: 1 }, '');
  sheetOpen = true;
  $$('.tagpick .chip', card).forEach(b => b.onclick = () => b.classList.toggle('on'));
  mount && mount(card);
  card.scrollTop = 0;
}
function hideSheet() {
  $('#sheet').classList.add('hidden');
  document.body.classList.remove('noscroll');
  sheetOpen = false;
}
function closeSheet() {
  if (sheetOpen && history.state && history.state.sheet) history.back();
  else hideSheet();
}
$('.sheet-bg').onclick = closeSheet;

function tagPicker(sel = [], groups = LIB_TAGS) {
  const s = new Set(sel.map(t => t.toLowerCase()));
  const all = Object.values(groups).flat().map(t => t.toLowerCase());
  const custom = sel.filter(t => !all.includes(t.toLowerCase()));
  return `<div class="tagpick">${Object.entries(groups).map(([g, ts]) => `<p class="glabel">${g}</p><div class="chips">${ts.map(t =>
    `<button type="button" class="chip ${s.has(t.toLowerCase()) ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>`).join('')}
    <input class="tagx" placeholder="Other tags, separated by commas" value="${esc(custom.join(', '))}"></div>`;
}
function readTags(root) {
  const on = $$('.tagpick .chip.on', root).map(b => b.dataset.tag);
  const x = ($('.tagx', root)?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  return [...new Set([...on, ...x])];
}
function topTags(items, n) {
  const c = {};
  for (const x of items) for (const t of x.tags || []) c[t] = (c[t] || 0) + 1;
  return Object.keys(c).sort((a, b) => c[b] - c[a]).slice(0, n);
}
const contactOptions = (sel, allowNew = true) => `<option value="">None</option>` +
  [...S.contacts].sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}${c.category ? ' · ' + esc(c.category) : ''}</option>`).join('') +
  (allowNew ? '<option value="__new">＋ New contact…</option>' : '');
const siteOptions = sel => `<option value="">None</option>` +
  S.sites.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('') +
  '<option value="__new">＋ New site…</option>';

/* ================= router ================= */
let cur = 'today';
const views = { today: vToday, followups: vFollowups, library: vLibrary, materials: vMaterials, people: vPeople };
function render(focusId) {
  const [name, arg] = (location.hash.slice(1).split('?')[0] || 'today').split('/');
  cur = views[name] ? name : 'today';
  const tab = { site: 'people', board: 'library', materials: 'library' }[cur] || cur;
  $$('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  const el = $('#view');
  views[cur](el, arg && decodeURIComponent(arg));
  if (focusId) {
    const i = document.getElementById(focusId);
    if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch { /* not a text input */ } }
  }
}
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });
/* each screen: a noun title, an optional grey line, its one add action */
const titleRow = (h, line, act, label) => `<header class="title-row"><div><h1>${h}</h1>${line ? `<p class="lede">${line}</p>` : ''}</div>
  ${act ? `<button class="btn primary" data-act="${act}">${I.plus}${label}</button>` : ''}</header>`;

/* ================= views ================= */
function fCard(f) {
  const c = contact(f.contactId), st = site(f.siteId), b = bucket(f), tries = (f.attempts || []).length;
  const rec = c ? recordText(c.id) : '';
  const done = f.status === 'done';
  const who = c ? esc(c.name) : 'No contact';
  return `<article class="fu ${done ? 'done' : b}">
    <button class="fu-main" data-act="${done ? 'editF' : 'outcome'}" data-id="${f.id}">
      <span class="fu-top"><span class="due ${done ? 'done' : b}">${done ? 'Done ' + fmtLong(f.doneAt) : fmtDate(f.due) + (f.time && b !== 'overdue' ? ' · ' + f.time : '')}</span>
        ${tries ? `<span class="pill">Chased ${tries}×</span>` : ''}${f.recur ? '<span class="pill">Weekly</span>' : ''}</span>
      <span class="fu-title">${esc(f.title)}</span>
      <span class="meta">${who}${st ? ' · ' + esc(st.name) : ''}${rec && !done ? ` · <em>${rec}</em>` : ''}</span>
    </button>
    ${done ? '' : `<span class="fu-acts">
      <button class="btn round ${b === 'overdue' ? 'primary' : ''}" data-act="wa" data-id="${f.id}" aria-label="WhatsApp ${who}">${I.chat}</button>
      <button class="btn round" data-act="call" data-id="${f.id}" aria-label="Call ${who}" ${c && c.phone ? '' : 'disabled'}>${I.phone}</button></span>`}
  </article>`;
}

function notifBanner() {
  if (!('Notification' in window)) return '';
  if (Notification.permission === 'default') {
    return `<div class="banner"><p>Turn on reminders and follow-ups will arrive on your phone at the time you set.</p><button class="btn primary small" data-act="enableNotif">Turn on</button></div>`;
  }
  return '';
}

function vToday(el) {
  const o = openFollowups();
  const od = o.filter(f => bucket(f) === 'overdue'), td = o.filter(f => bucket(f) === 'today'), wk = o.filter(f => bucket(f) === 'week');
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const name = LS.get('name', '');
  // the one finding: the follow-up that is most overdue, else today's count
  const worst = od[0];
  const wc = worst && contact(worst.contactId);
  const finding = worst
    ? `${wc ? esc(wc.name) + ': ' : ''}${esc(worst.title)} is ${-diffDays(worst.due, today())} day${diffDays(worst.due, today()) === -1 ? '' : 's'} late.`
    : td.length ? `${td.length} follow-up${td.length > 1 ? 's' : ''} due today.` : 'Nothing is waiting on you today.';
  const recent = [...S.materials].sort((a, b) => b.created - a.created).slice(0, 3);
  el.innerHTML = `
    <section class="hero">
      <h1 class="greet">${greet}${name ? ', ' + esc(name) : ''}.</h1>
      <p class="finding">${finding}</p>
      <p class="lede">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <div class="strip num">
        <a href="#followups" class="${od.length ? 'bad' : ''}"><span>Overdue</span><b>${od.length}</b></a>
        <a href="#followups" class="main"><span>Today</span><b>${td.length}</b></a>
        <a href="#followups"><span>Next 7 days</span><b>${wk.length}</b></a>
      </div>
    </section>
    <div id="nearNudge"></div>
    <div class="quick">
      <button data-act="newF">${I.bell}<span>Follow-up</span></button>
      <button data-act="voiceF">${I.mic}<span>Speak</span></button>
      <button data-act="newM">${I.camera}<span>Material</span></button>
      <button data-act="present">${I.play}<span>Present</span></button>
    </div>
    ${od.length ? `<h2 class="sec">Overdue <span class="count">${od.length}</span></h2><div class="fu-list">${od.map(fCard).join('')}</div>` : ''}
    ${td.length ? `<h2 class="sec">Today <span class="count">${td.length}</span></h2><div class="fu-list">${td.map(fCard).join('')}</div>` : ''}
    ${!od.length && !td.length ? `<div class="empty"><p>Nothing to chase today.</p>
      ${S.followups.length ? '' : '<button class="btn primary" data-act="newF">Add your first follow-up</button>'}</div>` : ''}
    ${wk.length ? `<h2 class="sec">Coming up <a href="#followups" class="more">View all</a></h2><div class="fu-list">${wk.slice(0, 4).map(fCard).join('')}</div>` : ''}
    ${recent.length ? `<h2 class="sec">Recent samples <a href="#materials" class="more">View all</a></h2>
      <div class="swatch-row">${recent.map(m => `<button class="sw" data-act="matOpen" data-id="${m.id}">${m.blob ? `<img src="${img(m)}" alt="">` : `<span class="sw-blank"${m.tone ? ` style="background:${esc(m.tone)}"` : ''}></span>`}<b>${esc(m.code || m.type)}</b><small>${esc(m.brand || '')}</small></button>`).join('')}</div>` : ''}
    ${notifBanner()}`;
  nearNudge();
}
async function nearNudge() {
  if (!LS.get('useLoc', false)) return;
  try {
    const me = await getLoc();
    const hits = S.contacts.filter(c => c.lat != null)
      .map(c => ({ c, d: km(me, c), n: S.followups.filter(f => isOpen(f) && f.contactId === c.id).length }))
      .filter(x => x.n && x.d <= 2).sort((a, b) => a.d - b.d);
    const box = $('#nearNudge');
    if (!box || !hits.length) return;
    const x = hits[0];
    box.innerHTML = `<div class="banner nudge"><p>You’re <b>${fmtKm(x.d)}</b> from <b>${esc(x.c.name)}</b> with ${x.n} pending follow-up${x.n > 1 ? 's' : ''}.</p>
      <a class="btn small" href="${dirUrl(x.c)}" target="_blank" rel="noopener">Go</a></div>`;
  } catch { /* location denied or unavailable */ }
}

let fFilter = 'open', fSite = '';
function vFollowups(el) {
  const list = S.followups.filter(f => fFilter === 'open' ? isOpen(f) : !isOpen(f)).filter(f => !fSite || f.siteId === fSite);
  let body = '';
  if (fFilter === 'open') {
    list.sort(byDue);
    for (const [k, label] of [['overdue', 'Overdue'], ['today', 'Today'], ['week', 'Next 7 days'], ['later', 'Later']]) {
      const g = list.filter(f => bucket(f) === k);
      if (g.length) body += `<h2 class="sec">${label} <span class="count">${g.length}</span></h2><div class="fu-list">${g.map(fCard).join('')}</div>`;
    }
  } else {
    list.sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
    body = `<div class="fu-list">${list.map(fCard).join('')}</div>`;
  }
  if (!list.length) {
    body = `<div class="empty"><p>${fFilter === 'open' ? 'All caught up.' : 'Nothing completed yet.'}</p>
      ${fFilter === 'open' ? '<button class="btn primary" data-act="newF">New follow-up</button>' : ''}</div>`;
  }
  const nOpen = S.followups.filter(isOpen).length;
  el.innerHTML = titleRow('Follow-ups', nOpen ? `${nOpen} open · ${S.followups.filter(f => isOpen(f) && bucket(f) === 'overdue').length} overdue` : 'Nothing open', 'newF', 'New') + `<div class="bar">
      <div class="seg"><button class="${fFilter === 'open' ? 'on' : ''}" data-act="fFilter" data-id="open">Open</button><button class="${fFilter === 'done' ? 'on' : ''}" data-act="fFilter" data-id="done">Done</button></div>
      <span class="grow"></span>
      ${S.sites.length ? `<select id="fSite" aria-label="Filter by site"><option value="">All sites</option>${S.sites.map(s => `<option value="${s.id}" ${s.id === fSite ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : ''}
    </div>${body}`;
  const sel = $('#fSite', el);
  if (sel) sel.onchange = () => { fSite = sel.value; render(); };
}

let libQ = '', libSel = null;
function libFiltered() {
  const words = libQ.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return S.library.filter(x => {
    const hay = ((x.tags || []).join(' ') + ' ' + (x.note || '') + ' ' + (x.text || '')).toLowerCase();
    return words.every(w => hay.includes(w));
  }).sort((a, b) => b.created - a.created);
}
function vLibrary(el) {
  const items = libFiltered();
  const words = libQ.toLowerCase().split(/\s+/);
  const tops = topTags(S.library, 14);
  el.innerHTML = titleRow('Library', S.library.length ? `${S.library.length} saved` : '', 'addImages', 'Add') + `
    ${S.library.length ? `<div class="bar"><input type="search" id="libQ" placeholder="Search: walnut wardrobe, pooja…" aria-label="Search library" value="${esc(libQ)}"></div>` : ''}
    ${tops.length ? `<div class="chips scroll">${tops.map(t => `<button class="chip ${words.includes(t.toLowerCase()) ? 'on' : ''}" data-act="libTag" data-id="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
    ${S.library.length ? `<div class="bar"><span class="meta">${items.length} item${items.length === 1 ? '' : 's'}</span><span class="grow"></span>
      ${libSel
        ? `<button class="btn ghost" data-act="libSelCancel">Cancel</button><button class="btn primary" data-act="present" ${libSel.size ? '' : 'disabled'}>${I.play}Present ${libSel.size}</button>`
        : `${items.length ? `<button class="btn ghost" data-act="libSelect">Select</button><button class="btn" data-act="present">${I.play}Present</button>` : ''}`}
    </div>` : ''}
    ${items.length ? `<div class="grid">${items.map(libThumb).join('')}</div>` : `<div class="empty">
      <p>${S.library.length ? 'No matches. Try another word.' : 'Save your Pinterest finds and site photos here, tagged by room and style, so you can pull them up in seconds.'}</p>
      ${S.library.length ? '' : '<button class="btn primary" data-act="addImages">Add images</button><p class="hint">Tip: after installing, use “Share, then StudioMate” from Pinterest or your gallery.</p>'}</div>`}
    ${S.sessions.length ? `<h2 class="sec">Client sessions</h2>${[...S.sessions].sort((a, b) => b.created - a.created).map(sessCard).join('')}` : ''}`;
  const q = $('#libQ', el);
  if (q) q.oninput = debounce(() => { libQ = q.value; render('libQ'); }, 300);
}
function libThumb(x) {
  const sel = libSel && libSel.has(x.id);
  return `<button class="thumb ${sel ? 'sel' : ''}" data-act="${libSel ? 'libToggle' : 'libOpen'}" data-id="${x.id}" aria-label="${esc((x.tags || []).join(', ') || 'image')}">
    ${x.blob ? `<img src="${img(x)}" loading="lazy" alt="">` : `<div class="linkthumb">${I.link}<small>${esc(host(x.url))}</small></div>`}</button>`;
}
function sessCard(s) {
  return `<article class="card"><div class="p-main" data-act="sessOpen" data-id="${s.id}">
    <h3>${esc(s.client || 'Client')} <span class="meta">· ${fmtLong(s.date)}</span></h3>
    <p class="note">${esc(s.summary)}</p></div></article>`;
}

let matQ = '', matType = '';
function vMaterials(el) {
  const words = matQ.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const list = S.materials.filter(m => !matType || m.type === matType).filter(m => {
    const v = contact(m.vendorId);
    const hay = [m.type, m.brand, m.code, m.finish, m.note, v?.name, v?.area, ...(m.tags || [])].join(' ').toLowerCase();
    return words.every(w => hay.includes(w));
  }).sort((a, b) => b.created - a.created);
  const types = MTYPES.filter(t => S.materials.some(m => m.type === t));
  el.innerHTML = titleRow('Materials', S.materials.length ? `${S.materials.length} samples` : '', 'newM', 'Add sample') + `
    ${S.materials.length ? `<div class="bar"><input type="search" id="matQ" placeholder="Search code, brand, colour, vendor…" aria-label="Search materials" value="${esc(matQ)}"></div>` : ''}
    ${types.length ? `<div class="chips scroll"><button class="chip ${matType ? '' : 'on'}" data-act="matType" data-id="">All</button>${types.map(t => `<button class="chip ${matType === t ? 'on' : ''}" data-act="matType" data-id="${t}">${t}</button>`).join('')}</div>` : ''}
    ${list.length ? `<div class="mgrid">${list.map(mCard).join('')}</div>` : `<div class="empty">
      <p>${S.materials.length ? 'No matches.' : 'Snap a laminate, tile or fabric sample with its label. Save the code, vendor and price, and never ask “what was that code?” again.'}</p>
      ${S.materials.length ? '' : '<button class="btn primary" data-act="newM">${I.camera}Snap a material</button>'}</div>`}`;
  const q = $('#matQ', el);
  if (q) q.oninput = debounce(() => { matQ = q.value; render('matQ'); }, 300);
}
function mCard(m) {
  const v = contact(m.vendorId);
  // laid out like the printed label on a real sample: maker, then the code large, then finish
  return `<button class="mcard" data-act="matOpen" data-id="${m.id}">
    ${m.blob ? `<img src="${img(m)}" alt="" loading="lazy">` : m.tone ? `<div class="noimg" style="background:${esc(m.tone)}"></div>` : `<div class="noimg">${I.swatch}</div>`}
    <div class="label"><small class="maker">${esc(m.brand || m.type || 'Sample')}</small>
      <b class="code num">${esc(m.code || '—')}</b>
      <small>${esc([m.finish, m.brand ? m.type : ''].filter(Boolean).join(' · ') || ' ')}</small>
      <span class="label-foot"><span class="num">${m.price ? `₹${fmtNum(m.price)}<i> per ${esc(m.unit || 'unit')}</i>` : '<i>No price yet</i>'}</span>${v ? `<span class="vendor">${esc(v.name)}</span>` : ''}</span></div></button>`;
}

let pTab = 'contacts', pCat = '', nearFrom = null;
function vPeople(el) {
  let body = '';
  if (pTab === 'contacts') {
    let list = S.contacts.filter(c => !pCat || c.category === pCat);
    if (nearFrom) {
      list = list.map(c => ({ ...c, _d: c.lat != null ? km(nearFrom, c) : Infinity })).sort((a, b) => a._d - b._d);
    } else {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0) || a.name.localeCompare(b.name));
    }
    const cats = CATS.filter(c => S.contacts.some(x => x.category === c));
    body = `
      <div class="bar">
        <button class="btn ${nearFrom ? 'primary' : ''}" data-act="nearMe">${I.pin}${nearFrom ? 'Near ' + esc(nearFrom.label) : 'Sort by near me'}</button>
        ${nearFrom ? '<button class="btn ghost small" data-act="nearOff" aria-label="Clear">${I.x}</button>' : ''}
      </div>
      ${cats.length ? `<div class="chips scroll"><button class="chip ${pCat ? '' : 'on'}" data-act="pCat" data-id="">All</button>${cats.map(c => `<button class="chip ${pCat === c ? 'on' : ''}" data-act="pCat" data-id="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
      ${list.length ? list.map(personCard).join('') : `<div class="empty"><p>${S.contacts.length ? 'Nobody in this category yet.' : 'Save the carpenters, vendors and shops you trust, with your own notes and rating. They’ll show up first when you’re nearby.'}</p>
        <button class="btn primary" data-act="newC">Add a contact</button></div>`}
      <h2 class="sec">Find someone new ${nearFrom ? 'near ' + esc(nearFrom.label) : 'near you'}</h2>
      <div class="find">${MAPQ.map(q => `<a class="btn" href="${mapSearch(q, nearFrom)}" target="_blank" rel="noopener">${I.search}${q}</a>`).join('')}</div>
      <p class="hint">Opens Google Maps with ratings, reviews and directions.</p>`;
  } else {
    body = S.sites.length ? S.sites.map(siteCard).join('') : `<div class="empty"><p>Add your active sites with their location. Then see trusted people and shops near any site.</p>
      <button class="btn primary" data-act="newS">Add a site</button></div>`;
  }
  el.innerHTML = titleRow('People & sites', `${S.contacts.length} people · ${S.sites.length} sites`, pTab === 'sites' ? 'newS' : 'newC', 'Add') + `<div class="bar"><div class="seg"><button class="${pTab === 'contacts' ? 'on' : ''}" data-act="pTab" data-id="contacts">People & shops</button><button class="${pTab === 'sites' ? 'on' : ''}" data-act="pTab" data-id="sites">Sites</button></div></div>${body}`;
}
function personCard(c) {
  const n = S.followups.filter(f => isOpen(f) && f.contactId === c.id).length;
  const rec = recordText(c.id);
  const dist = c._d != null && isFinite(c._d) ? fmtKm(c._d) : '';
  return `<article class="card person"><div class="p-main" data-act="editC" data-id="${c.id}">
      <h3>${esc(c.name)} ${c.rating ? `<span class="stars" aria-label="Rated ${c.rating} of 5">${STAR.repeat(c.rating)}<span class="off">${STAR.repeat(5 - c.rating)}</span></span>` : ''}</h3>
      <p class="meta">${[c.category, c.area, dist && dist + ' away'].filter(Boolean).map(esc).join(' · ')}</p>
      ${c.notes ? `<p class="note">${esc(c.notes)}</p>` : ''}
      ${n || rec ? `<p class="meta">${n ? `${n} open follow-up${n > 1 ? 's' : ''}` : ''}${n && rec ? ' · ' : ''}${rec ? `<em>${rec}</em>` : ''}</p>` : ''}
    </div>
    <div class="fu-actions">
      ${c.phone ? `<a class="btn" href="tel:${esc(c.phone)}">${I.phone}Call</a><a class="btn" href="${waUrl(c.phone)}" target="_blank" rel="noopener">${I.chat}WhatsApp</a>` : ''}
      ${c.lat != null ? `<a class="btn" href="${dirUrl(c)}" target="_blank" rel="noopener">${I.nav}Directions</a>` : ''}
      <button class="btn ghost" data-act="newFfor" data-id="${c.id}">＋ Follow-up</button>
    </div></article>`;
}
function siteCard(s) {
  const n = S.followups.filter(f => isOpen(f) && f.siteId === s.id).length;
  return `<article class="card"><div class="p-main" data-act="openSite" data-id="${s.id}">
      <h3>${esc(s.name)}</h3><p class="meta">${[s.client, s.area].filter(Boolean).map(esc).join(' · ') || 'No details'}${n ? ` · ${n} open` : ''}</p></div>
    <div class="fu-actions">
      ${s.lat != null ? `<a class="btn" href="${dirUrl(s)}" target="_blank" rel="noopener">${I.nav}Directions</a><button class="btn" data-act="nearSite" data-id="${s.id}">${I.pin}Who’s near</button>` : '<span class="meta">Add a location to see who’s near</span>'}
      ${n ? `<button class="btn ghost" data-act="siteFollowups" data-id="${s.id}">Follow-ups</button>` : ''}
    </div></article>`;
}

/* ================= forms ================= */
async function resolveContact(form) {
  const v = form.contactId.value;
  if (v !== '__new') return v;
  const name = form.cname.value.trim();
  if (!name) return '';
  const c = { id: uid(), name, phone: form.cphone.value.trim(), category: 'Other', created: Date.now() };
  await save('contacts', c);
  return c.id;
}
async function resolveSite(form) {
  const v = form.siteId.value;
  if (v !== '__new') return v;
  const name = form.sname.value.trim();
  if (!name) return '';
  const s = { id: uid(), name, created: Date.now() };
  await save('sites', s);
  return s.id;
}
function wireNewToggles(card, form) {
  if (form.contactId) form.contactId.onchange = () => $('#newC', card).classList.toggle('hidden', form.contactId.value !== '__new');
  if (form.siteId) form.siteId.onchange = () => $('#newS', card).classList.toggle('hidden', form.siteId.value !== '__new');
}

function followForm(f0 = null, { autoListen = false, ...prefill } = {}) {
  const isNew = !f0;
  const f = { title: '', contactId: '', siteId: '', due: today(), time: LS.get('remTime', '09:30'), recur: '', ...(f0 || {}), ...prefill };
  const vlang = LS.get('vlang', 'en-IN');
  openSheet(`<h2>${isNew ? 'New follow-up' : 'Edit follow-up'}</h2>
    <form id="ff" autocomplete="off">
      <label>What to follow up
        <div class="row"><input name="title" required value="${esc(f.title)}" placeholder="e.g. 8 sheets Greenlam 1234 SF"><button type="button" class="btn icon" id="dict" title="Speak" aria-label="Speak">${I.mic}</button></div></label>
      <div class="vlang"><span class="meta">Voice typing in</span><button type="button" class="chip ${vlang === 'en-IN' ? 'on' : ''}" data-vl="en-IN">English</button><button type="button" class="chip ${vlang === 'ta-IN' ? 'on' : ''}" data-vl="ta-IN">தமிழ்</button></div>
      <label>Who<select name="contactId">${contactOptions(f.contactId)}</select></label>
      <div id="newC" class="sub hidden"><input name="cname" placeholder="Name (e.g. Ravi Plywoods)"><input name="cphone" type="tel" placeholder="Phone number"></div>
      <label>Site (optional)<select name="siteId">${siteOptions(f.siteId)}</select></label>
      <div id="newS" class="sub hidden"><input name="sname" placeholder="Site name (e.g. Adyar – Lakshmi)"></div>
      <label>When</label>
      <div class="chips" id="dueChips">${[['Today', 0], ['Tomorrow', 1], ['In 3 days', 3], ['Next week', 7]].map(([l, n]) => `<button type="button" class="chip" data-n="${n}">${l}</button>`).join('')}</div>
      <div class="row" style="margin-top:8px"><input type="date" name="due" value="${f.due}" required><input type="time" name="time" value="${f.time || ''}" style="max-width:130px"></div>
      <label class="check"><input type="checkbox" name="recur" ${f.recur ? 'checked' : ''}> Repeat every week</label>
      <div class="actions">${isNew ? '' : `<button type="button" class="btn danger ghost" data-act="delF" data-id="${f.id}">Delete</button>`}<button class="btn primary">Save</button></div>
    </form>`, card => {
    const form = $('#ff', card);
    wireNewToggles(card, form);
    let lang = vlang;
    $$('[data-vl]', card).forEach(b => b.onclick = () => { lang = b.dataset.vl; LS.set('vlang', lang); $$('[data-vl]', card).forEach(x => x.classList.toggle('on', x === b)); });
    $$('#dueChips .chip', card).forEach(b => b.onclick = () => {
      form.due.value = addDays(today(), +b.dataset.n);
      $$('#dueChips .chip', card).forEach(x => x.classList.toggle('on', x === b));
    });
    $('#dict', card).onclick = e => listen(lang, t => {
      const p = parseVoice(t);
      form.title.value = p.title;
      if (p.due) form.due.value = p.due;
      if (p.contactId) form.contactId.value = p.contactId;
      if (p.siteId) form.siteId.value = p.siteId;
    }, e.currentTarget);
    form.onsubmit = async e => {
      e.preventDefault();
      const contactId = await resolveContact(form), siteId = await resolveSite(form);
      const o = {
        ...f, id: f.id || uid(), title: form.title.value.trim(), contactId, siteId,
        due: form.due.value, time: form.time.value, recur: form.recur.checked ? 'weekly' : '',
        status: f.status || 'open', attempts: f.attempts || [], firstDue: f.firstDue || form.due.value, created: f.created || Date.now(),
      };
      await save('followups', o);
      closeSheet(); toast('Follow-up saved'); render(); checkReminders();
    };
    if (autoListen) setTimeout(() => $('#dict', card).click(), 250);
  });
}

function outcomeSheet(id) {
  const f = S.followups.find(x => x.id === id);
  if (!f) return;
  const c = contact(f.contactId);
  const hist = (f.log || []).slice(-4).reverse();
  openSheet(`<h2>${esc(f.title)}</h2><p class="meta">${c ? esc(c.name) + ' · ' : ''}What happened?</p>
    <div class="stack" style="margin-top:14px">
      <button class="btn big ok" data-act="oDone" data-id="${id}">${I.check}Done, delivered</button>
      <div class="promise"><button class="btn big" data-act="oDate" data-id="${id}">${I.cal}They promised a new date</button><input type="date" id="oNew" value="${addDays(today(), 1)}" aria-label="Promised date"></div>
      <button class="btn big" data-act="oNoReply" data-id="${id}">${I.clock}No reply, remind me tomorrow</button>
      <div class="two"><button class="btn" data-act="oSnooze" data-id="${id}" data-h="1">Snooze 1 hour</button><button class="btn" data-act="oSnooze" data-id="${id}" data-h="24">Snooze to tomorrow</button></div>
      <div class="two"><button class="btn" data-act="wa" data-id="${id}">${I.chat}WhatsApp</button><button class="btn" data-act="call" data-id="${id}" ${c && c.phone ? '' : 'disabled'}>${I.phone}Call</button></div>
      <button class="btn ghost" data-act="editF" data-id="${id}">Edit details</button>
    </div>
    ${hist.length ? `<p class="glabel" style="margin-top:20px">History</p>${hist.map(h => `<p class="meta">${new Date(h.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} — ${esc(h.what)}</p>`).join('')}` : ''}`);
}

function waSheet(id) {
  const f = S.followups.find(x => x.id === id);
  if (!f) return;
  const c = contact(f.contactId);
  let lang = LS.get('lang', 'en');
  openSheet(`<h2>Message ${c ? esc(c.name) : ''}</h2>
    <div class="seg" id="langSeg">${[['en', 'English'], ['ta', 'தமிழ்'], ['tg', 'Tanglish']].map(([k, l]) => `<button data-l="${k}">${l}</button>`).join('')}</div>
    <textarea id="waText" rows="6" style="margin-top:12px"></textarea>
    <p class="hint">${c && c.phone ? 'Opens your WhatsApp chat with ' + esc(c.phone) + '. You press send.' : 'No phone saved. WhatsApp will ask you to pick the chat.'}</p>
    <div class="actions"><button class="btn primary wa" id="waGo">Open WhatsApp</button></div>`, card => {
    const ta = $('#waText', card);
    const set = l => { lang = l; LS.set('lang', l); ta.value = message(f, l); $$('#langSeg button', card).forEach(b => b.classList.toggle('on', b.dataset.l === l)); };
    set(lang);
    $$('#langSeg button', card).forEach(b => b.onclick = () => set(b.dataset.l));
    $('#waGo', card).onclick = () => {
      window.open(waUrl(c && c.phone, ta.value), '_blank');
      f.attempts = (f.attempts || []).concat({ at: Date.now(), type: 'whatsapp' });
      logEvent(f, 'WhatsApp message sent');
      pendingOutcome = f.id;
      closeSheet();
    };
  });
}

async function addImages(files) {
  files = files || await pickFiles({ multiple: true });
  if (!files.length) return;
  toast('Adding…');
  const blobs = await Promise.all(files.map(f => compress(f)));
  openSheet(`<h2>Tag ${blobs.length} image${blobs.length > 1 ? 's' : ''}</h2>
    <div class="mini">${blobs.slice(0, 8).map(b => `<img src="${URL.createObjectURL(b)}" alt="">`).join('')}</div>
    ${tagPicker([])}
    <label>Note (optional)<input id="libNote" placeholder="e.g. client liked this in Pinterest"></label>
    <div class="actions"><button class="btn primary" id="libSave">Save to library</button></div>`, card => {
    $('#libSave', card).onclick = async () => {
      const tags = readTags(card), note = $('#libNote', card).value.trim();
      for (const b of blobs) await save('library', { id: uid(), blob: b, tags, note, created: Date.now() });
      closeSheet(); toast(`${blobs.length} saved`);
      if (cur !== 'library') location.hash = '#library'; else render();
    };
  });
}

function libDetail(id) {
  const x = S.library.find(i => i.id === id);
  if (!x) return;
  const rel = S.materials.filter(m => (m.libIds || []).includes(id) || (m.tags || []).some(t => (x.tags || []).includes(t))).slice(0, 6);
  openSheet(`${x.blob ? `<img class="preview" src="${img(x)}" alt="" style="max-height:340px;object-fit:contain">` : ''}
    ${x.url ? `<p><a class="btn" href="${esc(x.url)}" target="_blank" rel="noopener">${I.link}Open ${esc(host(x.url))}</a></p>` : ''}
    ${tagPicker(x.tags || [])}
    <label>Note<input id="libNote" value="${esc(x.note || x.text || '')}"></label>
    ${rel.length ? `<p class="glabel">Matching materials</p><div class="mgrid">${rel.map(mCard).join('')}</div>` : ''}
    <div class="actions"><button class="btn danger ghost" data-act="libDel" data-id="${id}">Delete</button><button class="btn primary" id="libSave">Save</button></div>`, card => {
    $('#libSave', card).onclick = async () => {
      x.tags = readTags(card); x.note = $('#libNote', card).value.trim();
      await save('library', x); closeSheet(); render();
    };
  });
}

function newMaterial() {
  openSheet(`<h2>Snap a material</h2><p class="meta">Photograph the sample with its label (brand, code) visible.</p>
    <div class="stack" style="margin-top:14px">
      <button class="btn big primary" id="mCam">${I.camera}Take photo</button>
      <button class="btn big" id="mGal">${I.image}Choose from gallery</button>
      <button class="btn ghost" id="mNone">Add without photo</button>
    </div>`, card => {
    const go = async camera => {
      const files = camera === null ? [] : await pickFiles({ multiple: false, camera });
      if (camera !== null && !files.length) return;
      const blob = files[0] ? await compress(files[0]) : null;
      matForm(null, blob);
    };
    $('#mCam', card).onclick = () => go(true);
    $('#mGal', card).onclick = () => go(false);
    $('#mNone', card).onclick = () => go(null);
  });
}

function matForm(m0, blob) {
  const isNew = !m0;
  const m = { type: 'Laminate', brand: '', code: '', finish: '', vendorId: '', price: '', unit: 'sheet', tags: [], note: '', ...(m0 || {}) };
  if (blob) m.blob = blob;
  const preview = m.blob ? URL.createObjectURL(m.blob) : '';
  const brands = [...new Set(S.materials.map(x => x.brand).filter(Boolean))];
  const linked = S.library.filter(l => (m.libIds || []).includes(l.id) || (m.tags || []).some(t => (l.tags || []).includes(t))).slice(0, 8);
  openSheet(`<h2>${isNew ? 'New material' : esc([m.brand, m.code].filter(Boolean).join(' ') || 'Material')}</h2>
    ${preview ? `<div class="preview-wrap"><img class="preview" src="${preview}" alt=""><button type="button" class="btn small" id="mRetake">Retake</button></div>` : ''}
    ${!isNew ? `<div class="row" style="margin-top:12px;flex-wrap:wrap">
        <button class="btn" data-act="matOrder" data-id="${m.id}">${I.bell}Order or follow up</button>
        ${m.lat != null ? `<a class="btn" href="${dirUrl(m)}" target="_blank" rel="noopener">${I.nav}Where I saw it</a>` : ''}
      </div>` : ''}
    <form id="mf" autocomplete="off">
      <label>Type<select name="type">${MTYPES.map(t => `<option ${t === m.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="row"><label style="flex:1">Brand<input name="brand" list="brandList" value="${esc(m.brand)}" placeholder="Merino, Greenlam…"></label>
        <label style="flex:1">Code / name<input name="code" value="${esc(m.code)}" placeholder="e.g. 21557 SF"></label></div>
      <datalist id="brandList">${brands.map(b => `<option value="${esc(b)}">`).join('')}</datalist>
      <label>Finish<input name="finish" value="${esc(m.finish)}" placeholder="Suede, high gloss, matte…"></label>
      <label>Vendor<select name="contactId">${contactOptions(m.vendorId)}</select></label>
      <div id="newC" class="sub hidden"><input name="cname" placeholder="Shop name"><input name="cphone" type="tel" placeholder="Phone"></div>
      <div class="row"><label style="flex:1">Price ₹<input name="price" type="number" inputmode="decimal" value="${esc(m.price)}"></label>
        <label style="flex:1">per<select name="unit">${UNITS.map(u => `<option ${u === m.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></label></div>
      ${tagPicker(m.tags || [], MAT_TAGS)}
      <label>Note<input name="note" value="${esc(m.note)}" placeholder="Good for kitchen shutters, 2 week lead time…"></label>
      ${isNew ? `<label class="check"><input type="checkbox" name="here" ${LS.get('useLoc', false) ? 'checked' : ''}> Remember where I am now</label>` : ''}
      ${linked.length ? `<p class="glabel">Goes with (from your library)</p><div class="mini">${linked.map(l => l.blob ? `<img src="${img(l)}" alt="">` : '').join('')}</div>` : ''}
      <div class="actions">${isNew ? '' : `<button type="button" class="btn danger ghost" data-act="matDel" data-id="${m.id}">Delete</button>`}<button class="btn primary">Save</button></div>
    </form>`, card => {
    const form = $('#mf', card);
    wireNewToggles(card, form);
    const rt = $('#mRetake', card);
    if (rt) rt.onclick = async () => {
      const f = await pickFiles({ multiple: false, camera: true });
      if (f[0]) matForm(m0 ? { ...m0, ...collect() } : collect(), await compress(f[0]));
    };
    const collect = () => ({
      type: form.type.value, brand: form.brand.value.trim(), code: form.code.value.trim(), finish: form.finish.value.trim(),
      price: form.price.value, unit: form.unit.value, tags: readTags(card), note: form.note.value.trim(),
    });
    form.onsubmit = async e => {
      e.preventDefault();
      const vendorId = await resolveContact(form);
      const o = { ...m, ...collect(), vendorId, id: m.id || uid(), created: m.created || Date.now() };
      if (form.here && form.here.checked) {
        try { const p = await getLoc(); o.lat = p.lat; o.lng = p.lng; LS.set('useLoc', true); } catch { toast('Could not get location'); }
      }
      await save('materials', o);
      closeSheet(); toast('Material saved');
      if (cur !== 'materials') location.hash = '#materials'; else render();
    };
  });
}

function contactForm(c0 = null) {
  const isNew = !c0;
  const c = { name: '', phone: '', category: 'Carpenter', area: '', rating: 0, notes: '', ...(c0 || {}) };
  const canPick = 'contacts' in navigator && 'select' in navigator.contacts;
  openSheet(`<h2>${isNew ? 'New contact' : esc(c.name)}</h2>
    <form id="cf" autocomplete="off">
      ${canPick ? '<button type="button" class="btn" id="cPick">${I.user}Pick from phone contacts</button>' : ''}
      <label>Name<input name="name" required value="${esc(c.name)}" placeholder="Murugan (carpenter)"></label>
      <label>Phone<input name="phone" type="tel" value="${esc(c.phone)}" placeholder="98xxxxxxxx"></label>
      <label>Type<select name="category">${CATS.map(x => `<option ${x === c.category ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Area<input name="area" value="${esc(c.area)}" placeholder="T. Nagar, Gandhipuram…"></label>
      <label>Your rating</label><div class="rating" id="rate">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" class="${n <= c.rating ? 'on' : ''}" aria-label="${n} star${n > 1 ? 's' : ''}">${STAR}</button>`).join('')}</div>
      <label>Your notes<textarea name="notes" rows="2" placeholder="Good at modular, slow on polish, gives credit…">${esc(c.notes)}</textarea></label>
      <label>Location</label>
      <div class="row"><button type="button" class="btn" id="cHere">${I.pin}I’m at their shop now</button><span class="meta" id="cLocTxt">${c.lat != null ? 'Location saved' : 'Not saved'}</span></div>
      <div class="actions">${isNew ? '' : `<button type="button" class="btn danger ghost" data-act="delC" data-id="${c.id}">Delete</button>`}<button class="btn primary">Save</button></div>
    </form>`, card => {
    const form = $('#cf', card);
    let rating = c.rating || 0, loc = c.lat != null ? { lat: c.lat, lng: c.lng } : null;
    $$('#rate button', card).forEach(b => b.onclick = () => {
      rating = +b.dataset.n === rating ? 0 : +b.dataset.n;
      $$('#rate button', card).forEach(x => x.classList.toggle('on', +x.dataset.n <= rating));
    });
    $('#cHere', card).onclick = async () => {
      $('#cLocTxt', card).textContent = 'Locating…';
      try { const p = await getLoc(); loc = { lat: p.lat, lng: p.lng }; $('#cLocTxt', card).textContent = 'Location saved'; LS.set('useLoc', true); }
      catch { $('#cLocTxt', card).textContent = 'Location blocked'; }
    };
    const pick = $('#cPick', card);
    if (pick) pick.onclick = async () => {
      try {
        const [r] = await navigator.contacts.select(['name', 'tel'], { multiple: false });
        if (r) { if (r.name?.[0]) form.name.value = r.name[0]; if (r.tel?.[0]) form.phone.value = r.tel[0]; }
      } catch { /* cancelled */ }
    };
    form.onsubmit = async e => {
      e.preventDefault();
      const o = { ...c, id: c.id || uid(), name: form.name.value.trim(), phone: form.phone.value.trim(), category: form.category.value,
        area: form.area.value.trim(), rating, notes: form.notes.value.trim(), created: c.created || Date.now() };
      delete o._d;
      if (loc) { o.lat = loc.lat; o.lng = loc.lng; }
      await save('contacts', o);
      closeSheet(); toast('Saved'); render();
    };
  });
}

function siteForm(s0 = null) {
  const isNew = !s0;
  const s = { name: '', client: '', area: '', ...(s0 || {}) };
  openSheet(`<h2>${isNew ? 'New site' : esc(s.name)}</h2>
    <form id="sf" autocomplete="off">
      <label>Site name<input name="name" required value="${esc(s.name)}" placeholder="Adyar – 3BHK"></label>
      <label>Client (short label)<input name="client" value="${esc(s.client)}" placeholder="Lakshmi residence"></label>
      <label>Area<input name="area" value="${esc(s.area)}" placeholder="Adyar, Chennai"></label>
      <label>Location</label>
      <div class="row"><button type="button" class="btn" id="sHere">${I.pin}I’m at the site now</button><span class="meta" id="sLocTxt">${s.lat != null ? 'Location saved' : 'Not saved'}</span></div>
      <div class="actions">${isNew ? '' : `<button type="button" class="btn danger ghost" data-act="delS" data-id="${s.id}">Delete</button>`}<button class="btn primary">Save</button></div>
    </form>`, card => {
    const form = $('#sf', card);
    let loc = s.lat != null ? { lat: s.lat, lng: s.lng } : null;
    $('#sHere', card).onclick = async () => {
      $('#sLocTxt', card).textContent = 'Locating…';
      try { const p = await getLoc(); loc = { lat: p.lat, lng: p.lng }; $('#sLocTxt', card).textContent = 'Location saved'; LS.set('useLoc', true); }
      catch { $('#sLocTxt', card).textContent = 'Location blocked'; }
    };
    form.onsubmit = async e => {
      e.preventDefault();
      const o = { ...s, id: s.id || uid(), name: form.name.value.trim(), client: form.client.value.trim(), area: form.area.value.trim(), created: s.created || Date.now() };
      if (loc) { o.lat = loc.lat; o.lng = loc.lng; }
      await save('sites', o);
      closeSheet(); toast('Site saved'); render();
    };
  });
}

/* ================= presentation mode ================= */
let presentOpen = false;
function presentSetup() {
  let items = libSel && libSel.size ? S.library.filter(x => libSel.has(x.id)) : libFiltered();
  items = items.filter(x => x.blob);
  if (!items.length) { toast('Add some images to the Library first'); location.hash = '#library'; return; }
  openSheet(`<h2>Present to a client</h2>
    <p class="meta">${items.length} image${items.length > 1 ? 's' : ''}${libQ ? ` matching “${esc(libQ)}”` : ''}. The client taps Like or Not for me, or swipes right or left. You get a taste note at the end.</p>
    <label>Who is this for?<input id="pClient" placeholder="e.g. Lakshmi – master bedroom"></label>
    <label class="check"><input type="checkbox" id="pShuffle" checked> Shuffle order</label>
    <div class="actions"><button class="btn primary" id="pGo">▶ Start</button></div>`, card => {
    $('#pGo', card).onclick = () => {
      const client = $('#pClient', card).value.trim();
      if ($('#pShuffle', card).checked) items = [...items].sort(() => Math.random() - 0.5);
      hideSheet();
      history.replaceState({ present: 1 }, '');
      startPresent(items, client);
    };
  });
}
function startPresent(items, client) {
  let i = 0, mode = 'show';
  const rx = {};
  const ov = $('#present');
  presentOpen = true;
  ov.classList.remove('hidden');
  document.body.classList.add('noscroll');
  const show = () => {
    if (i >= items.length) return finish();
    const x = items[i];
    ov.innerHTML = `<div class="p-top"><button class="icon-btn" data-p="close" aria-label="Close">${I.x}</button><span class="num">${i + 1} / ${items.length}</span><button class="btn small" data-p="finish">Finish</button></div>
      <div class="p-img"><img src="${img(x)}" alt=""></div>
      <div class="p-tags">${esc((x.tags || []).join(' · '))}</div>
      <div class="p-bot"><button class="p-btn no" data-p="no">Not for me</button><button class="p-btn skip" data-p="skip">Skip</button><button class="p-btn yes" data-p="yes">${I.heart}Like</button></div>`;
  };
  const decide = v => {
    if (mode !== 'show') return;
    if (v) rx[items[i].id] = v;
    const im = $('.p-img img', ov);
    mode = 'anim';
    if (im && v) im.classList.add(v > 0 ? 'fly-r' : 'fly-l');
    setTimeout(() => { mode = 'show'; i++; show(); }, v ? 170 : 0);
  };
  const finish = async () => {
    mode = 'sum';
    const t = taste(items, rx);
    const liked = items.filter(x => rx[x.id] > 0);
    const sess = { id: uid(), client, date: today(), created: Date.now(), items: items.map(x => x.id), rx, likes: t.likes, avoid: t.avoid, summary: t.text };
    if (t.nL + t.nD) await save('sessions', sess);
    ov.innerHTML = `<div class="p-top"><span></span><span>Taste note</span><button class="icon-btn" data-p="close" aria-label="Close">${I.x}</button></div>
      <div class="p-sum">${sessionBody(sess, liked)}
        <div class="actions" style="justify-content:flex-start"><button class="btn primary" data-p="copy">Copy note</button>${navigator.share ? '<button class="btn" data-p="share">Share</button>' : ''}<button class="btn" data-p="close">Done</button></div></div>`;
    ov._sess = sess;
  };
  ov.onclick = async e => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    const a = b.dataset.p;
    if (a === 'close') return history.back();
    if (a === 'finish') return finish();
    if (a === 'yes') return decide(1);
    if (a === 'no') return decide(-1);
    if (a === 'skip') return decide(0);
    if (a === 'copy') { try { await navigator.clipboard.writeText(noteText(ov._sess)); toast('Copied'); } catch { toast('Could not copy'); } }
    if (a === 'share') { try { await navigator.share({ text: noteText(ov._sess) }); } catch { /* cancelled */ } }
  };
  let sx = null;
  ov.ontouchstart = e => { sx = mode === 'show' ? e.touches[0].clientX : null; };
  ov.ontouchend = e => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 70) decide(dx > 0 ? 1 : -1);
  };
  show();
}
function endPresent() {
  presentOpen = false;
  const ov = $('#present');
  ov.classList.add('hidden'); ov.innerHTML = '';
  document.body.classList.remove('noscroll');
  libSel = null;
  render();
}
function taste(items, rx) {
  const score = {};
  for (const x of items) {
    const v = rx[x.id];
    if (!v) continue;
    for (const t of x.tags || []) if (t !== 'Shared') score[t] = (score[t] || 0) + v;
  }
  const likes = Object.keys(score).filter(t => score[t] > 0).sort((a, b) => score[b] - score[a]).slice(0, 6);
  const avoid = Object.keys(score).filter(t => score[t] < 0).sort((a, b) => score[a] - score[b]).slice(0, 4);
  const vals = Object.values(rx), nL = vals.filter(v => v > 0).length, nD = vals.filter(v => v < 0).length;
  const text = `Liked ${nL} of ${nL + nD}.` + (likes.length ? ` Leans towards: ${likes.join(', ')}.` : '') + (avoid.length ? ` Avoid: ${avoid.join(', ')}.` : '');
  return { likes, avoid, nL, nD, text };
}
function sessionBody(s, liked) {
  return `<h2>${esc(s.client || 'Client')}</h2><p>${esc(s.summary)}</p>
    ${s.likes.length ? `<p class="glabel">Leans towards</p><div class="taste">${s.likes.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
    ${s.avoid.length ? `<p class="glabel">Avoid</p><div class="taste avoid">${s.avoid.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
    ${liked.length ? `<p class="glabel">Loved (${liked.length})</p><div class="mini">${liked.map(x => `<img src="${img(x)}" alt="">`).join('')}</div>` : ''}
    ${!s.likes.length && !s.avoid.length ? '<p class="hint">Tag your library images (room, style, look) to get a richer taste note.</p>' : ''}`;
}
const noteText = s => `${s.client || 'Client'} – taste note (${fmtLong(s.date)})\n${s.summary}`;

/* ================= settings, backup, sample ================= */
function settingsSheet() {
  const np = 'Notification' in window ? Notification.permission : 'unsupported';
  openSheet(`<h2>Settings</h2>
    <label>Your name (for the greeting)<input id="stName" value="${esc(LS.get('name', ''))}"></label>
    <label>Default reminder time<input type="time" id="stTime" value="${LS.get('remTime', '09:30')}"></label>
    <label>Reminders</label>
    <div class="row">${np === 'granted' ? '<span class="meta">On</span><button class="btn small" data-act="testNotif">Send a test</button>'
      : np === 'denied' ? '<span class="meta">Blocked. Allow notifications for this site in Chrome settings.</span>'
      : np === 'unsupported' ? '<span class="meta">Not supported in this browser.</span>'
      : '<button class="btn primary small" data-act="enableNotif">Turn on reminders</button>'}</div>
    <label class="check"><input type="checkbox" id="stLoc" ${LS.get('useLoc', false) ? 'checked' : ''}> Use my location for “you’re nearby” tips</label>
    <p class="glabel" style="margin-top:22px">Your data</p>
    <p class="hint" style="margin-top:0">Everything stays on this phone. Take a backup now and then.</p>
    <div class="row" style="flex-wrap:wrap;margin-top:8px"><button class="btn" data-act="export">Back up</button><button class="btn" data-act="import">Restore</button></div>
    <p class="glabel" style="margin-top:22px">Demo</p>
    <div class="row" style="flex-wrap:wrap"><button class="btn" data-act="sample">Load sample data</button><button class="btn danger ghost" data-act="unsample">Remove sample data</button></div>
    <div class="actions"><button class="btn primary" id="stSave">Done</button></div>
    <p class="hint" style="text-align:center;margin-top:18px">StudioMate · early access</p>`, card => {
    $('#stSave', card).onclick = () => {
      LS.set('name', $('#stName', card).value.trim());
      LS.set('remTime', $('#stTime', card).value || '09:30');
      LS.set('useLoc', $('#stLoc', card).checked);
      closeSheet(); render();
    };
  });
}

async function enableNotif() {
  if (!('Notification' in window)) return toast('Notifications not supported here');
  const p = await Notification.requestPermission();
  if (p === 'granted') { toast('Reminders are on'); await initSW(); checkReminders(); }
  else toast('Reminders stay off');
  if (sheetOpen) settingsSheet(); else render();
}

const blobToData = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
async function exportData() {
  const out = { app: 'studiomate', v: 1, at: Date.now(), data: {} };
  for (const s of ['contacts', 'sites', 'followups', 'library', 'materials', 'sessions']) {
    out.data[s] = await Promise.all(S[s].map(async o => o.blob ? { ...o, blob: await blobToData(o.blob) } : o));
  }
  const b = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = `studiomate-backup-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Backup saved to Downloads');
}
function importData() {
  const i = document.createElement('input');
  i.type = 'file'; i.accept = 'application/json,.json';
  i.onchange = async () => {
    try {
      const j = JSON.parse(await i.files[0].text());
      if (j.app !== 'studiomate') throw new Error('Not a StudioMate backup');
      let n = 0;
      for (const [s, arr] of Object.entries(j.data)) {
        if (!STORES.includes(s)) continue;
        for (const o of arr) {
          if (typeof o.blob === 'string') o.blob = await (await fetch(o.blob)).blob();
          await save(s, o); n++;
        }
      }
      toast(`Restored ${n} items`); closeSheet(); render();
    } catch (e) { toast('Restore failed: ' + e.message); }
  };
  i.click();
}

async function loadSample() {
  const t = today(), d = n => addDays(t, n);
  const C = [
    { id: 'sc1', name: 'Ravi Plywoods', phone: '9840000001', category: 'Plywood / Laminate', area: 'Saidapet', rating: 4, notes: 'Best rates for Greenlam & Merino. Delivers in 2 days if paid upfront.', lat: 13.0213, lng: 80.2231 },
    { id: 'sc2', name: 'Murugan', phone: '9840000002', category: 'Carpenter', area: 'Velachery', rating: 5, notes: 'Excellent modular finishing. Busy, so book a week ahead.', lat: 12.9791, lng: 80.2209 },
    { id: 'sc3', name: 'Sri Balaji Hardware', phone: '9840000003', category: 'Hardware', area: 'Parrys', rating: 3, notes: 'Hettich & Ebco stock. Ask for trade discount.', lat: 13.0905, lng: 80.2879 },
    { id: 'sc4', name: 'Lumina Lights', phone: '9840000004', category: 'Lighting', area: 'Anna Nagar', rating: 4, notes: 'Good profile lights, slow on custom orders.', lat: 13.0850, lng: 80.2101 },
    { id: 'sc5', name: 'Selvam Polish Works', phone: '9840000005', category: 'Painter', area: 'Adyar', rating: 4, notes: 'PU polish specialist.', lat: 13.0012, lng: 80.2565 },
  ];
  const Si = [
    { id: 'ss1', name: 'Adyar – 3BHK', client: 'Lakshmi residence', area: 'Adyar', lat: 13.0063, lng: 80.2574 },
    { id: 'ss2', name: 'Velachery – Villa', client: 'Karthik family', area: 'Velachery', lat: 12.9815, lng: 80.2180 },
    { id: 'ss3', name: 'Anna Nagar – 2BHK', client: 'Priya & Arun', area: 'Anna Nagar', lat: 13.0878, lng: 80.2085 },
  ];
  const F = [
    { id: 'sf1', title: '8 sheets Greenlam 1234 SF', contactId: 'sc1', siteId: 'ss1', due: d(-2), time: '10:00', attempts: [{ at: Date.now() - 864e5, type: 'whatsapp' }] },
    { id: 'sf2', title: 'Kitchen shutters fixing date', contactId: 'sc2', siteId: 'ss2', due: d(0), time: '09:30' },
    { id: 'sf3', title: 'Tandem drawer channels × 12', contactId: 'sc3', siteId: 'ss1', due: d(0), time: '15:00' },
    { id: 'sf4', title: 'Profile lights quote for living', contactId: 'sc4', siteId: 'ss3', due: d(2), time: '11:00' },
    { id: 'sf5', title: 'PU polish – pooja unit', contactId: 'sc5', siteId: 'ss1', due: d(4), time: '09:30', recur: 'weekly' },
    { id: 'sf6', title: '6 sheets Merino 21557', contactId: 'sc1', siteId: 'ss2', due: d(-20), firstDue: d(-20), doneAt: d(-17), status: 'done' },
    { id: 'sf7', title: '18mm BWP ply × 10', contactId: 'sc1', siteId: 'ss3', due: d(-12), firstDue: d(-12), doneAt: d(-10), status: 'done' },
  ];
  const M = [
    { id: 'sm1', type: 'Laminate', brand: 'Merino', code: '21557 SF', finish: 'Suede', tone: '#6b4a33', vendorId: 'sc1', price: 1650, unit: 'sheet', tags: ['Walnut', 'Matte'] },
    { id: 'sm2', type: 'Laminate', brand: 'Greenlam', code: '1234 SF', finish: 'Suede', tone: '#b99a72', vendorId: 'sc1', price: 1890, unit: 'sheet', tags: ['Oak', 'Matte'] },
    { id: 'sm3', type: 'Hardware', brand: 'Hettich', code: 'InnoTech Atira', finish: 'Anthracite', tone: '#3b3d3e', vendorId: 'sc3', price: 4200, unit: 'piece', tags: [] },
    { id: 'sm4', type: 'Tile', brand: 'Kajaria', code: 'Eternity Beige', finish: 'Matt, 600×1200', tone: '#d8cdb9', vendorId: '', price: 98, unit: 'sq ft', tags: ['Beige', 'Stone look'] },
  ];
  for (const m of M) await save('materials', { note: '', ...m, sample: true, created: Date.now() });
  for (const c of C) await save('contacts', { ...c, sample: true, created: Date.now() });
  for (const s of Si) await save('sites', { ...s, sample: true, created: Date.now() });
  for (const f of F) await save('followups', { recur: '', status: 'open', attempts: [], firstDue: f.due, created: Date.now(), ...f, sample: true });
  toast('Sample data loaded'); closeSheet(); render();
}
async function removeSample() {
  for (const s of ['contacts', 'sites', 'followups', 'materials']) for (const o of S[s].filter(x => x.sample)) await remove(s, o.id);
  toast('Sample data removed'); closeSheet(); render();
}

/* ================= actions (click delegation) ================= */
let pendingOutcome = null;
const ACT = {
  settings: () => settingsSheet(),
  closeSheet: () => closeSheet(),
  newF: () => followForm(),
  voiceF: () => followForm(null, { autoListen: true }),
  newM: () => newMaterial(),
  newC: () => contactForm(),
  newS: () => siteForm(),
  addImages: () => addImages(),
  present: () => presentSetup(),
  enableNotif: () => enableNotif(),
  testNotif: async () => {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) reg.showNotification('Reminders are working', { body: 'You’ll get follow-ups like this.', icon: 'icon-192.png' });
  },
  export: () => exportData(),
  import: () => importData(),
  sample: () => loadSample(),
  unsample: () => removeSample(),

  editF: id => followForm(S.followups.find(f => f.id === id)),
  delF: async id => { if (!confirm('Delete this follow-up?')) return; await remove('followups', id); closeSheet(); render(); },
  fFilter: id => { fFilter = id; render(); },
  outcome: id => outcomeSheet(id),
  wa: id => waSheet(id),
  call: id => {
    const f = S.followups.find(x => x.id === id), c = f && contact(f.contactId);
    if (!c || !c.phone) return;
    f.attempts = (f.attempts || []).concat({ at: Date.now(), type: 'call' });
    logEvent(f, 'Called');
    pendingOutcome = id;
    location.href = 'tel:' + c.phone;
  },
  oDone: async id => {
    const f = S.followups.find(x => x.id === id);
    f.status = 'done'; f.doneAt = today();
    await logEvent(f, 'Marked done');
    if (f.recur) {
      const next = addDays(f.due > today() ? f.due : today(), 7);
      await save('followups', { ...f, id: uid(), status: 'open', doneAt: '', due: next, firstDue: next, attempts: [], log: [], created: Date.now() });
    }
    closeSheet(); toast('Marked done'); render();
  },
  oDate: async id => {
    const f = S.followups.find(x => x.id === id), nd = $('#oNew').value;
    if (!nd) return;
    f.due = nd; f.promised = (f.promised || []).concat(nd);
    await logEvent(f, 'Promised ' + fmtLong(nd));
    closeSheet(); toast('Moved to ' + fmtLong(nd)); render();
  },
  oNoReply: async id => {
    const f = S.followups.find(x => x.id === id);
    f.due = addDays(today(), 1); f.time = LS.get('remTime', '09:30');
    await logEvent(f, 'No reply');
    closeSheet(); toast('Will remind you tomorrow'); render();
  },
  oSnooze: async (id, b) => {
    const f = S.followups.find(x => x.id === id);
    if (b.dataset.h === '1') {
      const t = new Date(Date.now() + 3600e3);
      f.due = ymd(t); f.time = hhmm(t);
    } else { f.due = addDays(today(), 1); f.time = LS.get('remTime', '09:30'); }
    await logEvent(f, 'Snoozed');
    closeSheet(); toast('Snoozed'); render();
  },

  libTag: t => {
    const words = libQ.toLowerCase().split(/\s+/).filter(Boolean);
    const lt = t.toLowerCase();
    libQ = words.includes(lt) ? words.filter(w => w !== lt).join(' ') : [...words, lt].join(' ');
    render();
  },
  libSelect: () => { libSel = new Set(); render(); },
  libSelCancel: () => { libSel = null; render(); },
  libToggle: id => { libSel.has(id) ? libSel.delete(id) : libSel.add(id); render(); },
  libOpen: id => libDetail(id),
  libDel: async id => { if (!confirm('Delete this image?')) return; await remove('library', id); closeSheet(); render(); },
  sessOpen: id => {
    const s = S.sessions.find(x => x.id === id);
    const liked = S.library.filter(x => s.rx[x.id] > 0);
    openSheet(`<div class="p-sess">${sessionBody(s, liked)}</div>
      <div class="actions"><button class="btn danger ghost" data-act="sessDel" data-id="${id}">Delete</button><button class="btn primary" data-act="sessCopy" data-id="${id}">Copy note</button></div>`);
  },
  sessCopy: async id => { try { await navigator.clipboard.writeText(noteText(S.sessions.find(x => x.id === id))); toast('Copied'); } catch { toast('Could not copy'); } },
  sessDel: async id => { await remove('sessions', id); closeSheet(); render(); },

  matType: t => { matType = t; render(); },
  matOpen: id => matForm(S.materials.find(m => m.id === id)),
  matDel: async id => { if (!confirm('Delete this material?')) return; await remove('materials', id); closeSheet(); render(); },
  matOrder: id => {
    const m = S.materials.find(x => x.id === id);
    followForm(null, { title: [m.brand, m.code, m.finish].filter(Boolean).join(' '), contactId: m.vendorId || '' });
  },

  pTab: t => { pTab = t; render(); },
  pCat: c => { pCat = c; render(); },
  nearMe: async () => {
    toast('Finding you…');
    try { const p = await getLoc(); nearFrom = { ...p, label: 'me' }; LS.set('useLoc', true); render(); }
    catch { toast('Allow location to sort by distance'); }
  },
  nearOff: () => { nearFrom = null; render(); },
  nearSite: id => { const s = site(id); nearFrom = { lat: s.lat, lng: s.lng, label: s.name }; pTab = 'contacts'; render(); window.scrollTo(0, 0); },
  siteFollowups: id => { fSite = id; fFilter = 'open'; location.hash = '#followups'; },
  editC: id => contactForm(S.contacts.find(c => c.id === id)),
  delC: async id => { if (!confirm('Delete this contact?')) return; await remove('contacts', id); closeSheet(); render(); },
  newFfor: id => followForm(null, { contactId: id }),
  editS: id => siteForm(site(id)),
  delS: async id => { if (!confirm('Delete this site?')) return; await remove('sites', id); closeSheet(); render(); },
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.closest('#present')) return;
  const fn = ACT[b.dataset.act];
  if (!fn) return;
  e.preventDefault();
  fn(b.dataset.id, b, e);
});

window.addEventListener('popstate', () => {
  if (presentOpen) endPresent();
  else if (sheetOpen) hideSheet();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  checkReminders();
  if (pendingOutcome) {
    const id = pendingOutcome;
    pendingOutcome = null;
    render();
    setTimeout(() => outcomeSheet(id), 350);
  }
});

/* ================= service worker & boot ================= */
async function initSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    if ('periodicSync' in reg) {
      try {
        const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (st.state === 'granted') await reg.periodicSync.register('reminders', { minInterval: 60 * 60e3 });
      } catch { /* not allowed until installed */ }
    }
  } catch (e) { console.warn('SW failed', e); }
}
async function processInbox() {
  if (!S.inbox.length) return;
  let n = 0;
  for (const it of S.inbox) {
    const o = { id: uid(), tags: ['Shared'], note: it.text || '', url: it.url || '', created: Date.now() };
    if (it.blob) o.blob = await compress(it.blob);
    await save('library', o);
    await remove('inbox', it.id);
    n++;
  }
  if (n) { toast(`${n} shared item${n > 1 ? 's' : ''} added to Library`); location.hash = '#library'; }
}

(async function boot() {
  $$('[data-ic]').forEach(el => el.insertAdjacentHTML('afterbegin', I[el.dataset.ic]));
  try {
    await DB.open();
    await load();
  } catch (e) {
    $('#view').innerHTML = `<div class="empty"><p>Storage is blocked in this browser, so StudioMate can’t save data. Try opening it in Chrome (not incognito).</p></div>`;
    return;
  }
  // ?demo fills an empty app with the sample data, for showing it to someone
  if (/[?&]demo\b/.test(location.search) && !S.followups.length) await loadSample();
  render();
  await processInbox();
  initSW().then(checkReminders);
  setInterval(checkReminders, 60e3);
})();
