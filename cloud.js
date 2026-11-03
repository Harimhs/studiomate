'use strict';
/* Mira's cloud: the body, the eyes, and the layers that weather, time of day and moods switch on.
   The state lives on <body> as data-weather, data-time and data-mood, so every cloud on screen agrees. */

const CLOUD = () => `<svg class="cloud mira" viewBox="-12 -24 124 128" aria-hidden="true">
  <g class="cl-sun"><circle cx="80" cy="12" r="13"/><path d="M80-8v6M80 26v6M60 12h6M94 12h6M66-2l4 4M90 22l4 4M94-2l-4 4M70 22l-4 4"/></g>
  <g class="cl-moon"><path d="M86-2a13 13 0 1 0 11 20 11 11 0 0 1-11-20z"/><circle class="cl-star" cx="12" cy="4" r="1.8"/><circle class="cl-star s2" cx="100" cy="40" r="1.5"/><circle class="cl-star s3" cx="2" cy="30" r="1.3"/></g>
  <g class="cl-body"><circle cx="30" cy="48" r="21"/><circle cx="52" cy="35" r="26"/><circle cx="74" cy="48" r="21"/><circle cx="41" cy="58" r="17"/><circle cx="62" cy="58" r="17"/></g>
  <g class="cl-rain"><path class="d1" d="M34 78l-3 8"/><path class="d2" d="M50 80l-3 8"/><path class="d3" d="M66 78l-3 8"/><path class="d4" d="M42 90l-3 8"/><path class="d5" d="M58 92l-3 8"/></g>
  <path class="cl-bolt" d="M57 72l-9 14h7l-5 13 14-18h-7l5-9z"/>
  <g class="cl-eyes">
    <ellipse class="cl-eye" cx="42" cy="47" rx="4" ry="5.4"/><ellipse class="cl-eye" cx="62" cy="47" rx="4" ry="5.4"/>
    <g class="cl-plead">
      <ellipse class="pl-eye" cx="42" cy="47" rx="6.6" ry="7.6"/><ellipse class="pl-eye" cx="62" cy="47" rx="6.6" ry="7.6"/>
      <circle class="pl-hi" cx="39.6" cy="44" r="2.6"/><circle class="pl-hi" cx="59.6" cy="44" r="2.6"/>
      <circle class="pl-hi sm" cx="44.6" cy="50.2" r="1.2"/><circle class="pl-hi sm" cx="64.6" cy="50.2" r="1.2"/>
      <path class="pl-tear" d="M36.8 50.5q5.2 4.4 10.4 0M56.8 50.5q5.2 4.4 10.4 0"/>
      <path class="pl-brow" d="M36 36.5l9-3M68 36.5l-9-3"/>
    </g>
    <path class="cl-happy" d="M37.5 48.5q4.5-5.5 9 0M57.5 48.5q4.5-5.5 9 0"/><path class="cl-sleep" d="M37.5 48h9M57.5 48h9"/>
  </g>
  <path class="cl-sweat" d="M78 22c5 6.5 7 10.5 3.6 14a5 5 0 0 1-7.4-6.4c.6-2.4 2-4.6 3.8-7.6z"/>
  <g class="cl-zzz"><text x="76" y="22">z</text><text x="90" y="6" class="big">Z</text></g>
  <g class="cl-dots"><circle cx="40" cy="2" r="2.6"/><circle cx="52" cy="-1" r="2.6"/><circle cx="64" cy="2" r="2.6"/></g>
</svg>`;

/* WMO weather codes from Open-Meteo → what the cloud wears */
function wxKind(w) {
  const c = +w.code;
  if (c >= 95) return 'storm';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if (c === 45 || c === 48) return 'fog';
  if (c === 3) return 'cloudy';
  if (w.temp >= 34) return 'hot';
  if (w.wind >= 30) return 'windy';
  return 'sunny';
}
const WX_WORDS = { storm: 'Thunderstorm', rain: 'Rain', fog: 'Fog', cloudy: 'Cloudy', hot: 'Hot', windy: 'Windy', sunny: 'Clear' };
function timeOfDay(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  return h < 5 || h >= 19.5 ? 'night' : h < 9 ? 'morning' : h >= 17 ? 'evening' : 'day';
}
