'use strict';
/* Calendar: a month view of follow-ups and site visits, which days are busy and which are free.
   Tap a day to see its tasks. Reached from Today and the Follow-ups header; route #calendar. */

let calMonth = null;   // first day of the shown month, as a Date
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function siteVisits() {
  // a "visit" is any follow-up tied to a site, plus explicit visit items if ever added
  return {};
}
function tasksOn(ymdStr) {
  const fus = S.followups.filter(f => isOpen(f) && f.due === ymdStr).sort(byDue);
  return fus;
}

views.calendar = (el) => {
  if (!calMonth) { const n = new Date(); calMonth = new Date(n.getFullYear(), n.getMonth(), 1); }
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;   // Monday = 0
  const days = new Date(y, m + 1, 0).getDate();
  const t = today();

  // count open follow-ups per day this month
  const counts = {};
  for (const f of S.followups) if (isOpen(f)) counts[f.due] = (counts[f.due] || 0) + 1;

  let cells = '';
  for (let i = 0; i < firstDow; i++) cells += '<span class="cal-cell empty"></span>';
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${z(m + 1)}-${z(d)}`;
    const n = counts[ds] || 0;
    const over = n && ds < t;
    const cls = [ds === t ? 'today' : '', n ? 'busy' : 'free', over ? 'over' : '', ds === calSel ? 'sel' : ''].filter(Boolean).join(' ');
    cells += `<button class="cal-cell ${cls}" data-act="calDay" data-id="${ds}"><span class="cal-n">${d}</span>${n ? `<span class="cal-dot">${n}</span>` : ''}</button>`;
  }

  const sel = calSel && tasksOn(calSel);
  const busyDays = Object.keys(counts).filter(k => k.startsWith(`${y}-${z(m + 1)}`)).length;
  const freeDays = days - busyDays;

  el.innerHTML = `<a class="back" href="#followups">${I.back}Follow-ups</a>
    ${titleRow('Calendar', `${busyDays} busy, ${freeDays} free this month`, 'newF', 'New')}
    <div class="cal-nav">
      <button class="btn icon" data-act="calPrev" aria-label="Previous month">${I.chevL}</button>
      <b>${MONTHS[m]} ${y}</b>
      <button class="btn icon" data-act="calNext" aria-label="Next month">${I.chevR}</button>
      <span class="grow"></span><button class="btn small" data-act="calToday">Today</button>
    </div>
    <div class="cal-grid-head">${WDAYS.map(w => `<span>${w}</span>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
    <p class="cal-legend"><span class="k busy"></span> has tasks <span class="k over"></span> overdue <span class="k free"></span> free</p>
    ${calSel ? `<h2 class="sec">${new Date(calSel + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
      ${sel.length ? `<div class="fu-list">${sel.map(fCard).join('')}</div>` : `<div class="empty"><p>A free day. Nothing to chase.</p><button class="btn" data-act="newFon" data-id="${calSel}">${I.plus}Add something for this day</button></div>`}` : '<p class="hint">Tap a day to see its tasks.</p>'}`;
};

let calSel = null;
Object.assign(ACT, {
  openCalendar: () => { location.hash = '#calendar'; },
  calPrev: () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); render(); },
  calNext: () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); render(); },
  calToday: () => { const n = new Date(); calMonth = new Date(n.getFullYear(), n.getMonth(), 1); calSel = today(); render(); },
  calDay: (ds) => { calSel = ds === calSel ? null : ds; render(); },
  newFon: (ds) => followForm(null, { due: ds }),
});

/* the calendar tab lights up the Follow-ups nav item */
const renderBeforeCal = render;
render = function (focusId) {
  renderBeforeCal(focusId);
  if ((location.hash.slice(1).split('?')[0] || '') === 'calendar') $$('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === 'followups'));
};

/* a Calendar button on the Follow-ups screen and a link on Today */
const fvBeforeCal = views.followups;
views.followups = (el) => {
  fvBeforeCal(el);
  const tr = $('.title-row', el);
  if (tr) tr.insertAdjacentHTML('beforeend', `<button class="btn" data-act="openCalendar" style="margin-left:8px">${I.cal}Calendar</button>`);
};

I.chevL = svg('<path d="M15 5.5 8.5 12l6.5 6.5"/>');
I.chevR = svg('<path d="M9 5.5 15.5 12 9 18.5"/>');
