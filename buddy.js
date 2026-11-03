'use strict';
/* Mira: a sample-swatch companion who lives in the corner. She knows the day's work, writes messages,
   gives design ideas through Gemini, and proposes actions that only happen when the designer taps them.
   Also here: how the app feels (swipe a follow-up, soft screen changes, a small vibration on success). */

/* ---------- Mira herself: an original drawing, coloured by the screen ---------- */
const MIRA = `<svg class="mira" viewBox="0 0 64 64" aria-hidden="true">
  <g class="mira-body">
    <rect class="m-back" x="17" y="9" width="34" height="46" rx="9" transform="rotate(12 34 32)"/>
    <rect class="m-card" x="13" y="8" width="34" height="46" rx="9" transform="rotate(-6 30 31)"/>
    <circle class="m-hole" cx="29" cy="15.5" r="2.6"/>
    <g class="m-face" transform="rotate(-6 30 31)">
      <g class="m-eyes"><ellipse cx="23.5" cy="31" rx="2.4" ry="3"/><ellipse cx="36.5" cy="31" rx="2.4" ry="3"/></g>
      <path class="m-mouth" d="M25.5 39.5q4.5 4 9 0"/>
      <circle class="m-cheek" cx="19.5" cy="37" r="2.2"/><circle class="m-cheek" cx="40.5" cy="37" r="2.2"/>
    </g>
  </g></svg>`;

let miraLog = [];   // this session's conversation
let miraBusy = false;
const vibe = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* not allowed */ } };

function miraButton() {
  if ($('#miraBtn')) return;
  const html = `<button id="miraBtn" class="mira-btn" aria-label="Ask Mira, your assistant">${MIRA}<span class="mira-dot" hidden></span><span class="mira-say">Ask Mira</span></button>`;
  const set = $('.top [data-act="settings"]');
  if (set) set.insertAdjacentHTML('beforebegin', html); else document.body.insertAdjacentHTML('beforeend', html);
  // on a wide screen she sits at the foot of the sidebar
  const side = $('.tabs .nav-settings');
  if (side) side.insertAdjacentHTML('beforebegin', `<button class="mira-side" data-act="openMira">${MIRA}<span>Ask Mira</span></button>`);
  $('#miraBtn').onclick = openMira;
  setInterval(() => { const b = $('#miraBtn'); if (b && !document.hidden) { b.classList.add('blink'); setTimeout(() => b.classList.remove('blink'), 180); } }, 4200);
}
function miraNudge() {
  const n = S.followups.filter(f => isOpen(f) && bucket(f) === 'overdue').length;
  const dot = $('#miraBtn .mira-dot');
  if (dot) dot.hidden = !n;
}

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
  return `Today is ${t} (${new Date().toLocaleDateString('en-IN', { weekday: 'long' })}).
Open follow-ups:\n${fu || '- none'}\nSites:\n${sites || '- none'}\nPeople:\n${people || '- none'}\nSaved samples:\n${mats || '- none'}`;
}

function openMira() {
  vibe(8);
  const name = LS.get('name', '');
  const od = S.followups.filter(f => isOpen(f) && bucket(f) === 'overdue');
  const td = S.followups.filter(f => isOpen(f) && bucket(f) === 'today');
  const hello = miraLog.length ? '' : `<div class="msg mira-msg">Hi${name ? ' ' + esc(name) : ''}! ${od.length ? `${od.length} thing${od.length > 1 ? 's are' : ' is'} overdue${od[0] ? `, starting with <b>${esc(od[0].title)}</b>` : ''}.` : td.length ? `You have ${td.length} follow-up${td.length > 1 ? 's' : ''} today.` : 'Nothing is waiting on you right now.'} What can I do?</div>`;
  const chips = ['What’s pending today?', 'Write a Tamil reminder for my oldest follow-up', 'Ideas for a small pooja unit', 'Which vendor is usually late?'];
  openSheet(`<div class="mira-head">${MIRA}<div><h2>Mira</h2><p class="meta">${aiKey() ? 'Your studio assistant' : 'Add a Gemini key in Settings so I can think with you'}</p></div></div>
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
  $('#miraBtn')?.classList.add('thinking'); $('.mira-head .mira')?.classList.add('thinking');
  miraBusy = true;
  let m;
  try {
    m = aiKey() ? await miraThink(q) : { text: offlineReply(q), actions: [] };
  } catch (e) { m = { text: aiError(e, 'text'), actions: [] }; }
  finally { miraBusy = false; $('#miraBtn')?.classList.remove('thinking'); $('.mira-head .mira')?.classList.remove('thinking'); }
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
  const run = () => { renderBeforeFeel(focusId); wireSwipes(); miraNudge(); };
  if (viaNav && document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) { viaNav = false; document.startViewTransition(run); }
  else { viaNav = false; run(); }
};

ACT.openMira = () => openMira();
I.send = svg('<path d="M4.5 12 19.5 5l-4 14-3.5-5.5z"/><path d="m12 13.5 7.5-8.5"/>');
miraButton();
