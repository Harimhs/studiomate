'use strict';
/* Coffee Break Design studio: room photos on each surface, room size, a 3D room built from the photos,
   items placed from a written brief, and 2D skeleton drawings (plan + four elevations) as DXF / SVG / print.
   All units are millimetres. Walls are numbered clockwise in plan: 1 top, 2 right, 3 bottom, 4 left.
   "Offset" is measured from the left end of a wall as you stand in the room facing it. */

const FACES = [['w1', 'Wall 1'], ['w2', 'Wall 2'], ['w3', 'Wall 3'], ['w4', 'Wall 4'], ['floor', 'Floor'], ['ceiling', 'Ceiling']];
const FACE_NAME = Object.fromEntries(FACES);

/* the parts a designer places most; sizes are common Indian residential defaults */
const ITEM_LIB = {
  wardrobe:      { name: 'Wardrobe',        w: 2400, h: 2100, d: 600, e: 0,    c: '#b98d5f', k: ['wardrobe', 'almirah', 'closet'] },
  loft:          { name: 'Loft',            w: 2400, h: 600,  d: 600, e: 2100, c: '#c9a57b', k: ['loft'] },
  tv:            { name: 'TV unit',         w: 1800, h: 450,  d: 400, e: 250,  c: '#6b4a33', k: ['tv unit', 'tv', 'television', 'media unit'] },
  tvpanel:       { name: 'TV back panel',   w: 2400, h: 1800, d: 40,  e: 0,    c: '#8a6a4f', k: ['tv panel', 'back panel', 'wall panel', 'fluted panel'] },
  bed:           { name: 'Bed',             w: 1800, h: 450,  d: 2100, e: 0,   c: '#d8cdb9', k: ['bed', 'king bed', 'queen bed'] },
  sidetable:     { name: 'Side table',      w: 450,  h: 550,  d: 400, e: 0,    c: '#8a6a4f', k: ['side table', 'bedside'] },
  sofa:          { name: 'Sofa',            w: 2100, h: 800,  d: 900, e: 0,    c: '#8d9a8c', k: ['sofa', 'couch', 'sectional'] },
  study:         { name: 'Study table',     w: 1200, h: 750,  d: 600, e: 0,    c: '#b99a72', k: ['study', 'desk', 'work table'] },
  shelf:         { name: 'Bookshelf',       w: 900,  h: 2100, d: 350, e: 0,    c: '#b99a72', k: ['bookshelf', 'book shelf', 'shelf', 'shelves'] },
  dresser:       { name: 'Dresser',         w: 900,  h: 750,  d: 450, e: 0,    c: '#b98d5f', k: ['dresser', 'dressing'] },
  crockery:      { name: 'Crockery unit',   w: 1200, h: 2100, d: 450, e: 0,    c: '#6b4a33', k: ['crockery'] },
  pooja:         { name: 'Pooja unit',      w: 900,  h: 1800, d: 450, e: 0,    c: '#c99a3b', k: ['pooja', 'puja', 'mandir'] },
  shoe:          { name: 'Shoe rack',       w: 900,  h: 900,  d: 350, e: 0,    c: '#8a6a4f', k: ['shoe'] },
  kbase:         { name: 'Kitchen base',    w: 3000, h: 850,  d: 600, e: 0,    c: '#f1efe9', k: ['kitchen base', 'base unit', 'counter', 'kitchen'] },
  kwall:         { name: 'Kitchen wall unit', w: 3000, h: 700, d: 350, e: 1450, c: '#f1efe9', k: ['wall unit', 'overhead', 'upper cabinet'] },
  dining:        { name: 'Dining table',    w: 1800, h: 750,  d: 900, e: 0,    c: '#6b4a33', k: ['dining'] },
  console:       { name: 'Console',         w: 1200, h: 800,  d: 350, e: 0,    c: '#6b4a33', k: ['console', 'foyer'] },
  ceiling:       { name: 'False ceiling',   w: 0,    h: 100,  d: 0,   e: 0,    c: '#ffffff', k: ['false ceiling', 'ceiling', 'cove', 'gypsum'] },
};
const FINISH = { walnut: '#6b4a33', teak: '#8a5a32', oak: '#b99a72', white: '#f1efe9', ivory: '#ece4d2', grey: '#8d8f8c', gray: '#8d8f8c',
  green: '#6f8a6e', sage: '#8d9a8c', blue: '#5f7896', navy: '#2f3f5c', black: '#2c2c2a', beige: '#d8cdb9', pink: '#d7a9a0', marble: '#e9e6df', brass: '#b8913f' };

const wallLen = (d, wall) => (wall === 'w1' || wall === 'w3') ? +d.L : +d.W;
const mm = n => fmtNum(Math.round(n)) + ' mm';
let curDesign = null;

/* ---------- reading the brief ---------- */
function parseBrief(text, d) {
  const items = [];
  const parts = text.toLowerCase().split(/[,;\n]|\band\b|\bwith\b/).map(s => s.trim()).filter(Boolean);
  const keys = Object.entries(ITEM_LIB).flatMap(([id, it]) => it.k.map(k => [k, id])).sort((a, b) => b[0].length - a[0].length);
  let rr = 0;
  for (const p of parts) {
    const hit = keys.find(([k]) => p.includes(k));
    if (!hit) continue;
    const lib = ITEM_LIB[hit[1]];
    if (hit[1] === 'ceiling' && (items.some(i => i.type === 'ceiling') || d.items.some(i => i.type === 'ceiling'))) continue;
    let wall = null;
    const wm = p.match(/wall\s*([1-4])/);
    if (wm) wall = 'w' + wm[1];
    else if (/\bleft\b/.test(p)) wall = 'w4';
    else if (/\bright\b/.test(p)) wall = 'w2';
    else if (/\b(back|opposite|facing|window)\b/.test(p)) wall = 'w1';
    else if (/\b(front|entrance|door)\b/.test(p)) wall = 'w3';
    if (hit[1] === 'ceiling') wall = 'ceiling';
    if (!wall) wall = ['w1', 'w2', 'w4', 'w3'][rr++ % 4];
    let w = lib.w;
    const fm = p.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|')/);
    const nm = p.match(/(\d{3,4})\s*(?:mm)?\b/);
    if (fm) w = Math.round(+fm[1] * 304.8);
    else if (nm) w = +nm[1];
    if (/full|entire|whole/.test(p) && wall !== 'ceiling') w = wallLen(d, wall);
    if (wall !== 'ceiling') w = Math.min(w, wallLen(d, wall));
    const fin = Object.keys(FINISH).find(f => p.includes(f));
    items.push({ id: uid(), type: hit[1], name: lib.name, wall, w, h: lib.h, d: lib.d, e: lib.e, off: null, c: fin ? FINISH[fin] : lib.c, finish: fin || '' });
  }
  // a loft sits above the wardrobe on the same wall when one exists
  for (const it of items.filter(i => i.type === 'loft')) {
    const wr = items.find(i => i.type === 'wardrobe' && i.wall === it.wall) || items.find(i => i.type === 'wardrobe');
    if (wr) { it.wall = wr.wall; it.w = wr.w; it.off = wr.off; it.e = wr.h; it.linked = wr.id; }
  }
  return items;
}
/* place items with no offset along their wall, left to right, centring a lone item */
function layout(d) {
  for (const wall of ['w1', 'w2', 'w3', 'w4']) {
    const len = wallLen(d, wall);
    const free = d.items.filter(i => i.wall === wall && i.off == null && !i.linked);
    const fixed = d.items.filter(i => i.wall === wall && i.off != null && !i.linked);
    if (!free.length) continue;
    if (free.length === 1 && !fixed.length) { free[0].off = Math.max(0, Math.round((len - free[0].w) / 2)); continue; }
    let x = fixed.reduce((m, i) => Math.max(m, i.off + i.w), 0);
    for (const i of free) { i.off = Math.min(x, Math.max(0, len - i.w)); x = i.off + i.w; }
  }
  for (const i of d.items.filter(i => i.linked)) {
    const wr = d.items.find(x => x.id === i.linked);
    if (wr) { i.wall = wr.wall; i.off = wr.off; i.w = wr.w; i.e = wr.e + wr.h; }
  }
}

/* ---------- list of rooms ---------- */
views.design = (el, id) => {
  if (id) return roomView(el, id);
  const list = [...S.designs].sort((a, b) => b.created - a.created);
  el.innerHTML = titleRow('Design', list.length ? `${list.length} room${list.length > 1 ? 's' : ''}` : 'Photos to 3D to drawings', 'newRoom', 'New room') +
    (list.length ? `<div class="rooms">${list.map(d => {
      const cover = d.faces && (d.faces.w1 || d.faces.w2 || d.faces.w4 || d.faces.w3);
      const st = d.siteId && site(d.siteId);
      return `<a class="room-card" href="#design/${d.id}">${cover ? `<img src="${faceUrl(d, 'w1') || faceUrl(d, 'w2') || faceUrl(d, 'w4') || faceUrl(d, 'w3')}" alt="">` : `<span class="room-blank">${I.cube}</span>`}
        <span><b>${esc(d.name)}</b><small>${st ? esc(st.name) + ' · ' : ''}${(+d.L / 1000).toFixed(2)} × ${(+d.W / 1000).toFixed(2)} m · ${(d.items || []).length} items</small></span></a>`;
    }).join('')}</div>`
    : `<div class="empty"><p>Photograph a room from inside (all four walls, the floor and the ceiling), arrange the photos, add the room size, and describe the design. You get a 3D room built from your photos and plan and elevation drawings to open in AutoCAD.</p>
       <button class="btn primary" data-act="newRoom">${I.plus}Start with a room</button></div>`);
};

/* face photo object URLs */
const faceUrls = new Map();
function faceUrl(d, f) {
  const b = d.faces && d.faces[f];
  if (!b) return '';
  const k = d.id + f + b.size;
  if (!faceUrls.has(k)) faceUrls.set(k, URL.createObjectURL(b));
  return faceUrls.get(k);
}

function newRoomForm() {
  openSheet(`<h2>New room</h2>
    <form id="nr" autocomplete="off">
      <label>Room name<input name="name" required placeholder="Master bedroom"></label>
      ${S.sites.length ? `<label>Site<select name="siteId"><option value="">None</option>${S.sites.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>` : ''}
      <p class="glabel">Size from your laser measure</p>
      <div class="three">
        <label>Wall 1<input name="L" type="number" inputmode="numeric" value="3600" required></label>
        <label>Wall 2<input name="W" type="number" inputmode="numeric" value="3300" required></label>
        <label>Height<input name="H" type="number" inputmode="numeric" value="2900" required></label>
      </div>
      <p class="hint">Millimetres. Wall 1 is the wall you face as you enter; the others go clockwise.</p>
      <div class="actions"><button class="btn primary">Create room</button></div>
    </form>`, card => {
    const f = $('#nr', card);
    f.onsubmit = async e => {
      e.preventDefault();
      const d = { id: uid(), name: f.name.value.trim(), siteId: f.siteId ? f.siteId.value : '', L: +f.L.value, W: +f.W.value, H: +f.H.value,
        faces: {}, tray: [], items: [], brief: '', created: Date.now() };
      await save('designs', d);
      closeSheet();
      location.hash = '#design/' + d.id;
    };
  });
}

/* ---------- one room ---------- */
let view3d = { ry: -35, rx: -22, photos: true };
function roomView(el, id) {
  const d = S.designs.find(x => x.id === id);
  if (!d) { el.innerHTML = `<a class="back" href="#design">${I.back}Design</a>` + titleRow('Room not found'); return; }
  curDesign = d.id;
  d.items = d.items || []; d.faces = d.faces || {}; d.tray = d.tray || [];
  const st = d.siteId && site(d.siteId);
  el.innerHTML = `<a class="back" href="#design">${I.back}Design</a>
    ${titleRow(esc(d.name), `${st ? esc(st.name) + ' · ' : ''}${(d.L / 1000).toFixed(2)} × ${(d.W / 1000).toFixed(2)} × ${(d.H / 1000).toFixed(2)} m`, '', '')}
    <nav class="steps-nav" aria-label="Room steps"><a href="#d-photos">Photos</a><a href="#d-size">Size</a><a href="#d-brief">Design</a><a href="#d-3d">3D</a><a href="#d-draw">Drawings</a></nav>

    <section id="d-photos" class="dstep">
      <h2 class="sec">Photos <span class="count">${FACES.filter(([f]) => d.faces[f]).length} of 6</span></h2>
      <p class="hint">Drag a photo onto its surface, or tap one photo and then tap where it goes.</p>
      <div class="cross" id="cross"></div>
      <div class="tray-row"><div class="tray" id="tray"></div><button class="btn" data-act="addFacePhotos">${I.camera}Add photos</button></div>
    </section>

    <section id="d-size" class="dstep">
      <h2 class="sec">Size</h2>
      <div class="three">
        <label>Wall 1 and 3<input id="dL" type="number" inputmode="numeric" value="${d.L}"></label>
        <label>Wall 2 and 4<input id="dW" type="number" inputmode="numeric" value="${d.W}"></label>
        <label>Floor to ceiling<input id="dH" type="number" inputmode="numeric" value="${d.H}"></label>
      </div>
    </section>

    <section id="d-brief" class="dstep">
      <h2 class="sec">Design</h2>
      <label class="brief"><span class="meta">Describe the room</span>
        <textarea id="brief" rows="3" placeholder="Walnut wardrobe 2400 on wall 2 with loft, TV unit on wall 4, bed on wall 1, false ceiling with cove">${esc(d.brief || '')}</textarea></label>
      <div class="chips" id="briefChips">${['Wardrobe on wall 2', 'Loft', 'TV unit on wall 4', 'Bed on wall 1', 'Study table on wall 3', 'Bookshelf', 'Pooja unit', 'False ceiling'].map(c => `<button type="button" class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="actions" style="justify-content:flex-start;margin-top:12px"><button class="btn primary" data-act="applyBrief">Place items</button><button class="btn" data-act="addItem">${I.plus}Add item</button></div>
      <div id="items"></div>
    </section>

    <section id="d-3d" class="dstep">
      <h2 class="sec">3D <span class="count">drag to turn</span></h2>
      <div class="stage" id="stage" role="img" aria-label="3D view of the room"><div class="room3d" id="room3d"></div></div>
      <div class="actions" style="justify-content:flex-start;margin-top:10px">
        <button class="btn" data-act="toggle3dPhotos">${view3d.photos ? 'Plain walls' : 'Show photos'}</button>
        <button class="btn" data-act="turn3d" data-id="-90">Turn left</button><button class="btn" data-act="turn3d" data-id="90">Turn right</button>
      </div>
    </section>

    <section id="d-draw" class="dstep">
      <h2 class="sec">Drawings</h2>
      <p class="hint">Plan and the four wall elevations, dimensioned in millimetres. DXF opens in AutoCAD and SketchUp.</p>
      <div class="sheet-prev" id="sheetPrev"></div>
      <div class="actions" style="justify-content:flex-start">
        <button class="btn primary" data-act="exportDXF">Download DXF</button>
        <button class="btn" data-act="exportSVG">Download SVG</button>
        <button class="btn" data-act="printSheet">Print or PDF</button>
      </div>
    </section>
    <div class="site-acts" style="margin-top:28px"><button class="btn ghost danger" data-act="roomDel" data-id="${d.id}">Delete room</button></div>`;

  renderCross(d); renderItems(d); render3d(d); renderSheet(d);
  const upd = debounce(async () => {
    d.L = Math.max(1000, +$('#dL').value || d.L); d.W = Math.max(1000, +$('#dW').value || d.W); d.H = Math.max(2000, +$('#dH').value || d.H);
    await save('designs', d); render3d(d); renderSheet(d);
  }, 400);
  ['#dL', '#dW', '#dH'].forEach(s => $(s).oninput = upd);
  $('#brief').oninput = debounce(() => { d.brief = $('#brief').value; save('designs', d); }, 500);
  $$('#briefChips .chip').forEach(b => b.onclick = () => {
    const t = $('#brief');
    t.value = (t.value.trim() ? t.value.trim().replace(/,?$/, ', ') : '') + b.dataset.chip.toLowerCase();
    t.dispatchEvent(new Event('input'));
  });
  wire3d(d);
}

/* ---------- photos on the unfolded room ---------- */
let pick = null;   // tap-to-place: the slot or tray index chosen first
function renderCross(d) {
  const slot = (f, label) => `<div class="slot ${d.faces[f] ? 'has' : ''} ${pick === f ? 'picked' : ''}" data-slot="${f}">
      ${d.faces[f] ? `<img src="${faceUrl(d, f)}" alt="${label}" draggable="false">` : ''}<span class="slot-name">${label}</span>
      ${d.faces[f] ? `<button class="slot-x" data-unset="${f}" aria-label="Remove photo from ${label}">${I.x}</button>` : ''}</div>`;
  $('#cross').innerHTML = `<span></span>${slot('ceiling', 'Ceiling')}<span></span><span></span>
    ${slot('w4', 'Wall 4')}${slot('w1', 'Wall 1')}${slot('w2', 'Wall 2')}${slot('w3', 'Wall 3')}
    <span></span>${slot('floor', 'Floor')}<span></span><span></span>`;
  const urls = d.tray.map(b => URL.createObjectURL(b));
  $('#tray').innerHTML = d.tray.length ? d.tray.map((b, i) => `<div class="tray-pic ${pick === 't' + i ? 'picked' : ''}" data-slot="t${i}"><img src="${urls[i]}" alt="Unplaced photo ${i + 1}" draggable="false"></div>`).join('')
    : '<span class="meta">Unplaced photos appear here</span>';
  wireDrag(d);
  $$('[data-unset]').forEach(b => b.onclick = async e => {
    e.stopPropagation();
    const f = b.dataset.unset;
    d.tray.push(d.faces[f]); delete d.faces[f];
    await save('designs', d); renderCross(d); render3d(d);
  });
}
const getAt = (d, k) => k.startsWith('t') ? d.tray[+k.slice(1)] : d.faces[k];
function setAt(d, k, v) {
  if (k.startsWith('t')) { if (v) d.tray[+k.slice(1)] = v; else d.tray[+k.slice(1)] = null; }
  else if (v) d.faces[k] = v; else delete d.faces[k];
}
async function swap(d, a, b) {
  if (a === b) return;
  const va = getAt(d, a), vb = getAt(d, b);
  if (b.startsWith('t') && !va) return;
  setAt(d, b, va); setAt(d, a, vb);
  d.tray = d.tray.filter(Boolean);
  await save('designs', d);
  renderCross(d); render3d(d); toast(`Moved to ${FACE_NAME[b] || 'unplaced'}`);
}
function wireDrag(d) {
  $$('#cross .slot, #tray .tray-pic').forEach(node => {
    node.onpointerdown = e => {
      if (e.target.closest('[data-unset]')) return;
      const from = node.dataset.slot;
      const pic = getAt(d, from);
      const sx = e.clientX, sy = e.clientY;
      let ghost = null;
      const move = ev => {
        if (!pic) return;
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
          ghost = node.querySelector('img').cloneNode();
          ghost.className = 'drag-ghost';
          document.body.append(ghost);
          node.classList.add('dragging');
        }
        if (ghost) {
          ghost.style.transform = `translate(${ev.clientX - 40}px, ${ev.clientY - 40}px) rotate(-4deg)`;
          $$('.slot.over').forEach(x => x.classList.remove('over'));
          const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-slot]');
          over && over.classList.add('over');
        }
      };
      const up = async ev => {
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        node.removeEventListener('pointercancel', cancel);
        if (ghost) {
          ghost.remove(); node.classList.remove('dragging');
          $$('.over').forEach(x => x.classList.remove('over'));
          const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-slot]');
          if (over) await swap(d, from, over.dataset.slot);
          return;
        }
        // a tap: first tap picks, second tap places
        if (pick == null) { if (pic) { pick = from; renderCross(d); } }
        else { const a = pick; pick = null; if (a === from) renderCross(d); else await swap(d, a, from); }
      };
      const cancel = () => { if (ghost) ghost.remove(); node.classList.remove('dragging'); node.removeEventListener('pointermove', move); };
      node.setPointerCapture(e.pointerId);
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up);
      node.addEventListener('pointercancel', cancel);
    };
  });
}
async function addFacePhotos(d) {
  const files = await pickFiles({ multiple: true });
  if (!files.length) return;
  toast('Adding photos…');
  for (const f of files) {
    const b = await compress(f, 1400);
    const empty = FACES.map(x => x[0]).find(k => !d.faces[k]);
    if (empty) d.faces[empty] = b; else d.tray.push(b);
  }
  await save('designs', d);
  renderCross(d); render3d(d);
  toast('Photos placed in order. Drag to correct.');
}

/* ---------- items ---------- */
function renderItems(d) {
  const box = $('#items');
  if (!d.items.length) { box.innerHTML = '<p class="hint">No items yet. Write a brief above and tap Place items, or add one by one.</p>'; return; }
  const wallOpts = sel => [...FACES.slice(0, 4), ['ceiling', 'Ceiling']].map(([k, n]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${n}</option>`).join('');
  box.innerHTML = `<div class="item-list">${d.items.map(it => `<div class="item" data-item="${it.id}">
      <div class="item-head"><span class="item-sw" style="background:${esc(it.c)}"></span><b>${esc(it.name)}</b>${it.finish ? `<small>${esc(it.finish)}</small>` : ''}
        <select data-f="wall" aria-label="Wall">${wallOpts(it.wall)}</select>
        <button class="icon-btn" data-delitem="${it.id}" aria-label="Remove ${esc(it.name)}">${I.x}</button></div>
      ${it.wall === 'ceiling' ? `<div class="item-dims"><label>Drop<input data-f="h" type="number" value="${it.h}"></label><label>Border<input data-f="b" type="number" value="${it.b || 600}"></label></div>`
      : `<div class="item-dims"><label>Width<input data-f="w" type="number" value="${it.w}"></label><label>Height<input data-f="h" type="number" value="${it.h}"></label><label>Depth<input data-f="d" type="number" value="${it.d}"></label>
        <label>From left<input data-f="off" type="number" value="${it.off ?? 0}"></label><label>Above floor<input data-f="e" type="number" value="${it.e}"></label></div>`}
    </div>`).join('')}</div>`;
  $$('.item', box).forEach(row => {
    const it = d.items.find(x => x.id === row.dataset.item);
    $$('[data-f]', row).forEach(inp => inp.onchange = async () => {
      const f = inp.dataset.f;
      it[f] = f === 'wall' ? inp.value : Math.max(0, +inp.value || 0);
      if (f === 'wall') { it.off = null; delete it.linked; layout(d); }
      await save('designs', d);
      if (f === 'wall') renderItems(d);
      render3d(d); renderSheet(d);
    });
  });
  $$('[data-delitem]', box).forEach(b => b.onclick = async () => {
    const gone = d.items.find(x => x.id === b.dataset.delitem);
    d.items = d.items.filter(x => x !== gone);
    await save('designs', d); renderItems(d); render3d(d); renderSheet(d);
    toastUndo(`${gone.name} removed`, async () => { d.items.push(gone); await save('designs', d); });
  });
}

/* ---------- 3D: the room as six CSS planes, furniture as boxes ---------- */
function render3d(d) {
  const room = $('#room3d');
  if (!room) return;
  const stage = $('#stage');
  const s = Math.min(stage.clientWidth * 0.62, 340) / Math.max(d.L, d.W, d.H);
  const L = d.L * s, W = d.W * s, H = d.H * s;
  const plane = (w, h, tf, cls, f) => {
    const url = view3d.photos && f ? faceUrl(d, f) : '';
    return `<div class="pl ${cls}" style="width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;transform:${tf};${url ? `background-image:url(${url})` : ''}">${!url && f ? `<span>${FACE_NAME[f]}</span>` : ''}</div>`;
  };
  let html =
    plane(L, H, `translateZ(${-W / 2}px)`, 'wall', 'w1') +
    plane(W, H, `rotateY(-90deg) translateZ(${-L / 2}px)`, 'wall', 'w2') +
    plane(L, H, `rotateY(180deg) translateZ(${-W / 2}px)`, 'wall', 'w3') +
    plane(W, H, `rotateY(90deg) translateZ(${-L / 2}px)`, 'wall', 'w4') +
    plane(L, W, `rotateX(90deg) translateZ(${-H / 2}px)`, 'floor', 'floor') +
    plane(L, W, `rotateX(-90deg) translateZ(${-H / 2}px)`, 'ceil', 'ceiling');
  for (const it of d.items) html += box3d(d, it, s);
  room.innerHTML = html;
  room.style.transform = `rotateX(${view3d.rx}deg) rotateY(${view3d.ry}deg)`;
}
function box3d(d, it, s) {
  let cx, cz, sx, sz, sy = it.h * s, cy;
  const L = d.L, W = d.W, H = d.H;
  if (it.wall === 'ceiling') {
    const b = it.b || 600;
    sx = (L - 2 * b) * s; sz = (W - 2 * b) * s; cx = 0; cz = 0; cy = (-H / 2 + it.h / 2) * s;
  } else {
    const off = it.off || 0;
    cy = (H / 2 - it.e - it.h / 2) * s;
    if (it.wall === 'w1') { cx = -L / 2 + off + it.w / 2; cz = -W / 2 + it.d / 2; sx = it.w * s; sz = it.d * s; }
    if (it.wall === 'w3') { cx = L / 2 - off - it.w / 2; cz = W / 2 - it.d / 2; sx = it.w * s; sz = it.d * s; }
    if (it.wall === 'w2') { cz = -W / 2 + off + it.w / 2; cx = L / 2 - it.d / 2; sx = it.d * s; sz = it.w * s; }
    if (it.wall === 'w4') { cz = W / 2 - off - it.w / 2; cx = -L / 2 + it.d / 2; sx = it.d * s; sz = it.w * s; }
    cx *= s; cz *= s;
  }
  const f = (w, h, tf, shade) => `<div class="bf" style="width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;transform:${tf};background:${esc(it.c)};filter:brightness(${shade})"></div>`;
  return `<div class="box" style="transform:translate3d(${cx}px,${cy}px,${cz}px)">
    ${f(sx, sy, `translateZ(${sz / 2}px)`, 1)}${f(sx, sy, `rotateY(180deg) translateZ(${sz / 2}px)`, .8)}
    ${f(sz, sy, `rotateY(90deg) translateZ(${sx / 2}px)`, .88)}${f(sz, sy, `rotateY(-90deg) translateZ(${sx / 2}px)`, .88)}
    ${f(sx, sz, `rotateX(90deg) translateZ(${sy / 2}px)`, 1.12)}${f(sx, sz, `rotateX(-90deg) translateZ(${sy / 2}px)`, .7)}</div>`;
}
function wire3d(d) {
  const stage = $('#stage');
  let start = null;
  stage.onpointerdown = e => { start = { x: e.clientX, y: e.clientY, ry: view3d.ry, rx: view3d.rx }; stage.setPointerCapture(e.pointerId); };
  stage.onpointermove = e => {
    if (!start) return;
    view3d.ry = start.ry + (e.clientX - start.x) * 0.5;
    view3d.rx = Math.max(-80, Math.min(-5, start.rx - (e.clientY - start.y) * 0.3));
    $('#room3d').style.transform = `rotateX(${view3d.rx}deg) rotateY(${view3d.ry}deg)`;
  };
  stage.onpointerup = stage.onpointercancel = () => { start = null; };
}

/* ---------- 2D drawings: one set of primitives for SVG and DXF ---------- */
function prims(d) {
  const P = [], L = +d.L, W = +d.W, H = +d.H, T = 150;
  const line = (x1, y1, x2, y2, c = '') => P.push({ t: 'l', x1, y1, x2, y2, c });
  const rect = (x, y, w, h, c = '') => { line(x, y, x + w, y, c); line(x + w, y, x + w, y + h, c); line(x + w, y + h, x, y + h, c); line(x, y + h, x, y, c); };
  const text = (x, y, s, h = 110, a = 'middle', c = '') => P.push({ t: 't', x, y, s, h, a, c });
  const hdim = (x1, x2, y, label) => {
    line(x1, y, x2, y, 'dim'); line(x1, y - 60, x1, y + 60, 'dim'); line(x2, y - 60, x2, y + 60, 'dim');
    text((x1 + x2) / 2, y - 50, label || fmtNum(Math.round(x2 - x1)), 95, 'middle', 'dim');
  };
  const vdim = (y1, y2, x) => {
    line(x, y1, x, y2, 'dim'); line(x - 60, y1, x + 60, y1, 'dim'); line(x - 60, y2, x + 60, y2, 'dim');
    text(x - 50, (y1 + y2) / 2 + 35, fmtNum(Math.round(y2 - y1)), 95, 'end', 'dim');
  };

  // plan
  text(0, -720, `${d.name}: plan`, 170, 'start');
  rect(-T, -T, L + 2 * T, W + 2 * T, 'wall'); rect(0, 0, L, W, 'wall');
  text(L / 2, -T - 40, 'Wall 1', 100, 'middle', 'mute'); text(L + T + 60, W / 2, 'Wall 2', 100, 'start', 'mute');
  text(L / 2, W + T + 140, 'Wall 3', 100, 'middle', 'mute'); text(-T - 60, W / 2, 'Wall 4', 100, 'end', 'mute');
  hdim(0, L, -T - 330); vdim(0, W, -T - 520);
  for (const it of d.items) {
    if (it.wall === 'ceiling') { const b = it.b || 600; rect(b, b, L - 2 * b, W - 2 * b, 'dash'); text(L / 2, b + 160, 'False ceiling', 90, 'middle', 'mute'); continue; }
    const o = it.off || 0;
    const r = it.wall === 'w1' ? [o, 0, it.w, it.d] : it.wall === 'w2' ? [L - it.d, o, it.d, it.w]
      : it.wall === 'w3' ? [L - o - it.w, W - it.d, it.w, it.d] : [0, W - o - it.w, it.d, it.w];
    if (it.e >= 1800) { rect(...r, 'dash'); } else { rect(...r); }
    if (!it.linked) text(r[0] + r[2] / 2, r[1] + r[3] / 2 + 35, it.name, Math.min(100, Math.max(60, Math.min(r[2], r[3]) / 5)));
  }

  // elevations, stacked under the plan
  let y0 = W + 1500;
  for (const [wall, label] of FACES.slice(0, 4)) {
    const len = wallLen(d, wall);
    text(0, y0 - 450, `${label} elevation`, 150, 'start');
    rect(0, y0, len, H, 'wall');
    line(-300, y0 + H, len + 300, y0 + H, 'wall');
    const fc = d.items.find(i => i.wall === 'ceiling');
    if (fc) { line(0, y0 + fc.h, len, y0 + fc.h, 'dash'); text(len - 80, y0 + fc.h + 120, `False ceiling, ${fc.h} drop`, 80, 'end', 'mute'); }
    for (const it of d.items.filter(i => i.wall === wall)) {
      const x = it.off || 0, y = y0 + H - it.e - it.h;
      rect(x, y, it.w, it.h);
      if (it.type === 'wardrobe' || it.type === 'crockery' || it.type === 'loft') {
        const n = Math.max(2, Math.round(it.w / 600));
        for (let k = 1; k < n; k++) line(x + it.w * k / n, y, x + it.w * k / n, y + it.h, 'mute');
      }
      text(x + it.w / 2, y + it.h / 2 + 35, it.name, Math.min(100, Math.max(60, it.h / 6)));
      hdim(x, x + it.w, y0 + H + 260);
      if (it.e > 0) vdim(y + it.h, y0 + H, x + it.w + 200);
    }
    hdim(0, len, y0 + H + 560);
    vdim(y0, y0 + H, -350);
    y0 += H + 2100;
  }
  text(0, y0 - 600, `Coffee Break · ${d.name} · ${d.L} × ${d.W} × ${d.H} mm · ${fmtLong(today())} · not to scale on screen, true size in DXF`, 80, 'start', 'mute');
  return P;
}
function bounds(P) {
  let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity;
  for (const p of P) {
    const xs = p.t === 'l' ? [p.x1, p.x2] : [p.x, p.a === 'start' ? p.x + p.s.length * p.h * .6 : p.a === 'end' ? p.x - p.s.length * p.h * .6 : p.x];
    const ys = p.t === 'l' ? [p.y1, p.y2] : [p.y - p.h, p.y];
    a = Math.min(a, ...xs); c = Math.max(c, ...xs); b = Math.min(b, ...ys); e = Math.max(e, ...ys);
  }
  return [a - 400, b - 400, c - a + 800, e - b + 800];
}
function toSVG(d, forScreen) {
  const P = prims(d), [x, y, w, h] = bounds(P);
  const col = { '': '#1f201d', wall: '#1f201d', dim: '#8a5a3c', mute: '#7a7a74', dash: '#3f5a73' };
  const sw = { '': 1.2, wall: 2, dim: .8, mute: .8, dash: 1 };
  const body = P.map(p => p.t === 'l'
    ? `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${col[p.c]}" stroke-width="${sw[p.c]}" vector-effect="non-scaling-stroke"${p.c === 'dash' ? ' stroke-dasharray="6 5"' : ''}/>`
    : `<text x="${p.x}" y="${p.y}" font-size="${p.h}" text-anchor="${p.a}" fill="${col[p.c]}">${esc(p.s)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" ${forScreen ? '' : `width="${Math.round(w / 10)}mm" height="${Math.round(h / 10)}mm"`} font-family="Instrument Sans, Arial, sans-serif"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>${body}</svg>`;
}
function toDXF(d) {
  const P = prims(d), out = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES'];
  const layer = { '': 'FURNITURE', wall: 'WALLS', dim: 'DIMENSIONS', mute: 'NOTES', dash: 'CEILING' };
  for (const p of P) {
    if (p.t === 'l') out.push('0', 'LINE', '8', layer[p.c], '10', p.x1, '20', -p.y1, '30', 0, '11', p.x2, '21', -p.y2, '31', 0);
    else out.push('0', 'TEXT', '8', layer[p.c], '10', p.x, '20', -p.y, '30', 0, '40', p.h, '1', p.s,
      '72', p.a === 'middle' ? 1 : p.a === 'end' ? 2 : 0, '11', p.x, '21', -p.y, '31', 0);
  }
  out.push('0', 'ENDSEC', '0', 'EOF');
  return out.join('\n');
}
function renderSheet(d) {
  const box = $('#sheetPrev');
  if (!box) return;
  box.innerHTML = toSVG(d, true);
  box.title = 'Tap to open full size';
  box.onclick = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.name)} drawings</title><style>body{margin:0;background:#fff}svg{width:100%;height:auto}</style>${toSVG(d, true)}`);
    w.document.close();
  };
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const fileBase = d => (d.name || 'room').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'room';

/* ---------- actions ---------- */
const dsg = () => S.designs.find(x => x.id === curDesign);
Object.assign(ACT, {
  newRoom: () => newRoomForm(),
  addFacePhotos: () => addFacePhotos(dsg()),
  applyBrief: async () => {
    const d = dsg();
    d.brief = $('#brief').value;
    const items = parseBrief(d.brief, d);
    if (!items.length) { toast('No items found. Try “wardrobe on wall 2”.'); return; }
    const before = d.items.slice();
    d.items = d.items.concat(items);
    layout(d);
    await save('designs', d);
    renderItems(d); render3d(d); renderSheet(d);
    toastUndo(`${items.length} item${items.length > 1 ? 's' : ''} placed`, async () => { d.items = before; await save('designs', d); });
  },
  addItem: () => {
    openSheet(`<h2>Add item</h2><div class="pick-grid">${Object.entries(ITEM_LIB).map(([k, it]) =>
      `<button class="btn" data-act="addItemType" data-id="${k}"><span class="item-sw" style="background:${it.c}"></span>${esc(it.name)}</button>`).join('')}</div>`);
  },
  addItemType: async k => {
    const d = dsg(), lib = ITEM_LIB[k];
    const it = { id: uid(), type: k, name: lib.name, wall: k === 'ceiling' ? 'ceiling' : 'w1', w: Math.min(lib.w, d.L), h: lib.h, d: lib.d, e: lib.e, off: null, c: lib.c, finish: '' };
    d.items.push(it); layout(d);
    await save('designs', d);
    closeSheet(); renderItems(d); render3d(d); renderSheet(d);
    toast(`${lib.name} added on ${FACE_NAME[it.wall] || 'Ceiling'}`);
  },
  toggle3dPhotos: b => { view3d.photos = !view3d.photos; render3d(dsg()); $('[data-act="toggle3dPhotos"]').textContent = view3d.photos ? 'Plain walls' : 'Show photos'; },
  turn3d: deg => { view3d.ry += +deg; $('#room3d').style.transform = `rotateX(${view3d.rx}deg) rotateY(${view3d.ry}deg)`; },
  exportDXF: () => { const d = dsg(); download(`${fileBase(d)}-drawings.dxf`, toDXF(d), 'application/dxf'); toast('DXF saved to Downloads'); },
  exportSVG: () => { const d = dsg(); download(`${fileBase(d)}-drawings.svg`, toSVG(d, false), 'image/svg+xml'); toast('SVG saved to Downloads'); },
  printSheet: () => {
    const d = dsg();
    const w = window.open('', '_blank');
    if (!w) { toast('Allow pop-ups to print'); return; }
    w.document.write(`<!doctype html><title>${esc(d.name)} drawings</title><style>body{margin:0}svg{width:100%;height:auto}@page{size:A4 portrait;margin:10mm}</style>${toSVG(d, true)}<script>onload=()=>print()<\/script>`);
    w.document.close();
  },
  roomDel: async id => { await softDelete('designs', id, 'Room'); location.hash = '#design'; },
});

/* ---------- Library and Samples share one tab ---------- */
const segFor = on => `<div class="seg lib-seg"><button class="${on === 'library' ? 'on' : ''}" data-act="goLib">Inspiration</button><button class="${on === 'materials' ? 'on' : ''}" data-act="goMat">Samples</button></div>`;
for (const v of ['library', 'materials']) {
  const base = views[v];
  views[v] = (el, arg) => { base(el, arg); const tr = $('.title-row', el); tr && tr.insertAdjacentHTML('afterend', segFor(v)); };
}
ACT.goLib = () => { location.hash = '#library'; };
ACT.goMat = () => { location.hash = '#materials'; };

/* ---------- sample data: a half-built master bedroom with photos, brief and furniture ---------- */
const sampleBeforeDesign = loadSample;
loadSample = async function () {
  await sampleBeforeDesign();
  if (S.designs.some(d => d.sample)) return;
  const faces = {};
  for (const f of ['w1', 'w2', 'w3', 'w4', 'floor', 'ceiling']) {
    try { const r = await fetch(`sample/${f}.jpg`); if (r.ok) faces[f] = await r.blob(); } catch { /* offline: room without that photo */ }
  }
  const items = [
    { id: 'si1', type: 'bed', name: 'Bed', wall: 'w1', w: 1800, h: 450, d: 2100, e: 0, off: 900, c: '#d8cdb9', finish: '' },
    { id: 'si2', type: 'wardrobe', name: 'Wardrobe', wall: 'w2', w: 2400, h: 2100, d: 600, e: 0, off: 450, c: '#6b4a33', finish: 'walnut' },
    { id: 'si3', type: 'loft', name: 'Loft', wall: 'w2', w: 2400, h: 600, d: 600, e: 2100, off: 450, c: '#6b4a33', finish: 'walnut', linked: 'si2' },
    { id: 'si4', type: 'study', name: 'Study table', wall: 'w3', w: 1200, h: 750, d: 600, e: 0, off: 2400, c: '#b99a72', finish: 'oak' },
    { id: 'si5', type: 'tv', name: 'TV unit', wall: 'w4', w: 1800, h: 450, d: 400, e: 250, off: 750, c: '#6b4a33', finish: 'walnut' },
    { id: 'si6', type: 'ceiling', name: 'False ceiling', wall: 'ceiling', w: 0, h: 100, d: 0, e: 0, off: 0, c: '#ffffff', finish: '', b: 600 },
  ];
  // finished "after" renders of each wall, made from these photos
  const renders = {}, freeRenders = {};
  for (const f of ['w1', 'w2', 'w3', 'w4']) {
    try { const r = await fetch(`sample/after-${f}.jpg`); if (r.ok) { renders[f] = await r.blob(); freeRenders[f] = 'photo'; } } catch { /* offline */ }
  }
  await save('designs', { id: 'sdr1', name: 'Master bedroom', siteId: 'ss1', L: 3600, W: 3300, H: 2900, faces, tray: [], items, renders, freeRenders,
    brief: 'Warm, calm master bedroom: walnut wardrobe with loft, bed facing the TV wall, small study corner, cove false ceiling, beige walls.',
    created: Date.now(), sample: true });
};
const removeBeforeDesign = removeSample;
removeSample = async function () {
  for (const d of S.designs.filter(x => x.sample)) await remove('designs', d.id);
  await removeBeforeDesign();
};
