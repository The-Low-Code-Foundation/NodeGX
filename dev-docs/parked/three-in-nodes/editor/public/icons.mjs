// Small isometric pictures of each thing the editor adds, drawn in two tones of the tile's colour.
const svg = (body, size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;

const top = 'fill="currentColor" fill-opacity=".95"';
const left = 'fill="currentColor" fill-opacity=".55"';
const right = 'fill="currentColor" fill-opacity=".3"';
const line = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  box: svg(`<path ${top} d="M12 3l8 4.5-8 4.5-8-4.5z"/><path ${left} d="M4 7.5l8 4.5v9l-8-4.5z"/><path ${right} d="M20 7.5l-8 4.5v9l8-4.5z"/>`),
  sphere: svg(`<defs><radialGradient id="g-s" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="currentColor" stop-opacity="1"/><stop offset="1" stop-color="currentColor" stop-opacity=".25"/></radialGradient></defs><circle cx="12" cy="12" r="8.5" fill="url(#g-s)"/>`),
  cylinder: svg(`<path ${left} d="M5 6.5v11c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5v-11"/><path ${right} d="M12 10c3.9 0 7-1.6 7-3.5v11c0 1.9-3.1 3.5-7 3.5z"/><ellipse ${top} cx="12" cy="6.5" rx="7" ry="3.5"/>`),
  cone: svg(`<path ${left} d="M12 2.5L4.5 17.5c0 1.9 3.4 3.5 7.5 3.5z"/><path ${right} d="M12 2.5l7.5 15c0 1.9-3.4 3.5-7.5 3.5z"/><ellipse fill="currentColor" fill-opacity=".18" cx="12" cy="17.5" rx="7.5" ry="3.5"/>`),
  torus: svg(`<ellipse cx="12" cy="12.5" rx="8.5" ry="5" fill="none" stroke="currentColor" stroke-opacity=".9" stroke-width="3.6"/><path d="M5 10.6c1.6-1.6 4.1-2.6 7-2.6s5.4 1 7 2.6" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="1.2"/>`),
  plane: svg(`<path ${top} d="M12 7l9 5-9 5-9-5z"/><path fill="none" stroke="currentColor" stroke-opacity=".5" d="M7.5 9.5l9 5M16.5 9.5l-9 5"/>`),
  group: svg(`<path ${line} stroke-dasharray="2.4 2.2" d="M12 2.8l8.5 4.7v9L12 21.2l-8.5-4.7v-9z"/><path ${top} d="M12 8.5l3.6 2-3.6 2-3.6-2z"/><path ${left} d="M8.4 10.5l3.6 2v4l-3.6-2z"/><path ${right} d="M15.6 10.5l-3.6 2v4l3.6-2z"/>`),
  sun: svg(`<circle cx="12" cy="12" r="4.2" fill="currentColor"/><path ${line} d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>`),
  lamp: svg(`<path fill="currentColor" d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/><path ${line} d="M9.6 18.5h4.8M10.4 21h3.2"/>`),
  sky: svg(`<path fill="currentColor" fill-opacity=".95" d="M3 13a9 9 0 0 1 18 0z"/><path fill="currentColor" fill-opacity=".35" d="M3 14h18a9 6 0 0 1-18 0z"/>`),
  scene: svg(`<rect x="2.5" y="4" width="19" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path ${top} d="M12 8l4 2.2-4 2.2-4-2.2z"/><path ${left} d="M8 10.2l4 2.2v4l-4-2.2z"/><path ${right} d="M16 10.2l-4 2.2v4l4-2.2z"/>`),
  foreach: svg(`<path ${line} d="M4 7h11M4 12h11M4 17h11"/><path ${line} d="M18 6.5a3.5 3.5 0 1 1 0 7"/><path fill="currentColor" d="M17 11.5l2.6 2-2.6 2z"/>`),
  other: svg(`<circle cx="12" cy="12" r="3" fill="currentColor"/>`),
  body: svg(`<circle cx="14" cy="13" r="6" fill="currentColor" fill-opacity=".9"/><path ${line} d="M2.5 9.5h4M2 13h3.5M2.5 16.5h4"/><path fill="currentColor" fill-opacity=".45" d="M6 20.5h16v1.5H6z"/>`),
  camera3d: svg(`<path fill="currentColor" fill-opacity=".9" d="M3 7.5A1.5 1.5 0 0 1 4.5 6h9A1.5 1.5 0 0 1 15 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 3 16.5z"/><path fill="currentColor" fill-opacity=".55" d="M15 10.5l6-3.5v10l-6-3.5z"/>`),
  player: svg(`<circle cx="14" cy="13" r="6" fill="currentColor" fill-opacity=".9"/><path ${line} d="M2.5 9.5h4M2 13h3.5M2.5 16.5h4"/>`),
  floor: svg(`<path ${top} d="M12 8l10 5-10 5-10-5z"/><path ${left} d="M2 13v1.5l10 5V18z"/><path ${right} d="M22 13v1.5l-10 5V18z"/>`),
  wall: svg(`<path ${top} d="M12 3l6 3-6 3-6-3z"/><path ${left} d="M6 6l6 3v12l-6-3z"/><path ${right} d="M18 6l-6 3v12l6-3z"/>`),
  coin: svg(`<ellipse cx="12" cy="12" rx="5.5" ry="8" fill="none" stroke="currentColor" stroke-width="3.2"/>`),
  undo: svg(`<path ${line} d="M9 7L4.5 11.5 9 16"/><path ${line} d="M5 11.5h9a5 5 0 0 1 0 10h-2"/>`, 18),
  redo: svg(`<path ${line} d="M15 7l4.5 4.5L15 16"/><path ${line} d="M19 11.5h-9a5 5 0 0 0 0 10h2"/>`, 18),
  copy: svg(`<rect x="8" y="8" width="12" height="12" rx="2" ${line}/><path ${line} d="M16 5V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1"/>`, 16),
  trash: svg(`<path ${line} d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>`, 16),
  eye: svg(`<path ${line} d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`, 16),
  play: svg(`<path fill="currentColor" d="M8 5.5v13l10.5-6.5z"/>`, 14),
  edit: svg(`<path fill="currentColor" d="M5 4l13 6.5-5.6 1.4L10 17.5z"/>`, 14),
  focus: svg(`<path ${line} d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>`, 16),
  grid: svg(`<path ${line} d="M4 9h16M4 15h16M9 4v16M15 4v16"/>`, 16),
  camera: svg(`<path ${line} d="M3 8.5a1.5 1.5 0 0 1 1.5-1.5h2.2l1.6-2.2h7.4L17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/><circle cx="12" cy="12.8" r="3.6" ${line}/>`, 16)
};

/** The colour each kind of thing wears in the palette and the outline. */
export const TINTS = {
  box: '#6aa8ff', sphere: '#ff6b81', cylinder: '#7bed9f', cone: '#ffc048', torus: '#c39bff', plane: '#70e1e1',
  group: '#c8d0dc', sun: '#ffd166', lamp: '#ffe29a', sky: '#8ecbff', scene: '#ffb547', foreach: '#7ee0a8', other: '#8b95a5',
  body: '#ff8a65', camera3d: '#b0bec5', player: '#ff6b6b', floor: '#90a4ae', wall: '#6aa8ff', coin: '#f2b630'
};
