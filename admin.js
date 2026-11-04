'use strict';
/* Admin "team activity" view: a person's stops over several days on a map, with a timeline list.
   Demo data only. A real version would read activity the team logs through signed-in accounts. */

const $ = s => document.querySelector(s);
const z = n => String(n).padStart(2, '0');

// demo: two field staff, each with a few days of stops across Chennai
const PEOPLE = {
  lakshmi: {
    name: 'Lakshmi R.',
    days: {
      '2026-11-03': [
        { t: '09:40', kind: 'site', name: 'Adyar – 3BHK', note: 'Site check, false ceiling', lat: 13.0063, lng: 80.2574 },
        { t: '11:20', kind: 'vendor', name: 'Ravi Plywoods', note: 'Picked laminate samples', lat: 13.0213, lng: 80.2231 },
        { t: '13:05', kind: 'vendor', name: 'Sri Balaji Hardware', note: 'Drawer channels', lat: 13.0905, lng: 80.2879 },
        { t: '15:30', kind: 'site', name: 'Velachery – Villa', note: 'Carpenter review', lat: 12.9815, lng: 80.2180 },
      ],
      '2026-11-04': [
        { t: '10:10', kind: 'site', name: 'Anna Nagar – 2BHK', note: 'Measurement', lat: 13.0878, lng: 80.2085 },
        { t: '12:40', kind: 'vendor', name: 'Lumina Lights', note: 'Profile lights', lat: 13.0850, lng: 80.2101 },
        { t: '16:00', kind: 'site', name: 'Adyar – 3BHK', note: 'Client walkthrough', lat: 13.0063, lng: 80.2574 },
      ],
    },
  },
  arun: {
    name: 'Arun K.',
    days: {
      '2026-11-04': [
        { t: '09:15', kind: 'site', name: 'OMR – Office fit-out', note: 'Handover snag list', lat: 12.9516, lng: 80.2409 },
        { t: '11:50', kind: 'vendor', name: 'Selvam Polish Works', note: 'PU polish schedule', lat: 13.0012, lng: 80.2565 },
        { t: '14:20', kind: 'site', name: 'Besant Nagar – 2BHK', note: 'Wardrobe fixing', lat: 12.9986, lng: 80.2669 },
      ],
    },
  },
};

let map, layer;
function initMap() {
  map = L.map('map', { scrollWheelZoom: false }).setView([13.03, 80.25], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '© OpenStreetMap',
  }).addTo(map);
  layer = L.layerGroup().addTo(map);
}

const COLOR = { site: '#b8613e', vendor: '#a87b1f', visit: '#2f7676', other: '#2f7676' };
function dot(c, n) {
  return L.divIcon({ className: '', html: `<div style="width:26px;height:26px;border-radius:50%;background:${c};color:#fff;display:grid;place-items:center;font:600 13px Instrument Sans,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.3)">${n}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
}

let markers = [];
function draw() {
  const p = $('#person').value, d = $('#day').value;
  const stops = (PEOPLE[p].days[d] || []).slice().sort((a, b) => a.t.localeCompare(b.t));
  layer.clearLayers(); markers = [];
  const pts = stops.map(s => [s.lat, s.lng]);
  if (pts.length > 1) L.polyline(pts, { color: COLOR.visit, weight: 3, opacity: .5, dashArray: '6 6' }).addTo(layer);
  stops.forEach((s, i) => {
    const mk = L.marker([s.lat, s.lng], { icon: dot(COLOR[s.kind] || COLOR.other, i + 1) })
      .addTo(layer).bindPopup(`<b>${s.name}</b><br>${s.t} · ${s.note}`);
    markers.push(mk);
  });
  if (pts.length) map.fitBounds(pts, { padding: [50, 50], maxZoom: 14 });

  // stats
  const sites = new Set(stops.filter(s => s.kind === 'site').map(s => s.name)).size;
  const first = stops[0]?.t, last = stops[stops.length - 1]?.t;
  const span = first && last ? hoursBetween(first, last) : '—';
  $('#stats').innerHTML = `
    <div class="stat"><span>Stops</span><b>${stops.length}</b></div>
    <div class="stat"><span>Sites visited</span><b>${sites}</b></div>
    <div class="stat"><span>Vendors / shops</span><b>${stops.filter(s => s.kind === 'vendor').length}</b></div>
    <div class="stat"><span>First to last</span><b>${span}</b></div>`;

  // list
  $('#stopsTitle').textContent = `${stops.length} stop${stops.length === 1 ? '' : 's'} · ${new Date(d + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`;
  $('#stopList').innerHTML = stops.map((s, i) => `<div class="stop ${s.kind}" data-i="${i}">
    <span class="pin">${i + 1}</span>
    <span><b>${s.name}</b><small>${s.note}</small></span>
    <span class="time">${s.t}</span></div>`).join('') || '<div class="stop"><span></span><span><b>No stops logged</b></span><span></span></div>';
  document.querySelectorAll('.stop[data-i]').forEach(row => row.onclick = () => {
    const i = +row.dataset.i;
    document.querySelectorAll('.stop').forEach(r => r.classList.remove('on'));
    row.classList.add('on');
    if (markers[i]) { map.setView(markers[i].getLatLng(), 15); markers[i].openPopup(); }
  });
}
function hoursBetween(a, b) {
  const [ah, am] = a.split(':').map(Number), [bh, bm] = b.split(':').map(Number);
  const mins = (bh * 60 + bm) - (ah * 60 + am);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fillDays() {
  const p = $('#person').value;
  const days = Object.keys(PEOPLE[p].days).sort().reverse();
  $('#day').innerHTML = days.map(d => `<option value="${d}">${new Date(d + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</option>`).join('');
}

window.addEventListener('DOMContentLoaded', () => {
  initMap();
  $('#person').innerHTML = Object.entries(PEOPLE).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
  $('#person').onchange = () => { fillDays(); draw(); };
  $('#day').onchange = draw;
  fillDays();
  draw();
});
