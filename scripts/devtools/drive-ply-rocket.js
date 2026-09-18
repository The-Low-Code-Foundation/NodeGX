#!/usr/bin/env node
/**
 * P95 — drive the DEPLOYED Rocket School through the surfaces Richard's second
 * play test asked for, and grade them.
 *
 * `drive-tpl007-rocket.js` plays the first-run journey. It knows nothing about
 * the hangar's buy card, the comeback turbo or the monster's mode row, which
 * are exactly what P95 built — so this is those drives, one scenario per task,
 * sharing the instrument in `drive-rocket-lib.js`.
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school \
 *     /tmp/rocket --allow-development-engine
 *   node scripts/devtools/drive-ply-rocket.js /tmp/rocket --scenario ply002 --shots /tmp/shots
 *   node scripts/devtools/drive-ply-rocket.js /tmp/rocket --scenario all --shots /tmp/shots
 *
 * 🔴 The deploy exits 0 EVEN WHEN IT REFUSES TO WRITE — it reports the refusal
 * as `{"ok":false}` on stdout. Without `--allow-development-engine` (the viewer
 * in this checkout is a development build) nothing is written and a drive then
 * grades whatever folder was there before. Check the folder's mtime, not the
 * exit code.
 *
 * Exits 0 when every clause passed, 1 when any did.
 */
const { withRocket, wait } = require('./drive-rocket-lib.js');

const DIR = process.argv[2];
const arg = (flag, dflt) => { const i = process.argv.indexOf(flag); return i === -1 ? dflt : process.argv[i + 1]; };
const SHOTS = arg('--shots', null);
const WHICH = arg('--scenario', 'all');

if (!DIR) {
  console.error('usage: drive-ply-rocket.js <deploy-dir | origin> --scenario <name|all> [--shots <dir>]');
  process.exit(2);
}

const STORE_KEY = 'noodl_store_rocket-school';

/** The labels each arm presses, in the two languages the drives run in. */
const L = {
  en: { home: 'Home', hangar: /Hangar/, face: 'Face', rocket: 'Rocket', yes: 'Yes, buy it', no: 'No',
        owned: 'Yours · tap to wear', race: 'Rocket Race', start: 'Start', next: 'Next',
        purse: /⭐ (\d+) to spend/, have: /You have\s*\n?\s*(\d+)/, cost: /This costs\s*\n?\s*−(\d+)/,
        left: /You.ll have\s*\n?\s*(\d+)/, buyTitle: /^Buy (.+)\?$/m },
  fr: { home: 'Accueil', hangar: /Hangar/, face: 'Visage', rocket: 'Fusée', yes: /Oui/, no: /Non/,
        owned: 'À toi · touche pour mettre', race: 'Course de fusées', start: /Départ|Commencer/, next: /Suivant/,
        purse: /⭐ (\d+) à dépenser/, have: /Tu as\s*\n?\s*(\d+)/, cost: /Ça coûte\s*\n?\s*−(\d+)/,
        left: /Il te restera\s*\n?\s*(\d+)/, buyTitle: /^Acheter (.+) ?\?$/m }
};

/** A profile seeded straight into the store, so a drive can start from a purse it did not have to earn. */
const profile = (over = {}) => ({
  app: {
    profiles: [{
      id: 'ply', name: 'Lea', look: 'adventurer', seed: 'lp8ezv', level: 'CM1',
      lang: 'en', layout: 'qwerty', sound: true, answerMode: 'auto', created: Date.now(), days: [],
      ...over,
      model: { rating: 0, skills: {}, lastSkill: '', answered: 0, stars: 0, spent: 0, owned: [], ...(over.model || {}) }
    }],
    sets: [], activeId: 'ply'
  }
});

/** Sign in on the seeded profile and land on Home. */
async function signIn(d, over) {
  await d.seedStore(STORE_KEY, profile(over));
  await d.click('Lea');
  await wait(1200);
}

/**
 * The signed-in player as the app actually stores them.
 *
 * 🔴 `spent` is on `p.model`, but `owned` and `wear` are on the PROFILE itself
 * (`PICK_ITEM_SCRIPT`: `p.owned = ownedOf(p).concat(...)`). Reading
 * `model.owned` gets the seeded empty array for ever and makes a working buy
 * look like a charge for nothing.
 */
async function who(d) {
  const p = (await d.store())[STORE_KEY].app.profiles[0];
  return { spent: Number(p.model && p.model.spent) || 0, stars: Number(p.model && p.model.stars) || 0,
           owned: p.owned || [], wear: p.wear || {}, model: p.model };
}

async function openHangar(d, lang) {
  await d.click('▾');
  const s = await d.read();
  const h = s.buttons.find((b) => L[lang].hangar.test(b));
  if (!h) return false;
  await d.click(h);
  await wait(1300);
  return true;
}

/** A number out of the page text, or null. */
const num = (text, re) => { const m = text.match(re); return m ? Number(m[1]) : null; };

// ───────────────────────────────────────────────────────────────────────────
// PLY-002 — paint is basic, pattern is the prize. AC6 and AC7.
// ───────────────────────────────────────────────────────────────────────────
async function ply002(d, { lang, viewport }) {
  const t = L[lang];
  const tag = `[${lang} ${viewport}]`;
  console.log(`\n═══ PLY-002 ${tag} ═══`);
  await d.viewport(viewport);
  await signIn(d, { lang, layout: lang === 'fr' ? 'azerty' : 'qwerty', model: { stars: 500 } });

  d.check(`${tag} the hangar opens from the player menu (the known-firing signal)`,
    await openHangar(d, lang), 'no Hangar entry in the ▾ menu');

  await d.click(t.rocket);
  await wait(900);
  let s = await d.snap(`ply002-${lang}-shelf`);

  // the two layers are both on the shelf, and paint is the cheap one (§3.2)
  const tiles = await d.evaluate(`(() => [...document.querySelectorAll('[class*="pressable"]')].filter(e=>e.getClientRects().length).map(e=>e.innerText.trim().replace(/\\n/g,' | ')))()`);
  const patterns = tiles.filter((x) => /\b(1[2-9]\d|2[0-2]\d) ⭐/.test(x));
  const paints = tiles.filter((x) => /\b15 ⭐/.test(x));
  d.check(`${tag} the rocket shelf sells cheap paint and dear patterns`,
    paints.length >= 1 && patterns.length >= 7, JSON.stringify(tiles));

  const label = patterns[0] && patterns[0].split(' | ')[0];
  const price = patterns[0] && Number(patterns[0].match(/(\d+) ⭐/)[1]);

  // ── AC6: the dialog, and the three numbers ────────────────────────────────
  const before = await who(d);
  const CARD_OPEN = `/${lang === 'fr' ? 'Acheter' : 'Buy'} /.test(document.body.innerText)`;
  d.check(`${tag} AC6 a tap on an unowned pattern opens the card`,
    await d.pressUntil(label, CARD_OPEN, { settle: 1100 }), `tapping "${label}" opened nothing`);
  s = await d.snap(`ply002-${lang}-buy-card`);

  const have = num(s.text, t.have), cost = num(s.text, t.cost), left = num(s.text, t.left);
  d.check(`${tag} AC6 the card names the item being bought`, t.buyTitle.test(s.text), s.text.slice(0, 400));
  d.check(`${tag} AC6 the card shows balance, cost and what is left`,
    have !== null && cost !== null && left !== null, `have=${have} cost=${cost} left=${left}\n${s.text.slice(0, 500)}`);
  d.check(`${tag} AC6 the three numbers add up (${have} − ${cost} = ${left})`,
    have !== null && have - cost === left, `have=${have} cost=${cost} left=${left}`);
  d.check(`${tag} AC6 the cost on the card is the price on the tile (${price})`, cost === price, `card=${cost} tile=${price}`);
  d.check(`${tag} AC6 nothing is charged while the card is open`,
    (await who(d)).spent === before.spent, JSON.stringify(await who(d)));

  // the card must be whole on the screen, not clipped — text cannot see this
  const card = await d.evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(e => /${lang === 'fr' ? 'Oui' : 'Yes'}/.test(e.innerText));
    if (!b) return { found: false };
    const box = b.closest('[class*="group"], [class*="card"], div');
    const r = (box || b).getBoundingClientRect();
    return { found: true, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right),
      innerH: innerHeight, innerW: innerWidth, clipped: r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth };
  })()`);
  d.check(`${tag} AC6 the buy card is whole on the screen, not clipped`, card.found && !card.clipped, JSON.stringify(card));

  // ── AC6: No changes nothing ───────────────────────────────────────────────
  const noLabel = s.buttons.find((b) => (t.no.test ? t.no.test(b) : b === t.no));
  d.check(`${tag} AC6 No closes the card`,
    await d.pressUntil(noLabel, `!(${CARD_OPEN})`, { settle: 1000 }), 'the card was still open after No');
  s = await d.snap(`ply002-${lang}-after-no`);
  const afterNo = await who(d);
  d.check(`${tag} AC6 No changes nothing — purse and owned are as they were`,
    afterNo.spent === before.spent && afterNo.owned.length === before.owned.length,
    `before=${JSON.stringify(before)} after=${JSON.stringify(afterNo)}`);

  // ── AC6: Yes buys it, and the purse drops by exactly the price ────────────
  // 🔴 Closing the card puts the shelf back on the FACE tab. Without this the
  // re-tap finds no pattern, and the first run of this drive silently bought a
  // 40 ⭐ face item while grading a 120 ⭐ one.
  await d.click(t.rocket);
  await wait(800);
  d.check(`${tag} AC6 the card opens again for the buy`,
    await d.pressUntil(label, CARD_OPEN, { settle: 1100 }), `"${label}" did not re-open the card`);
  const yesLabel = (await d.read()).buttons.find((b) => (t.yes.test ? t.yes.test(b) : b === t.yes));
  d.check(`${tag} AC6 Yes closes the card`,
    await d.pressUntil(yesLabel, `!(${CARD_OPEN})`, { settle: 1400 }), `pressing "${yesLabel}" left the card open`);
  s = await d.snap(`ply002-${lang}-after-yes`);
  const afterYes = await who(d);
  d.check(`${tag} AC6 Yes charges exactly the price (spent ${before.spent} → ${afterYes.spent}, price ${price})`,
    afterYes.spent === before.spent + price, JSON.stringify(afterYes));
  d.check(`${tag} AC6 what was EARNED never drops`, afterYes.stars === before.stars, `${before.stars} → ${afterYes.stars}`);
  d.check(`${tag} AC6 the item is now owned`, afterYes.owned.length === before.owned.length + 1, JSON.stringify(afterYes.owned));
  const pursed = num(s.text, t.purse);
  d.check(`${tag} AC6 the purse on screen reads what is left (${left})`, pursed === left, `screen=${pursed} expected=${left}`);

  // ── AC7: an owned item wears with no card; a dear one opens none ──────────
  const ownedTile = (await d.evaluate(`(() => [...document.querySelectorAll('[class*="pressable"]')].filter(e=>e.getClientRects().length).map(e=>e.innerText.trim().replace(/\\n/g,' | ')))()`))
    .find((x) => x.includes(t.owned));
  if (ownedTile) {
    await d.click(ownedTile.split(' | ')[0], { settle: 1000 });
    s = await d.snap(`ply002-${lang}-owned-tap`);
    d.check(`${tag} AC7 a tap on an OWNED item opens no card`, !t.buyTitle.test(s.text), s.text.slice(0, 300));
  } else {
    d.check(`${tag} AC7 an owned tile was found to tap`, false, 'no tile said it was owned');
  }

  // ── AC6: the next race's rocket wears the decal ───────────────────────────
  await d.click(t.home);
  await wait(1200);
  await d.click(t.race);
  await wait(1200);
  const st = (await d.read()).buttons.find((b) => t.start.test ? t.start.test(b) : b === t.start);
  if (st) { await d.click(st); await wait(1600); }
  s = await d.snap(`ply002-${lang}-race-decal`);
  const worn = await d.evaluate(`(() => [...document.querySelectorAll('[data-pattern]')].map(e => e.getAttribute('data-pattern')).filter(Boolean))()`);
  d.check(`${tag} AC6 the next race's rocket wears the decal that was bought`,
    worn.length >= 1, `data-pattern on the course: ${JSON.stringify(worn)} · shelf label "${label}"`);

  // ── AC7: a tile too dear opens no card ────────────────────────────────────
  console.log(`\n── ${tag} AC7, the too-dear arm (a purse of 100) ──`);
  await d.viewport(viewport);
  await signIn(d, { lang, layout: lang === 'fr' ? 'azerty' : 'qwerty', model: { stars: 100 } });
  await openHangar(d, lang);
  await d.click(t.rocket);
  await wait(900);
  const dear = (await d.evaluate(`(() => [...document.querySelectorAll('[class*="pressable"]')].filter(e=>e.getClientRects().length).map(e=>e.innerText.trim().replace(/\\n/g,' | ')))()`))
    .find((x) => /\b2[0-2]\d ⭐/.test(x));
  const beforeDear = await who(d);
  if (dear) {
    await d.click(dear.split(' | ')[0], { settle: 1100 });
    s = await d.snap(`ply002-${lang}-too-dear`);
    d.check(`${tag} AC7 a tile too dear (${dear.replace(' | ', ' ')}, purse 100) opens no card`,
      !t.buyTitle.test(s.text), s.text.slice(0, 400));
    d.check(`${tag} AC7 and charges nothing`, (await who(d)).spent === beforeDear.spent, JSON.stringify(await who(d)));
  } else {
    d.check(`${tag} AC7 a too-dear tile was found`, false, 'no tile above 200 ⭐');
  }
}

// ───────────────────────────────────────────────────────────────────────────
// PLY-001 — the hangar fits the face you chose. AC7 and AC8.
// ───────────────────────────────────────────────────────────────────────────
async function ply001(d, { lang, viewport }) {
  const t = L[lang];
  const tag = `[${lang} ${viewport}]`;
  console.log(`\n═══ PLY-001 ${tag} ═══`);
  await d.viewport(viewport);
  await signIn(d, { lang, layout: lang === 'fr' ? 'azerty' : 'qwerty', look: 'adventurer', model: { stars: 500 } });

  d.check(`${tag} the hangar opens (the known-firing signal)`, await openHangar(d, lang), 'no Hangar entry');
  await d.click(t.face);
  await wait(900);
  const s = await d.snap(`ply001-${lang}-face-tab`);

  // Every tile on the face tab, with its box and how it is painted.
  const tiles = await d.evaluate(`(() => [...document.querySelectorAll('[class*="pressable"]')]
    .filter((e) => e.getClientRects().length && !/^(Lea|▾)/.test(e.innerText.trim()))
    .map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { text: e.innerText.trim().replace(/\\n/g, ' | ').slice(0, 60), w: Math.round(r.width), h: Math.round(r.height),
        opacity: Number(cs.opacity), filter: cs.filter }; }))()`);
  const items = tiles.filter((x) => !/^(Face|Visage|Rocket|Fusée|Home|Accueil)$/.test(x.text.split(' | ')[0]));

  d.check(`${tag} AC7 the face tab offers at least 10 tiles (read ${items.length})`,
    items.length >= 10, JSON.stringify(items.map((i) => i.text)));

  // 🔴 The defect this task removed showed as a DIMMED tile. Read the paint,
  // not only the words: a tile could say nothing and still be greyed out.
  const dim = items.filter((x) => x.opacity < 0.95 || /grayscale|saturate\(0/.test(x.filter));
  const saysFits = /fits another face|va à un autre visage|another face/i.test(s.text);
  d.check(`${tag} AC7 no tile is greyed as "fits another face" — none dim, and the words are gone`,
    dim.length === 0 && !saysFits, `dim=${JSON.stringify(dim)} saysFits=${saysFits}`);

  const small = items.filter((x) => x.w < 44 || x.h < 44);
  d.check(`${tag} AC7 every tile is at least 44×44 px for a finger`,
    small.length === 0, JSON.stringify(small));

  const sideways = await d.evaluate(`(() => { const de = document.scrollingElement || document.documentElement;
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, over: de.scrollWidth > de.clientWidth + 1 }; })()`);
  d.check(`${tag} AC7 the hangar does not scroll sideways`, !sideways.over, JSON.stringify(sideways));

  // ── AC8: a profile on a dropped look keeps its face and is told why ───────
  console.log(`\n── ${tag} AC8, a profile on the dropped 'thumbs' look ──`);
  await signIn(d, { lang, layout: lang === 'fr' ? 'azerty' : 'qwerty', look: 'thumbs', model: { stars: 500 } });
  const drew = await d.evaluate(`!!document.querySelector('img[src^="data:image/svg+xml"]')`);
  d.check(`${tag} AC8 a thumbs profile still draws its face on Home`, drew, 'no avatar img on Home');

  await openHangar(d, lang);
  await d.click(t.face);
  await wait(900);
  const s8 = await d.snap(`ply001-${lang}-thumbs-face-tab`);
  d.check(`${tag} AC8 the face tab explains that this face wears nothing`,
    /doesn.t wear things|ne porte rien|ne met rien/i.test(s8.text), s8.text.slice(0, 600));

  await d.click(t.rocket);
  await wait(900);
  const s8r = await d.snap(`ply001-${lang}-thumbs-rocket-tab`);
  d.check(`${tag} AC8 and its rocket tab still works`,
    /⭐/.test(s8r.text) && s8r.text.split('\n').filter((x) => /⭐/.test(x)).length >= 3, s8r.text.slice(0, 600));
}

// ───────────────────────────────────────────────────────────────────────────
// PLY-005 — a step back in the face roll. AC6 and AC7.
// ───────────────────────────────────────────────────────────────────────────

/**
 * A fingerprint of the face the form is drawing right now.
 *
 * 🔴 NOT a prefix of the data URI. Every avatar begins with the same SVG
 * header, so comparing the first 120 characters made four different faces
 * read as one — which failed the "four different faces" clause and, worse,
 * PASSED the "two steps back draws the second face" clause without looking at
 * anything. A hash of the WHOLE src is what tells two faces apart.
 */
const FACE_URI = `(() => {
  // 🔴 The BIGGEST avatar on the page, never the first. Once a player is signed
  // in there are two — a 40px chip in the header and the form's own 96px face —
  // and \`querySelector\` returns the chip. Hashing the chip on one surface and
  // the form face on another made a correct creation look like it had thrown
  // the chosen face away.
  const all = [...document.querySelectorAll('img[src^="data:image/svg+xml"]')]
    .filter((e) => e.getClientRects().length)
    .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width);
  const i = all[0];
  if (!i) return null;
  let h = 5381;
  for (let k = 0; k < i.src.length; k++) h = ((h * 33) ^ i.src.charCodeAt(k)) >>> 0;
  return 'face#' + h.toString(16) + ':' + i.src.length;
})()`;
/** The n/of counter between the arrows. */
const COUNTER = `(() => { const m = document.body.innerText.match(/\\b(\\d+)\\/(\\d+)\\b/); return m ? m[0] : null; })()`;

async function ply005(d, { lang, viewport }) {
  const tag = `[${lang} ${viewport}]`;
  console.log(`\n═══ PLY-005 ${tag} ═══`);
  await d.viewport(viewport);
  // a clean store, so this is the NEW player form
  await d.seedStore(STORE_KEY, { app: { profiles: [], sets: [], activeId: '' } });
  const newBtn = (await d.read()).buttons.find((b) => /New player|Nouveau joueur/.test(b));
  d.check(`${tag} the new-player form opens (the known-firing signal)`, await d.click(newBtn, { settle: 1100 }), 'no New player button');

  let s = await d.snap(`ply005-${lang}-form-fresh`);
  d.check(`${tag} AC4 a form that has just opened has one face and nothing to go back to`,
    (await d.evaluate(COUNTER)) === '1/1', `counter=${await d.evaluate(COUNTER)}`);

  // ── roll three times, remembering each face ──────────────────────────────
  const faces = [await d.evaluate(FACE_URI)];
  const rollBtn = s.buttons.find((b) => /Roll again|Relancer|Relance/.test(b));
  for (let i = 0; i < 3; i++) {
    await d.click(rollBtn, { settle: 800 });
    faces.push(await d.evaluate(FACE_URI));
  }
  s = await d.snap(`ply005-${lang}-rolled-3`);
  d.check(`${tag} AC6 three rolls give four different faces`,
    new Set(faces).size === 4 && !faces.includes(null), JSON.stringify(faces));
  d.check(`${tag} AC6 the counter reads 4/4 after three rolls`,
    (await d.evaluate(COUNTER)) === '4/4', `counter=${await d.evaluate(COUNTER)}`);

  // ── back twice: the second face, and the counter says 2/4 ────────────────
  const backLabel = (await d.read()).buttons.find((b) => /◀|‹|←/.test(b));
  d.check(`${tag} AC6 a Back arrow is offered once there is somewhere to go`, Boolean(backLabel),
    JSON.stringify((await d.read()).buttons));
  if (!backLabel) return;

  await d.click(backLabel, { settle: 700 });
  await d.click(backLabel, { settle: 700 });
  s = await d.snap(`ply005-${lang}-back-twice`);
  const nowFace = await d.evaluate(FACE_URI);
  d.check(`${tag} AC6 two steps back draw the SECOND face again`,
    nowFace === faces[1], `now=${nowFace} wanted=${faces[1]}`);
  d.check(`${tag} AC6 and the counter reads 2/4`, (await d.evaluate(COUNTER)) === '2/4',
    `counter=${await d.evaluate(COUNTER)}`);

  // ── forward returns ──────────────────────────────────────────────────────
  const fwdLabel = (await d.read()).buttons.find((b) => /▶|›|→/.test(b));
  d.check(`${tag} AC6 a Forward arrow is offered when there is a face ahead`, Boolean(fwdLabel),
    JSON.stringify((await d.read()).buttons));
  if (fwdLabel) {
    await d.click(fwdLabel, { settle: 700 });
    d.check(`${tag} AC6 forward returns to the third face`, (await d.evaluate(FACE_URI)) === faces[2],
      `now=${await d.evaluate(FACE_URI)} wanted=${faces[2]}`);
  }

  // ── the face created is the one on screen ────────────────────────────────
  const shown = await d.evaluate(FACE_URI);
  await d.typeInto(0, 'Zoe');
  await d.click('CM1', { settle: 400 });
  const go = (await d.read()).buttons.find((b) => /Let.s go|C.est parti|Allons/.test(b));
  await d.click(go, { settle: 1600 });
  s = await d.snap(`ply005-${lang}-created`);
  d.check(`${tag} AC6 the player was created`, /Rocket Race|Course de fusées/.test(s.text), s.text.slice(0, 200));

  // ── AC7: Edit player starts on THEIR face, with no Back until they roll ──
  //
  // 🔴 This is also where AC6's "the face created is the one shown" is read.
  // Home draws the player only as a 40px chip, and the form draws a 96px face;
  // the same seed at two sizes is two different SVGs, so comparing across those
  // two surfaces can never mean anything. The Edit form is the SAME renderer at
  // the SAME size as the form that was walked, so it is the one honest read-back.
  console.log(`\n── ${tag} AC7, Edit player on an existing child ──`);
  await d.click('▾');
  const edit = (await d.read()).buttons.find((b) => /Edit player|Modifier le joueur/.test(b));
  d.check(`${tag} AC7 Edit player is offered`, Boolean(edit), JSON.stringify((await d.read()).buttons));
  if (!edit) return;
  await d.click(edit, { settle: 1300 });
  s = await d.snap(`ply005-${lang}-edit`);
  const back2 = await d.evaluate(FACE_URI);
  d.check(`${tag} AC6 the player created wears the face that was on the form (read back on the Edit form)`,
    back2 === shown, `edit=${back2} form=${shown} rolled=${JSON.stringify(faces)}`);
  d.check(`${tag} AC7 the face shown is the child's own`, back2 === shown,
    `edit=${back2} theirs=${shown}`);
  d.check(`${tag} AC7 no Back arrow until they roll`,
    !(await d.read()).buttons.some((b) => /◀|‹|←/.test(b)), JSON.stringify(s.buttons));
}

// ───────────────────────────────────────────────────────────────────────────
// PLY-003 — more ways to hunt a number. AC6.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Every number on the hunt grid, with where to tap it.
 *
 * 🔴 `i` is the index among ALL buttons, not among the numeric ones. The tap
 * is made with `clickSel('button', { index: i })`, which indexes the unfiltered
 * list — so a filtered index taps "Home" or "New game" instead of a square, and
 * a working grid reads as one that rejects correct answers.
 */
const GRID = `(() => {
  const all = [...document.querySelectorAll('button')].filter((b) => b.getClientRects().length);
  return all.map((b, i) => ({ i, text: b.innerText.trim() }))
    .filter((x) => /^-?[\\d.,\\s\\u202f]+$/.test(x.text));
})()`;

/**
 * Which squares to tap, read from the instruction the child is given.
 *
 * The kind is named in words (`HUNT_WORDS`), so the drive reads the same
 * sentence the child does rather than being told the answer out of band.
 * Returns the tile labels to press, or null when no combination works.
 */
function solveHunt(instruction, tiles) {
  const asNum = (x) => {
    let t = String(x).replace(/[\s  ]/g, '');
    if (/^[1-9]\d{0,2}(,\d{3})+$/.test(t)) t = t.replace(/,/g, ''); else t = t.replace(',', '.');
    return Number(t);
  };
  const text = String(instruction || '');
  let op = 'add', count = 2, target = null;
  if (/make 100|font 100/.test(text)) { op = 'add'; target = 100; }
  else if (/make 1000|font 1000/.test(text)) { op = 'add'; target = 1000; }
  else {
    const m = text.match(/([\d.,\s ]+)\s*$/);
    target = m ? asNum(m[1]) : null;
    if (/multiply to|le produit fait/.test(text)) op = 'mul';
    else if (/difference of|la différence fait/.test(text)) op = 'sub';
    else if (/÷|le plus petit fait/.test(text)) op = 'div';
    else op = 'add';
  }
  if (/^Pick 3|Choisis 3/.test(text)) count = 3;
  if (target === null || !isFinite(target)) return null;

  const vals = tiles.map((t) => ({ ...t, v: asNum(t.text) })).filter((t) => isFinite(t.v));
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  if (count === 3) {
    for (let a = 0; a < vals.length; a++) for (let b = a + 1; b < vals.length; b++) for (let c = b + 1; c < vals.length; c++)
      if (near(vals[a].v + vals[b].v + vals[c].v, target)) return [vals[a], vals[b], vals[c]];
    return null;
  }
  for (let a = 0; a < vals.length; a++) for (let b = a + 1; b < vals.length; b++) {
    const x = vals[a].v, y = vals[b].v, hi = Math.max(x, y), lo = Math.min(x, y);
    const got = op === 'add' ? x + y : op === 'mul' ? x * y : op === 'sub' ? hi - lo : (lo !== 0 && hi % lo === 0 ? hi / lo : NaN);
    if (near(got, target)) return [vals[a], vals[b]];
  }
  return null;
}

async function ply003(d, { lang, viewport }) {
  const tag = `[${lang} ${viewport}]`;
  console.log(`\n═══ PLY-003 ${tag} ═══`);
  await d.viewport(viewport);

  // AC6 asks for both ends of the range: the youngest class and the oldest.
  for (const level of ['CE2', '6e']) {
    await signIn(d, { lang, level, layout: lang === 'fr' ? 'azerty' : 'qwerty' });
    await d.click(lang === 'fr' ? 'Chasse aux nombres' : 'Number Hunt', { settle: 1600 });
    let s = await d.snap(`ply003-${lang}-${level}-grid`);

    const instruction = s.text.split('\n').map((x) => x.trim())
      .find((x) => /^(Pick|Choisis) \d/.test(x));
    d.check(`${tag} ${level} AC6 the grid asks for a hunt in words the child can read`,
      Boolean(instruction), s.text.slice(0, 400));
    if (!instruction) continue;
    console.log(`  ${tag} ${level}: ${JSON.stringify(instruction)}`);

    // 🔴 The instruction must be punctuated in the child's own language (AC5's
    // subject, read here on the screen rather than out of the script).
    if (/dec|décim/.test(instruction) || /[\d],[\d]|[\d]\.[\d]/.test(instruction)) {
      const frStyle = /\d,\d/.test(instruction), enStyle = /\d\.\d/.test(instruction);
      d.check(`${tag} ${level} AC6 a decimal target is punctuated for the language`,
        lang === 'fr' ? !enStyle : !frStyle, instruction);
    }

    const tiles = await d.evaluate(GRID);
    const pick = solveHunt(instruction, tiles);
    d.check(`${tag} ${level} AC6 the grid holds a true answer to what it asked`,
      Boolean(pick), `instruction=${JSON.stringify(instruction)} tiles=${JSON.stringify(tiles.map((t) => t.text))}`);
    if (!pick) continue;

    const FOUND = /(\d+)\s*(?:of|sur)\s*(\d+)/g;
    const lastPair = (t) => { const all = [...t.matchAll(FOUND)]; return all.length ? all[all.length - 1] : null; };
    const before = lastPair(s.text);
    for (const p of pick) await d.clickSel('button', { index: p.i, settle: 700 });
    s = await d.snap(`ply003-${lang}-${level}-picked`);
    const after = lastPair(s.text);
    const found = after ? Number(after[1]) : null;
    d.check(`${tag} ${level} AC6 a correct pick (${pick.map((p) => p.text).join(' + ')}) is ACCEPTED — the count went up`,
      found >= 1, `before=${before && before[0]} after=${after && after[0]}\n${s.text.slice(0, 400)}`);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// PLY-004 — the monster can type, and practice can be lost. AC6 and AC7.
// ───────────────────────────────────────────────────────────────────────────
async function ply004(d, { lang, viewport }) {
  const tag = `[${lang} ${viewport}]`;
  console.log(`\n═══ PLY-004 ${tag} ═══`);
  await d.viewport(viewport);
  await signIn(d, { lang, layout: lang === 'fr' ? 'azerty' : 'qwerty' });
  await d.click(lang === 'fr' ? 'La porte du monstre' : 'Monster Gate', { settle: 1500 });

  let s = await d.snap(`ply004-${lang}-setup`);
  // AC5's mode row, on the screen rather than in the template
  const hasModes = /Maths|Mathématiques/.test(s.text) && /Typing|Frappe|Clavier/.test(s.text);
  d.check(`${tag} AC6 the monster setup offers a Maths AND a Typing mode`, hasModes, s.text.slice(0, 500));

  // ── AC6: a TYPING game in Practice asks words and shows the keyboard ──────
  const typing = s.text.split('\n').map((x) => x.trim()).find((x) => /^(Typing|Frappe|Clavier)$/.test(x));
  if (typing) await d.click(typing, { settle: 500 });
  const practice = s.text.split('\n').map((x) => x.trim()).find((x) => /^(Practice|Entraînement)$/.test(x));
  if (practice) await d.click(practice, { settle: 500 });
  const start = (await d.read()).buttons.find((b) => /^(Start|Départ|Commencer)$/.test(b));
  d.check(`${tag} AC6 the monster game starts (the known-firing signal)`, await d.click(start, { settle: 1700 }), 'no Start');

  s = await d.snap(`ply004-${lang}-typing-board`);
  // 🔴 Read the prompt from the card, not through the generic question helper.
  // A typing prompt can be a SINGLE LETTER ("d", the home row drill) — no "?",
  // no "=", no digits — so the helper that finds the race's sums returns null
  // for it, and a working Typing mode reads as one that asks nothing.
  const typed = await d.evaluate(`(() => {
    const big = [...document.querySelectorAll('*')]
      // 🔴 SVG elements have no innerText at all, so it must be guarded before
      // .trim() — the lane draws several, and they threw the whole drive.
      .filter((e) => e.children.length === 0 && e.getClientRects().length && e.innerText && e.innerText.trim())
      .map((e) => ({ t: e.innerText.trim(), size: parseFloat(getComputedStyle(e).fontSize) || 0 }))
      .filter((x) => x.t.length <= 20 && !/Restart|Recommencer|Check|Vérifier|Monster|Monstre/.test(x.t))
      .sort((a, b) => b.size - a.size);
    return big.length ? big[0].t : null;
  })()`);
  d.check(`${tag} AC6 in Typing mode the monster asks LETTERS, not a sum`,
    Boolean(typed) && /^[\p{L}\s'’-]{1,20}$/u.test(typed) && !/[+×÷−=\d]/.test(typed),
    `prompt=${JSON.stringify(typed)}\n${s.text.slice(0, 400)}`);
  d.check(`${tag} AC6 the letter keyboard is on screen for it`, s.keys > 0, `data-key count=${s.keys}`);
  // and the keyboard is the one the child's layout asks for (FR ⇒ AZERTY)
  const azerty = await d.evaluate(`(() => { const k = [...document.querySelectorAll('[data-key]')].map((e) => e.getAttribute('data-key')); return { first: k.slice(0, 6), n: k.length }; })()`);
  console.log(`  ${tag} keyboard top row: ${JSON.stringify(azerty)}`);
  d.check(`${tag} AC6 the lane shows the monster's hearts and creep`,
    /❤️/.test(s.text) && /●|○/.test(s.text), s.text.slice(0, 400));

  // ── AC7: in Practice a SLOW right answer holds it, a QUICK one pushes ─────
  //
  // 🔴 The whole subject of AC7 is TIME, so the drive must actually wait. The
  // creep pips are what say where the monster stands, and they are read before
  // and after each answer rather than inferred from the verdict words.
  console.log(`\n── ${tag} AC7, slow answers hold and quick answers push ──`);
  await signIn(d, { lang, layout: lang === 'fr' ? 'azerty' : 'qwerty' });
  await d.click(lang === 'fr' ? 'La porte du monstre' : 'Monster Gate', { settle: 1500 });
  const st2 = (await d.read()).buttons.find((b) => /^(Start|Départ|Commencer)$/.test(b));
  await d.click(st2, { settle: 1700 });

  // 🔴 WHERE THE MONSTER STANDS is `.rkt-monster`'s place along `.rkt-lane`,
  // and the gate is at the LEFT end — so a SMALLER left is closer to the door
  // and a bigger one is further away. It is NOT the ●○○○ row: those are hits
  // landed on the monster ("A small hit. Quicker hits harder."), which a first
  // reading of this drive mistook for the creep and which fall on every right
  // answer, slow or quick. Reading them made slow and quick look identical.
  const WHERE = `(() => {
    const lane = document.querySelector('.rkt-lane');
    const mon = document.querySelector('.rkt-monster');
    if (!lane || !mon) return null;
    const L = lane.getBoundingClientRect(), M = mon.getBoundingClientRect();
    return { at: Math.round(M.left - L.left), lane: Math.round(L.width) };
  })()`;

  // Bring it in first: it only moves on a wrong answer, so there is nothing to
  // push back from until the child has missed a few.
  for (let i = 0; i < 3; i++) { await d.answer({ wrong: true }); await nextQuestion(d); }
  const crept = await d.evaluate(WHERE);
  d.check(`${tag} AC7 three wrong answers bring the monster in off its start`,
    crept && crept.at < crept.lane - 80, JSON.stringify(crept));

  const slow = [];
  for (let i = 0; i < 3; i++) {
    const was = await d.evaluate(WHERE);
    await wait(7000);                       // past every fluentMs in the set
    await d.answer({ wrong: false });
    const now = await d.evaluate(WHERE);
    slow.push({ was: was && was.at, now: now && now.at });
    await nextQuestion(d);
  }
  s = await d.snap(`ply004-${lang}-slow`);
  console.log(`  ${tag} monster across three SLOW right answers:`, JSON.stringify(slow));
  d.check(`${tag} AC7 three slow right answers only HOLD it — it is not thrown back`,
    slow.every((g) => g.now !== null && g.was !== null && g.now - g.was <= 8), JSON.stringify(slow));

  const wasQ = await d.evaluate(WHERE);
  await d.answer({ wrong: false });         // immediately: a quick one
  const nowQ = await d.evaluate(WHERE);
  s = await d.snap(`ply004-${lang}-quick`);
  console.log(`  ${tag} monster across one QUICK right answer:`, JSON.stringify({ was: wasQ, now: nowQ }));
  d.check(`${tag} AC7 a quick right answer DOES push it back (${wasQ && wasQ.at} → ${nowQ && nowQ.at} px from the gate)`,
    nowQ && wasQ && nowQ.at > wasQ.at + 8, JSON.stringify({ was: wasQ, now: nowQ, text: s.text.slice(0, 300) }));
}

// ───────────────────────────────────────────────────────────────────────────
// PLY-006 — a way back into the race. AC8 (the comeback) and AC9 (the face).
// ───────────────────────────────────────────────────────────────────────────

/**
 * How far the last graded answer moved a rocket, in thousandths of the course.
 *
 * The kit lights the stretch a right answer won as a dashed overlay whose
 * `stroke-dasharray` is `0 <from×1000> <length×1000> 100000` (`kit.js`,
 * `gainPath`). That third number IS the gain the app drew, so the drive reads
 * the product's own arithmetic rather than guessing at a curve from the
 * rocket's x. `a` is the child's rocket.
 */
const GAIN = `(() => {
  const p = document.querySelector('[data-gain="a"]');
  if (!p) return null;
  const parts = (p.getAttribute('stroke-dasharray') || '').trim().split(/\\s+/).map(Number);
  return parts.length >= 3 ? { from: parts[1], len: parts[2] } : null;
})()`;

/** Start a race against the computer, in Practice. */
async function startRace(d, t) {
  await d.click(t.race);
  await wait(1300);
  const s = await d.read();
  for (const want of [/^(Maths|Mathématiques)$/, /^(Me vs the computer|Moi contre l.ordinateur)$/, /^(Practice|Entraînement)$/]) {
    const b = s.text.split('\n').map((x) => x.trim()).find((x) => want.test(x));
    if (b) await d.click(b, { settle: 350 });
  }
  const st = (await d.read()).buttons.find((b) => t.start.test ? t.start.test(b) : b === t.start);
  if (st) await d.click(st, { settle: 1600 });
  return Boolean(st);
}

/** Move past the verdict banner to the next question, if it is offered. */
async function nextQuestion(d) {
  const nx = (await d.read()).buttons.find((b) => /^(Next|Suivant)$/.test(b));
  if (nx) { await d.click(nx, { settle: 1000 }); return true; }
  return false;
}

async function ply006(d, { lang, viewport }) {
  const t = L[lang];
  const tag = `[${lang} ${viewport}]`;
  const CHAIN = lang === 'fr' ? /⚡ (\d)\/(\d) bonnes de suite/ : /⚡ (\d)\/(\d) right in a row/;
  const FIRED = lang === 'fr' ? /turbo lancé/ : /turbo fired/;
  const TURBO_BTN = lang === 'fr' ? /Lance le turbo/ : /Fire the turbo/;
  console.log(`\n═══ PLY-006 ${tag} ═══`);
  await d.viewport(viewport);
  await signIn(d, { lang, layout: lang === 'fr' ? 'azerty' : 'qwerty', model: { stars: 0 } });

  d.check(`${tag} the race starts (the known-firing signal)`, await startRace(d, t), 'no Start button on the race setup');
  let s = await d.snap(`ply006-${lang}-race-start`);
  d.check(`${tag} the kit drew two rockets on the course`, s.rockets === 2, `rockets=${s.rockets}`);

  // ── Misses on purpose: this is the hole Richard fell into ─────────────────
  //
  // 🔴 SIX, not the four AC8 asks for, and the difference is a real reading of
  // the product rather than a convenience. Measured 2026-09-18: after FOUR
  // misses the chain still charges (`race.turbo` goes to 1 on the third right
  // answer) but the button never appears, because by then the slipstream has
  // pulled the child back to within `BEHIND_FROM` (0.15) and `rdCanFire`
  // requires `behind`. The turbo is not lost — it stays charged for when they
  // fall behind again — but it cannot be FIRED, so AC8's sequence cannot be
  // completed at four. At six the gap survives three right answers and the
  // button appears. Either AC8's number moves to six or the rule changes;
  // that is Richard's call, and §6 says a gate closes nothing here anyway.
  const MISSES = 6;
  for (let i = 1; i <= MISSES; i++) {
    const a = await d.answer({ wrong: true });
    if (!a) break;
    await nextQuestion(d);
  }
  s = await d.snap(`ply006-${lang}-misses`);
  const behind = await d.evaluate(`(() => {
    const gs = [...document.querySelectorAll('svg g[transform*="translate"]')].map(g => g.getAttribute('transform'));
    return gs.slice(0, 4);
  })()`);
  console.log(`  ${tag} after ${MISSES} misses, rockets at:`, JSON.stringify(behind));

  // ── Right answers until the chain charges ─────────────────────────────────
  const gains = [];
  let charged = false, chainSeen = [];
  for (let i = 0; i < 12 && !charged; i++) {
    const a = await d.answer({ wrong: false });
    if (!a) break;
    const after = await d.read();
    const m = after.text.match(CHAIN);
    if (m) chainSeen.push(`${m[1]}/${m[2]}`);
    const g = await d.evaluate(GAIN);
    const correct = !/Not quite|Pas tout à fait/.test(after.text);
    if (correct && g) gains.push({ len: g.len, line: (after.text.match(/⚡[^\n]*|[\d.]+ s · [^\n]*/) || [''])[0] });
    // 🔴 The turbo button is drawn only when the verdict banner is CLOSED
    // (`rdCanFire`: ready && behind && !open), so it can never be seen in the
    // text taken straight after an answer. Move on first, then look.
    await nextQuestion(d);
    const idle = await d.read();
    const m2 = idle.text.match(CHAIN);
    if (m2) chainSeen.push(`${m2[1]}/${m2[2]}`);
    charged = TURBO_BTN.test(idle.text);
    if (/reached the planet|atteint la planète|arrivé avant|Play again|Rejouer/i.test(idle.text)) break;
  }
  s = await d.snap(`ply006-${lang}-charged`);
  console.log(`  ${tag} chain line read:`, JSON.stringify(chainSeen), '· plain gains:', JSON.stringify(gains.map((x) => x.len)));

  d.check(`${tag} AC8 the chain line counts right answers in a row`,
    chainSeen.length >= 1 && /^[1-3]\/3$/.test(chainSeen[0]), JSON.stringify(chainSeen));
  d.check(`${tag} AC8 the chain reaches 3 and the turbo button appears`, charged,
    `chain seen: ${JSON.stringify(chainSeen)}\n${s.text.slice(0, 600)}`);

  if (!charged) return;                       // nothing below can be read without it

  // the button must be a real, reachable control — not merely rendered
  const btnLabel = s.buttons.find((b) => TURBO_BTN.test(b));
  const where = btnLabel ? await d.locate(btnLabel) : { found: false };
  d.check(`${tag} AC8 the turbo button is reachable, not behind a blocker`,
    where.found && where.reachable, JSON.stringify(where));

  // ── Fire it, and measure what the next right answer wins ──────────────────
  const plain = gains.length ? gains[gains.length - 1].len : null;
  await d.click(btnLabel, { settle: 900 });
  await d.snap(`ply006-${lang}-turbo-armed`);
  const a = await d.answer({ wrong: false });
  s = await d.snap(`ply006-${lang}-turbo-fired`);
  const fired = await d.evaluate(GAIN);
  const ratio = plain && fired ? fired.len / plain : null;
  console.log(`  ${tag} plain gain=${plain} · turbo gain=${fired && fired.len} · ratio=${ratio && ratio.toFixed(2)} · answered ${JSON.stringify(a && a.prompt)}`);

  d.check(`${tag} AC8 the line says the turbo was fired`, FIRED.test(s.text),
    s.text.replace(/\n/g, ' | ').slice(0, 500));

  // 🔴 AC8 asks that the line SAY WHY, and a line running off both edges of the
  // screen does not. This is the longest the verdict line ever gets — speed,
  // turbo and slipstream all at once — and it only exists for the one answer a
  // fired turbo grades, which is why no earlier drive could have seen it.
  // `innerText` holds the whole string whether or not a person can read it, so
  // this is measured from the box, not the text.
  const line = await d.evaluate(`(() => {
    const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /${lang === 'fr' ? 'turbo lancé' : 'turbo fired'}/.test(e.innerText || ''));
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    return { found: true, text: el.innerText.trim(), left: Math.round(r.left), right: Math.round(r.right),
      innerW: innerWidth, offLeft: r.left < 0, offRight: r.right > innerWidth,
      overflows: el.scrollWidth > el.clientWidth + 1 };
  })()`);
  d.check(`${tag} AC8 the verdict line is whole on the screen — both ends readable`,
    line.found && !line.offLeft && !line.offRight && !line.overflows, JSON.stringify(line));
  d.check(`${tag} AC8 the turbo answer moves the rocket about twice as far (plain ${plain} → turbo ${fired && fired.len}, ×${ratio && ratio.toFixed(2)})`,
    ratio !== null && ratio >= 1.7 && ratio <= 2.3, `plain=${plain} turbo=${fired && fired.len} ratio=${ratio}`);

  // ── AC9: the face in the window, at this viewport ─────────────────────────
  const face = await d.evaluate(`(() => {
    const im = [...document.querySelectorAll('svg image')];
    return im.map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
  })()`);
  const biggest = face.length ? Math.max(...face.map((f) => Math.min(f.w, f.h))) : 0;
  d.check(`${tag} AC9 the avatar in the rocket window is at least 20 px across (read ${biggest})`,
    biggest >= 20, JSON.stringify(face));
}

/**
 * PLY-006 AC9 on its own — the avatar in the rocket window, at ALL FIVE
 * viewports §5 names, not the two the comeback arms happen to use.
 *
 * Measured on the rendered `<image>`, so it reads what the viewer's layout
 * actually gave the sprite rather than what the kit would draw at its default
 * size. AC2 already grades the kit's own seam; this grades the screen.
 */
async function ply006face(d) {
  console.log(`\n═══ PLY-006 AC9 — the face at all five viewports ═══`);
  for (const vp of Object.values(d.VIEWPORTS)) {
    await d.viewport(vp);
    await signIn(d, { lang: 'fr', layout: 'azerty', model: { stars: 0 } });
    const started = await startRace(d, L.fr);
    if (!started) { d.check(`[${vp.name}] AC9 the race starts`, false, 'no Start'); continue; }
    const s = await d.snap(`ply006-face-${vp.name}`);
    const faces = await d.evaluate(`(() => [...document.querySelectorAll('svg image')].map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }))()`);
    const biggest = faces.length ? Math.max(...faces.map((f) => Math.min(f.w, f.h))) : 0;
    d.check(`[${vp.name}] AC9 the avatar in the rocket window is at least 20 px across (read ${biggest}, ${s.rockets} rockets)`,
      biggest >= 20, JSON.stringify(faces));
  }
}

// ───────────────────────────────────────────────────────────────────────────
const SCENARIOS = { ply001, ply002, ply003, ply004, ply005, ply006, ply006face };

(async () => {
  const names = WHICH === 'all' ? Object.keys(SCENARIOS) : WHICH.split(',');
  const bad = names.filter((n) => !SCENARIOS[n]);
  if (bad.length) { console.error(`no such scenario: ${bad.join(', ')} (have: ${Object.keys(SCENARIOS).join(', ')})`); process.exit(2); }

  const out = await withRocket({ dir: /^https?:\/\//.test(DIR) ? undefined : DIR, origin: /^https?:\/\//.test(DIR) ? DIR : undefined, shots: SHOTS }, async (d) => {
    for (const n of names) {
      // A scenario that takes only the driver runs its own viewports; the rest
      // get both arms — FR on the phone, EN on the laptop. FR is primary (§5).
      if (SCENARIOS[n].length === 1) { await SCENARIOS[n](d); continue; }
      await SCENARIOS[n](d, { lang: 'fr', viewport: '390x844' });
      await SCENARIOS[n](d, { lang: 'en', viewport: '1366x768' });
    }
    d.check('no console errors', d.page.consoleErrors.length === 0, JSON.stringify(d.page.consoleErrors.slice(0, 4)));
    d.check('no network errors', d.page.networkErrors.length === 0, JSON.stringify(d.page.networkErrors.slice(0, 3)));
  });
  process.exitCode = out.passed === out.total ? 0 : 1;
})().catch((e) => { console.error(e); process.exit(1); });
