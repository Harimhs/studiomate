'use strict';
/* Mira: a sample-swatch companion who lives in the corner. She knows the day's work, writes messages,
   gives design ideas through Gemini, and proposes actions that only happen when the designer taps them.
   Also here: how the app feels (swipe a follow-up, soft screen changes, a small vibration on success). */

/* ---------- Mira herself: an original drawing, coloured by the screen ---------- */
const MIRA_ICON = CLOUD;

let miraLog = [];   // this session's conversation
let miraBusy = false;
const vibe = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* not allowed */ } };

const roam = { el: null, x: 0, y: 0, drag: null, moved: false, timer: 0, pauseUntil: 0 };
const navH = () => innerWidth >= 900 ? 0 : (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 62);
function roamBounds() {
  const side = innerWidth >= 900 ? 236 : 6;   // keep clear of the desktop sidebar
  return { minX: side, maxX: Math.max(side, innerWidth - 82), minY: 60, maxY: Math.max(60, innerHeight - navH() - 76) };
}
function cloudInit() {
  if ($('#cloud')) return;
  document.body.insertAdjacentHTML('beforeend', `<button id="cloud" class="roam" aria-label="Ask Mira, your assistant">${CLOUD()}</button>`);
  const el = roam.el = $('#cloud');
  // first spot once the page has a size: bottom right, or where she last left it
  const home = () => {
    if (!innerWidth || !innerHeight) return requestAnimationFrame(home);
    const b = roamBounds(), saved = LS.get('cloudPos', null);
    place(saved ? saved.x : b.maxX - 4, saved ? saved.y : b.maxY - 10);
  };
  home();
  el.addEventListener('pointerdown', e => {
    roam.drag = { sx: e.clientX, sy: e.clientY, x: roam.x, y: roam.y }; roam.moved = false;
    el.setPointerCapture(e.pointerId); el.classList.add('held');
  });
  el.addEventListener('pointermove', e => {
    if (!roam.drag) return;
    const dx = e.clientX - roam.drag.sx, dy = e.clientY - roam.drag.sy;
    if (Math.hypot(dx, dy) > 6) roam.moved = true;
    if (roam.moved) place(roam.drag.x + dx, roam.drag.y + dy);
  });
  const drop = () => {
    if (roam.drag && roam.moved) { LS.set('cloudPos', { x: roam.x, y: roam.y }); roam.pauseUntil = Date.now() + 25000; vibe(6); }
    roam.drag = null; el.classList.remove('held');
  };
  el.addEventListener('pointerup', drop);
  el.addEventListener('pointercancel', drop);
  el.addEventListener('click', e => { if (roam.moved) { roam.moved = false; e.preventDefault(); return; } openMira(); });
  // her finger catches its eye
  document.addEventListener('pointerdown', e => { if (!e.target.closest('#cloud')) lookAt(e.clientX, e.clientY); }, true);
  addEventListener('resize', () => place(roam.x, roam.y));
  setInterval(() => { if (!document.hidden && roam.el) { roam.el.classList.add('blink'); setTimeout(() => roam.el.classList.remove('blink'), 150); } }, 3800);
  requestAnimationFrame(flowTick);
  setInterval(pointAtOverdue, 300);
}
/* the cloud drifts all the time: a slow pull toward a goal, plus a gentle wave */
const flow = { bx: 0, by: 0, tx: 0, ty: 0, next: 0, last: 0 };
function place(x, y) {
  const b = roamBounds();
  x = Math.max(b.minX, Math.min(b.maxX, x)); y = Math.max(b.minY, Math.min(b.maxY, y));
  flow.bx = flow.tx = roam.x = x; flow.by = flow.ty = roam.y = y;
  roam.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}
function flowTick(now) {
  requestAnimationFrame(flowTick);
  const el = roam.el;
  if (!el || roam.drag || document.hidden) return;
  const still = LS.get('cloudStill', false) || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const open = document.body.classList.contains('noscroll');
  if (!still && !open && now > flow.next && Date.now() > roam.pauseUntil && !miraBusy) {
    const p = freeSpot();
    if (p) { flow.tx = p.x; flow.ty = p.y; }
    flow.next = now + 7000 + Math.random() * 9000;
  }
  if (!still) {
    const bb = roamBounds();
    flow.tx = Math.max(bb.minX + 10, Math.min(bb.maxX - 10, flow.tx)); flow.ty = Math.max(bb.minY + 8, Math.min(bb.maxY - 8, flow.ty));
    const dx = flow.tx - flow.bx, dy = flow.ty - flow.by, d = Math.hypot(dx, dy);
    // time-based, so a slow phone that drops frames drifts at the same speed
    const dt = Math.min(0.5, flow.last ? (now - flow.last) / 1000 : 0.016), pull = 1 - Math.exp(-dt / 1.8);
    flow.bx += dx * pull; flow.by += dy * pull;
    flow.bx = Math.max(bb.minX + 10, Math.min(bb.maxX - 10, flow.bx)); flow.by = Math.max(bb.minY + 8, Math.min(bb.maxY - 8, flow.by));
    const t = now / 1000;
    roam.x = flow.bx + Math.sin(t * 0.8) * 10;
    roam.y = flow.by + Math.sin(t * 1.25 + 1.3) * 8;
    el.style.transform = `translate3d(${roam.x.toFixed(1)}px, ${roam.y.toFixed(1)}px, 0)`;
    if (d > 12 && !el.classList.contains('pointing')) look(dx / d, (dy / d) * 0.8);
  }
  flow.last = now;
}
/* when something is overdue and the cloud is near it, one thin arm points at it */
function pointAtOverdue() {
  const el = roam.el, arm = el && $('.cl-arm', el);
  if (!arm) return;
  const card = document.body.dataset.mood === 'worried' && !document.body.classList.contains('noscroll') && $('.fu.overdue');
  const r = card && card.getBoundingClientRect();
  const visible = r && r.bottom > 70 && r.top < innerHeight - navH() - 20;
  // the cloud's SVG maps 124 units onto its 84 px box
  const k = el.clientWidth / 124, cx = roam.x + (52 + 12) * k, cy = roam.y + (47 + 24) * k;
  const tx = r && r.left + Math.min(r.width * 0.35, 150), ty = r && r.top + r.height / 2;
  if (!visible || Math.hypot(tx - cx, ty - cy) > 340) { el.classList.remove('pointing'); return; }
  const right = tx >= cx;
  const sx = right ? 84 : 20, sy = 52;
  const ang = Math.atan2(ty - (roam.y + (sy + 24) * k), tx - (roam.x + (sx + 12) * k)) * 180 / Math.PI;
  arm.setAttribute('transform', `translate(${sx} ${sy}) rotate(${ang.toFixed(1)})`);
  el.classList.add('pointing');
  look(Math.cos(ang * Math.PI / 180), Math.sin(ang * Math.PI / 180) * 0.8);
}
function look(lx, ly) { const g = roam.el && $('.cl-eyes', roam.el); if (g) g.style.transform = `translate(${(lx * 4).toFixed(1)}px, ${(ly * 3).toFixed(1)}px)`; }
function lookAt(px, py) {
  if (!roam.el) return;
  const dx = px - (roam.x + 40), dy = py - (roam.y + 32), m = Math.hypot(dx, dy) || 1;
  look(dx / m, dy / m);
  clearTimeout(roam.lookT); roam.lookT = setTimeout(() => look(0, 0), 1800);
}
function pickSpot() {
  const b = roamBounds();
  const od = document.body.dataset.mood === 'worried' && $('.fu.overdue');
  if (od && Math.random() < 0.5) {
    const r = od.getBoundingClientRect();
    if (r.top > 80 && r.top < b.maxY) return { x: Math.min(b.maxX, r.left + r.width * 0.55), y: Math.max(b.minY, r.top - 96) };
  }
  return { x: b.minX + Math.random() * (b.maxX - b.minX), y: b.minY + Math.pow(Math.random(), 1.5) * (b.maxY - b.minY) };
}
/* never park on something she might tap */
const TAPPABLE = 'button, a, input, select, textarea, label, .fu-main, .chip, .thumb, .mcard, .dec, .site-row, .step';
function blocks(x, y) {
  const el = roam.el;
  if (el) el.style.visibility = 'hidden';
  const pts = [[14, 18], [66, 18], [40, 32], [14, 50], [66, 50]];
  const hit = pts.some(([dx, dy]) => { const t = document.elementFromPoint(x + dx, y + dy); return t && t.closest(TAPPABLE) && !t.closest('#cloud'); });
  if (el) el.style.visibility = '';
  return hit;
}
function freeSpot() {
  for (let i = 0; i < 14; i++) { const p = pickSpot(); const b = roamBounds(); const x = Math.max(b.minX, Math.min(b.maxX, p.x)), y = Math.max(b.minY, Math.min(b.maxY, p.y)); if (!blocks(x, y)) return { x, y }; }
  return null;
}
let scrollT;
addEventListener('scroll', () => {
  clearTimeout(scrollT);
  scrollT = setTimeout(() => { if (roam.el && !roam.drag && blocks(roam.x, roam.y)) { const p = freeSpot(); if (p) { flow.tx = p.x; flow.ty = p.y; } } }, 250);
}, { passive: true });

let moodHold = 0;
function setMood(m) { if (m) document.body.dataset.mood = m; else delete document.body.dataset.mood; }
function miraNudge() {
  if (Date.now() < moodHold) return;
  const h = new Date().getHours();
  const od = S.followups.some(f => isOpen(f) && bucket(f) === 'overdue');
  const td = S.followups.some(f => isOpen(f) && bucket(f) === 'today');
  setMood(miraBusy ? 'thinking' : h >= 22 || h < 6 ? 'sleepy' : od ? 'worried' : !td ? 'happy' : '');
  roam.el && roam.el.setAttribute('aria-label', od ? 'Ask Mira. Something is overdue.' : 'Ask Mira, your assistant');
}
function cheer() { moodHold = Date.now() + 4500; setMood('happy'); roam.el && roam.el.classList.add('hop'); setTimeout(() => { roam.el && roam.el.classList.remove('hop'); moodHold = 0; miraNudge(); }, 4500); }

/* ---------- weather and time of day ---------- */
let sky = null;
const skyOverride = () => { const q = location.search; return { wx: (q.match(/[?&]sky=(\w+)/) || [])[1], tod: (q.match(/[?&]tod=(\w+)/) || [])[1] }; };
async function skyPlace() {
  if (LS.get('useLoc', false)) { try { const p = await getLoc(); return { lat: p.lat, lng: p.lng, label: 'where you are' }; } catch { /* fall back */ } }
  const st = S.sites.find(x => x.lat != null);
  return st ? { lat: st.lat, lng: st.lng, label: st.area || st.name } : { lat: 13.08, lng: 80.27, label: 'Chennai' };
}
async function updateSky() {
  const o = skyOverride();
  document.body.dataset.time = o.tod || timeOfDay();
  let w = LS.get('wx', null);
  if (!o.wx && navigator.onLine && (!w || Date.now() - w.at > 30 * 60e3)) {
    try {
      const pl = await skyPlace();
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pl.lat.toFixed(2)}&longitude=${pl.lng.toFixed(2)}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`, { signal: AbortSignal.timeout(10000) });
      const c = (await r.json()).current;
      if (c) { w = { code: c.weather_code, temp: c.temperature_2m, wind: c.wind_speed_10m, place: pl.label, at: Date.now() }; LS.set('wx', w); }
    } catch { /* keep the last known sky */ }
  }
  sky = w;
  const kind = o.wx || (w ? wxKind(w) : '');
  if (kind) document.body.dataset.weather = kind; else delete document.body.dataset.weather;
}
const skyLine = () => sky ? `${WX_WORDS[wxKind(sky)]} in ${sky.place}, ${Math.round(sky.temp)}°` : '';

/* what Mira knows: a short summary of the designer's own data */
function contextFor() {
  const t = today();
  const fu = openFollowups().slice(0, 25).map(f => `- ${f.title} | ${contact(f.contactId)?.name || 'no contact'} | ${site(f.siteId)?.name || 'no site'} | due ${f.due}${f.due < t ? ' (OVERDUE)' : ''}`).join('\n');
  const sites = S.sites.map(s => {
    const decs = S.decisions.filter(d => d.siteId === s.id && !d.replacedBy).map(d => `${d.room}: ${d.item} = ${d.choice}${d.cost ? ' ₹' + d.cost : ''}`).join('; ');
    return `- ${s.name} (${s.client || ''}, ${s.area || ''})${s.budget ? ' budget ₹' + s.budget : ''}${decs ? ' | approved: ' + decs : ''}`;
  }).join('\n');
  const people = S.contacts.map(c => `- ${c.name} (${c.category}${c.area ? ', ' + c.area : ''})${recordText(c.id) ? ' ' + recordText(c.id) : ''}`).join('\n');
  const mats = S.materials.slice(0, 30).map(m => `- ${[m.brand, m.code, m.finish].filter(Boolean).join(' ')}${m.price ? ' ₹' + m.price + '/' + m.unit : ''}${contact(m.vendorId) ? ' from ' + contact(m.vendorId).name : ''}`).join('\n');
  return `Today is ${t} (${new Date().toLocaleDateString('en-IN', { weekday: 'long' })}), ${timeOfDay()}.${sky ? ` Weather: ${skyLine()}, wind ${Math.round(sky.wind)} km/h.` : ''}
Open follow-ups:\n${fu || '- none'}\nSites:\n${sites || '- none'}\nPeople:\n${people || '- none'}\nSaved samples:\n${mats || '- none'}`;
}

function openMira() {
  vibe(8);
  const name = LS.get('name', '');
  const od = S.followups.filter(f => isOpen(f) && bucket(f) === 'overdue');
  const td = S.followups.filter(f => isOpen(f) && bucket(f) === 'today');
  const hello = miraLog.length ? '' : `<div class="msg mira-msg">Hi${name ? ' ' + esc(name) : ''}! ${od.length ? `${od.length} thing${od.length > 1 ? 's are' : ' is'} overdue${od[0] ? `, starting with <b>${esc(od[0].title)}</b>` : ''}.` : td.length ? `You have ${td.length} follow-up${td.length > 1 ? 's' : ''} today.` : 'Nothing is waiting on you right now.'} What can I do?</div>`;
  const chips = ['What’s pending today?', 'Write a Tamil reminder for my oldest follow-up', 'Ideas for a small pooja unit', 'Which vendor is usually late?'];
  openSheet(`<div class="mira-head">${MIRA_ICON()}<div><h2>Mira</h2><p class="meta">${skyLine() ? esc(skyLine()) + ' · ' : ''}${aiKey() ? 'Your studio assistant' : 'Add a Gemini key in Settings so I can think with you'}</p></div></div>
    <div class="chat" id="chat">${hello}${miraLog.map(m => msgHtml(m)).join('')}</div>
    <div class="chips chat-chips">${chips.map(c => `<button type="button" class="chip" data-ask="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <form id="miraForm" class="chat-input" autocomplete="off">
      <button type="button" class="btn round" id="miraMic" aria-label="Speak to Mira">${I.mic}</button>
      <input id="miraQ" placeholder="Ask Mira anything" aria-label="Message Mira">
      <button class="btn round primary" aria-label="Send">${I.send}</button>
    </form>`, card => {
    card.classList.add('mira-sheet');
    const chat = $('#chat', card);
    chat.scrollTop = chat.scrollHeight;
    $$('[data-ask]', card).forEach(b => b.onclick = () => ask(b.dataset.ask));
    $('#miraForm', card).onsubmit = e => { e.preventDefault(); const q = $('#miraQ').value.trim(); if (q) ask(q); };
    $('#miraMic', card).onclick = e => listen(LS.get('vlang', 'en-IN'), t => ask(t), e.currentTarget);
    wireActions(card);
  });
}
function msgHtml(m) {
  if (m.role === 'user') return `<div class="msg me">${esc(m.text)}</div>`;
  const acts = (m.actions || []).map((a, i) => `<div class="act-card"><span>${actLabel(a)}</span>
    ${a.done ? '<b class="act-done">Done</b>' : `<button class="btn small primary" data-run="${m.id}:${i}">${a.type === 'whatsapp' ? 'Open WhatsApp' : 'Add'}</button>`}</div>`).join('');
  return `<div class="msg mira-msg">${fmtReply(m.text)}${acts}</div>`;
}
const fmtReply = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
function actLabel(a) {
  if (a.type === 'add_followup') return `Follow-up: <b>${esc(a.title)}</b>${a.contact ? ' · ' + esc(a.contact) : ''} · ${a.due ? fmtDate(a.due) : 'Today'}`;
  if (a.type === 'whatsapp') return `Message to <b>${esc(a.contact || 'someone')}</b>`;
  return esc(a.type);
}
async function ask(q) {
  if (miraBusy) return;
  const chat = $('#chat');
  miraLog.push({ role: 'user', text: q });
  chat.insertAdjacentHTML('beforeend', msgHtml({ role: 'user', text: q }) + '<div class="msg mira-msg typing" id="typing"><i></i><i></i><i></i></div>');
  $('#miraQ').value = '';
  chat.scrollTop = chat.scrollHeight;
  $('#cloud')?.classList.add('thinking'); setMood('thinking'); $('.mira-head .mira')?.classList.add('thinking');
  miraBusy = true;
  let m;
  try {
    m = aiKey() ? await miraThink(q) : { text: offlineReply(q), actions: [] };
  } catch (e) { m = { text: aiError(e, 'text'), actions: [] }; }
  finally { miraBusy = false; $('#cloud')?.classList.remove('thinking'); miraNudge(); $('.mira-head .mira')?.classList.remove('thinking'); }
  m.id = uid(); m.role = 'mira';
  miraLog.push(m);
  $('#typing')?.remove();
  chat.insertAdjacentHTML('beforeend', msgHtml(m));
  chat.scrollTop = chat.scrollHeight;
  wireActions(chat);
  vibe(6);
}
async function miraThink(q) {
  const history = miraLog.slice(-8, -1).map(m => `${m.role === 'user' ? 'Designer' : 'Mira'}: ${m.text}`).join('\n');
  const prompt = `You are Mira, a warm, brief assistant inside StudioMate, the phone app of a senior interior designer in Chennai who works on full homes.
Answer in 1-4 short sentences unless asked for more. Use the designer's data below; never invent vendors, prices or dates that are not there. If she writes in Tamil or Tanglish, reply the same way.
When she clearly asks to remember, add or chase something, propose an action. Actions are only suggestions until she taps them: never say you have saved, set or sent anything; say “Tap Add to save it” or “Tap Open WhatsApp to send it”. If she asks for Tamil, write the message in Tamil script; use Tanglish only if she asks for Tanglish. When she asks you to write a message to a vendor or client, put the full message text in the action's "text" and name the contact. Dates are YYYY-MM-DD.
${contextFor()}
${history ? 'Conversation so far:\n' + history : ''}
Designer: ${q}`;
  const schema = { type: 'OBJECT', properties: { reply: { type: 'STRING' }, actions: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
    type: { type: 'STRING', enum: ['add_followup', 'whatsapp'] }, title: { type: 'STRING' }, contact: { type: 'STRING' }, site: { type: 'STRING' },
    due: { type: 'STRING' }, text: { type: 'STRING' } }, required: ['type'] } } }, required: ['reply'] };
  const j = await firstModel(AI_TEXT, { contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.6 } });
  const r = JSON.parse(j.candidates[0].content.parts.map(p => p.text || '').join(''));
  return { text: r.reply || '…', actions: (r.actions || []).slice(0, 3) };
}
function offlineReply(q) {
  const od = S.followups.filter(f => isOpen(f) && bucket(f) === 'overdue');
  const td = S.followups.filter(f => isOpen(f) && bucket(f) === 'today');
  if (/pending|today|due|overdue/i.test(q)) return od.length || td.length
    ? `${od.length ? `Overdue: ${od.map(f => f.title).join(', ')}. ` : ''}${td.length ? `Today: ${td.map(f => f.title).join(', ')}.` : ''}`
    : 'Nothing pending. Enjoy the quiet.';
  return 'I can count what’s due without AI, but to write messages and suggest designs I need a Gemini key. Add it in Settings → AI design.';
}
const findContact = n => n && S.contacts.find(c => c.name.toLowerCase().includes(String(n).toLowerCase().split(' ')[0]));
function wireActions(root) {
  $$('[data-run]', root).forEach(b => b.onclick = async () => {
    const [mid, i] = b.dataset.run.split(':');
    const m = miraLog.find(x => x.id === mid), a = m && m.actions[+i];
    if (!a || a.done) return;
    const c = findContact(a.contact);
    if (a.type === 'whatsapp') {
      window.open(waUrl(c && c.phone, a.text || ''), '_blank');
    } else {
      const st = a.site && S.sites.find(s => s.name.toLowerCase().includes(a.site.toLowerCase().split(' ')[0]));
      const due = /^\d{4}-\d{2}-\d{2}$/.test(a.due || '') ? a.due : today();
      await save('followups', { id: uid(), title: a.title || 'Follow up', contactId: c ? c.id : '', siteId: st ? st.id : '', due, time: LS.get('remTime', '09:30'),
        recur: '', status: 'open', attempts: [], firstDue: due, created: Date.now() });
    }
    a.done = true;
    b.outerHTML = '<b class="act-done">Done</b>';
    vibe([10, 40, 10]);
    if (a.type === 'add_followup') { toast('Follow-up added'); miraNudge(); }
  });
}

/* ---------- feel: swipe a follow-up right for done, left for tomorrow ---------- */
function wireSwipes() {
  $$('.fu:not(.done)').forEach(row => {
    if (row.dataset.swipe) return;
    row.dataset.swipe = '1';
    const main = $('.fu-main', row);
    const id = main && main.dataset.id;
    if (!id) return;
    let sx = 0, sy = 0, dx = 0, on = false, locked = null;
    row.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || e.target.closest('.fu-acts')) return; sx = e.clientX; sy = e.clientY; dx = 0; on = true; locked = null; });
    row.addEventListener('pointermove', e => {
      if (!on) return;
      const mx = e.clientX - sx, my = e.clientY - sy;
      if (locked == null && Math.hypot(mx, my) > 10) locked = Math.abs(mx) > Math.abs(my) * 1.3;
      if (!locked) return;
      dx = mx;
      row.classList.add('dragging');
      row.style.transform = `translateX(${Math.max(-130, Math.min(130, dx))}px)`;
      row.classList.toggle('sw-done', dx > 70); row.classList.toggle('sw-later', dx < -70);
    });
    const end = async () => {
      if (!on) return;
      on = false;
      row.classList.remove('dragging');
      row.style.transform = '';
      const go = dx > 90 ? 'oDone' : dx < -90 ? 'snoozeTomorrow' : null;
      row.classList.remove('sw-done', 'sw-later');
      if (locked && go) {
        main.dataset.swiped = '1'; setTimeout(() => delete main.dataset.swiped, 400);
        vibe(go === 'oDone' ? [10, 40, 10] : 12);
        if (go === 'oDone') await ACT.oDone(id);
        else { const f = S.followups.find(x => x.id === id); f.due = addDays(today(), 1); f.time = LS.get('remTime', '09:30'); await logEvent(f, 'Snoozed by swipe'); render(); toast('Moved to tomorrow'); }
      }
    };
    row.addEventListener('pointerup', end);
    row.addEventListener('pointercancel', () => { on = false; row.style.transform = ''; row.classList.remove('sw-done', 'sw-later'); });
  });
}
/* a swipe must not also open the row */
document.addEventListener('click', e => { const m = e.target.closest('.fu-main[data-swiped]'); if (m) { e.stopPropagation(); e.preventDefault(); } }, true);

/* ---------- feel: soft change between screens ---------- */
const renderBeforeFeel = render;
let viaNav = false;
window.addEventListener('hashchange', () => { viaNav = true; }, true);
render = function (focusId) {
  const run = () => {
    renderBeforeFeel(focusId); wireSwipes(); miraNudge();
    setTimeout(() => { if (roam.el && !roam.drag && blocks(roam.x, roam.y)) { const p = freeSpot(); if (p) { flow.tx = p.x; flow.ty = p.y; } } }, 400);
  };
  if (viaNav && document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) { viaNav = false; document.startViewTransition(run); }
  else { viaNav = false; run(); }
};

ACT.openMira = () => openMira();
const settingsBeforeCloud = ACT.settings;
ACT.settings = () => {
  settingsBeforeCloud();
  const card = $('.sheet-card');
  const anchor = card && [...$$('.glabel', card)].find(g => g.textContent.trim() === 'Your data');
  if (!anchor) return;
  anchor.insertAdjacentHTML('beforebegin', `<label class="check" style="margin-top:18px"><input type="checkbox" id="stCloud" ${LS.get('cloudStill', false) ? '' : 'checked'}> Let Mira the cloud wander around the screen</label>`);
  $('#stCloud', card).onchange = e => { LS.set('cloudStill', !e.target.checked); if (!e.target.checked) LS.set('cloudPos', { x: roam.x, y: roam.y }); };
};
I.send = svg('<path d="M4.5 12 19.5 5l-4 14-3.5-5.5z"/><path d="m12 13.5 7.5-8.5"/>');
cloudInit();
updateSky().then(miraNudge);
setInterval(() => { updateSky(); miraNudge(); }, 10 * 60e3);
const doneBeforeCheer = ACT.oDone;
ACT.oDone = async id => { await doneBeforeCheer(id); cheer(); };
// ?point sends the cloud to the overdue item, for showing the pointing hand
if (/[?&]point\b/.test(location.search)) setTimeout(() => { const c = $('.fu.overdue'); if (!c) return; const r = c.getBoundingClientRect(); flow.tx = r.left + r.width * 0.55; flow.ty = r.top - 96; flow.next = performance.now() + 60000; }, 2500);
if (/[?&]openmira\b/.test(location.search)) setTimeout(() => openMira(), 3200);
