'use strict';
/* StudioMate, part two: the site page (client decisions, budget, follow-ups), collection boards,
   undo instead of confirm(), the first-run welcome and sites on Today.
   Loaded after app.js and uses its helpers (S, save, remove, openSheet, render, views, ACT, I…). */

const ROOMS = ['Living', 'Dining', 'Kitchen', 'Master bedroom', 'Bedroom 2', 'Kids room', 'Pooja', 'Foyer', 'Bathrooms', 'Whole home'];
const rupee = n => '₹' + fmtNum(Math.round(Number(n) || 0));
const matName = m => [m.brand, m.code, m.finish].filter(Boolean).join(' ');
let curSite = null, curBoard = null;

/* ---------- undo instead of confirm() ---------- */
function toastUndo(msg, undo) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span><button class="toast-act" type="button">Undo</button>`;
  t.classList.add('show', 'has-act');
  $('.toast-act', t).onclick = async () => { t.classList.remove('show', 'has-act'); await undo(); render(); toast('Restored'); };
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show', 'has-act'), 6000);
}
async function softDelete(store, id, label) {
  const o = S[store].find(x => x.id === id);
  if (!o) return;
  await remove(store, id);
  closeSheet();
  render();
  toastUndo(`${label} deleted`, () => save(store, o));
}

/* ---------- decisions: what the client approved, and what they changed ---------- */
const inForce = siteId => S.decisions.filter(d => d.siteId === siteId && !d.replacedBy);
const byDate = (a, b) => (a.date || '').localeCompare(b.date || '');

function decCard(d) {
  const prev = d.prevId && S.decisions.find(x => x.id === d.prevId);
  const m = d.materialId && S.materials.find(x => x.id === d.materialId);
  const delta = prev ? (+d.cost || 0) - (+prev.cost || 0) : 0;
  const sw = m && m.blob ? `<img class="dec-sw" src="${img(m)}" alt="">` : m && m.tone ? `<span class="dec-sw" style="background:${esc(m.tone)}"></span>` : '';
  return `<button class="dec" data-act="openDecision" data-id="${d.id}">
    ${sw}
    <span class="dec-body"><span class="dec-item">${esc(d.item)}</span>
      <span class="dec-choice">${esc(d.choice)}</span>
      ${prev ? `<span class="dec-was">Was ${esc(prev.choice)} · changed ${fmtLong(d.date)}</span>` : `<span class="meta">Approved ${fmtLong(d.date)}</span>`}</span>
    <span class="dec-cost num">${d.cost ? rupee(d.cost) : '<span class="faint">—</span>'}${prev && delta ? `<small class="${delta > 0 ? 'neg' : ''}">${delta > 0 ? '+' : '−'}${rupee(Math.abs(delta))}</small>` : ''}</span>
  </button>`;
}

views.site = (el, id) => {
  const s = site(id);
  if (!s) {
    el.innerHTML = `<a class="back" href="#people">${I.back}Sites</a>` + titleRow('Site not found') +
      `<div class="empty"><p>This site was deleted or never existed.</p><a class="btn" href="#people">Back to people and sites</a></div>`;
    return;
  }
  curSite = s.id;
  const decs = inForce(s.id).sort(byDate);
  const approved = decs.reduce((t, d) => t + (+d.cost || 0), 0);
  const changes = S.decisions.filter(d => d.siteId === s.id && d.prevId);
  const changeCost = changes.reduce((t, d) => {
    const p = S.decisions.find(x => x.id === d.prevId);
    return t + (+d.cost || 0) - (+(p && p.cost) || 0);
  }, 0);
  const fus = S.followups.filter(f => f.siteId === s.id && isOpen(f)).sort(byDue);
  const budget = +s.budget || 0;
  const over = budget && approved > budget;
  const rooms = [...new Set(decs.map(d => d.room || 'Whole home'))];
  el.innerHTML = `
    <a class="back" href="#people" data-act="sitesTab">${I.back}Sites</a>
    ${titleRow(esc(s.name), [s.client, s.area].filter(Boolean).map(esc).join(' · '), 'newDecision', 'Decision')}
    <div class="site-acts">
      ${s.lat != null ? `<a class="btn" href="${dirUrl(s)}" target="_blank" rel="noopener">${I.nav}Directions</a><button class="btn" data-act="nearSite" data-id="${s.id}">${I.pin}Who’s near</button>` : ''}
      <button class="btn" data-act="editS" data-id="${s.id}">Edit site</button>
    </div>
    <section class="budget">
      <div class="budget-head"><span class="meta">Approved by client</span>
        <span><b class="num">${rupee(approved)}</b>${budget ? `<span class="num of"> of ${rupee(budget)}</span>` : ''}</span></div>
      ${budget ? `<div class="track" role="img" aria-label="${Math.round(approved / budget * 100)}% of the budget approved"><i class="${over ? 'over' : ''}" style="width:${Math.min(100, approved / budget * 100)}%"></i></div>` : ''}
      <p class="meta">${budget ? (over ? `<b class="neg">${rupee(approved - budget)} over budget</b>` : `${rupee(budget - approved)} left in the budget`) : 'No budget set yet'}${changes.length ? ` · <span class="nowrap">${changes.length} change${changes.length > 1 ? 's' : ''} by client, ${changeCost >= 0 ? '+' : '−'}${rupee(Math.abs(changeCost))}</span>` : ''}
        · <button class="linkbtn" data-act="setBudget" data-id="${s.id}">${budget ? 'Edit budget' : 'Set budget'}</button></p>
    </section>
    <h2 class="sec">Client decisions <span class="count">${decs.length}</span>${decs.length ? `<button class="more linkbtn" data-act="shareDecisions" data-id="${s.id}">Send summary to client</button>` : ''}</h2>
    ${decs.length ? rooms.map(r => `<h3 class="room">${esc(r)}</h3><div class="decs">${decs.filter(d => (d.room || 'Whole home') === r).map(decCard).join('')}</div>`).join('')
      : `<div class="empty"><p>Record what the client approves: the item, their choice, the cost and the date. If they change their mind later, you’ll see the old and new choice, and what it did to the budget.</p><button class="btn primary" data-act="newDecision">${I.plus}Add the first decision</button></div>`}
    <h2 class="sec">To chase for this site <span class="count">${fus.length}</span></h2>
    ${fus.length ? `<div class="fu-list">${fus.map(fCard).join('')}</div>`
      : `<div class="empty"><p>Nothing to chase for this site.</p><button class="btn" data-act="newFsite" data-id="${s.id}">${I.plus}Follow-up for this site</button></div>`}`;
};

function decisionForm(siteId, d0 = null, changeOf = null) {
  const base = d0 || changeOf || {};
  const d = { room: base.room || '', item: base.item || '', choice: d0 ? d0.choice : '', materialId: d0 ? d0.materialId : '',
    cost: d0 ? d0.cost : '', date: d0 ? d0.date : today(), note: d0 ? (d0.note || '') : '' };
  const mats = [...S.materials].sort((a, b) => b.created - a.created);
  openSheet(`<h2>${changeOf ? 'The client changed their mind' : d0 ? 'Edit decision' : 'New decision'}</h2>
    ${changeOf ? `<p class="meta">Was <b>${esc(changeOf.choice)}</b>${changeOf.cost ? ', ' + rupee(changeOf.cost) : ''}, approved ${fmtLong(changeOf.date)}</p>` : ''}
    <form id="df" autocomplete="off">
      <label>Room</label>
      <div class="chips" id="roomChips">${ROOMS.map(r => `<button type="button" class="chip ${r === d.room ? 'on' : ''}" data-room="${esc(r)}">${esc(r)}</button>`).join('')}</div>
      <label>Item<input name="item" required value="${esc(d.item)}" placeholder="Kitchen shutters, wardrobe, false ceiling…" ${changeOf ? 'readonly' : ''}></label>
      ${mats.length ? `<label>Pick from your samples<select name="materialId"><option value="">None</option>${mats.map(m => `<option value="${m.id}" ${m.id === d.materialId ? 'selected' : ''}>${esc(matName(m))}</option>`).join('')}</select></label>` : ''}
      <label>${changeOf ? 'New choice' : 'The client’s choice'}<input name="choice" required value="${esc(d.choice)}" placeholder="Merino 21557 SF, suede"></label>
      <div class="two">
        <label>Cost ₹<input name="cost" type="number" inputmode="numeric" min="0" value="${esc(d.cost)}"></label>
        <label>Date<input name="date" type="date" value="${d.date}" required></label>
      </div>
      <label>Note<input name="note" value="${esc(d.note)}" placeholder="Approved at site visit, wants brass handles"></label>
      <div class="actions">${d0 ? `<button type="button" class="btn danger ghost" data-act="decDel" data-id="${d0.id}">Delete</button>` : ''}<button class="btn primary">Save</button></div>
    </form>`, card => {
    const form = $('#df', card);
    let room = d.room;
    $$('#roomChips .chip', card).forEach(b => b.onclick = () => {
      room = b.dataset.room;
      $$('#roomChips .chip', card).forEach(x => x.classList.toggle('on', x === b));
    });
    if (form.materialId) form.materialId.onchange = () => {
      const m = S.materials.find(x => x.id === form.materialId.value);
      if (m) form.choice.value = matName(m);
      if (m && m.price && !form.cost.value) form.cost.focus();
    };
    form.onsubmit = async e => {
      e.preventDefault();
      const o = { ...(d0 || {}), id: d0 ? d0.id : uid(), siteId, room: room || 'Whole home', item: form.item.value.trim(),
        choice: form.choice.value.trim(), materialId: form.materialId ? form.materialId.value : '', cost: form.cost.value,
        date: form.date.value, note: form.note.value.trim(), created: d0 ? d0.created : Date.now() };
      if (changeOf && !d0) { o.prevId = changeOf.id; await save('decisions', { ...changeOf, replacedBy: o.id }); }
      await save('decisions', o);
      closeSheet(); toast(changeOf ? 'Change recorded' : 'Decision saved'); render();
    };
  });
}

function decisionSheet(id) {
  const d = S.decisions.find(x => x.id === id);
  if (!d) return;
  const earlier = [];
  for (let p = d; p && p.prevId;) { p = S.decisions.find(x => x.id === p.prevId); if (p) earlier.push(p); }
  const m = d.materialId && S.materials.find(x => x.id === d.materialId);
  openSheet(`<h2>${esc(d.item)}</h2>
    <p class="meta">${esc(d.room || 'Whole home')} · ${d.cost ? rupee(d.cost) : 'No cost noted'} · ${fmtLong(d.date)}</p>
    <p class="dec-big">${esc(d.choice)}</p>
    ${d.note ? `<p class="note">${esc(d.note)}</p>` : ''}
    ${m ? `<p class="hint">Sample: ${esc(matName(m))}${contact(m.vendorId) ? ' from ' + esc(contact(m.vendorId).name) : ''}</p>` : ''}
    ${earlier.length ? `<p class="glabel">Earlier choices</p>${earlier.map(c => `<p class="meta">${fmtLong(c.date)}: ${esc(c.choice)}${c.cost ? ', ' + rupee(c.cost) : ''}</p>`).join('')}` : ''}
    <div class="stack" style="margin-top:20px">
      <button class="btn big" data-act="changeDecision" data-id="${d.id}">The client changed their mind</button>
      ${m ? `<button class="btn big" data-act="matOrder" data-id="${m.id}">${I.bell}Order from vendor</button>` : ''}
      <button class="btn big ghost" data-act="editDecision" data-id="${d.id}">Edit details</button>
    </div>`);
}

function shareDecisions(siteId) {
  const s = site(siteId);
  const decs = inForce(siteId).sort(byDate);
  const total = decs.reduce((t, d) => t + (+d.cost || 0), 0);
  const lines = decs.map(d => `• ${d.room && d.room !== 'Whole home' ? d.room + ', ' : ''}${d.item}: ${d.choice}${d.cost ? ' (' + rupee(d.cost) + ')' : ''}`);
  const text = `${s.client || s.name}: selections confirmed as of ${fmtLong(today())}\n\n${lines.join('\n')}\n\nTotal ${rupee(total)}\n\nPlease reply OK to confirm these.`;
  openSheet(`<h2>Summary for the client</h2>
    <p class="meta">Everything approved so far. Edit it if you like; you pick the chat in WhatsApp.</p>
    <textarea id="sumTx" rows="11" style="margin-top:12px" aria-label="Summary message"></textarea>
    <div class="actions"><button class="btn" id="sumCopy">Copy</button><button class="btn primary" id="sumGo">${I.chat}Open WhatsApp</button></div>`, card => {
    const ta = $('#sumTx', card);
    ta.value = text;
    $('#sumCopy', card).onclick = async () => { try { await navigator.clipboard.writeText(ta.value); toast('Copied'); } catch { toast('Could not copy'); } };
    $('#sumGo', card).onclick = () => { window.open(waUrl(s.clientPhone || '', ta.value), '_blank'); closeSheet(); };
  });
}

function budgetSheet(siteId) {
  const s = site(siteId);
  openSheet(`<h2>Budget for ${esc(s.name)}</h2>
    <form id="bf"><label>Total budget ₹<input name="budget" type="number" inputmode="numeric" min="0" value="${esc(s.budget || '')}" placeholder="1800000"></label>
    <label>Client’s WhatsApp number (for summaries)<input name="phone" type="tel" value="${esc(s.clientPhone || '')}" placeholder="98xxxxxxxx"></label>
    <div class="actions"><button class="btn primary">Save</button></div></form>`, card => {
    const f = $('#bf', card);
    f.onsubmit = async e => {
      e.preventDefault();
      await save('sites', { ...s, budget: f.budget.value, clientPhone: f.phone.value.trim() });
      closeSheet(); render();
    };
  });
}

/* ---------- boards: her collections, per client or room ---------- */
function boardCover(b) {
  const pics = (b.items || []).map(id => S.library.find(x => x.id === id)).filter(x => x && x.blob).slice(0, 4);
  return `<span class="cover">${pics.map(x => `<img src="${img(x)}" alt="">`).join('')}</span>`;
}
function boardsRow() {
  return `<h2 class="sec">Boards <span class="count">${S.boards.length}</span></h2>
    <div class="boards">${S.boards.map(b => `<a class="board" href="#board/${b.id}">${boardCover(b)}<b>${esc(b.name)}</b><small>${(b.items || []).length} image${(b.items || []).length === 1 ? '' : 's'}</small></a>`).join('')}
    <button class="board new" data-act="newBoard"><span class="cover">${I.plus}</span><b>New board</b><small>For a client or a room</small></button></div>
    <h2 class="sec">All images</h2>`;
}
const libraryView = views.library;
views.library = el => {
  libraryView(el);
  if (!S.library.length) return;
  const anchor = $('.title-row', el);
  if (anchor && !libSel) anchor.insertAdjacentHTML('afterend', boardsRow());
};

views.board = (el, id) => {
  const b = S.boards.find(x => x.id === id);
  if (!b) {
    el.innerHTML = `<a class="back" href="#library">${I.back}Library</a>` + titleRow('Board not found') + '<div class="empty"><p>This board was deleted.</p></div>';
    return;
  }
  curBoard = b.id;
  const items = (b.items || []).map(i => S.library.find(x => x.id === i)).filter(Boolean);
  const st = b.siteId && site(b.siteId);
  el.innerHTML = `<a class="back" href="#library">${I.back}Library</a>
    <header class="title-row"><div><h1>${esc(b.name)}</h1><p class="lede">${items.length} image${items.length === 1 ? '' : 's'}${st ? ' · ' + esc(st.name) : ''}</p></div>
      ${items.some(x => x.blob) ? `<button class="btn primary" data-act="presentBoard" data-id="${b.id}">${I.play}Present</button>` : ''}</header>
    ${items.length ? `<div class="grid">${items.map(libThumb).join('')}</div>`
      : `<div class="empty"><p>Open any image in your Library and tap “${esc(b.name)}” to add it to this board.</p><a class="btn" href="#library">Go to Library</a></div>`}
    <div class="site-acts" style="margin-top:20px"><button class="btn" data-act="editBoard" data-id="${b.id}">Rename or link to a site</button><button class="btn ghost danger" data-act="boardDel" data-id="${b.id}">Delete board</button></div>`;
};

function boardForm(b0 = null, addImage = null) {
  openSheet(`<h2>${b0 ? 'Edit board' : 'New board'}</h2>
    <form id="bdf" autocomplete="off"><label>Name<input name="name" required value="${esc(b0 ? b0.name : '')}" placeholder="Lakshmi, master bedroom"></label>
    ${S.sites.length ? `<label>Site (optional)<select name="siteId"><option value="">None</option>${S.sites.map(s => `<option value="${s.id}" ${b0 && b0.siteId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>` : ''}
    <div class="actions"><button class="btn primary">Save</button></div></form>`, card => {
    const f = $('#bdf', card);
    f.onsubmit = async e => {
      e.preventDefault();
      const b = { items: [], created: Date.now(), ...(b0 || {}), id: b0 ? b0.id : uid(), name: f.name.value.trim(), siteId: f.siteId ? f.siteId.value : '' };
      if (addImage && !b.items.includes(addImage)) b.items = [...b.items, addImage];
      await save('boards', b);
      closeSheet(); toast(b0 ? 'Board saved' : addImage ? 'Added to new board' : 'Board created'); render();
    };
  });
}

/* image sheet: add or remove the image from boards */
ACT.libOpen = id => {
  libDetail(id);
  const card = $('.sheet-card');
  const at = card && $('.actions', card);
  if (!at) return;
  at.insertAdjacentHTML('beforebegin', `<p class="glabel">Boards</p><div class="chips board-chips">${S.boards.map(b =>
    `<button type="button" class="chip ${(b.items || []).includes(id) ? 'on' : ''}" data-board="${b.id}">${esc(b.name)}</button>`).join('')}
    <button type="button" class="chip" data-act="newBoardWith" data-id="${id}">${I.plus}New board</button></div>`);
  $$('[data-board]', card).forEach(btn => btn.onclick = async () => {
    const b = S.boards.find(x => x.id === btn.dataset.board);
    const set = new Set(b.items || []);
    set.has(id) ? set.delete(id) : set.add(id);
    await save('boards', { ...b, items: [...set] });
    btn.classList.toggle('on');
  });
};

/* ---------- Today: first-run welcome, and her sites ---------- */
function welcome() {
  const canNotify = 'Notification' in window && Notification.permission === 'default';
  return `<section class="hero"><h1 class="greet">Welcome to StudioMate.</h1>
      <p class="finding">Your vendors, samples, sites and client choices, together on your phone.</p></section>
    <div class="steps">
      <button class="step" data-act="settings">${I.user}<span><b>Add your name</b><small>So Today can greet you</small></span></button>
      <button class="step" data-act="newS">${I.today}<span><b>Add a site you’re working on</b><small>Then record what the client approves</small></span></button>
      <button class="step" data-act="newC">${I.phone}<span><b>Save a vendor or carpenter</b><small>With your own notes and rating</small></span></button>
      <button class="step" data-act="newF">${I.bell}<span><b>Add something to chase</b><small>Follow up on WhatsApp in one tap</small></span></button>
      ${canNotify ? `<button class="step" data-act="enableNotif">${I.clock}<span><b>Turn on reminders</b><small>Follow-ups arrive at the time you set</small></span></button>` : ''}
    </div>
    <p class="hint">Want to look around first? <button class="linkbtn" data-act="sample">Load sample data</button></p>`;
}
const todayView = views.today;
views.today = el => {
  const empty = !S.followups.length && !S.contacts.length && !S.sites.length && !S.library.length && !S.materials.length;
  if (empty) { el.innerHTML = welcome(); return; }
  todayView(el);
  const list = S.sites.map(s => ({ s, n: S.followups.filter(f => isOpen(f) && f.siteId === s.id).length, d: inForce(s.id).length }))
    .sort((a, b) => b.n - a.n || a.s.name.localeCompare(b.s.name)).slice(0, 4);
  if (!list.length) return;
  const html = `<h2 class="sec">Your sites <a href="#people" class="more" data-act="sitesTab">View all</a></h2>
    <div class="site-list">${list.map(x => `<a class="site-row" href="#site/${x.s.id}"><span><b>${esc(x.s.name)}</b><small>${esc(x.s.client || x.s.area || '')}</small></span>
      <span class="site-meta">${x.n ? `<span class="due today">${x.n} to chase</span>` : ''}${x.d ? `<small>${x.d} decision${x.d > 1 ? 's' : ''}</small>` : ''}</span></a>`).join('')}</div>`;
  const banner = $('.banner:not(.nudge)', el);
  banner ? banner.insertAdjacentHTML('beforebegin', html) : el.insertAdjacentHTML('beforeend', html);
};

/* ---------- actions ---------- */
Object.assign(ACT, {
  delF: id => softDelete('followups', id, 'Follow-up'),
  libDel: id => softDelete('library', id, 'Image'),
  matDel: id => softDelete('materials', id, 'Sample'),
  delC: id => softDelete('contacts', id, 'Contact'),
  delS: id => softDelete('sites', id, 'Site'),
  sessDel: id => softDelete('sessions', id, 'Session'),
  decDel: id => softDelete('decisions', id, 'Decision'),
  boardDel: async id => { await softDelete('boards', id, 'Board'); location.hash = '#library'; },
  openSite: id => { location.hash = '#site/' + id; },
  sitesTab: () => { pTab = 'sites'; if (location.hash === '#people') render(); else location.hash = '#people'; },
  newFsite: id => followForm(null, { siteId: id }),
  newDecision: () => curSite && decisionForm(curSite),
  openDecision: id => decisionSheet(id),
  editDecision: id => { const d = S.decisions.find(x => x.id === id); decisionForm(d.siteId, d); },
  changeDecision: id => { const d = S.decisions.find(x => x.id === id); decisionForm(d.siteId, null, d); },
  setBudget: id => budgetSheet(id),
  shareDecisions: id => shareDecisions(id),
  newBoard: () => boardForm(),
  newBoardWith: id => boardForm(null, id),
  editBoard: id => boardForm(S.boards.find(b => b.id === id)),
  presentBoard: id => {
    const b = S.boards.find(x => x.id === id);
    const items = (b.items || []).map(i => S.library.find(x => x.id === i)).filter(x => x && x.blob);
    if (!items.length) return;
    history.pushState({ present: 1 }, '');
    startPresent(items, b.name);
  },
});

/* ---------- sample data gains a budget, decisions and one change ---------- */
const baseSample = loadSample;
loadSample = async function () {
  await baseSample();
  const d = n => addDays(today(), n);
  await save('sites', { ...site('ss1'), budget: 1800000, clientPhone: '' });
  await save('sites', { ...site('ss2'), budget: 3500000, clientPhone: '' });
  const D = [
    { id: 'sd1', room: 'Kitchen', item: 'Kitchen shutters', choice: 'Greenlam 1234 SF, suede', materialId: 'sm2', cost: 184000, date: d(-30), replacedBy: 'sd2' },
    { id: 'sd2', room: 'Kitchen', item: 'Kitchen shutters', choice: 'Merino 21557 SF, suede', materialId: 'sm1', cost: 192500, date: d(-6), prevId: 'sd1', note: 'Client wanted a darker walnut after seeing the sample in daylight' },
    { id: 'sd3', room: 'Kitchen', item: 'Drawer system', choice: 'Hettich InnoTech Atira, anthracite', materialId: 'sm3', cost: 50400, date: d(-12) },
    { id: 'sd4', room: 'Master bedroom', item: 'Wardrobe shutters', choice: 'Fluted PU, matte white', cost: 236000, date: d(-20) },
    { id: 'sd5', room: 'Living', item: 'TV unit', choice: 'Walnut veneer with brass inlay', cost: 145000, date: d(-18) },
    { id: 'sd6', room: 'Whole home', item: 'False ceiling', choice: 'Gypsum with cove lighting', cost: 210000, date: d(-25) },
  ];
  for (const x of D) await save('decisions', { siteId: 'ss1', note: '', ...x, sample: true, created: Date.now() });
  render();
};
const baseRemoveSample = removeSample;
removeSample = async function () {
  for (const o of S.decisions.filter(x => x.sample)) await remove('decisions', o.id);
  await baseRemoveSample();
};
I.back = svg('<path d="M15 5.5 8.5 12l6.5 6.5"/>');
