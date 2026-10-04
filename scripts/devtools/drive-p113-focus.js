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
 *   every cell: quiet — no console error
 *
 * Usage: node scripts/devtools/drive-p113-focus.js <deploy-dir> [--arm focus|lists] [--only 1366x768] [--shots <dir>]
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
const ARMS = arg('--arm') ? [arg('--arm')] : ['focus', 'lists'];
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
    listsTitle: 'My revision lists', newList: 'New list', save: 'Save', count: '4 questions', home: 'Home', myList: 'My list · '
  },
  fr: {
    race: 'Course de fusées', start: 'Commencer', next: 'Suivant', change: 'Changer', practiseThis: 'Réviser ça', maths: '🔢 Maths', tables: 'Tables de multiplication', t5: 'Table de 5', t8: 'Table de 8',
    everything: 'Maths · tout (CE2)', two: 'Maths · Table de 5, Table de 8', title: 'Qu’est-ce que tu veux réviser ?', lists: '📚 Mes listes', noLists: 'Pas encore de liste.', editLists: 'Créer ou modifier une liste',
    listsTitle: 'Mes listes de révision', newList: 'Nouvelle liste', save: 'Enregistrer', count: '4 questions', home: 'Accueil', myList: 'Ma liste · '
  }
};

const LIST_NAME = 'History Monday';
const LIST_LINES = [
  ['Neanderthals disappear', 'around -40 000'],
  ['Fire is mastered', 'around -400 000'],
  ['Lascaux is painted', 'around -20 000'],
  ['Writing is invented', 'around -3 300']
];

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
        const listStates = Object.keys(skills).filter((k) => k.startsWith('set:')).map((k) => ({ id: k, learned: skills[k].learned || 0, items: Object.keys(skills[k].items || {}).length }));
        stored = {
          sets: (app.sets || []).map((s) => ({ id: s.id, name: s.name, count: (s.items || []).length, both: s.both === true })),
          active: p && { name: p.name, level: p.level, lang: p.lang, focus: p.focus || null, answered: p.model ? p.model.answered : 0, lastSkill: p.model ? p.model.lastSkill : '', stars: p.model ? p.model.stars : 0, listStates }
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
    stored
  };
})()`;

const cells = [];

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
    const answerOne = async (want) => {
      const q = await until((r) => r.options.some((o) => /^[\d\s  .,/−-]+$/.test(o.text) || o.text.startsWith('around')) || r.padBox, 6000);
      const before = q.stored && q.stored.active ? q.stored.active.answered : 0;
      const prompt = q.bodyFull;
      const choices = q.options.filter((o) => /^[\d\s  .,/−-]+$/.test(o.text) || o.text.startsWith('around'));
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
    const cellsFor = arm === 'focus' ? [['1366x768', 'en'], ['390x844', 'fr']] : [['1366x768', 'en']];
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
    const names = Object.keys(cell.clauses);
    const bad = names.filter((n) => !cell.clauses[n]);
    failed += bad.length + (cell.reached ? 0 : 1);
    console.log(`${cell.arm} ${cell.lang} ${cell.vp}: ${cell.reached ? 'reached' : 'NOT REACHED'} · ${names.length - bad.length}/${names.length} ${bad.length ? 'FAIL ' + bad.join(',') : 'ALL PASS'}`);
    for (const n of bad) console.log(`   ✗ ${n}: ${cell.saw[n]}`);
    for (const n of cell.notes) console.log(`   · ${n}`);
  }
  process.exit(failed ? 1 : 0);
})();
