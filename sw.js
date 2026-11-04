/* StudioMate service worker: offline shell, "Share to StudioMate", background reminders */
const V = 'sm-v24';
const SHELL = ['./', 'index.html', 'app.js', 'features.js', 'calendar.js', 'nearby.js', 'theme.js', 'cloud.js', 'buddy.js', 'tour.js', 'design.js', 'ai.js', 'styles.css', 'manifest.json', 'icon-192.png', 'icon-512.png'];
const STORES = ['contacts', 'sites', 'followups', 'library', 'materials', 'sessions', 'inbox', 'meta', 'decisions', 'boards', 'designs'];

self.addEventListener('install', e => {
  // bypass the browser's HTTP cache, so a new version never stores stale copies
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.pathname.endsWith('/share-target')) {
    e.respondWith(handleShare(e.request));
    return;
  }
  if (e.request.method !== 'GET') return;
  const sameOrigin = u.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!sameOrigin && !isFont) return;
  // stale-while-revalidate: instant from cache, refreshed in the background
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: sameOrigin });
    const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }).catch(() => hit);
    if (hit) { e.waitUntil(net); return hit; }
    return net;
  }));
});

/* IndexedDB, same schema as app.js */
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('studiomate', 3);
    r.onupgradeneeded = () => { for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const all = (db, s) => req(db.transaction(s).objectStore(s).getAll());
const get = (db, s, id) => req(db.transaction(s).objectStore(s).get(id));
const put = (db, s, v) => req(db.transaction(s, 'readwrite').objectStore(s).put(v));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* Share sheet: Pinterest usually sends a link, the gallery sends the image */
async function handleShare(request) {
  try {
    const fd = await request.formData();
    const files = fd.getAll('image').filter(f => f && f.size);
    const text = [fd.get('title'), fd.get('text'), fd.get('url')].filter(Boolean).join(' ');
    const db = await openDB();
    const items = files.map(f => ({ id: uid(), blob: f, text, created: Date.now() }));
    if (!items.length && text) {
      const m = text.match(/https?:\/\/\S+/);
      items.push({ id: uid(), url: m ? m[0] : '', text, created: Date.now() });
    }
    for (const it of items) await put(db, 'inbox', it);
  } catch (err) { /* the app opens anyway */ }
  return Response.redirect('./#library', 303);
}

/* Background reminders via Chrome periodic sync (best effort: Chrome decides how often) */
const z = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
const hhmm = d => `${z(d.getHours())}:${z(d.getMinutes())}`;

async function checkDue() {
  const db = await openDB();
  const now = new Date(), t = ymd(now);
  const fs = await all(db, 'followups');
  const contacts = await all(db, 'contacts');
  const meta = (await get(db, 'meta', 'notified')) || { id: 'notified', map: {} };
  let changed = false;
  for (const f of fs) {
    if (f.status === 'done') continue;
    const due = f.due < t || (f.due === t && (f.time || '00:00') <= hhmm(now));
    if (!due) continue;
    const k = f.due < t ? `${f.id}|late|${t}` : `${f.id}|${f.due}|${f.time || ''}`;
    if (meta.map[k]) continue;
    const c = contacts.find(x => x.id === f.contactId);
    await self.registration.showNotification(f.title, {
      body: (c ? c.name + ' · ' : '') + (f.due < t ? 'Overdue' : 'Follow up now'),
      tag: f.id, icon: 'icon-192.png', badge: 'icon-192.png', data: { id: f.id },
    });
    meta.map[k] = Date.now(); changed = true;
  }
  if (changed) await put(db, 'meta', meta);
}
self.addEventListener('periodicsync', e => { if (e.tag === 'reminders') e.waitUntil(checkDue()); });

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./#followups');
  }));
});
