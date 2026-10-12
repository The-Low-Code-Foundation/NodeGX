#!/usr/bin/env node
/**
 * P113 REV-001 / REV-002 — the chooser and the revision lists, driven in a real browser against a deployed Rocket School.
 *
 * Richard, 2026-10-04: his CE2 daughter gets fractions she has not met; his 6e daughter has a verb test and a list of
 * prehistory dates from an older textbook. The remedies are a chooser before a race (what to practise, down to "the tables
 * of 5 and 8") and the player's own revision list, typed as the teacher gave it. This drive does both, the way a person
 * would — real CDP clicks at an element's centre, text through `Input.insertText` — and grades every clause against the
 * STORED profile (localStorage) as well as the page.
 *
 * Arms:
 *   focus (EN 1366×768, FR 390×844) — a CE2 player:
 *     line0      the setup says "Maths · everything (CE2)" before anything is chosen
 *     picker     Change opens the chooser with the subject pills
 *     skills     the Times tables topic shows "5 times table"
 *     saved      Practise this stores focus { maths, [table-5, table-8] } and the line says the two tables
 *     only58     six questions later, every skill asked was table-5 or table-8 (read off the stored model)
 *     kept       after a reload the setup still says the two tables
 *   lists (EN 1366×768) — a 6e player:
 *     noLists    My lists says there is no list yet, and offers to make one
 *     listsPage  Make or edit a list opens the lists page
 *     count      four typed lines read as "4 questions" before Save
 *     row        Save stores the list (four items) and shows its row
 *     lineList   back in the race, the list is chosen and the line says "My list · History Monday"
 *     fromList   every question of the race came from the list (its skill id is set:<id>)
 *     learned    answering right from the list learns its items: the stored model counts them, and stars grew by more than the answers alone
 *                (eight answers: eight fluent right answers land the rocket, so a ninth question never comes)
 *   monster (EN 1366×768, FR 390×844) — REV-001 AC5 and REV-002 AC2, Monster Gate's own setup:
 *     line0M     Monster Gate's setup says "Maths · everything (CE2)" before anything is chosen
 *     savedM     its Change → Times tables → 5 and 8 → Practise this stores the same focus the race's does
 *     only58M    every question of the monster game was table-5 or table-8 (read off the stored model)
 *     shared     the race's setup then says the two tables too (the focus is the player's, not the game's)
 *     lineListM  a list made from Monster Gate's My lists step, chosen there, says "My list · History Monday"
 *     fromListM  every monster question came from the list (its skill id is set:<id>)
 *   editor (EN 1366×768) — REV-002 AC5:
 *     filled     Edit opens the editor holding the list's name and its lines
 *     edited     a changed line, saved, is in the SAME list (one list, four items, the old line gone)
 *     asks       Delete asks "Delete this list?" and deletes nothing yet
 *     keptNo     "No, keep" puts the row back with the list still stored
 *     deleted    Delete → "Yes, delete" removes the list from the store and the row from the page
 *   both (EN 1366×768) — REV-002 AC4:
 *     bothSaved  a list saved with "Ask both ways" is stored both: true and its row says so
 *     backwards  at least one question was asked from the answer side (the buttons were the question side)
 *     forwards   and at least one the usual way (each is a coin toss: eight questions miss one side 1 time in 128)
 *     rightBack  every answer was the list's own (a backwards one answered with the question) and graded right: eight answers stored, no item missed
 *   moon (EN 1366×768, FR 390×844) — REV-005, ruling 4 (the prizes are aliens on a moon):
 *     moonPage   stars earned by a list race; the result card → the hangar → the moon: the adopt card (first one free), six species drawn, the purse
 *     adopted    Fuzz, Pink, "Zorp", Adopt: stored (species, colour, name), nothing spent, the welcome line, the card folds to "Adopt another · 60 ⭐"
 *     fed        a strawberry: 3 ⭐ spent, a meal (two if it is the favourite), the yum line, and the alien hopped (its Happy count rose)
 *     asks       a bow (not owned) asks first: the purse, and what is left after 20 ⭐; nothing spent yet
 *     bought     Yes: 20 ⭐ spent, owned, worn — the kit draws it on the alien
 *     offFree    a tap on the bow again takes it off, and costs nothing
 *     keptMoon   /moon reloads as itself: Zorp and the meals are still there
 *   every cell: quiet — no console error
 *
 * Usage: node scripts/devtools/drive-p113-focus.js <deploy-dir> [--arm focus|lists|monster|editor|both|moon] [--only 1366x768] [--shots <dir>]
 * Exits 0 when every clause passed in every cell.
 */
const fs = require('fs');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const argv = process.argv.slice(2);
const DIR = argv[0];
const arg = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
};
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-p113-focus.js <deploy-dir> [--arm focus|lists] [--only 1366x768] [--shots <dir>]');
  process.exit(2);
}
const SHOTS = arg('--shots');
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ARMS = arg('--arm') ? [arg('--arm')] : ['focus', 'lists', 'monster', 'editor', 'both', 'moon'];
const ONLY = arg('--only') ? arg('--only').split(',') : null;
const VPS = {
  '1366x768': { width: 1366, height: 768, mobile: false },
  '390x844': { width: 390, height: 844, mobile: true }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const WORDS = {
  en: {
    race: 'Rocket Race', start: 'Start', next: 'Next', change: 'Change', practiseThis: 'Practise this', maths: '🔢 Maths', tables: 'Times tables', t5: '5 times table', t8: '8 times table',
    everything: 'Maths · everything (CE2)', two: 'Maths · 5 times table, 8 times table', title: 'What do you want to practise?', lists: '📚 My lists', noLists: 'No list yet.', editLists: 'Make or edit a list',
    listsTitle: 'My revision lists', newList: 'New list', save: 'Save', count: '4 questions', home: 'Home', myList: 'My list · ',
    monster: 'Monster Gate', edit: 'Edit', del: 'Delete', delAsk: 'Delete this list?', yes: 'Yes, delete', no: 'No, keep', both: 'Ask both ways',
    toHangar: 'To the hangar', visitMoon: '🌙 Visit your aliens on the Moon', moonTitle: 'The Moon', adoptFirst: 'Adopt your first alien — it’s free!', purse: 'You have {n} ⭐',
    fuzz: 'Fuzz', pink: 'Pink', adoptFree: 'Adopt · free!', welcome: 'Welcome to the moon, Zorp!', another: '＋ Adopt another alien · 60 ⭐', strawberry: 'Strawberry', yum: 'Zorp munches 🍓. Yum!', loves: 'Zorp LOVES 🍓!',
    bow: 'Bow', yesBuy: 'Yes, buy it'
  },
  fr: {
    race: 'Course de fusées', start: 'Commencer', next: 'Suivant', change: 'Changer', practiseThis: 'Réviser ça', maths: '🔢 Maths', tables: 'Tables de multiplication', t5: 'Table de 5', t8: 'Table de 8',
    everything: 'Maths · tout (CE2)', two: 'Maths · Table de 5, Table de 8', title: 'Qu’est-ce que tu veux réviser ?', lists: '📚 Mes listes', noLists: 'Pas encore de liste.', editLists: 'Créer ou modifier une liste',
    listsTitle: 'Mes listes de révision', newList: 'Nouvelle liste', save: 'Enregistrer', count: '4 questions', home: 'Accueil', myList: 'Ma liste · ',
    monster: 'La porte du monstre', edit: 'Modifier', del: 'Supprimer', delAsk: 'Supprimer cette liste ?', yes: 'Oui, supprimer', no: 'Non, garder', both: 'Dans les deux sens',
    toHangar: 'Au hangar', visitMoon: '🌙 Va voir tes aliens sur la Lune', moonTitle: 'La Lune', adoptFirst: 'Adopte ton premier alien — c’est gratuit !', purse: 'Tu as {n} ⭐',
    fuzz: 'Poilu', pink: 'Rose', adoptFree: 'Adopter · gratuit !', welcome: 'Bienvenue sur la Lune, Zorp !', another: '＋ Adopter un autre alien · 60 ⭐', strawberry: 'Fraise', yum: 'Zorp croque 🍓. Miam !', loves: 'Zorp ADORE 🍓 !',
    bow: 'Nœud', yesBuy: 'Oui, achète'
  }
};

const LIST_NAME = 'History Monday';
const LIST_LINES = [
  ['Neanderthals disappear', 'around -40 000'],
  ['Fire is mastered', 'around -400 000'],
  ['Lascaux is painted', 'around -20 000'],
  ['Writing is invented', 'around -3 300']
];
// The editor arm changes one answer; the both arm is a vocabulary list, the kind a child asks both ways.
const EDITED = ['Fire is mastered', 'around -500 000'];
const VOCAB_NAME = 'English words';
const VOCAB_LINES = [
  ['le chien', 'the dog'],
  ['la maison', 'the house'],
  ['le livre', 'the book'],
  ['la pomme', 'the apple']
];
const linesText = (lines) => lines.map(([q, a]) => `${q} = ${a}`).join('\n');

/** Everything a clause reads, in one evaluation: the page's text, the controls, and the stored active profile. */
const LOOK = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
  let stored = null;
  try {
    const find = (v, depth) => {
      if (!v || typeof v !== 'object' || depth > 6) return null;
      if (Array.isArray(v.profiles) && typeof v.activeId === 'string') return v;
      for (const k of Object.keys(v)) { const hit = find(typeof v[k] === 'string' && /^[{[]/.test(v[k]) ? JSON.parse(v[k]) : v[k], depth + 1); if (hit) return hit; }
      return null;
    };
    for (let i = 0; i < localStorage.length; i++) {
      let parsed; try { parsed = JSON.parse(localStorage.getItem(localStorage.key(i))); } catch (e) { continue; }
      const app = find(parsed, 0);
      if (app) {
        const p = app.profiles.find((x) => x.id === app.activeId) || null;
        const skills = p && p.model && p.model.skills ? p.model.skills : {};
        const listStates = Object.keys(skills).filter((k) => k.startsWith('set:')).map((k) => { const it = skills[k].items || {}; return { id: k, learned: skills[k].learned || 0, items: Object.keys(it).length, ok: Object.keys(it).filter((x) => it[x] && it[x].ok).length, missed: Object.keys(it).filter((x) => it[x] && it[x].k !== it[x].n).length, asked: Object.keys(it).reduce((n, x) => n + ((it[x] && it[x].n) || 0), 0) }; });
        stored = {
          sets: (app.sets || []).map((s) => ({ id: s.id, name: s.name, count: (s.items || []).length, both: s.both === true, lines: (s.items || []).map((it) => it.q + ' = ' + it.a) })),
          active: p && { name: p.name, level: p.level, lang: p.lang, focus: p.focus || null, answered: p.model ? p.model.answered : 0, lastSkill: p.model ? p.model.lastSkill : '', stars: p.model ? p.model.stars : 0, spent: p.model ? p.model.spent || 0 : 0, moon: p.moon || null, listStates }
        };
        break;
      }
    }
  } catch (e) { stored = { error: String(e) }; }
  const inputs = [...document.querySelectorAll('input, textarea')].filter((i) => vis(i) && !i.closest('.gk-pad'));
  return {
    body: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 300),
    bodyFull: document.body.innerText,
    inputs: inputs.map((i) => ({ tag: i.tagName.toLowerCase(), value: i.value, box: box(i) })),
    padBox: box(document.querySelector('.gk-pad input:not([disabled])')),
    options: [...document.querySelectorAll('button')].filter((b) => vis(b) && !b.closest('.gk-pad')).map((b) => ({ text: b.innerText.trim(), box: box(b) })),
    aliens: [...document.querySelectorAll('svg[data-alien]')].filter(vis).map((s) => ({ alien: s.dataset.alien, grown: Number(s.dataset.grown), hops: Number(s.dataset.hops), w: Math.round(s.getBoundingClientRect().width), wear: [...s.querySelectorAll('[data-wear]')].map((g) => g.dataset.wear) })),
    stored
  };
})()`;

const cells = [];
/**
 * Every clause an arm owes. A cell that stops early (a `return note(...)`) never runs the rest, so the summary counts a clause
 * that never ran as failed: a drive that lost its way is not a pass.
 */
const EXPECT = {
  focus: ['line0', 'picker', 'skills', 'saved', 'only58', 'kept', 'quiet'],
  lists: ['noLists', 'listsPage', 'count', 'row', 'lineList', 'fromList', 'learned', 'quiet'],
  monster: ['line0M', 'savedM', 'only58M', 'shared', 'lineListM', 'fromListM', 'quiet'],
  editor: ['filled', 'edited', 'asks', 'keptNo', 'deleted', 'quiet'],
  both: ['bothSaved', 'backwards', 'forwards', 'rightBack', 'quiet'],
  moon: ['moonPage', 'adopted', 'fed', 'asks', 'bought', 'offFree', 'keptMoon', 'quiet']
};

async function driveCell(arm, vpName, lang) {
  const vp = VPS[vpName];
  const w = WORDS[lang];
  const cell = { arm, vp: vpName, lang, clauses: {}, saw: {}, notes: [], reached: false };
  cells.push(cell);
  const clause = (name, ok, saw) => {
    cell.clauses[name] = !!ok;
    if (!ok) cell.saw[name] = saw;
  };
  const note = (t) => cell.notes.push(t);

  await withDeployedSite({ dir: DIR }, async ({ client, evaluate, consoleErrors }) => {
    const send = (m, p) => client.send(m, p || {});
    await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
    await wait(1200);
    const look = () => evaluate(LOOK);
    const until = async (test, ms) => {
      const end = Date.now() + ms;
      for (;;) {
        const r = await look();
        if (test(r)) return r;
        if (Date.now() > end) return r;
        await wait(250);
      }
    };
    const clickAt = async (x, y) => {
      for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    };
    /** The LAST visible element whose own text is the label (the innermost), scrolled into view and clicked. */
    const click = async (label) => {
      const at = await evaluate(`(() => { const hit = [...document.querySelectorAll('body *')].reverse().find((e) => e.getClientRects().length && e.innerText && e.innerText.trim() === ${JSON.stringify(label)}); if (!hit) return null; hit.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = hit.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (!at) return false;
      await clickAt(at.x, at.y);
      await wait(900);
      return true;
    };
    /** Type into the n-th visible field that is not the answer pad's. */
    const typeInto = async (index, text) => {
      const at = await evaluate(`(() => { const all = [...document.querySelectorAll('input, textarea')].filter((i) => i.getClientRects().length && !i.closest('.gk-pad')); const i = all[${index}]; if (!i) return null; i.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = i.getBoundingClientRect(); return { x: r.left + 20, y: r.top + Math.min(20, r.height / 2) }; })()`);
      if (!at) return false;
      await clickAt(at.x, at.y);
      await wait(150);
      await evaluate(`(() => { const i = document.activeElement; if (i && i.select) i.select(); })()`);
      await send('Input.insertText', { text });
      await wait(400);
      return true;
    };
    const shoot = async (label) => {
      if (!SHOTS) return;
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `p113-${arm}-${lang}-${vpName}-${label}.png`), Buffer.from(data, 'base64'));
    };
    const newPlayer = async (who, level) => {
      if (!(await click('New player'))) return false;
      if (!(await typeInto(0, who))) return false;
      await click(level);
      if (lang === 'fr') await click('Français');
      if (!(await click('Let’s go!'))) return false;
      await until((r) => r.bodyFull.includes(w.race), 5000);
      return true;
    };
    /** Answer the question on screen: the option whose text is `want` when given, else the first option, else a "1" in the box. Then Next. */
    const answerOne = async (want, texts) => {
      const isChoice = (o) => (texts ? texts.includes(o.text) : /^[\d\s  .,/−-]+$/.test(o.text) || o.text.startsWith('around'));
      const q = await until((r) => r.options.some(isChoice) || r.padBox, 6000);
      const before = q.stored && q.stored.active ? q.stored.active.answered : 0;
      const prompt = q.bodyFull;
      const choices = q.options.filter(isChoice);
      let kind;
      if (choices.length) {
        const pick = want ? choices.find((o) => o.text === want) || choices[0] : choices[0];
        await clickAt(pick.box.x, pick.box.y);
        kind = 'options';
      } else if (q.padBox) {
        await clickAt(q.padBox.x, q.padBox.y);
        await send('Input.insertText', { text: '1' });
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        kind = 'typed';
      } else return { kind: 'none', prompt };
      const graded = await until((r) => r.stored && r.stored.active && r.stored.active.answered > before, 5000);
      await click(w.next);
      await wait(400);
      return { kind, prompt, skill: graded.stored && graded.stored.active ? graded.stored.active.lastSkill : '', stored: graded.stored };
    };

    /**
     * A question from a list the drive typed, answered right. The buttons say which way it is asked: the answer side (the usual
     * way) or the question side (backwards). The item is the one whose other side is on the page and not on a button.
     */
    const answerList = async (lines, shotAs) => {
      const qs = lines.map((l) => l[0]);
      const as = lines.map((l) => l[1]);
      const q = await until((r) => r.options.some((o) => qs.includes(o.text) || as.includes(o.text)) || r.padBox, 6000);
      const opts = q.options.map((o) => o.text);
      const reverse = opts.some((t) => qs.includes(t));
      const line = lines.find(([qq, aa]) => (reverse ? q.bodyFull.includes(aa) && !opts.includes(aa) : q.bodyFull.includes(qq) && !opts.includes(qq)));
      // The picture is of THIS question: answerOne presses Next, so a shot after it shows the following one.
      if (shotAs) await shoot(shotAs(reverse));
      const a = await answerOne(line ? (reverse ? line[0] : line[1]) : undefined, reverse ? qs : as);
      return { skill: a.skill, kind: a.kind, reverse, known: !!line };
    };
    /** The lists page, the way a child finds it: a game's setup → Change → My lists → Make or edit a list. */
    const toListsPage = async (game) => {
      if (!(await click(game))) return `no "${game}" card on Home`;
      await until((r) => r.bodyFull.includes(w.change), 4000);
      if (!(await click(w.change))) return 'no Change';
      await until((r) => r.bodyFull.includes(w.title), 3000);
      if (!(await click(w.lists))) return `no "${w.lists}" pill`;
      await until((r) => r.bodyFull.includes(w.editLists), 3000);
      if (!(await click(w.editLists))) return 'no Make or edit a list';
      const page = await until((r) => r.bodyFull.includes(w.listsTitle), 4000);
      return page.bodyFull.includes(w.listsTitle) ? null : `the lists page did not open — ${page.body}`;
    };
    /** New list → name → lines → (both ways) → Save. Returns the stored set, or null. */
    const makeList = async (name, lines, both) => {
      const before = (await look()).stored.sets.length;
      if (!(await click(w.newList))) return null;
      await until((r) => r.inputs.length >= 2, 3000);
      await typeInto(0, name);
      await typeInto(1, linesText(lines));
      await until((r) => r.bodyFull.includes(w.count), 3000);
      if (both) await click(w.both);
      if (!(await click(w.save))) return null;
      const saved = await until((r) => r.stored && r.stored.sets.length === before + 1, 4000);
      return saved.stored.sets.find((s) => s.name === name) || null;
    };
    /** A game's setup → Change → My lists → the list → Practise this. Returns the look once the setup's line names the list. */
    const chooseList = async (game, name, count) => {
      await click(game);
      await until((r) => r.bodyFull.includes(w.change), 4000);
      await click(w.change);
      await until((r) => r.bodyFull.includes(w.title), 3000);
      await click(w.lists);
      if (!(await click(`${name} (${count})`))) return null;
      if (!(await click(w.practiseThis))) return null;
      return until((r) => r.bodyFull.includes(w.myList + name), 4000);
    };
    /**
     * Home, from anywhere. A reload leaves a live game for Home (the bar, and its Home, are away while a game is live), but a page
     * with a URL of its own, like /lists, reloads as itself, so the bar's Home finishes the way.
     */
    const reloadHome = async () => {
      await send('Page.reload', {});
      await wait(3500);
      // Home is where both game cards are: the race page's own title is "Rocket Race" too.
      const home = (r) => r.bodyFull.includes(w.race) && r.bodyFull.includes(w.monster);
      const at = await until(home, 5000);
      if (home(at)) return at;
      await click(w.home);
      return until(home, 5000);
    };

    if (arm === 'monster') {
      if (!(await newPlayer('Saoirse', 'CE2'))) return note('could not make the player');
      cell.reached = true;
      if (!(await click(w.monster))) return note(`no "${w.monster}" card on Home`);
      const setup = await until((r) => r.bodyFull.includes(w.everything), 4000);
      await shoot('setup');
      clause('line0M', setup.bodyFull.includes(w.everything), setup.body);
      if (!(await click(w.change))) return note(`no "${w.change}" on Monster Gate's setup — ${(await look()).body}`);
      await until((r) => r.bodyFull.includes(w.title), 3000);
      if (!(await click(w.tables))) return note(`no "${w.tables}" topic pill — ${(await look()).body}`);
      await until((r) => r.bodyFull.includes(w.t5), 3000);
      await click(w.t5);
      await click(w.t8);
      if (!(await click(w.practiseThis))) return note(`no "${w.practiseThis}" button`);
      const saved = await until((r) => r.stored && r.stored.active && r.stored.active.focus && r.stored.active.focus.skills && r.stored.active.focus.skills.length === 2, 4000);
      await shoot('saved');
      const focus = saved.stored && saved.stored.active ? saved.stored.active.focus : null;
      clause('savedM', !!focus && focus.subject === 'maths' && [...focus.skills].sort().join() === 'table-5,table-8' && saved.bodyFull.includes(w.two), JSON.stringify({ focus, body: saved.body }));
      if (!(await click(w.start))) return note('no Start');
      const asked = [];
      for (let i = 0; i < 6; i++) {
        const a = await answerOne();
        if (a.kind === 'none') break;
        asked.push(a.skill);
      }
      await shoot('played');
      clause('only58M', asked.length === 6 && asked.every((s) => s === 'table-5' || s === 'table-8'), JSON.stringify(asked));
      await reloadHome();
      await click(w.race);
      const race = await until((r) => r.bodyFull.includes(w.two), 5000);
      clause('shared', race.bodyFull.includes(w.two), race.body);
      // A list, made and chosen from Monster Gate's own setup.
      await reloadHome();
      const lost = await toListsPage(w.monster);
      if (lost) return note(lost);
      const set = await makeList(LIST_NAME, LIST_LINES, false);
      if (!set) return note(`the list was not saved — ${(await look()).body}`);
      await reloadHome();
      const chosen = await chooseList(w.monster, LIST_NAME, 4);
      await shoot('chosen');
      clause('lineListM', !!chosen && chosen.bodyFull.includes(w.myList + LIST_NAME) && chosen.stored.active.focus.subject === 'set:' + set.id, chosen && JSON.stringify({ focus: chosen.stored.active.focus, body: chosen.body }));
      if (!(await click(w.start))) return note('no Start');
      const fromList = [];
      for (let i = 0; i < 6; i++) {
        const a = await answerList(LIST_LINES);
        if (a.kind === 'none') break;
        fromList.push(a);
      }
      await shoot('listplayed');
      clause('fromListM', fromList.length === 6 && fromList.every((a) => a.skill === 'set:' + set.id && a.known), JSON.stringify(fromList));
    }

    if (arm === 'editor') {
      if (!(await newPlayer('Ellie', '6e'))) return note('could not make the player');
      cell.reached = true;
      const lost = await toListsPage(w.race);
      if (lost) return note(lost);
      const set = await makeList(LIST_NAME, LIST_LINES, false);
      if (!set) return note(`the list was not saved — ${(await look()).body}`);
      if (!(await click(w.edit))) return note(`no "${w.edit}" on the row — ${(await look()).body}`);
      const open = await until((r) => r.inputs.length >= 2 && r.inputs[0].value === LIST_NAME, 3000);
      await shoot('filled');
      clause('filled', open.inputs.length >= 2 && open.inputs[0].value === LIST_NAME && open.inputs[1].value === linesText(LIST_LINES), JSON.stringify(open.inputs.map((i) => i.value)));
      const changed = LIST_LINES.map((l) => (l[0] === EDITED[0] ? EDITED : l));
      await typeInto(1, linesText(changed));
      if (!(await click(w.save))) return note(`no "${w.save}" in the editor — ${(await look()).body}`);
      const after = await until((r) => r.stored.sets.length === 1 && r.stored.sets[0].lines.includes(EDITED.join(' = ')), 4000);
      await shoot('edited');
      const s0 = after.stored.sets[0];
      clause('edited', after.stored.sets.length === 1 && s0.id === set.id && s0.count === 4 && s0.lines.includes(EDITED.join(' = ')) && !s0.lines.includes('Fire is mastered = around -400 000') && after.bodyFull.includes(LIST_NAME), JSON.stringify(after.stored.sets));
      if (!(await click(w.del))) return note(`no "${w.del}" on the row`);
      const asking = await until((r) => r.bodyFull.includes(w.delAsk), 3000);
      await shoot('asks');
      clause('asks', asking.bodyFull.includes(w.delAsk) && asking.stored.sets.length === 1, JSON.stringify({ sets: asking.stored.sets.length, body: asking.body }));
      if (!(await click(w.no))) return note(`no "${w.no}"`);
      const kept = await until((r) => !r.bodyFull.includes(w.delAsk), 3000);
      clause('keptNo', !kept.bodyFull.includes(w.delAsk) && kept.stored.sets.length === 1 && kept.options.some((o) => o.text === w.edit), JSON.stringify({ sets: kept.stored.sets.length, body: kept.body }));
      await click(w.del);
      await until((r) => r.bodyFull.includes(w.delAsk), 3000);
      if (!(await click(w.yes))) return note(`no "${w.yes}"`);
      const gone = await until((r) => r.stored.sets.length === 0, 4000);
      await shoot('deleted');
      clause('deleted', gone.stored.sets.length === 0 && !gone.bodyFull.includes(LIST_NAME), JSON.stringify({ sets: gone.stored.sets, body: gone.body }));
    }

    if (arm === 'both') {
      if (!(await newPlayer('Ellie', '6e'))) return note('could not make the player');
      cell.reached = true;
      const lost = await toListsPage(w.race);
      if (lost) return note(lost);
      const set = await makeList(VOCAB_NAME, VOCAB_LINES, true);
      await shoot('saved');
      const row = await look();
      clause('bothSaved', !!set && set.both === true && row.bodyFull.includes(`${w.count} · ${w.both}`), JSON.stringify({ set, body: row.body }));
      if (!set) return;
      await click(w.home);
      await until((r) => r.bodyFull.includes(w.race), 4000);
      const chosen = await chooseList(w.race, VOCAB_NAME, 4);
      if (!chosen) return note(`could not choose "${VOCAB_NAME}" — ${(await look()).body}`);
      if (!(await click(w.start))) return note('no Start');
      const asked = [];
      for (let i = 0; i < 8; i++) {
        const a = await answerList(VOCAB_LINES, (reverse) => `q${i}-${reverse ? 'back' : 'fwd'}`);
        if (a.kind === 'none') break;
        asked.push(a);
      }
      note(`asked: ${asked.map((a) => (a.reverse ? 'back' : 'fwd')).join(' ')}`);
      const end = await look();
      const state = end.stored.active.listStates.find((s) => s.id === 'set:' + set.id);
      clause('backwards', asked.some((a) => a.reverse && a.known), JSON.stringify(asked));
      clause('forwards', asked.some((a) => !a.reverse && a.known), JSON.stringify(asked));
      // Graded right: no item has a miss (a miss sets its run k back to 0, so k === n is "never missed"), over all eight answers.
      clause('rightBack', asked.length === 8 && asked.every((a) => a.known && a.skill === 'set:' + set.id) && !!state && state.asked === 8 && state.missed === 0, JSON.stringify({ asked: asked.length, state }));
    }

    if (arm === 'moon') {
      if (!(await newPlayer('Ellie', '6e'))) return note('could not make the player');
      cell.reached = true;
      // Stars first, the honest way: a list race, eight right answers.
      const lost = await toListsPage(w.race);
      if (lost) return note(lost);
      const set = await makeList(LIST_NAME, LIST_LINES, false);
      if (!set) return note(`the list was not saved — ${(await look()).body}`);
      await click(w.home);
      await until((r) => r.bodyFull.includes(w.race), 4000);
      if (!(await chooseList(w.race, LIST_NAME, 4))) return note('could not choose the list');
      if (!(await click(w.start))) return note('no Start');
      for (let i = 0; i < 8; i++) {
        const a = await answerList(LIST_LINES);
        if (a.kind === 'none') break;
      }
      // The result card's way to the hangar, then the hangar's way to the moon.
      if (!(await click(w.toHangar))) return note(`no "${w.toHangar}" on the result card — ${(await look()).body}`);
      const hangar = await until((r) => r.bodyFull.includes(w.visitMoon), 5000);
      await shoot('hangar');
      if (!(await click(w.visitMoon))) return note(`no "${w.visitMoon}" in the hangar — ${hangar.body}`);
      const moon = await until((r) => r.bodyFull.includes(w.moonTitle) && r.aliens.length >= 6, 5000);
      await shoot('moon');
      const purse0 = moon.stored.active.stars - moon.stored.active.spent;
      clause('moonPage', moon.bodyFull.includes(w.adoptFirst) && moon.aliens.filter((a) => a.w > 0).length === 6 && new Set(moon.aliens.map((a) => a.alien)).size === 6 && moon.bodyFull.includes(w.purse.replace('{n}', purse0)) && purse0 >= 25, JSON.stringify({ purse0, aliens: moon.aliens, body: moon.body }));
      // Adopt: a species, a colour and a name, then Adopt (the first is free, so no question).
      await click(w.fuzz);
      await click(w.pink);
      await typeInto(0, 'Zorp');
      if (!(await click(w.adoptFree))) return note(`no "${w.adoptFree}" — ${(await look()).body}`);
      const adopted = await until((r) => r.stored.active.moon && r.stored.active.moon.aliens && r.stored.active.moon.aliens.length === 1, 5000);
      await shoot('adopted');
      const zorp = adopted.stored.active.moon && adopted.stored.active.moon.aliens[0];
      const big = (r) => r.aliens.reduce((m, a) => (a.w > (m ? m.w : 0) ? a : m), null);
      clause('adopted', !!zorp && zorp.species === 'fuzz' && zorp.colour === 'pink' && zorp.name === 'Zorp' && adopted.stored.active.spent === 0 && adopted.bodyFull.includes(w.welcome) && big(adopted).alien === 'fuzz' && adopted.bodyFull.includes(w.another), JSON.stringify({ zorp, spent: adopted.stored.active.spent, big: big(adopted), body: adopted.body }));
      // Feed: one tap, its price, a meal (two if it is the favourite), and a hop.
      const hops0 = big(adopted).hops;
      if (!(await click(w.strawberry))) return note(`no "${w.strawberry}" tile`);
      const fed = await until((r) => r.stored.active.moon.aliens[0].meals > 0, 4000);
      await shoot('fed');
      const meals = fed.stored.active.moon.aliens[0].meals;
      clause('fed', (meals === 1 || meals === 2) && fed.stored.active.spent === 3 && (fed.bodyFull.includes(w.yum) || fed.bodyFull.includes(w.loves)) && big(fed).hops === hops0 + 1, JSON.stringify({ meals, spent: fed.stored.active.spent, hops0, big: big(fed), body: fed.body }));
      // Something to wear: not owned, so it asks first, with the purse, the price and what is left.
      if (!(await click(w.bow))) return note(`no "${w.bow}" tile`);
      const asking = await until((r) => r.bodyFull.includes(w.yesBuy), 3000);
      await shoot('asks');
      const p1 = purse0 - 3;
      clause('asks', asking.bodyFull.includes(w.yesBuy) && asking.bodyFull.includes(`${p1} ⭐`) && asking.bodyFull.includes(`${p1 - 20} ⭐`) && asking.stored.active.spent === 3 && (asking.stored.active.moon.owned || []).length === 0, JSON.stringify({ p1, spent: asking.stored.active.spent, body: asking.body }));
      if (!(await click(w.yesBuy))) return note(`no "${w.yesBuy}"`);
      const bought = await until((r) => (r.stored.active.moon.owned || []).includes('bow'), 4000);
      await shoot('bought');
      clause('bought', bought.stored.active.spent === 23 && bought.stored.active.moon.aliens[0].wear.hat === 'bow' && big(bought).wear.includes('hat:bow') && !bought.bodyFull.includes(w.yesBuy), JSON.stringify({ spent: bought.stored.active.spent, wear: bought.stored.active.moon.aliens[0].wear, big: big(bought) }));
      // Theirs now: a tap takes it off, and costs nothing.
      await click(w.bow);
      const off = await until((r) => r.stored.active.moon.aliens[0].wear.hat === '', 3000);
      clause('offFree', off.stored.active.moon.aliens[0].wear.hat === '' && off.stored.active.spent === 23 && !big(off).wear.includes('hat:bow') && !off.bodyFull.includes(w.yesBuy), JSON.stringify({ spent: off.stored.active.spent, wear: off.stored.active.moon.aliens[0].wear }));
      // The moon is kept: /moon reloads as itself, with the alien and its meals.
      await send('Page.reload', {});
      await wait(3500);
      const kept = await until((r) => r.bodyFull.includes(w.moonTitle) && r.bodyFull.includes('Zorp'), 5000);
      await shoot('kept');
      clause('keptMoon', kept.bodyFull.includes('Zorp') && big(kept) && big(kept).alien === 'fuzz' && kept.stored.active.moon.aliens[0].meals === meals, JSON.stringify({ big: big(kept), body: kept.body }));
    }

    if (arm === 'focus') {
      if (!(await newPlayer('Saoirse', 'CE2'))) return note('could not make the player');
      cell.reached = true;
      if (!(await click(w.race))) return note(`no "${w.race}" card on Home`);
      const setup = await until((r) => r.bodyFull.includes(w.everything), 4000);
      await shoot('setup');
      clause('line0', setup.bodyFull.includes(w.everything), setup.body);
      if (!(await click(w.change))) return note(`no "${w.change}" on the setup — ${(await look()).body}`);
      const picker = await until((r) => r.bodyFull.includes(w.title), 3000);
      await shoot('picker');
      clause('picker', picker.bodyFull.includes(w.title) && picker.bodyFull.includes(w.maths), picker.body);
      if (!(await click(w.tables))) return note(`no "${w.tables}" topic pill — ${(await look()).body}`);
      const skills = await until((r) => r.bodyFull.includes(w.t5), 3000);
      await shoot('tables');
      clause('skills', skills.bodyFull.includes(w.t5) && skills.bodyFull.includes(w.t8), skills.body);
      await click(w.t5);
      await click(w.t8);
      await shoot('ticked');
      if (!(await click(w.practiseThis))) return note(`no "${w.practiseThis}" button`);
      const saved = await until((r) => r.stored && r.stored.active && r.stored.active.focus && r.stored.active.focus.skills && r.stored.active.focus.skills.length === 2, 4000);
      await shoot('saved');
      const focus = saved.stored && saved.stored.active ? saved.stored.active.focus : null;
      clause('saved', !!focus && focus.subject === 'maths' && [...focus.skills].sort().join() === 'table-5,table-8' && saved.bodyFull.includes(w.two), JSON.stringify({ focus, body: saved.body }));
      if (!(await click(w.start))) return note('no Start');
      const asked = [];
      for (let i = 0; i < 6; i++) asked.push((await answerOne()).skill);
      clause('only58', asked.length === 6 && asked.every((s) => s === 'table-5' || s === 'table-8'), JSON.stringify(asked));
      await send('Page.reload', {});
      await wait(3500);
      // A reload lands on Home (the race page is left); the setup is one tap away.
      await click(w.race);
      const back = await until((r) => r.bodyFull.includes(w.two), 5000);
      await shoot('kept');
      clause('kept', back.bodyFull.includes(w.two), back.body);
    }

    if (arm === 'lists') {
      if (!(await newPlayer('Ellie', '6e'))) return note('could not make the player');
      cell.reached = true;
      if (!(await click(w.race))) return note(`no "${w.race}" card on Home`);
      await until((r) => r.bodyFull.includes(w.change), 4000);
      if (!(await click(w.change))) return note('no Change');
      await until((r) => r.bodyFull.includes(w.title), 3000);
      if (!(await click(w.lists))) return note(`no "${w.lists}" pill — ${(await look()).body}`);
      const none = await until((r) => r.bodyFull.includes(w.noLists), 3000);
      await shoot('nolists');
      clause('noLists', none.bodyFull.includes(w.noLists) && none.bodyFull.includes(w.editLists), none.body);
      if (!(await click(w.editLists))) return note('no Make or edit a list');
      const page = await until((r) => r.bodyFull.includes(w.listsTitle), 4000);
      await shoot('listspage');
      clause('listsPage', page.bodyFull.includes(w.listsTitle), page.body);
      if (!(await click(w.newList))) return note('no New list');
      await until((r) => r.inputs.length >= 2, 3000);
      await typeInto(0, LIST_NAME);
      await typeInto(1, LIST_LINES.map(([q, a]) => `${q} = ${a}`).join('\n'));
      const counted = await until((r) => r.bodyFull.includes(w.count), 3000);
      await shoot('typed');
      clause('count', counted.bodyFull.includes(w.count), JSON.stringify({ body: counted.body, inputs: counted.inputs.map((i) => i.value.slice(0, 40)) }));
      if (!(await click(w.save))) return note(`no "${w.save}" — ${(await look()).body}`);
      const stored = await until((r) => r.stored && r.stored.sets.length === 1, 4000);
      await shoot('row');
      const set = stored.stored && stored.stored.sets[0];
      clause('row', !!set && set.name === LIST_NAME && set.count === 4 && stored.bodyFull.includes(LIST_NAME) && stored.bodyFull.includes(w.count), JSON.stringify({ sets: stored.stored && stored.stored.sets, body: stored.body }));
      if (!set) return;
      // Back to the race, and choose the list.
      await click(w.home);
      await until((r) => r.bodyFull.includes(w.race), 4000);
      await click(w.race);
      await until((r) => r.bodyFull.includes(w.change), 4000);
      await click(w.change);
      await until((r) => r.bodyFull.includes(w.title), 3000);
      await click(w.lists);
      if (!(await click(`${LIST_NAME} (4)`))) return note(`no "${LIST_NAME} (4)" pill — ${(await look()).body}`);
      if (!(await click(w.practiseThis))) return note('no Practise this');
      const chosen = await until((r) => r.bodyFull.includes(w.myList + LIST_NAME), 4000);
      await shoot('chosen');
      clause('lineList', chosen.bodyFull.includes(w.myList + LIST_NAME) && chosen.stored.active.focus && chosen.stored.active.focus.subject === 'set:' + set.id, JSON.stringify({ focus: chosen.stored.active.focus, body: chosen.body }));
      if (!(await click(w.start))) return note('no Start');
      // Eight answers, each the right one (the drive typed the list, so it knows them): every item learned pays, and the list pays.
      // Eight, because eight fluent right answers land the rocket (RACE_STEP) and the result screen takes the round's place.
      const answers = [];
      const starsBefore = chosen.stored.active.stars || 0;
      for (let i = 0; i < 8; i++) {
        const q = await until((r) => r.options.some((o) => o.text.startsWith('around')) || r.padBox, 6000);
        const line = LIST_LINES.find(([question]) => q.bodyFull.includes(question));
        const a = await answerOne(line ? line[1] : undefined);
        answers.push({ skill: a.skill, known: !!line, kind: a.kind });
        if (a.kind === 'none') break;
      }
      await shoot('answered');
      const after = await look();
      clause('fromList', answers.length === 8 && answers.every((a) => a.skill === 'set:' + set.id && a.known), JSON.stringify(answers));
      const state = after.stored && after.stored.active ? after.stored.active.listStates.find((s) => s.id === 'set:' + set.id) : null;
      const starsAfter = after.stored && after.stored.active ? after.stored.active.stars : 0;
      // Eight right answers pay 8 ⭐ on their own (the landing's 5 comes with the finish); learning an item pays 2 and the whole list 25.
      clause('learned', !!state && state.learned >= 2 && starsAfter - starsBefore > 8, JSON.stringify({ state, starsBefore, starsAfter }));
    }

    clause('quiet', consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  });
}

(async () => {
  const plan = [];
  for (const arm of ARMS) {
    const cellsFor = arm === 'focus' || arm === 'monster' || arm === 'moon' ? [['1366x768', 'en'], ['390x844', 'fr']] : [['1366x768', 'en']];
    for (const [vpName, lang] of cellsFor) if (!ONLY || ONLY.includes(vpName)) plan.push([arm, vpName, lang]);
  }
  for (const [arm, vpName, lang] of plan) {
    try {
      await driveCell(arm, vpName, lang);
    } catch (e) {
      cells.push({ arm, vp: vpName, lang, clauses: {}, saw: {}, notes: [`threw: ${e && e.message}`], reached: false });
    }
  }
  let failed = 0;
  for (const cell of cells) {
    const names = [...new Set([...(EXPECT[cell.arm] || []), ...Object.keys(cell.clauses)])];
    const bad = names.filter((n) => !cell.clauses[n]);
    for (const n of bad) if (!(n in cell.clauses)) cell.saw[n] = 'never ran';
    failed += bad.length + (cell.reached ? 0 : 1);
    console.log(`${cell.arm} ${cell.lang} ${cell.vp}: ${cell.reached ? 'reached' : 'NOT REACHED'} · ${names.length - bad.length}/${names.length} ${bad.length ? 'FAIL ' + bad.join(',') : 'ALL PASS'}`);
    for (const n of bad) console.log(`   ✗ ${n}: ${cell.saw[n]}`);
    for (const n of cell.notes) console.log(`   · ${n}`);
  }
  process.exit(failed ? 1 : 0);
})();
