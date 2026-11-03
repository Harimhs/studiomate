'use strict';
/* First-run welcome and a guided tour of the whole app.
   Each step: go to the right place, light up one real control, and say what it is for
   and what to do in two short lines. Previous / Next on every step; Settings → User guide replays it. */

const APP_NAME = 'StudioMate';
const wait = ms => new Promise(r => setTimeout(r, ms));
const visible = el => !!el && el.getClientRects().length > 0;
const first = (...sels) => { for (const s of sels) { const e = $$(s).find(visible); if (e) return e; } return null; };

async function go(hash) {
  if (sheetOpen) { closeSheet(); await wait(260); }
  if (location.hash !== hash) { location.hash = hash; await wait(380); }
}
async function inSettings() {
  if (!(sheetOpen && $('#stName'))) { ACT.settings(); await wait(320); }
}

const STEPS = [
  // ---- settings
  { title: 'Settings', at: () => first('.top [data-act="settings"]', '.tabs .nav-settings'), go: () => go('#today'),
    b: ['Your name, reminders, backups and this guide live here.', 'Tap the gear any time to open it.'] },
  { title: 'Your name', at: () => $('#stName'), go: inSettings,
    b: ['Today greets you by this name.', 'Type it in; it saves when you tap Done.'] },
  { title: 'Reminder time', at: () => $('#stTime'), go: inSettings,
    b: ['New follow-ups remind you at this time unless you pick another.', 'Set the hour you usually start chasing vendors.'] },
  { title: 'Reminders', at: () => [...$$('.sheet-card label')].find(l => l.textContent.trim() === 'Reminders')?.nextElementSibling, go: inSettings,
    b: ['Follow-ups pop up on your phone when they are due.', 'Tap Turn on and allow notifications.'] },
  { title: 'The cloud', at: () => $('#stCloud')?.closest('label'), go: inSettings,
    b: ['A little cloud floats around and nudges you when something is overdue.', 'Untick this if you want it to stay still.'] },
  { title: 'Back up your work', at: () => $('.sheet-card [data-act="export"]')?.closest('.row'), go: inSettings,
    b: ['Everything stays on this phone only, not on any server.', 'Tap Back up once a week; Restore brings it back on a new phone.'] },
  { title: 'Try it with sample data', at: () => $('.sheet-card [data-act="sample"]')?.closest('.row'), go: inSettings, next: 'Load sample and continue',
    onNext: async () => { await dataReady(); if (!S.followups.some(f => f.sample)) await loadSample(); await go('#today'); },
    b: ['Sample vendors, sites and follow-ups show how a real day looks.', 'Next loads them; remove them later from here.'] },

  // ---- today
  { title: 'Your day at a glance', at: () => $('.band .hero .greet')?.closest('.hero'), go: () => go('#today'),
    b: ['The first line says what needs you most today.', 'Below it: what is overdue, due today and coming up.'] },
  { title: 'Counts', at: () => $('.strip'), go: () => go('#today'),
    b: ['Overdue, today and the next 7 days at a glance.', 'Tap any of them to open your follow-ups.'] },
  { title: 'Quick actions', at: () => $('.quick'), go: () => go('#today'),
    b: ['Add a follow-up, speak one, snap a sample or present to a client.', 'One tap from the home screen.'] },
  { title: 'A follow-up', at: () => $('.fu'), go: () => go('#today'),
    b: ['WhatsApp or call the vendor with one tap; tap the row to note what happened.', 'Swipe right when it is done, left to move it to tomorrow.'] },
  { title: 'Your sites', at: () => $('.site-list'), go: () => go('#today'),
    b: ['Each home you are working on, with what is pending there.', 'Tap a site to see its decisions and budget.'] },
  { title: 'Your assistant', at: () => $('#cloud'), go: () => go('#today'),
    b: ['It shows your mood of the day, the weather where you are, and points at overdue work.', 'Tap it to ask anything or have it write a WhatsApp message; drag it aside if it is in the way.'] },

  // ---- follow-ups
  { title: 'Follow-ups', at: () => $('.title-row [data-act="newF"]'), go: () => go('#followups'),
    b: ['Everything you are chasing: laminates, carpenters, quotes.', 'Tap New, write what to chase, pick who and when, or speak it in Tamil or English.'] },
  { title: 'Filters', at: () => $('.seg [data-act="fFilter"]')?.closest('.bar'), go: () => go('#followups'),
    b: ['Switch between open and done, or show one site only.', 'Done items keep a record of who delivered and when.'] },

  // ---- design
  { title: 'Design studio', at: () => first('.title-row [data-act="newRoom"]'), go: () => go('#design'),
    b: ['Photograph a room, add its size, describe the design.', 'Tap New room to begin.'] },
  { title: 'From photos to drawings', at: () => first('#view .empty', '#view .rooms'), go: () => go('#design'),
    b: ['Drag each photo onto its wall, get a 3D view, then place furniture from your brief.', 'Download the plan and elevations as DXF for AutoCAD, or print them.'] },

  // ---- library and samples
  { title: 'Library', at: () => $('.lib-seg'), go: () => go('#library'),
    b: ['Inspiration holds your Pinterest finds and site photos; Samples holds materials.', 'Switch between them here.'] },
  { title: 'Add inspiration', at: () => $('.title-row [data-act="addImages"]'), go: () => go('#library'),
    b: ['Add photos, tag them by room and style, and group them into boards per client.', 'From Pinterest or your gallery, tap Share and pick this app.'] },
  { title: 'Present to a client', at: () => first('#view .empty', '.boards', '[data-act="present"]'), go: () => go('#library'),
    b: ['Show a board full screen; the client taps Like or Not for me.', 'You get a note of their taste at the end.'] },
  { title: 'Samples', at: () => $('.mcard'), go: () => go('#materials'),
    b: ['Each sample with its brand, code, finish, price and vendor.', 'Tap Add sample and photograph the label; never ask "what was that code?" again.'] },

  // ---- people and sites
  { title: 'People and shops', at: () => $('[data-act="nearMe"]'), go: async () => { pTab = 'contacts'; await go('#people'); render(); await wait(150); },
    b: ['Your trusted carpenters, dealers and shops, with your own notes and ratings.', 'Sort by near me when you are at a site.'] },
  { title: 'Find someone new', at: () => $('.find'), go: async () => { pTab = 'contacts'; await go('#people'); render(); await wait(150); },
    b: ['Search Google Maps for a carpenter, tile showroom and more, nearby.', 'Tap a type to see ratings and directions.'] },
  { title: 'Sites', at: () => $('#view .card'), go: async () => { pTab = 'sites'; await go('#people'); render(); await wait(150); },
    b: ['Every home you are working on, with its location.', 'Tap a site to open its page.'] },

  // ---- a site page
  { title: 'Budget', at: () => $('.budget'), go: () => go('#site/ss1'),
    b: ['What the client has approved against the budget, and what changes cost.', 'Tap Set budget to enter the total.'] },
  { title: 'Client decisions', at: () => first('.dec', '[data-act="newDecision"]'), go: () => go('#site/ss1'),
    b: ['Record each choice the client approves: item, finish, cost and date.', 'If they change their mind, tap it and choose "changed their mind"; the old choice stays on record.'] },
  { title: 'Send to client', at: () => $('[data-act="shareDecisions"]'), go: () => go('#site/ss1'),
    b: ['Sends the client a WhatsApp summary of everything approved, with the total.', 'They reply OK, and you have it in writing.'] },

  // ---- end
  { title: 'You are all set', at: () => first('.top [data-act="settings"]', '.tabs .nav-settings'), go: () => go('#today'), next: 'Finish',
    b: ['Replay this guide any time from Settings → User guide.', 'Remove the sample data from Settings when you start with your own.'] },
];

/* ---------- the overlay ---------- */
let tourAt = -1;
function tourUI() {
  if ($('#tour')) return $('#tour');
  document.body.insertAdjacentHTML('beforeend', `<div id="tour" class="tour" role="dialog" aria-modal="true" aria-live="polite">
    <div class="tour-hole"></div>
    <div class="tour-card"><div class="tour-top"><span class="tour-count"></span><button class="tour-skip" type="button">Skip guide</button></div>
      <h3></h3><ul></ul>
      <div class="tour-btns"><button class="btn tour-prev" type="button">Previous</button><button class="btn primary tour-next" type="button">Next</button></div></div>
  </div>`);
  const t = $('#tour');
  $('.tour-prev', t).onclick = () => showStep(tourAt - 1);
  $('.tour-next', t).onclick = async () => {
    const st = STEPS[tourAt];
    if (st.onNext) { t.classList.add('busy'); await st.onNext(); t.classList.remove('busy'); }
    if (tourAt >= STEPS.length - 1) endTour(); else showStep(tourAt + 1);
  };
  $('.tour-skip', t).onclick = endTour;
  addEventListener('resize', () => { if (tourAt >= 0) { placeStep(); guideCloud(STEPS[tourAt].at()); } });
  return t;
}
async function showStep(i) {
  if (i < 0 || i >= STEPS.length) return;
  const t = tourUI();
  tourAt = i;
  t.classList.add('moving');
  await STEPS[i].go();
  const el = STEPS[i].at();
  if (el) { el.scrollIntoView({ block: 'center', behavior: 'instant' }); await wait(60); }
  const st = STEPS[i];
  $('.tour-count', t).textContent = `${i + 1} of ${STEPS.length}`;
  $('h3', t).textContent = st.title;
  $('ul', t).innerHTML = st.b.map(x => `<li>${esc(x)}</li>`).join('');
  $('.tour-prev', t).disabled = i === 0;
  $('.tour-next', t).textContent = st.next || 'Next';
  t.classList.remove('moving');
  placeStep();
  guideCloud(el);
}
/* the cloud is the guide: it sits on the card's corner nearest the highlight and points at it */
function guideCloud(target) {
  if (typeof guideTo !== 'function' || !roam.el) return;
  const c = $('.tour-card').getBoundingClientRect();
  const w = roam.el.clientWidth || 84, h = roam.el.clientHeight || 86;
  if (target === roam.el) {
    // this step is about the cloud itself: it rises above the card, hops, and the spotlight follows it
    guideTo(c.left + c.width / 2 - w / 2, c.top - h - 18, null);
    roam.el.classList.add('hop'); setTimeout(() => roam.el.classList.remove('hop'), 1600);
    [350, 750, 1200, 1700].forEach(ms => setTimeout(() => tourAt >= 0 && STEPS[tourAt].at() === roam.el && placeStep(), ms));
    return;
  }
  const card = $('.tour-card');
  const x = c.left + 10;
  const y = card.classList.contains('cl-bottom') ? c.bottom - h - 8 : c.top + 8;
  guideTo(x, y, target || null);
}
function placeStep() {
  const t = $('#tour'), st = STEPS[tourAt], el = st && st.at();
  const hole = $('.tour-hole', t), card = $('.tour-card', t);
  const pad = 8;
  let r = el ? el.getBoundingClientRect() : null;
  if (r && (r.width === 0 || r.bottom < 0 || r.top > innerHeight)) r = null;
  if (r) {
    Object.assign(hole.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`, opacity: 1 });
  } else Object.assign(hole.style, { left: '50%', top: '40%', width: '0px', height: '0px', opacity: 0 });
  // card below the highlight when there is room, else above it
  const ch = card.offsetHeight, below = r ? r.bottom + pad + 14 : innerHeight / 2 - ch / 2;
  const top = r && below + ch > innerHeight - 12 ? Math.max(12, r.top - pad - 14 - ch) : Math.min(below, innerHeight - ch - 12);
  card.style.top = `${Math.max(12, top)}px`;
  // the cloud speaks from the card's edge that faces the highlight
  const faceUp = !r || r.top < Math.max(12, top);
  const self = el && el === roam.el;
  card.classList.toggle('cl-top', !self && faceUp);
  card.classList.toggle('cl-bottom', !self && !faceUp);
}
function startTour() {
  document.body.classList.add('touring');
  if (typeof setMood === 'function') { moodHold = Date.now() + 36e5; setMood(''); }
  tourUI().classList.add('on');
  showStep(0);
}
function endTour() {
  LS.set('toured', true);
  tourAt = -1;
  const t = $('#tour');
  if (t) t.classList.remove('on');
  document.body.classList.remove('touring');
  if (typeof guideEnd === 'function') { moodHold = 0; guideEnd(); }
  if (sheetOpen) closeSheet();
}

/* ---------- the first-run welcome ---------- */
function welcomeAsk() {
  LS.set('toured', true);   // ask once; Settings → User guide replays it
  openSheet(`<div class="welcome-ask">
      <div class="welcome-cloud">${typeof CLOUD === 'function' ? CLOUD() : ''}</div>
      <h2>Welcome to ${APP_NAME}: your vendors, sites, samples and designs in one place.</h2>
      <p class="meta">Let me guide you through it. It takes about 2 minutes.</p>
      <div class="actions"><button class="btn" id="wSkip">Skip</button><button class="btn primary" id="wOk">OK</button></div>
    </div>`, card => {
    $('#wSkip', card).onclick = () => { LS.set('toured', true); closeSheet(); };
    $('#wOk', card).onclick = async () => { closeSheet(); await wait(300); startTour(); };
  });
}

/* Settings: a User guide button to replay the tour */
const settingsBeforeGuide = ACT.settings;
ACT.settings = () => {
  settingsBeforeGuide();
  const card = $('.sheet-card');
  const anchor = card && [...$$('.glabel', card)].find(g => g.textContent.trim() === 'Your data');
  if (!anchor || $('#stGuide', card)) return;
  anchor.insertAdjacentHTML('beforebegin', `<p class="glabel" style="margin-top:22px">Help</p>
    <div class="row"><button class="btn" id="stGuide" type="button">User guide</button><span class="meta">A 2-minute walk through everything</span></div>`);
  $('#stGuide', card).onclick = async () => { closeSheet(); await wait(300); startTour(); };
};

// ?tour=N opens the guide at step N, for screenshots and checks
const tourQ = location.search.match(/[?&]tour=(\d+)/);
const dataReady = async () => { while (!S.followups) await wait(100); };
if (tourQ) setTimeout(async () => { await dataReady(); if (!S.followups.some(f => f.sample)) await loadSample(); startTour(); await wait(400); showStep(Math.min(STEPS.length, +tourQ[1]) - 1); }, 1400);
// first time only, once the app has drawn
if (!LS.get('toured', false) && !/[?&](demo|point|openmira|tour)\b/.test(location.search)) setTimeout(welcomeAsk, 1200);
