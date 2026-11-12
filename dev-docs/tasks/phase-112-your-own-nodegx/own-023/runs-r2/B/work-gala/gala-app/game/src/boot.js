// The game's frame, mounted inside the NodeGX Home page's stage, then started. The grown-ups' changes (`over`, already
// checked by scripts/gala/rows.js) are laid over the rows with gala-rules' applyRows BEFORE main.js loads, because main.js
// reads them as it loads: the save is mended against them and a new school starts with their stars.
import { applyRows } from './data.js';
const MARKUP = `
<canvas id="gl"></canvas>
<div id="top">
  <span id="brand"></span>
  <button type="button" class="chip" id="introBtn"><span id="seasonchip"></span></button>
  <span class="chip stars" id="starchip"></span>
  <span class="chip" id="daychip"></span>
  <button type="button" class="small" id="soundBtn">🔊</button>
  <button type="button" class="small" id="langBtn">EN</button>
  <button type="button" class="small" id="grownUpsBtn"></button>
</div>
<div id="cam"></div>
<div id="sheet" class="side"><nav class="tabs" id="tabs" role="tablist"></nav><div id="sbody"></div><div class="go" id="go"></div></div>
<div id="float" hidden></div>
<div id="toast"></div>
<div id="modal" hidden></div>`;

const STYLESHEETS = [
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@500;700;800&family=Playball&display=swap',
  '/game/style.css',
];

let started = false;
export async function boot(host, { over = {}, onGrownUps } = {}) {
  if (started) return;
  started = true;
  applyRows(over);
  for (const href of STYLESHEETS) {
    if (document.querySelector(`link[href="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href;
    document.head.appendChild(link);
  }
  document.documentElement.lang = 'fr';
  host.innerHTML = MARKUP;
  host.querySelector('#grownUpsBtn').onclick = () => onGrownUps && onGrownUps();
  await import('./main.js');
}
