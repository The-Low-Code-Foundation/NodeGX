// The opening crawl: the famous blue line, the project's name receding into the stars, then a
// yellow crawl of the project as a space war (written here from the project's own numbers).
// Any key or click skips it. It plays once a browser session; clicking the project's name plays it again.

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
function roman(n) {
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) (out += s), (n -= v);
  return out || 'I';
}

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const list = (folders) => {
  const xs = folders.map((f) => (f === '(top level)' ? 'core' : f));
  return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
};

/** The crawl's words, from the project: its name, its numbers and which folders fly for which side. */
export function crawlText({ name, components, nodes, wires, fleets }) {
  const e = fleets.empire;
  const r = fleets.rebels;
  return {
    episode: `Episode ${roman(components)}`,
    title: name.toUpperCase(),
    paragraphs: [
      `The ${name} is at war with itself. ${components} components drift through the void as capital ships, their decks crowded with ${nodes.toLocaleString()} nodes and ${wires.toLocaleString()} crackling wires.`,
      `The EMPIRE commands ${e.ships} ships of the ${list(e.folders)} squadrons. Against them, a REBEL fleet of ${r.ships} ships holds the ${list(r.folders)} sectors.`,
      `Between the fleets, TIE fighters and X-wings duel without end. Aboard the map, a lone developer prepares to rewire them all, knowing that a single unsaved change could tip the balance of the galaxy....`
    ]
  };
}

let current = null;

export function playCrawl(info) {
  current?.();
  const t = crawlText(info);
  const el = document.createElement('div');
  el.id = 'crawl';
  el.innerHTML = `
    <div class="crawl-intro">A long time ago in a galaxy far,<br>far away....</div>
    <div class="crawl-logo">${esc(t.title)}</div>
    <div class="crawl-field"><div class="crawl-text">
      <p class="crawl-episode">${esc(t.episode)}</p>
      <p class="crawl-title">${esc(t.title)}</p>
      ${t.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
    </div></div>
    <div class="crawl-skip">Press any key or click to skip</div>`;
  document.body.appendChild(el);
  const end = () => {
    if (!el.isConnected) return;
    el.classList.add('crawl-done');
    setTimeout(() => el.remove(), 600);
    window.removeEventListener('keydown', end, true);
    window.removeEventListener('pointerdown', end, true);
    current = null;
  };
  // Skipping does not swallow the key or click, so the first one still starts the music.
  setTimeout(() => {
    window.addEventListener('keydown', end, true);
    window.addEventListener('pointerdown', end, true);
  }, 300);
  el.querySelector('.crawl-text').addEventListener('animationend', end);
  current = end;
  return end;
}

/** Plays the crawl if it has not played in this browser session yet. */
export function crawlOncePerSession(info) {
  if (sessionStorage.getItem('map-crawl') === 'seen') return;
  sessionStorage.setItem('map-crawl', 'seen');
  playCrawl(info);
}
