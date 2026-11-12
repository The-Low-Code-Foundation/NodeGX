// Maestro Fig's piano (the Music Room, round 2; SCOPE.md §8: "learn where do, ré, mi sit on the stave; play falling
// notes; then read a short tune off a page of sheet music without help"). Eight keys, C4 to C5 (do to do), named both
// ways (she is at school in France). Three ways to play:
//   notes  "Find the note": a note appears on the stave, she taps its key. Eight in a row; her best is kept.
//   glow   "Follow the glow": a song on the stave, the next key lit up. Finishing it is a silver star.
//   read   "Read the music": the same song, no glow and no names on the keys. A gold star.
// The songs are data (SONGS): another room can bring more, and each one is played the same two ways.
//
// open(api) resolves when she closes it. api: { save, persist, sfx, note(midi, opts), press(i), fig(mood) }.
// While open, `window.__game.mini` is { kind: 'piano', mode, song, expect(), tap(i) } for the drives.

export const KEYS = [
  { midi: 60, en: 'C', fr: 'Do', step: -2 },
  { midi: 62, en: 'D', fr: 'Ré', step: -1 },
  { midi: 64, en: 'E', fr: 'Mi', step: 0 },
  { midi: 65, en: 'F', fr: 'Fa', step: 1 },
  { midi: 67, en: 'G', fr: 'Sol', step: 2 },
  { midi: 69, en: 'A', fr: 'La', step: 3 },
  { midi: 71, en: 'B', fr: 'Si', step: 4 },
  { midi: 72, en: 'C', fr: 'Do', step: 5 }
];
const IDX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6, c: 7 };
// A tune as letters (c = the high do), each with its length in beats after a colon when it is not one beat.
const tune = (s) => s.trim().split(/\s+/).map((t) => {
  const [n, b] = t.split(':');
  return { k: IDX[n], beats: Number(b) || 1 };
});
export const SONGS = [
  { id: 'lune', title: 'Au clair de la lune', notes: tune('C C C D E:2 D:2 C E D D C:4') },
  { id: 'lamb', title: 'Mary Had a Little Lamb', notes: tune('E D C D E E E:2 D D D:2 E G G:2') },
  { id: 'twinkle', title: 'Twinkle, Twinkle, Little Star', notes: tune('C C G G A A G:2 F F E E D D C:2') },
  { id: 'jacques', title: 'Frère Jacques', notes: tune('C D E C C D E C E F G:2 E F G:2') },
  { id: 'joy', title: 'Ode to Joy', notes: tune('E E F G G F E D C C D E E:1.5 D:0.5 D:2') }
];
const KEYBOARD = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'];

// The stave: five lines, a treble clef, and the notes as round heads (a ledger line through the low do).
const LINE = 12, BOTTOM = 92, X0 = 70;
const yOf = (step) => BOTTOM - step * (LINE / 2);
function staveSvg(notes, { at = -1, width = 640, names = false, done = 0 } = {}) {
  const gap = Math.min(46, (width - X0 - 20) / Math.max(1, notes.length));
  let s = `<svg viewBox="0 0 ${width} 130" class="stave" role="img" aria-label="music">`;
  for (let l = 0; l < 5; l++) s += `<line x1="10" x2="${width - 10}" y1="${BOTTOM - l * LINE}" y2="${BOTTOM - l * LINE}" />`;
  s += `<text x="16" y="${BOTTOM + 6}" class="clef">𝄞</text>`;
  notes.forEach((n, i) => {
    const k = KEYS[n.k];
    const x = X0 + i * gap + gap / 2, y = yOf(k.step);
    const cls = i < done ? 'done' : i === at ? 'now' : '';
    if (k.step <= -2) s += `<line class="ledger" x1="${x - 11}" x2="${x + 11}" y1="${yOf(-2)}" y2="${yOf(-2)}" />`;
    const hollow = n.beats >= 2;
    s += `<g class="note ${cls}"><ellipse cx="${x}" cy="${y}" rx="7.5" ry="5.6" transform="rotate(-20 ${x} ${y})" class="${hollow ? 'hollow' : ''}" />`;
    if (n.beats < 4) s += `<line x1="${x + 6.5}" x2="${x + 6.5}" y1="${y}" y2="${y - 34}" />`;
    if (n.beats === 0.5) s += `<path d="M${x + 6.5} ${y - 34} q 10 8 6 20" class="flag" />`;
    if (n.beats === 1.5) s += `<circle cx="${x + 12}" cy="${y - 2}" r="2" />`;
    if (names) s += `<text x="${x}" y="122" class="name">${k.fr}</text>`;
    s += `</g>`;
  });
  return s + '</svg>';
}

let el = null;
function ensure() {
  if (el) return el;
  el = document.createElement('section');
  el.id = 'piano';
  el.hidden = true;
  el.innerHTML = `
    <div class="win piano-panel">
      <div class="row" id="p-modes"></div>
      <p id="p-say"></p>
      <div id="p-stave"></div>
      <div id="p-keys"></div>
      <p class="small"><span id="p-hint"></span> <button class="link" id="p-done">Thank Maestro Fig and go</button></p>
    </div>`;
  document.body.appendChild(el);
  return el;
}

export function open(api) {
  const { save, persist, sfx } = api;
  save.piano ??= { best: 0, songs: {} };
  ensure();
  el.hidden = false;
  const $ = (s) => el.querySelector(s);
  let mode = 'notes', song = null, pos = 0, quiz = [], right = 0, wrongs = 0, busy = false;
  const fig = (text, mood) => {
    $('#p-say').innerHTML = `<b>Maestro Fig:</b> ${text}`;
    if (mood) api.fig?.(mood);
  };
  const stars = (id) => ({ glow: '☆', read: '★' })[save.piano.songs[id]] ?? '';
  const renderModes = () => {
    const m = $('#p-modes');
    m.innerHTML = '';
    const chip = (label, on, fn, title = '') => {
      const b = document.createElement('button');
      b.className = `chip${on ? ' on' : ''}`;
      b.textContent = label;
      b.title = title;
      b.onclick = () => (sfx('click'), fn());
      m.appendChild(b);
    };
    chip(`🎼 Find the note${save.piano.best ? ` (best ${save.piano.best}/8)` : ''}`, mode === 'notes', startNotes);
    for (const sg of SONGS) chip(`${sg.title} ${stars(sg.id)}`.trim(), song === sg, () => startSong(sg, save.piano.songs[sg.id] ? 'read' : 'glow'));
    if (song && save.piano.songs[song.id]) chip(mode === 'read' ? '✨ With the glow' : '📖 Read it, no glow', false, () => startSong(song, mode === 'read' ? 'glow' : 'read'));
  };
  const renderKeys = () => {
    const k = $('#p-keys');
    k.innerHTML = '';
    const glowAt = mode === 'glow' && song ? song.notes[pos]?.k : -1;
    KEYS.forEach((key, i) => {
      const b = document.createElement('button');
      b.className = `key${i === glowAt ? ' glow' : ''}`;
      b.dataset.k = i;
      b.innerHTML = mode === 'read' ? '' : `<b>${key.fr}</b><small>${key.en}</small>`;
      b.onpointerdown = (e) => (e.preventDefault(), tap(i));
      k.appendChild(b);
    });
  };
  const renderStave = () => {
    if (mode === 'notes') $('#p-stave').innerHTML = staveSvg([{ k: quiz[right + wrongs] ?? 0, beats: 1 }], { at: 0, width: 260 });
    else $('#p-stave').innerHTML = staveSvg(song.notes, { at: pos, done: pos, names: mode === 'glow' });
  };
  const render = () => (renderModes(), renderStave(), renderKeys());
  function startNotes() {
    mode = 'notes';
    song = null;
    // Eight notes, never the same twice running.
    quiz = [];
    while (quiz.length < 8) {
      const k = Math.floor(Math.random() * 8);
      if (k !== quiz.at(-1)) quiz.push(k);
    }
    right = wrongs = 0;
    $('#p-hint').textContent = 'Tap the key for the note on the stave (or the keys A S D F G H J K).';
    fig('Which note is this? Tap its key. Remember: the low <b>Do</b> sits on its own little line under the stave!', 'think');
    render();
  }
  function startSong(sg, m) {
    mode = m;
    song = sg;
    pos = 0;
    wrongs = 0;
    $('#p-hint').textContent = m === 'glow' ? 'Play the glowing key each time.' : 'No glow this time: read each note on the stave.';
    fig(m === 'glow' ? `“${sg.title}”! Follow the glowing keys, my dear.` : `Now, “${sg.title}” from the music alone. Look at where each note sits on the lines!`, 'think');
    render();
  }
  // Fig plays a tune back, in time.
  function playBack(notes, beat = 0.42) {
    let at = 0;
    notes.forEach((n, i) => {
      api.note?.(KEYS[n.k].midi, { at, dur: Math.max(0.5, n.beats * beat * 1.4), vol: 0.18 });
      setTimeout(() => api.press?.(n.k), at * 1000);
      at += n.beats * beat;
      void i;
    });
    return at;
  }
  function tap(i) {
    if (busy) return;
    api.note?.(KEYS[i].midi);
    api.press?.(i);
    const b = $(`#p-keys .key[data-k="${i}"]`);
    b?.classList.add('down');
    setTimeout(() => b?.classList.remove('down'), 160);
    if (mode === 'notes') {
      const want = quiz[right + wrongs];
      if (i === want) {
        right++;
        fig(['Bravo!', 'Magnifique!', 'Exactly so!', 'Perfect pitch!'][right % 4], 'happy');
      } else {
        wrongs++;
        sfx('wrong');
        fig(`That was <b>${KEYS[i].fr}</b>. This one was <b>${KEYS[want].fr}</b> (${KEYS[want].en}). Next!`, 'think');
      }
      if (right + wrongs >= 8) {
        busy = true;
        const best = right > save.piano.best;
        save.piano.best = Math.max(save.piano.best, right);
        persist();
        setTimeout(() => {
          busy = false;
          sfx(right >= 6 ? 'win' : 'potion');
          fig(`${right} out of 8${best ? ', your best yet' : ''}! ${right === 8 ? 'A perfect ear! Encore!' : 'Shall we try another eight?'}`, right >= 6 ? 'happy' : null);
          startNotesSoon();
        }, 500);
      }
      renderStave();
      return;
    }
    const want = song.notes[pos].k;
    if (i !== want) {
      wrongs++;
      fig(mode === 'glow' ? 'Oops! The <b>glowing</b> one.' : `Not that one. Count the lines: this note is <b>${KEYS[want].fr}</b>.`, 'think');
      if (mode === 'read' && wrongs >= 3) renderKeys();
      return;
    }
    pos++;
    if (pos < song.notes.length) return (renderStave(), renderKeys());
    // The end of the song: Fig plays it through, and a star.
    busy = true;
    renderStave();
    renderKeys();
    const was = save.piano.songs[song.id];
    const star = mode === 'read' ? 'read' : was === 'read' ? 'read' : 'glow';
    save.piano.songs[song.id] = star;
    persist();
    fig(`Wonderful! Listen, here it is all together…`, 'happy');
    const len = playBack(song.notes);
    setTimeout(() => {
      busy = false;
      sfx('reward');
      fig(mode === 'read' ? `You read “${song.title}” all by yourself! A gold star ★` : `A silver star ☆ for “${song.title}”! Now try it with no glow: tap “Read it, no glow”.`, 'happy');
      renderModes();
    }, len * 1000 + 300);
  }
  let soon = null;
  function startNotesSoon() {
    clearTimeout(soon);
    soon = setTimeout(() => mode === 'notes' && startNotes(), 2600);
  }
  const onKey = (e) => {
    const i = KEYBOARD.indexOf(e.code);
    if (i >= 0 && !e.repeat) tap(i);
  };
  addEventListener('keydown', onKey);
  startNotes();
  fig('Ah! A pianist! I am Maestro Fig. Shall we learn the notes first? Then pick a song above.', 'happy');
  const handle = { kind: 'piano', get mode() { return mode; }, get song() { return song?.id ?? null; }, expect: () => (mode === 'notes' ? quiz[right + wrongs] : song?.notes[pos]?.k), tap, start: (id, m = 'glow') => startSong(SONGS.find((s) => s.id === id), m), get busy() { return busy; } };
  if (window.__game) window.__game.mini = handle;
  return new Promise((resolve) => {
    $('#p-done').onclick = () => {
      sfx('click');
      clearTimeout(soon);
      removeEventListener('keydown', onKey);
      el.hidden = true;
      if (window.__game?.mini === handle) window.__game.mini = null;
      resolve();
    };
  });
}
