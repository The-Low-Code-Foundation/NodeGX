// Madame Lune's ball (the Ballroom, round 2; SCOPE.md §8: "a rhythm game on four arrows"). Arrows fall down four
// lanes in time to a tune; she taps the lane (or presses the arrow key) as each one reaches the line: Perfect, Good or
// Missed. The heroine dances the whole time; a Perfect throws stardust round her feet. Each dance is data (DANCES): a
// tempo, a tune and a pattern of steps, so a later room can bring more, played the same way. Her best stars per dance
// are kept (1★ half the points, 2★ three quarters, 3★ nine tenths).
//
// open(api) resolves when she closes it. api: { save, persist, sfx, note(midi, opts), tick(strong), sparkle(kind),
// lune(mood) }. While open, `window.__game.mini` is { kind: 'dance', next(), hit(lane), playing, result } for drives.

export const LANES = [
  { id: 'L', arrow: '←', code: ['ArrowLeft', 'KeyA'] },
  { id: 'D', arrow: '↓', code: ['ArrowDown', 'KeyS'] },
  { id: 'U', arrow: '↑', code: ['ArrowUp', 'KeyW'] },
  { id: 'R', arrow: '→', code: ['ArrowRight', 'KeyD'] }
];
// `steps`: one character a beat, a lane letter or `.` for a rest. `tune`: one MIDI note a beat (0 = none).
export const DANCES = [
  {
    id: 'waltz', title: 'The Moonlight Waltz', bpm: 96, bar: 3,
    steps: 'L..R..L..R..U..D..U..D..L.RL.RU.DU.D',
    tune: [65, 69, 72, 77, 76, 72, 74, 72, 69, 70, 72, 69, 65, 67, 69, 72, 70, 67, 65, 64, 65, 69, 72, 77, 76, 72, 74, 72, 69, 70, 67, 64, 65, 0, 0, 0]
  },
  {
    id: 'polka', title: 'The Starlight Polka', bpm: 112, bar: 2,
    steps: 'L.R.L.R.U.U.D.D.LRLRU.D.LLRRUUD.',
    tune: [72, 76, 79, 76, 72, 76, 79, 0, 74, 77, 81, 77, 74, 77, 79, 0, 72, 76, 79, 84, 81, 79, 77, 76, 74, 76, 77, 74, 72, 0, 72, 0]
  },
  {
    id: 'gavotte', title: 'The Midnight Gavotte', bpm: 104, bar: 4,
    steps: 'LDUR.RUDL.LRLR..UUDD.LURD.RDUL...',
    tune: [69, 72, 76, 72, 74, 71, 67, 71, 69, 72, 76, 81, 79, 76, 72, 0, 77, 76, 74, 72, 71, 72, 74, 76, 69, 71, 72, 74, 76, 0, 69, 0, 0]
  }
];
const LEAD = 2.2; // seconds an arrow takes to fall from the top to the line
const PERFECT = 0.11, GOOD = 0.22, LATE = 0.3;

let el = null;
function ensure() {
  if (el) return el;
  el = document.createElement('section');
  el.id = 'dance';
  el.hidden = true;
  el.innerHTML = `
    <div class="win dance-side">
      <h2>The Ball</h2>
      <p id="d-say"></p>
      <div id="d-list"></div>
      <p class="small">Tap the lanes, or press ← ↓ ↑ → as each arrow reaches the line.</p>
      <p class="small"><button class="link" id="d-done">Curtsey to Madame Lune and go</button></p>
    </div>
    <div class="lanes" id="d-lanes" hidden>
      ${LANES.map((l, i) => `<div class="lane" data-lane="${i}"><div class="target">${l.arrow}</div></div>`).join('')}
      <div id="d-judge"></div>
      <div id="d-score"></div>
    </div>`;
  document.body.appendChild(el);
  return el;
}

export function open(api) {
  const { save, persist, sfx } = api;
  save.dances ??= {};
  ensure();
  el.hidden = false;
  const $ = (s) => el.querySelector(s);
  let dance = null, notes = [], t0 = 0, raf = 0, playing = false, points = 0, result = null, lastBeat = -1;
  const lune = (text, mood) => {
    $('#d-say').innerHTML = `<b>Madame Lune:</b> ${text}`;
    if (mood) api.lune?.(mood);
  };
  const starsOf = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const renderList = () => {
    const l = $('#d-list');
    l.innerHTML = '';
    for (const d of DANCES) {
      const b = document.createElement('button');
      b.className = `dance-pick${dance === d ? ' on' : ''}`;
      b.innerHTML = `${d.title}<small>${starsOf(save.dances[d.id] ?? 0)}</small>`;
      b.disabled = playing;
      b.onclick = () => (sfx('click'), start(d));
      l.appendChild(b);
    }
  };
  const now = () => (performance.now() - t0) / 1000;
  function start(d) {
    dance = d;
    const beat = 60 / d.bpm;
    notes = [];
    [...d.steps].forEach((c, i) => {
      const lane = LANES.findIndex((l) => l.id === c);
      if (lane >= 0) notes.push({ lane, t: LEAD + i * beat, judged: false, el: null });
    });
    for (const n of notes) {
      n.el = document.createElement('div');
      n.el.className = 'arrow';
      n.el.textContent = LANES[n.lane].arrow;
      el.querySelector(`.lane[data-lane="${n.lane}"]`).appendChild(n.el);
    }
    points = 0;
    result = null;
    lastBeat = -1;
    playing = true;
    $('#d-lanes').hidden = false;
    $('#d-judge').textContent = '';
    $('#d-score').textContent = '';
    lune(`“${d.title}”! Ready… and one, two, three…`, 'happy');
    api.dancing?.(true);
    renderList();
    t0 = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  function judge(n, how) {
    n.judged = true;
    n.el.classList.add(how);
    setTimeout(() => n.el.remove(), 260);
    points += how === 'perfect' ? 2 : how === 'good' ? 1 : 0;
    const j = $('#d-judge');
    j.textContent = how === 'perfect' ? 'Perfect!' : how === 'good' ? 'Good!' : 'Missed';
    j.className = how;
    j.style.animation = 'none';
    void j.offsetWidth;
    j.style.animation = '';
    if (how === 'perfect') api.sparkle?.('perfect');
    $('#d-score').textContent = `${points} / ${notes.length * 2}`;
  }
  function hit(lane) {
    if (!playing) return;
    const t = now();
    const lt = el.querySelector(`.lane[data-lane="${lane}"] .target`);
    lt.classList.add('down');
    setTimeout(() => lt.classList.remove('down'), 120);
    // The nearest unjudged arrow in that lane, if it is close enough to count.
    let best = null;
    for (const n of notes) if (!n.judged && n.lane === lane && Math.abs(n.t - t) < LATE && (!best || Math.abs(n.t - t) < Math.abs(best.t - t))) best = n;
    if (!best) return;
    const off = Math.abs(best.t - t);
    judge(best, off <= PERFECT ? 'perfect' : off <= GOOD ? 'good' : 'miss');
  }
  function loop() {
    const t = now();
    const beat = 60 / dance.bpm;
    // The tune and the beat, one note a beat from the moment the first arrow lands.
    const b = Math.floor((t - LEAD) / beat);
    if (b > lastBeat && b >= 0 && b < dance.tune.length) {
      lastBeat = b;
      const m = dance.tune[b];
      if (m) api.note?.(m, { dur: beat * 1.6, vol: 0.14 });
      if (b % dance.bar === 0 && m) api.note?.(m - 24, { dur: beat * dance.bar, vol: 0.1 });
      api.tick?.(b % dance.bar === 0);
    }
    const h = $('#d-lanes').clientHeight || 400;
    const line = h - 70;
    for (const n of notes) {
      if (n.judged) continue;
      if (t - n.t > LATE) judge(n, 'miss');
      else n.el.style.transform = `translateY(${line - (n.t - t) * (line / LEAD) - 28}px)`;
    }
    const end = notes.at(-1).t + 1.2;
    if (t < end) raf = requestAnimationFrame(loop);
    else finish();
  }
  function finish() {
    playing = false;
    api.dancing?.(false);
    const share = points / (notes.length * 2);
    const stars = share >= 0.9 ? 3 : share >= 0.75 ? 2 : share >= 0.5 ? 1 : 0;
    const was = save.dances[dance.id] ?? 0;
    save.dances[dance.id] = Math.max(was, stars);
    persist();
    result = { id: dance.id, points, of: notes.length * 2, stars };
    sfx(stars ? 'win' : 'potion');
    lune(stars === 3 ? 'Exquisite! You dance like moonlight on water! ★★★' : stars ? `Lovely! ${starsOf(stars)}${stars > was ? ' — your best yet!' : ''} Again, or another dance?` : 'Hmm, the music ran away from you! Watch the arrows land on the line, and try again.', stars ? 'happy' : null);
    setTimeout(() => !playing && ($('#d-lanes').hidden = true), 1400);
    renderList();
  }
  const onKey = (e) => {
    const lane = LANES.findIndex((l) => l.code.includes(e.code));
    if (lane >= 0 && !e.repeat) {
      e.preventDefault();
      hit(lane);
    }
  };
  addEventListener('keydown', onKey, true);
  for (const laneEl of el.querySelectorAll('.lane')) laneEl.onpointerdown = (e) => (e.preventDefault(), hit(Number(laneEl.dataset.lane)));
  $('#d-lanes').hidden = true;
  dance = null;
  renderList();
  lune('Welcome to my ball, little sorceress! Pick a dance, and follow the arrows with your feet.', 'happy');
  const handle = { kind: 'dance', hit, start: (id) => start(DANCES.find((d) => d.id === id)), get playing() { return playing; }, get result() { return result; }, next: () => notes.filter((n) => !n.judged).map((n) => ({ lane: n.lane, in: n.t - now() }))[0] ?? null };
  if (window.__game) window.__game.mini = handle;
  return new Promise((resolve) => {
    $('#d-done').onclick = () => {
      sfx('click');
      cancelAnimationFrame(raf);
      for (const n of notes) n.el?.remove();
      playing = false;
      api.dancing?.(false);
      removeEventListener('keydown', onKey, true);
      el.hidden = true;
      if (window.__game?.mini === handle) window.__game.mini = null;
      resolve();
    };
  });
}
