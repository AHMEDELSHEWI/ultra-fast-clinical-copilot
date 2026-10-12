// Original medical icon set (24x24, stroke-based, drawn for this product).
// Each icon has a meaning; colour comes from its semantic tone, never decoration only.

const P = {
  heart: '<path d="M12 20.5s-7.5-4.6-7.5-10.4A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.7c0 5.8-7.5 10.4-7.5 10.4z"/><path d="M6.5 12.2h2.6l1.3-2.6 2.1 5 1.4-2.4h3.6"/>',
  lungs: '<path d="M12 3.5v8"/><path d="M12 9.5l-2.2 1.8M12 9.5l2.2 1.8"/><path d="M9.8 8.2C7.6 6.6 4.8 8.6 4.3 12.6c-.5 4 .3 7.4 3 7.4 1.9 0 2.5-1.6 2.5-3.6V11.3"/><path d="M14.2 8.2c2.2-1.6 5-.4 5.5 4.4.5 4-.3 7.4-3 7.4-1.9 0-2.5-1.6-2.5-3.6v-5.1"/>',
  brain: '<path d="M11.5 5.2A2.6 2.6 0 0 0 7 6.6a2.9 2.9 0 0 0-2.3 4.1 3 3 0 0 0 .7 4.9A2.8 2.8 0 0 0 9.2 19a2.4 2.4 0 0 0 2.3.8z"/><path d="M12.5 5.2A2.6 2.6 0 0 1 17 6.6a2.9 2.9 0 0 1 2.3 4.1 3 3 0 0 1-.7 4.9 2.8 2.8 0 0 1-3.8 3.4 2.4 2.4 0 0 1-2.3.8z"/><path d="M8.2 10.5c1 .2 1.8.9 2 2M15.8 10.5c-1 .2-1.8.9-2 2"/>',
  stomach: '<path d="M10 3v3.5c0 1.6-4 2.4-4 7.2a6.3 6.3 0 0 0 6.3 6.3h.4c3 0 5.3-2.2 5.3-5 0-2.2-1.6-3.8-3.6-3.8-1.7 0-2.5 1-3.6.3-.8-.5-.8-1.6-.8-2.5V3"/><path d="M15 20l1.5 1.5"/>',
  syncope: '<circle cx="16.5" cy="5" r="2"/><path d="M15 8.5l-4.2 4.2-3.8.6"/><path d="M10.8 12.7l1.8 3.3-2.2 3.2"/><path d="M12.6 16l3.9.4"/><path d="M3 21h18"/>',
  pulse: '<path d="M3 12.5h3.6l2-5.5 3.2 11 2.4-7.5 1.5 2h5.3"/>',
  thermometer: '<path d="M14 14.6V4.8a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/><circle cx="12" cy="17.6" r="1.2"/>',
  vomit: '<circle cx="12" cy="8.5" r="5"/><path d="M10 7.3h.01M14 7.3h.01"/><path d="M10.4 11c1 .6 2.2.6 3.2 0"/><path d="M11 15.5l-.6 2.2M13 15.5l.6 2.6M12 15.5v4.5"/>',
  confusion: '<path d="M15.5 20v-3.2a6.8 6.8 0 1 0-8.4-6.3c0 1.6.6 3 1.6 4.2V20"/><path d="M10 8.8a2.2 2.2 0 1 1 3.2 2c-.7.4-1.2.9-1.2 1.7"/><path d="M12 14.6h.01"/>',
  spine: '<rect x="9" y="2.8" width="6" height="3.4" rx="1.2"/><rect x="8.6" y="7.6" width="6.8" height="3.6" rx="1.2"/><rect x="8.2" y="12.6" width="7.6" height="3.6" rx="1.2"/><rect x="8.8" y="17.6" width="6.4" height="3.4" rx="1.2"/>',
  ecg: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M5.5 12.5h3l1.5-3.5 2.2 7 1.7-4.5 1 1h3.6"/>',
  flask: '<path d="M9.5 3h5M10.2 3v6.2L5.3 17.6A2.3 2.3 0 0 0 7.3 21h9.4a2.3 2.3 0 0 0 2-3.4L13.8 9.2V3"/><path d="M7.6 14.5h8.8"/>',
  imaging: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M12 6.5v11M9 8.5c-1.6.4-2.6 1.4-2.6 2.6M9 11.5c-1.6.4-2.6 1.4-2.6 2.6M15 8.5c1.6.4 2.6 1.4 2.6 2.6M15 11.5c1.6.4 2.6 1.4 2.6 2.6"/>',
  ultrasound: '<path d="M8 3.5h8l-1.2 6H9.2z"/><path d="M5 13a10 10 0 0 0 14 0M7.5 16.5a6.5 6.5 0 0 0 9 0M10 20a3 3 0 0 0 4 0"/>',
  syringe: '<path d="M18 3l3 3M16.5 4.5l3 3M19.5 6l-9.8 9.8-3.5-3.5L16 2.5"/><path d="M9 9.5l1.5 1.5M11.5 7l1.5 1.5"/><path d="M6.2 12.3l-2.7 2.7 3 3 2.7-2.7M4.8 16.6L3 18.5"/>',
  pill: '<rect x="2.8" y="8.6" width="18.4" height="6.8" rx="3.4" transform="rotate(-45 12 12)"/><path d="M9.6 9.6l4.8 4.8"/>',
  shield: '<path d="M12 21s7.5-3.3 7.5-9.5V5.6L12 3 4.5 5.6v5.9C4.5 17.7 12 21 12 21z"/><path d="M8.8 12l2.2 2.2 4.4-4.6"/>',
  alert: '<path d="M10.3 4.2L2.8 17.6A2 2 0 0 0 4.5 20.6h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17.2h.01"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.2"/><path d="M9 4.5V3.5h6v1"/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.2"/><path d="M15.5 8.5V5.7a2.2 2.2 0 0 0-2.2-2.2H5.7a2.2 2.2 0 0 0-2.2 2.2v7.6a2.2 2.2 0 0 0 2.2 2.2h2.8"/>',
  stethoscope: '<path d="M6 3.5v5.2a4.5 4.5 0 0 0 9 0V3.5"/><path d="M4.5 3.5H7.5M13.5 3.5h3"/><path d="M10.5 13.2v1.8a5 5 0 0 0 10 0v-1.5"/><circle cx="20.5" cy="11.3" r="2"/>',
  baby: '<circle cx="12" cy="8" r="4.5"/><path d="M10.4 7.6h.01M13.6 7.6h.01M10.8 9.8a1.8 1.8 0 0 0 2.4 0"/><path d="M7.5 21v-2.5a4.5 4.5 0 0 1 9 0V21"/>',
  pregnancy: '<circle cx="11" cy="4.6" r="2"/><path d="M10 21v-5.5l-1.5-.5V10a2.5 2.5 0 0 1 4.6-1.4l.9 1.4c2.6.4 3.8 2.3 3.8 4.2s-1.6 3-3.8 3V21"/>',
  scalpel: '<path d="M20.5 3.5L10 14l-2 .5.5-2L19 2z"/><path d="M8 14.5L3.5 21c3.6-.8 6-3 6.8-6.2"/>',
  home: '<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5.5h4V20"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20.5 20.5"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2.2"/><rect x="7.8" y="5.8" width="8.4" height="3.6" rx="1"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/>',
  droplet: '<path d="M12 3.5s6 6.4 6 10.7a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z"/>',
  activity: '<path d="M3 12h4l2.5-6.5 5 13L17 12h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  bed: '<path d="M3 18.5V6M21 18.5v-5H3"/><path d="M3 13.5h18v-1.5a3 3 0 0 0-3-3h-7.5v4.5"/><circle cx="7" cy="10.8" r="1.8"/>',
  exit: '<path d="M10 4.5H5.5v15H10"/><path d="M14 8l4 4-4 4M18 12H9"/>',
  send: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  refresh: '<path d="M20 11.5A8 8 0 0 0 6.2 6.5L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 12.5a8 8 0 0 0 13.8 5l2.2-2"/><path d="M20 20v-4.5h-4.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 13.5h9l1-13.5"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>',
  upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4.5 19.5h15"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.3 1 2.1V16h5.2v-.1c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5M19 6.5l1.5-1.5"/>',
  zap: '<path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z"/>',
  chevron: '<path d="M9 5.5l6.5 6.5L9 18.5"/>',
  back: '<path d="M15 5.5L8.5 12 15 18.5"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  list: '<path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
  vitals: '<path d="M3 13h3.5l2-4 3 8 2.5-6 1.5 2H21"/><circle cx="12" cy="12" r="9.2" opacity=".35"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  team: '<circle cx="8.5" cy="8" r="3.2"/><circle cx="16.5" cy="9" r="2.6"/><path d="M2.8 19.5a5.8 5.8 0 0 1 11.4 0M14.5 14.6a4.6 4.6 0 0 1 6.8 4.4"/>',
  bandage: '<rect x="2.6" y="8.4" width="18.8" height="7.2" rx="3.6" transform="rotate(-45 12 12)"/><path d="M10.5 10.5h.01M13.5 10.5h.01M10.5 13.5h.01M13.5 13.5h.01"/>',
  kidney: '<path d="M9 4.5c-3 0-5 3-5 7.5s2 7.5 5 7.5c2 0 3-1.4 3-3.2 0-1.5-1.2-2.3-1.2-4.3s1.2-2.8 1.2-4.3C12 5.9 11 4.5 9 4.5z"/><path d="M12 12h3.5c1.4 0 2.5 1.2 2.5 2.6V20"/>',
};

export const TONES = Object.freeze({
  red: ['#c92a2a', '#fff0f0'], orange: ['#d9480f', '#fff3e8'], yellow: ['#a26a00', '#fff8dc'], green: ['#0b7a55', '#e8f8f1'],
  blue: ['#0a58ca', '#eaf2ff'], purple: ['#6741d9', '#f2edff'], teal: ['#0b7285', '#e6f7f9'], slate: ['#334e68', '#eef2f7'], pink: ['#c2255c', '#fff0f6'],
});

/** Bare icon (inherits currentColor). */
export function icon(name, { size = 24, label } = {}) {
  const body = P[name] ?? P.stethoscope;
  const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${aria}>${body}</svg>`;
}

/** Icon on a tinted tile, coloured by meaning. */
export function tile(name, tone = 'blue', size = 'md') {
  const [fg, bg] = TONES[tone] ?? TONES.blue;
  return `<span class="tile tile-${size}" style="--fg:${fg};--bg:${bg}">${icon(name)}</span>`;
}

export const ICON_NAMES = Object.freeze(Object.keys(P));

/** Semantic icon + tone for each complaint icon key used in the content pack. */
export const COMPLAINT_ICON = Object.freeze({
  heart: ['heart', 'red'], lungs: ['lungs', 'teal'], stomach: ['stomach', 'orange'], brain: ['brain', 'purple'],
  syncope: ['syncope', 'blue'], thermometer: ['thermometer', 'red'], bone: ['spine', 'slate'], palpitations: ['pulse', 'pink'],
  vomit: ['vomit', 'orange'], confusion: ['confusion', 'purple'],
});
