'use strict';
/* StudioMate AI: Gemini reads the design brief into items (text model) and renders a wall photo
   with the planned items (image model). The key lives only in this phone's storage, never in the code.
   Calls go straight from the phone to Google's Generative Language API. */

const AI_TEXT = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite'];
const AI_IMAGE = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];
const aiKey = () => LS.get('gkey', '');

async function gemini(model, body) {
  // never hang: text answers get 25 s, images 90 s
  const wait = /image/.test(model) ? 90000 : 25000;
  let r;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': aiKey() },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(wait),
    });
  } catch (err) {
    throw Object.assign(new Error(err.name === 'TimeoutError' ? 'Gemini took too long' : 'Network error'), { status: err.name === 'TimeoutError' ? 'DEADLINE_EXCEEDED' : 'NETWORK' });
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const e = new Error((j.error && j.error.message) || `HTTP ${r.status}`);
    e.status = (j.error && j.error.status) || r.status;
    throw e;
  }
  return j;
}
async function firstModel(models, body) {
  let last;
  // each model once, then one more round after a short pause when Google is busy
  for (let round = 0; round < 2; round++) {
    for (const m of models) {
      try { return await gemini(m, body); }
      catch (e) {
        last = e;
        if (e.status === 'INVALID_ARGUMENT' || e.status === 'PERMISSION_DENIED' || e.status === 'UNAUTHENTICATED') throw e;
      }
    }
    if (last && (last.status === 'UNAVAILABLE' || last.status === 503 || last.status === 'DEADLINE_EXCEEDED')) await new Promise(r => setTimeout(r, 1500));
    else break;
  }
  throw last;
}
function aiError(e, kind) {
  if (e.status === 'RESOURCE_EXHAUSTED') return kind === 'image'
    ? 'Your Gemini key has no image quota. Turn on billing for it in Google AI Studio, then try again.'
    : 'Gemini’s free limit is used up for now. Try again in a minute.';
  if (e.status === 'PERMISSION_DENIED' || e.status === 'UNAUTHENTICATED' || e.status === 400 || e.status === 'INVALID_ARGUMENT') return 'Gemini refused the key. Check it in Settings.';
  if (e.status === 'UNAVAILABLE' || e.status === 503 || /high demand|overloaded/i.test(e.message || '')) return 'Gemini is busy right now. Try again in a moment.';
  if (e.status === 'DEADLINE_EXCEEDED') return 'Gemini took too long. Check your signal and try again.';
  if (!navigator.onLine || e.status === 'NETWORK') return 'You’re offline or the signal is weak. AI needs the internet.';
  return 'Gemini didn’t answer: ' + String(e.message || e).slice(0, 120);
}

/* ---------- brief → items ---------- */
async function aiBrief(d, text) {
  const lib = Object.entries(ITEM_LIB).map(([k, it]) => `${k}: ${it.name}, default ${it.w}×${it.h}×${it.d} mm, ${it.e} mm above floor`).join('\n');
  const prompt = `You are an interior designer's assistant in India. Turn the designer's brief into furniture items for one room.
Room: Wall 1 and Wall 3 are ${d.L} mm long, Wall 2 and Wall 4 are ${d.W} mm long, height ${d.H} mm.
Walls are numbered clockwise in plan; Wall 1 is the wall you face on entering. "off" is mm from the left end of the wall when standing in the room facing it.
Item types you may use (use these keys for "type"):
${lib}
Rules: every item must fit its wall (off + w ≤ wall length). Use realistic Indian residential sizes. A loft sits directly above a wardrobe (same wall, off and w; e = wardrobe height). A false ceiling uses wall "ceiling" with h = drop in mm. "finish" is one colour or material word (walnut, oak, white, grey, green, beige, marble, brass…) or empty. Keep items from overlapping on the same wall.
Brief: """${text}"""`;
  const schema = { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
    type: { type: 'STRING' }, name: { type: 'STRING' }, wall: { type: 'STRING', enum: ['w1', 'w2', 'w3', 'w4', 'ceiling'] },
    w: { type: 'NUMBER' }, h: { type: 'NUMBER' }, d: { type: 'NUMBER' }, off: { type: 'NUMBER' }, e: { type: 'NUMBER' }, finish: { type: 'STRING' } },
    required: ['type', 'wall', 'w', 'h', 'd', 'off', 'e'] } } }, required: ['items'] };
  const j = await firstModel(AI_TEXT, { contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.3 } });
  const raw = JSON.parse(j.candidates[0].content.parts.map(p => p.text || '').join(''));
  // trust nothing: clamp every number to the room
  return (raw.items || []).map(r => {
    const base = ITEM_LIB[r.type] || { name: r.name || 'Item', c: '#b99a72', w: 900, h: 900, d: 450, e: 0 };
    const wall = ['w1', 'w2', 'w3', 'w4', 'ceiling'].includes(r.wall) ? r.wall : 'w1';
    const len = wall === 'ceiling' ? 0 : wallLen(d, wall);
    const n = (v, lo, hi, def) => Math.round(Math.min(hi, Math.max(lo, Number.isFinite(+v) ? +v : def)));
    const fin = (r.finish || '').toLowerCase().trim();
    const it = { id: uid(), type: ITEM_LIB[r.type] ? r.type : 'custom', name: r.name || base.name, wall,
      w: wall === 'ceiling' ? 0 : n(r.w, 200, len, base.w), h: n(r.h, 20, d.H, base.h), d: n(r.d, 20, 3000, base.d),
      e: n(r.e, 0, d.H - 20, base.e), off: 0, c: FINISH[fin] || base.c, finish: FINISH[fin] ? fin : '' };
    if (wall !== 'ceiling') it.off = n(r.off, 0, Math.max(0, len - it.w), 0);
    return it;
  });
}

/* ---------- wall photo → render ---------- */
const blobToB64 = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(b); });
async function aiRender(d, face) {
  const photo = d.faces[face];
  const len = wallLen(d, face);
  const on = d.items.filter(i => i.wall === face);
  const ceil = d.items.find(i => i.wall === 'ceiling');
  const list = on.length ? on.map(i => `- ${i.finish ? i.finish + ' ' : ''}${i.name}: ${i.w} mm wide, ${i.h} mm high, ${i.d} mm deep, ${i.off} mm from the left end of the wall, ${i.e} mm above the floor`).join('\n') : '- no furniture on this wall';
  const prompt = `This photo shows ${FACE_NAME[face]} of a room in a home in India, taken from inside the room. The wall is ${len} mm long and the room is ${d.H} mm high.
Redesign it as a photorealistic interior render for the client. Keep the exact camera position and angle, the wall's edges, any windows, doors, beams and switchboards, and the floor line.
Place exactly these items on this wall, to scale:
${list}
${ceil ? `Add a gypsum false ceiling with a ${ceil.h} mm drop and cove lighting.` : ''}
Overall brief from the designer: ${d.brief || 'contemporary Indian home, warm and calm'}.
Natural daylight plus warm lighting. No people, no text, no labels, no watermarks.`;
  const j = await firstModel(AI_IMAGE, {
    contents: [{ parts: [{ inline_data: { mime_type: photo.type || 'image/jpeg', data: await blobToB64(photo) } }, { text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } });
  const part = j.candidates[0].content.parts.find(p => p.inlineData || p.inline_data);
  if (!part) throw Object.assign(new Error('No image came back. Try a clearer photo.'), { status: 'NO_IMAGE' });
  const data = part.inlineData || part.inline_data;
  return await (await fetch(`data:${data.mimeType || data.mime_type};base64,${data.data}`)).blob();
}

/* ---------- the room screen gains AI controls and a Renders section ---------- */
const designView = views.design;
views.design = (el, id) => {
  designView(el, id);
  if (!id) return;
  const d = S.designs.find(x => x.id === id);
  if (!d) return;
  d.renders = d.renders || {};
  const has = !!aiKey();
  // brief: AI first when a key exists
  const apply = $('[data-act="applyBrief"]', el);
  if (apply) {
    apply.insertAdjacentHTML('beforebegin', `<button class="btn primary" data-act="aiBrief">${I.spark}${has ? 'Design with AI' : 'Design with AI (add key)'}</button>`);
    apply.classList.remove('primary');
  }
  // renders section, before the 3D section
  const faces = FACES.slice(0, 4).filter(([f]) => d.faces[f]);
  $('#d-3d', el).insertAdjacentHTML('beforebegin', `<section id="d-render" class="dstep">
    <h2 class="sec">AI renders <span class="count">${Object.keys(d.renders).length}</span></h2>
    ${!has ? `<div class="empty"><p>Add your Gemini key in Settings to turn each wall photo into a client-ready render with the items you planned.</p><button class="btn" data-act="settings">Open Settings</button></div>`
    : !faces.length ? '<p class="hint">Add wall photos above, then render each wall.</p>'
    : `<div class="renders">${faces.map(([f, n]) => `<figure class="render" data-face="${f}">
        <div class="render-img">${d.renders[f] ? `<img src="${URL.createObjectURL(d.renders[f])}" alt="AI render of ${n}"><img class="before" src="${faceUrl(d, f)}" alt="${n} before">` : `<img src="${faceUrl(d, f)}" alt="${n} photo">`}</div>
        <figcaption><b>${n}</b>${d.renders[f] ? '<small>Hold to see before</small>' : `<small>${d.items.filter(i => i.wall === f).length} items planned</small>`}
          <button class="btn small ${d.renders[f] ? '' : 'primary'}" data-act="aiRender" data-id="${f}">${I.spark}${d.renders[f] ? 'Again' : 'Render'}</button>
          ${d.renders[f] ? `<button class="btn small" data-act="saveRender" data-id="${f}">Save</button>` : ''}</figcaption></figure>`).join('')}</div>`}
  </section>`);
  const nav = $('.steps-nav', el);
  nav && $('a[href="#d-3d"]', nav).insertAdjacentHTML('beforebegin', '<a href="#d-render">Renders</a>');
};

let busy = false;
Object.assign(ACT, {
  aiBrief: async (_, btn) => {
    if (!aiKey()) return ACT.settings();
    if (busy) return;
    const d = dsg(), text = $('#brief').value.trim();
    if (!text) { toast('Write what you want in the room first'); $('#brief').focus(); return; }
    busy = true; btn.classList.add('busy'); btn.disabled = true;
    const label = btn.innerHTML; btn.innerHTML = `${I.spark}Designing…`;
    try {
      const items = await aiBrief(d, text);
      if (!items.length) { toast('Gemini found no items in that brief'); return; }
      const before = d.items.slice();
      d.brief = text;
      d.items = d.items.filter(i => !items.some(n => n.type === i.type && n.wall === i.wall)).concat(items);
      layout(d);
      await save('designs', d);
      render();
      toastUndo(`AI placed ${items.length} item${items.length > 1 ? 's' : ''}`, async () => { d.items = before; await save('designs', d); });
    } catch (e) { toast(aiError(e, 'text')); }
    finally { busy = false; btn.disabled = false; btn.classList.remove('busy'); btn.innerHTML = label; }
  },
  aiRender: async (face, btn) => {
    if (busy) return;
    const d = dsg();
    busy = true; btn.disabled = true;
    const fig = btn.closest('.render'); fig && fig.classList.add('working');
    const label = btn.innerHTML; btn.innerHTML = 'Rendering…';
    try {
      d.renders = d.renders || {};
      d.renders[face] = await aiRender(d, face);
      await save('designs', d);
      render();
      toast(`${FACE_NAME[face]} rendered`);
    } catch (e) {
      const msg = aiError(e, 'image');
      if (e.status === 'RESOURCE_EXHAUSTED') openSheet(`<h2>Renders need image quota</h2><p class="note">${esc(msg)}</p>
        <p class="hint">Text features (Design with AI) keep working on the free tier. Image renders are billed per image by Google.</p>
        <div class="actions"><a class="btn primary" href="https://aistudio.google.com/" target="_blank" rel="noopener">Open Google AI Studio</a></div>`);
      else toast(msg);
    } finally { busy = false; btn.disabled = false; btn.innerHTML = label; fig && fig.classList.remove('working'); }
  },
  saveRender: async face => {
    const d = dsg(), b = d.renders && d.renders[face];
    if (!b) return;
    await save('library', { id: uid(), blob: b, tags: ['AI render', d.name], note: `${d.name}, ${FACE_NAME[face]}`, created: Date.now() });
    toast('Saved to Library, ready to present');
  },
});

/* hold a render to compare with the photo */
document.addEventListener('pointerdown', e => {
  const im = e.target.closest('.render-img');
  if (im && im.querySelector('.before')) im.classList.add('show-before');
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => document.addEventListener(t, () => $$('.show-before').forEach(x => x.classList.remove('show-before')), true));

/* ---------- Settings: the key, kept on this phone ---------- */
const settingsBase = ACT.settings;
ACT.settings = () => {
  settingsBase();
  const card = $('.sheet-card');
  const anchor = card && [...$$('.glabel', card)].find(g => g.textContent.trim() === 'Your data');
  if (!anchor) return;
  anchor.insertAdjacentHTML('beforebegin', `<p class="glabel" style="margin-top:22px">AI design</p>
    <label>Gemini API key<div class="row"><input id="stKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your key" value="${esc(aiKey())}">
      <button type="button" class="btn icon" id="stKeyShow" aria-label="Show key">${I.search}</button></div></label>
    <p class="hint" style="margin-top:6px">Stored only on this phone. Used for Design with AI and wall renders. Get one free at aistudio.google.com.</p>`);
  const inp = $('#stKey', card);
  inp.oninput = () => LS.set('gkey', inp.value.trim());
  $('#stKeyShow', card).onclick = () => { inp.type = inp.type === 'password' ? 'text' : 'password'; };
};

I.spark = svg('<path d="M12 3.5 13.8 9 19.5 10.5 13.8 12 12 17.5 10.2 12 4.5 10.5 10.2 9z"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>');
