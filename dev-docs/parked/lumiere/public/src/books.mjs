// Archivist Hoot's reading nook (the Library, round 2): six books on his shelf, each a few pages to turn, and at the
// end Hoot asks one question about it. A right answer is a gold star on the book's spine; a star on every book and
// Hoot gives her his Owl Quill (+10 magic). One book is a recipe that Chef Praline knows (the Tea Room's Moon Biscuits),
// one is a bestiary that fills in as she frees creatures. Richard, 11-12: "a mini game could be as simple as just
// discovering some lore about the castle in books in the library, or reading a recipe for cookies".
//
// open(api) shows it and resolves when she closes it. api: { save, persist, say(text), sfx(name), onQuill() }.
import { ROOMS, CREATURE_NAMES, FREED } from './data.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// A page is HTML (written here, never from a player). `ask`: the question Hoot asks once the last page is turned.
export const BOOKS = [
  {
    id: 'story', title: 'The Story of Château Lumière', colour: '#9a2a3a', ink: '#ffe2a0',
    pages: [
      '<h4>Chapter One</h4><p>Long ago, this was the brightest house in all of France. At night its windows glowed like a lantern on the hill, and travellers called it <b>Château Lumière</b>: the Castle of Light.</p>',
      '<p>Your great-aunt was a sorceress. She grew roses that hummed, she baked with fairies, and every evening there was music in the Ballroom.</p>',
      '<p>Her fairy godmother, <b>Lady Lumière</b>, lived at the top of the Moon Tower. It was her job to keep every candle in the château lit.</p>',
      '<h4>Chapter Two</h4><p>One winter, your great-aunt went away on a very long journey. Lady Lumière waited, and waited. She grew lonely, then sad, then grey.</p>',
      '<p>And her sadness turned into a <b>curse</b>. The candles went out. The château’s good creatures were twisted into grumpy, spooky ones. The doors locked themselves…</p>',
      '<p>…and the château slept for a hundred years, until someone with a staff came home.</p><p class="smudge">(The rest of the page is smudged. With tears? Or tea?)</p>'
    ],
    ask: { q: 'What did Lady Lumière’s sadness turn into?', options: ['A curse', 'A birthday cake', 'A song'], a: 0 }
  },
  {
    id: 'recipe', title: 'Great-Aunt’s Moon Biscuits', colour: '#f2c4d4', ink: '#7a2a4a',
    pages: [
      '<h4>Moon Biscuits</h4><p><i>Makes about 12. My favourite for midnight feasts!</i></p><p>— your great-aunt</p>',
      '<h4>You need</h4><ul><li>100 g soft butter</li><li>50 g sugar</li><li>150 g flour</li><li>1 egg yolk</li><li>a drop of vanilla</li><li>a grown-up, for the oven!</li></ul>',
      '<ol><li>Squish the butter and the sugar together until it is pale and fluffy.</li><li>Stir in the egg yolk and the vanilla.</li><li>Add the flour, and squeeze it all into a ball of dough.</li></ol>',
      '<ol start="4"><li>Roll it out as thick as your little finger.</li><li>Cut out crescent moons.</li><li>Bake for 10 minutes at 180 °C, until the edges are golden.</li></ol>',
      '<ol start="7"><li>When they are cool, paint the tips with icing and add a pinch of sugar stars.</li></ol><p>Eat one. Give one away!</p>',
      '<p class="smudge">(Written underneath, in a different hand: “Chef Praline knows this one too. Tell her you have read it! — H.”)</p>'
    ],
    ask: { q: 'How many egg yolks go into the Moon Biscuits?', options: ['Twelve', 'One', 'Three'], a: 1 }
  },
  {
    id: 'bestiary', title: 'Creatures of the Château', colour: '#2a6a46', ink: '#d8ffe2',
    // Its pages are written from what she has freed so far (see `pagesOf`).
    pages: null,
    ask: { q: 'What was the Grumpy Grimoire, before the curse?', options: ['A cookbook', 'A map', 'A storybook nobody read any more'], a: 2 }
  },
  {
    id: 'jokes', title: 'Hoot’s Big Book of Owl Jokes', colour: '#e08a2a', ink: '#fff2c8',
    pages: [
      '<p><b>Why did the owl go to school?</b></p><p>To get even <i>wiser!</i> Hoo hoo!</p>',
      '<p><b>What do you call an owl who does magic tricks?</b></p><p>Hoo-dini!</p>',
      '<p><b>What is an owl’s favourite subject at school?</b></p><p>Owl-gebra!</p>',
      '<p><b>What does an owl say when it leaves?</b></p><p>“Owl see you later!”</p>',
      '<p><b>Why do owls never go out in the rain?</b></p><p>Because it’s too <i>wet</i> to <i>woo!</i></p><p class="smudge">(Hoot laughed so hard at this one he fell off his perch.)</p>'
    ],
    ask: { q: 'What is an owl’s favourite subject at school?', options: ['Owl-gebra', 'Hoot-ography', 'Wing-lish'], a: 0 }
  },
  {
    id: 'wing', title: 'A Guide to the Swan Wing', colour: '#3a5ab0', ink: '#e0ecff',
    pages: [
      '<p>The Swan Wing is the château’s prettiest corridor: roses in stone urns, and portraits of every sorceress who ever lived here.</p>',
      '<p>Its first door is the <b>Music Room</b>, where a frog called <b>Maestro Fig</b> tuned the grand piano every morning, and scolded anyone who played it with sticky fingers.</p>',
      '<p>Its second door is the <b>Tea Room</b>, where <b>Chef Praline</b> (Chef Mirabelle’s little sister) baked biscuits for the ghosts’ afternoon tea.</p>',
      '<p>And at the far end: the great doors of the <b>Ballroom</b>. Once a year, the whole château danced there until dawn.</p>',
      '<p>The key to the Swan Wing was given to the Library’s oldest storybook, to keep safe.</p><p class="smudge">(Oh dear. That was the Grumpy Grimoire.)</p>'
    ],
    ask: { q: 'Who tunes the piano in the Music Room?', options: ['Archivist Hoot', 'Maestro Fig', 'Chef Mirabelle'], a: 1 }
  },
  {
    id: 'moon', title: 'The Moon and the Stars', colour: '#5a3a9a', ink: '#f0e4ff',
    pages: [
      '<p>The Moon has no light of its own. It shines because the <b>Sun</b> lights it up, like a torch shining on a ball.</p>',
      '<p>The Moon goes all the way round the Earth in about <b>four weeks</b>. That is why we see it change: from a thin crescent, to a full round moon, and back again.</p>',
      '<p>Stars are suns too, but so far away that they look like tiny sparks. The light from some of them set off before your great-aunt was born!</p>',
      '<p>Your great-aunt called the château’s tallest tower the <b>Moon Tower</b>. From its window you can see every star in the sky.</p><p class="smudge">(In the margin, in silver ink: “Lady Lumière is still up there. Bring her some light.”)</p>'
    ],
    ask: { q: 'Why does the Moon shine?', options: ['It is on fire', 'The Sun lights it up', 'It is full of candles'], a: 1 }
  }
];

// The bestiary: one creature a page, in the order of the rooms, filled in once that creature is freed.
function pagesOf(book, save) {
  if (book.pages) return book.pages;
  const seen = [];
  for (const r of ROOMS) for (const k of r.creatures) if (!seen.includes(k)) seen.push(k);
  const pages = ['<h4>A Bestiary</h4><p>Every creature of the château, and what it was before the curse twisted it. Free one, and its page fills in by itself.</p>'];
  for (const k of seen) {
    const room = ROOMS.find((r) => r.creatures.includes(k));
    const freed = save.won.includes(room.id);
    pages.push(freed ? `<h4>${esc(CREATURE_NAMES[k])}</h4><p><i>Found in ${esc(room.name.replace(/^The /, 'the '))}.</i></p><p>${esc(FREED[k])}</p>` : `<h4>???</h4><p><i>Somewhere in the château…</i></p><p>This page is still blank. Free the creature to fill it in.</p>`);
  }
  return pages;
}

let el = null;
function ensure() {
  if (el) return el;
  el = document.createElement('section');
  el.id = 'books';
  el.hidden = true;
  el.innerHTML = `
    <div class="win shelf">
      <h2>Hoot’s Shelf</h2>
      <p class="small" id="b-stars"></p>
      <div id="b-spines"></div>
      <div class="row actions"><button id="b-done">Thank Hoot and go</button></div>
    </div>
    <div class="book" id="b-book" hidden>
      <div class="page left" id="b-left"></div>
      <div class="page right" id="b-right"></div>
      <div class="turns"><button id="b-prev" aria-label="Previous page">◀</button><span id="b-num"></span><button id="b-next" aria-label="Next page">▶</button></div>
    </div>
    <div class="win speech" id="b-say"></div>`;
  document.body.appendChild(el);
  return el;
}

export function open(api) {
  const { save, persist, say, sfx } = api;
  save.books ??= {};
  ensure();
  el.hidden = false;
  let book = null, spread = 0;
  const $ = (s) => el.querySelector(s);
  const hoot = (text) => {
    $('#b-say').innerHTML = `<b>Archivist Hoot:</b> ${text}`;
    say?.(text);
  };
  const starCount = () => BOOKS.filter((b) => save.books[b.id]).length;
  const renderShelf = () => {
    $('#b-stars').textContent = `Stars: ${starCount()} of ${BOOKS.length}${save.quill ? ' · the Owl Quill is yours' : ' · a star on every book wins the Owl Quill'}`;
    const s = $('#b-spines');
    s.innerHTML = '';
    for (const b of BOOKS) {
      const btn = document.createElement('button');
      btn.className = `spine${book === b ? ' on' : ''}`;
      btn.style.setProperty('--c', b.colour);
      btn.style.setProperty('--ink', b.ink);
      btn.dataset.book = b.id;
      btn.innerHTML = `<span>${esc(b.title)}</span>${save.books[b.id] ? '<i>★</i>' : ''}`;
      btn.onclick = () => (sfx('click'), openBook(b));
      s.appendChild(btn);
    }
  };
  const renderBook = () => {
    const pages = pagesOf(book, save);
    $('#b-book').hidden = false;
    const n = Math.ceil(pages.length / 2);
    const last = spread >= n; // the spread after the last: Hoot's question
    if (last) {
      const a = book.ask;
      $('#b-left').innerHTML = `<h4>Hoot’s question</h4><p>${esc(a.q)}</p>`;
      $('#b-right').innerHTML = save.books[book.id] ? '<p class="gold">★ You answered this one already!</p><p>Pick another book from the shelf.</p>' : `<div class="answers">${a.options.map((o, i) => `<button data-a="${i}">${esc(o)}</button>`).join('')}</div>`;
      for (const b of $('#b-right').querySelectorAll('button[data-a]')) b.onclick = () => answer(Number(b.dataset.a), b);
      hoot(save.books[book.id] ? 'You know this book by heart!' : 'Now then. A little question, to see if you were paying attention…');
    } else {
      $('#b-left').innerHTML = pages[spread * 2] ?? '';
      $('#b-right').innerHTML = pages[spread * 2 + 1] ?? '<p class="smudge">(This page is blank.)</p>';
    }
    $('#b-num').textContent = last ? '?' : `${spread * 2 + 1}–${Math.min(pages.length, spread * 2 + 2)} of ${pages.length}`;
    $('#b-prev').disabled = spread === 0;
    $('#b-next').disabled = last;
  };
  const openBook = (b) => {
    book = b;
    spread = 0;
    sfx('potion');
    hoot(b.id === 'jokes' ? 'Ah, my favourite! Hoo hoo hoo!' : b.id === 'recipe' ? 'Your great-aunt’s own handwriting. Mind the butter stains.' : b.id === 'bestiary' ? 'This one writes itself, you know. Every creature you free.' : 'A fine choice. Turn the pages with the arrows.');
    renderShelf();
    renderBook();
  };
  const answer = (i, btn) => {
    if (i === book.ask.a) {
      sfx('brilliant');
      save.books[book.id] = true;
      btn.classList.add('right');
      api.cheer?.();
      hoot(['Splendid! A gold star for that one.', 'Hoo hoo! Quite right!', 'Clever owlet. A star for you!'][starCount() % 3]);
      if (starCount() === BOOKS.length && !save.quill) {
        save.quill = true;
        persist();
        setTimeout(() => api.onQuill?.(), 900);
      }
      persist();
      setTimeout(() => (renderShelf(), renderBook()), 900);
    } else {
      sfx('wrong');
      btn.disabled = true;
      api.think?.();
      hoot('Not quite! Have another look. You can turn back with ◀.');
    }
  };
  $('#b-prev').onclick = () => (sfx('click'), (spread = Math.max(0, spread - 1)), renderBook());
  $('#b-next').onclick = () => (sfx('click'), spread++, renderBook());
  $('#b-book').hidden = true;
  renderShelf();
  hoot(starCount() ? `Welcome back! You have ${starCount()} star${starCount() > 1 ? 's' : ''}. Which book today?` : 'Hoo! A visitor! Pick a book from my shelf, and read it with me.');
  return new Promise((resolve) => {
    $('#b-done').onclick = () => {
      sfx('click');
      el.hidden = true;
      resolve();
    };
  });
}
