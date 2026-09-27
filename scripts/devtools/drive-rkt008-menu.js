#!/usr/bin/env node
/**
 * P87 RKT-008 — the player menu. "A child taps their face, fixes their name or changes class or language, and is straight back where
 * they were — and the language switch stops taking a row of every screen."
 *
 * One fresh Chrome per cell. Every reading is graded against the STORED profile (localStorage) and the rendered page. Taps are mouse
 * clicks: the header's layout does not depend on the pointer (RKT-005's pad does, and no clause here reads the pad's box).
 *
 * Arms:
 *   row (AC2) — all five viewports × FR and EN, a player with a 24-character name (the longest a name can be, so the worst case):
 *     rowHome    Home's bar is one row: no taller than its tallest control plus 16px
 *     fitsHome   nothing in Home's bar runs past it, and the page is no wider than the viewport
 *     rowSetup   the race setup's bar (which has Home) is one row too
 *     fitsSetup  and the name gives way: Home stays inside the bar
 *     closed     known-firing pair: with the menu closed there are no language pills and no Switch player on Home…
 *     opens      …and a tap on the name shows them
 *     keyboard   (1366×768 only) focus the ▾ and press Enter: the menu opens
 *   edit (AC3) — FR 390×844 and EN 1366×768: menu → Edit player → rename (Léa → Zoé) and change class (CE2 → CM2) → Save:
 *     filled     the form opens holding the player's own name
 *     renamed    the header says Zoé, and the store has Zoé in CM2
 *     kept       after a reload, the header still says Zoé and the store still has CM2
 *     level      the first question of the next race is a CM2 skill (read off the stored model and Data/Curriculum)
 *   delete (AC5) — EN 1366×768: Léa and Sam; Sam's menu → Edit → Delete:
 *     asks       the first tap only asks, by name ("Delete Sam?"), and Sam is still stored
 *     kept       "No, keep" keeps Sam (the control for `gone`)
 *     gone       "Yes, delete" → the Profiles page, and the store holds Léa only
 *     reloaded   after a reload the Profiles page shows Léa's card and no Sam
 *   answers (AC6) — EN 1366×768, a CE2 player: four questions on Auto, then Answers → Buttons from the setup's menu, four more:
 *     control    known-firing: on Auto at least one question was typed (the pad)
 *     stored     the store says answerMode "options"
 *     buttons    every question after the change shows options
 *   every cell: quiet — no console error
 *
 * Usage: node scripts/devtools/drive-rkt008-menu.js <deploy-dir> [--arm row|edit|delete|answers] [--only 390x844,1366x768] [--lang fr|en] [--shots <dir>]
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
  console.error('usage: drive-rkt008-menu.js <deploy-dir> [--arm row|edit|delete|answers] [--only 390x844] [--lang fr|en] [--shots <dir>]');
  process.exit(2);
}
const SHOTS = arg('--shots');
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ARMS = arg('--arm') ? [arg('--arm')] : ['row', 'edit', 'delete', 'answers'];
const ALL_VPS = {
  '1366x768': { width: 1366, height: 768, mobile: false },
  '1280x720': { width: 1280, height: 720, mobile: false },
  '1024x768': { width: 1024, height: 768, mobile: true },
  '768x1024': { width: 768, height: 1024, mobile: true },
  '390x844': { width: 390, height: 844, mobile: true }
};
const ONLY = arg('--only') ? arg('--only').split(',') : null;
const LANG = arg('--lang');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const WORDS = {
  en: { edit: 'Edit player', save: 'Save', switchPlayer: 'Switch player', del: 'Delete this player', yes: 'Yes, delete', no: 'No, keep', home: 'Home', race: 'Rocket Race', practice: 'Practice', start: 'Start', next: 'Next', buttons: 'Buttons', otherRace: 'Change the race', ask: (n) => `Delete ${n}?` },
  fr: { edit: 'Modifier le joueur', save: 'Enregistrer', switchPlayer: 'Changer de joueur', del: 'Supprimer ce joueur', yes: 'Oui, supprimer', no: 'Non, garder', home: 'Accueil', race: 'Course de fusées', practice: 'Entraînement', start: 'Commencer', next: 'Suivant', buttons: 'Des boutons', otherRace: 'Changer de course', ask: (n) => `Supprimer ${n} ?` }
};
const LONG_NAME = 'Maximilienne-Alexandrine';

/** Skill id → level, read from the generated template this deploy was built from. */
function curriculumLevels() {
  const file = path.join(__dirname, '..', '..', 'templates', 'rocket-school', 'components', 'Data', 'Curriculum', 'nodes.json');
  const levels = {};
  const walk = (v) => {
    if (typeof v === 'string' && v.startsWith('[')) {
      try { walk(JSON.parse(v)); } catch (e) { /* not JSON */ }
    } else if (Array.isArray(v)) {
      for (const x of v) {
        if (x && typeof x === 'object' && typeof x.id === 'string' && typeof x.level === 'string') levels[x.id] = x.level;
        else walk(x);
      }
    } else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k]);
  };
  walk(JSON.parse(fs.readFileSync(file, 'utf8')));
  return levels;
}

/** Everything a clause reads, in one evaluation. */
const LOOK = (name) => `(() => {
  const NAME = ${JSON.stringify(name || '')};
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const leaves = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && vis(e));
  const count = (t) => leaves.filter((e) => e.textContent.trim() === t).length;
  const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, left: r.left, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; };

  // The bar: from the player's name up to the first ancestor that also holds the face, then its parent. 🔴 Not from the ▾: build 5 has
  // none, and a finder that only the new build satisfies reads the old bar as null, which grades nothing.
  const caret = [...document.querySelectorAll('button')].find((b) => vis(b) && b.innerText.trim() === '▾') || null;
  let who = leaves.find((e) => NAME && e.textContent.trim() === NAME) || null;
  while (who && !who.querySelector('img')) who = who.parentElement;
  const bar = who ? who.parentElement : null;
  let barReading = null;
  if (bar) {
    const r = bar.getBoundingClientRect();
    const controls = [...bar.querySelectorAll('button, img')].filter(vis).map((e) => e.getBoundingClientRect().height);
    const kids = [...bar.querySelectorAll('*')].filter(vis).map((e) => e.getBoundingClientRect());
    barReading = {
      h: Math.round(r.height), w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right),
      tallestControl: Math.round(Math.max(0, ...controls)),
      overflowRight: Math.round(Math.max(0, ...kids.map((k) => k.right - r.right))),
      homeInBar: [...bar.querySelectorAll('button')].filter(vis).map((b) => b.innerText.trim()).filter((t) => t !== '▾')
    };
  }

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
        stored = { names: app.profiles.map((x) => x.name), active: p && { name: p.name, level: p.level, lang: p.lang, answerMode: p.answerMode, answered: p.model ? p.model.answered : 0, lastSkill: p.model ? p.model.lastSkill : '' } };
        break;
      }
    }
  } catch (e) { stored = { error: String(e) }; }

  const input = [...document.querySelectorAll('input')].find((i) => vis(i) && !i.closest('.gk-pad')) || null;
  return {
    url: location.pathname,
    body: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 220),
    bodyFull: document.body.innerText,
    pageWide: document.documentElement.scrollWidth,
    bar: barReading,
    caret: box(caret),
    english: count('English'),
    francais: count('Français'),
    azerty: leaves.filter((e) => e.textContent.includes('AZERTY')).length,
    switchEn: count('Switch player'),
    switchFr: count('Changer de joueur'),
    nameBox: input ? input.value : null,
    padKeys: [...document.querySelectorAll('.gk-pad button')].filter(vis).length,
    padBox: box(document.querySelector('.gk-pad input:not([disabled])')),
    options: [...document.querySelectorAll('button')].filter((b) => vis(b) && !b.closest('.gk-pad') && /^[\\d\\s\\u00a0\\u202f.,/−-]+$/.test(b.innerText.trim())).map(box),
    stored
  };
})()`;

const cells = [];

async function driveCell(arm, vpName, lang) {
  const vp = ALL_VPS[vpName];
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
    let name = '';
    const look = () => evaluate(LOOK(name));
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
    const typeName = async (text) => {
      const at = await evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((i) => i.getClientRects().length && !i.closest('.gk-pad')); if (!i) return null; i.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = i.getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; })()`);
      if (!at) return false;
      await clickAt(at.x, at.y);
      await wait(150);
      await evaluate(`(() => { const i = document.activeElement; if (i && i.select) i.select(); })()`);
      await send('Input.insertText', { text });
      await wait(300);
      return true;
    };
    const shoot = async (label) => {
      if (!SHOTS) return;
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `rkt008-${arm}-${lang}-${vpName}-${label}.png`), Buffer.from(data, 'base64'));
    };
    const reload = async () => {
      await send('Page.reload', {});
      await wait(3500);
    };
    const newPlayer = async (who, level) => {
      if (!(await click('New player'))) return false;
      if (!(await typeName(who))) return false;
      await click(level);
      if (lang === 'fr') await click('Français');
      if (!(await click('Let’s go!'))) return false;
      name = who;
      await until((r) => r.bodyFull.includes(w.race), 5000);
      return true;
    };
    const openMenu = async () => {
      if (!(await click(name))) return false;
      await until((r) => r.english > 0, 3000);
      return true;
    };
    const oneRow = (b) => !!b && b.h <= Math.max(b.tallestControl, 40) + 16;
    const barSaw = (r) => JSON.stringify({ bar: r.bar, pageWide: r.pageWide, body: r.body });

    /** Answer the question on screen (first option, or a wrong "1" in the box), wait for the grade, then Next. */
    const answerOne = async () => {
      const q = await until((r) => r.options.length > 0 || r.padBox || r.padKeys > 0, 5000);
      const before = q.stored && q.stored.active ? q.stored.active.answered : 0;
      const kind = q.options.length > 0 ? 'options' : 'typed';
      if (kind === 'options') await clickAt(q.options[0].x, q.options[0].y);
      else if (q.padBox) {
        await clickAt(q.padBox.x, q.padBox.y);
        await send('Input.insertText', { text: '1' });
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      } else return { kind: 'none' };
      const graded = await until((r) => r.stored && r.stored.active && r.stored.active.answered > before, 4000);
      await click(w.next);
      await wait(500);
      return { kind, skill: graded.stored && graded.stored.active ? graded.stored.active.lastSkill : '' };
    };
    const toRace = async () => {
      if (!(await click(w.race))) return false;
      await wait(900);
      await click(w.practice);
      return click(w.start);
    };

    if (arm === 'row') {
      if (!(await newPlayer(LONG_NAME, 'CE2'))) return note('could not make the player');
      cell.reached = true;
      const home = await until((r) => !!r.bar, 3000);
      await shoot('home');
      clause('rowHome', oneRow(home.bar), barSaw(home));
      clause('fitsHome', home.bar && home.bar.overflowRight <= 1 && home.pageWide <= vp.width, barSaw(home));
      clause('closed', home.english === 0 && home.francais === 0 && home.switchEn + home.switchFr === 0, JSON.stringify({ english: home.english, francais: home.francais, switch: home.switchEn + home.switchFr }));
      await openMenu();
      const open = await look();
      await shoot('menu');
      clause('opens', open.english > 0 && open.francais > 0 && open.switchEn + open.switchFr > 0 && open.azerty > 0, JSON.stringify({ english: open.english, francais: open.francais, switch: open.switchEn + open.switchFr, azerty: open.azerty, body: open.body }));
      await click(name); // close it again
      if (vpName === '1366x768') {
        await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.getClientRects().length && b.innerText.trim() === '▾'); if (b) b.focus(); })()`);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        const byKey = await until((r) => r.english > 0, 2000);
        clause('keyboard', byKey.english > 0, JSON.stringify({ english: byKey.english, active: await evaluate('document.activeElement && document.activeElement.innerText') }));
        if (byKey.english > 0) await click(name);
      }
      if (!(await click(w.race))) return note(`no "${w.race}" card on Home`);
      const setup = await until((r) => !!r.bar && r.bar.homeInBar.length > 0, 3000);
      await shoot('setup');
      clause('rowSetup', oneRow(setup.bar), barSaw(setup));
      clause('fitsSetup', setup.bar && setup.bar.overflowRight <= 1 && setup.bar.homeInBar.includes(w.home) && setup.pageWide <= vp.width, barSaw(setup));
    }

    if (arm === 'edit') {
      if (!(await newPlayer('Léa', 'CE2'))) return note('could not make the player');
      cell.reached = true;
      await openMenu();
      if (!(await click(w.edit))) return note(`no "${w.edit}" in the menu — ${(await look()).body}`);
      const form = await until((r) => r.nameBox !== null, 3000);
      await shoot('form');
      clause('filled', form.nameBox === 'Léa', JSON.stringify({ nameBox: form.nameBox, body: form.body }));
      await typeName('Zoé');
      await click('CM2');
      if (!(await click(w.save))) return note(`no "${w.save}" on the form`);
      const saved = await until((r) => r.stored && r.stored.active && r.stored.active.name === 'Zoé', 3000);
      name = 'Zoé';
      await wait(600);
      const after = await look();
      await shoot('saved');
      clause('renamed', after.bar && after.stored.active.name === 'Zoé' && after.stored.active.level === 'CM2', JSON.stringify({ stored: saved.stored, barFound: !!after.bar, body: after.body }));
      await reload();
      const back = await until((r) => !!r.bar, 5000);
      clause('kept', !!back.bar && back.stored.active.name === 'Zoé' && back.stored.active.level === 'CM2' && back.stored.names.length === 1, JSON.stringify({ stored: back.stored, barFound: !!back.bar, body: back.body }));
      if (!(await toRace())) return note('could not start a race');
      // The picker offers a player's own level and the one below (tpl007Scripts.ts, Pick next question: `si > li` skipped, `li - 1` kept
      // unless mastered, older only once seen). So a fresh CM2 player draws CM1 and CM2 skills, and a CE2 player can draw neither: four
      // questions all CM1 or CM2 is what "the next question comes from the new level" can mean. (Build 6's first version wanted CM2 alone
      // and read a CM1 skill as red.)
      const levels = curriculumLevels();
      const asked = [];
      for (let i = 0; i < 4; i++) {
        const a = await answerOne();
        asked.push({ skill: a.skill, level: levels[a.skill], kind: a.kind });
      }
      clause('level', asked.every((a) => a.level === 'CM1' || a.level === 'CM2'), JSON.stringify(asked));
    }

    if (arm === 'delete') {
      if (!(await newPlayer('Léa', 'CE2'))) return note('could not make Léa');
      await openMenu();
      if (!(await click(w.switchPlayer))) return note('no Switch player in the menu');
      if (!(await newPlayer('Sam', 'CM1'))) return note('could not make Sam');
      cell.reached = true;
      await openMenu();
      if (!(await click(w.edit))) return note(`no "${w.edit}"`);
      if (!(await click(w.del))) return note(`no "${w.del}" on the form — ${(await look()).body}`);
      const asked = await look();
      await shoot('asked');
      clause('asks', asked.bodyFull.includes(w.ask('Sam')) && asked.stored.names.includes('Sam'), JSON.stringify({ stored: asked.stored, body: asked.body }));
      await click(w.no);
      const kept = await look();
      clause('kept', kept.stored.names.includes('Sam') && !kept.bodyFull.includes(w.ask('Sam')) && kept.bodyFull.includes(w.del), JSON.stringify({ stored: kept.stored, body: kept.body }));
      await click(w.del);
      if (!(await click(w.yes))) return note(`no "${w.yes}"`);
      const gone = await until((r) => r.stored && !r.stored.names.includes('Sam'), 3000);
      await wait(800);
      const where = await look();
      await shoot('gone');
      clause('gone', JSON.stringify(gone.stored.names) === '["Léa"]' && where.bodyFull.includes('Who is playing?'), JSON.stringify({ stored: gone.stored, url: where.url, body: where.body }));
      await reload();
      const again = await look();
      clause('reloaded', again.bodyFull.includes('Léa') && !again.bodyFull.includes('Sam') && JSON.stringify(again.stored.names) === '["Léa"]', JSON.stringify({ stored: again.stored, body: again.body }));
    }

    if (arm === 'answers') {
      if (!(await newPlayer('Léa', 'CE2'))) return note('could not make the player');
      if (!(await toRace())) return note('could not start a race');
      cell.reached = true;
      const before = [];
      for (let i = 0; i < 4; i++) before.push((await answerOne()).kind);
      clause('control', before.includes('typed'), JSON.stringify(before));
      if (!(await click(w.otherRace))) return note(`no "${w.otherRace}"`);
      await until((r) => !!r.bar, 3000);
      await openMenu();
      if (!(await click(w.buttons))) return note(`no "${w.buttons}" in the menu — ${(await look()).body}`);
      const set = await until((r) => r.stored && r.stored.active && r.stored.active.answerMode === 'options', 3000);
      clause('stored', set.stored.active.answerMode === 'options', JSON.stringify(set.stored));
      await click(name);
      if (!(await click(w.start))) return note(`no "${w.start}" on the setup`);
      const after = [];
      for (let i = 0; i < 4; i++) after.push((await answerOne()).kind);
      await shoot('buttons');
      clause('buttons', after.length === 4 && after.every((k) => k === 'options'), JSON.stringify({ before, after }));
    }

    clause('quiet', consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  });
}

(async () => {
  const plan = [];
  for (const arm of ARMS) {
    const vps = arm === 'row' ? Object.keys(ALL_VPS) : arm === 'edit' ? ['390x844', '1366x768'] : ['1366x768'];
    for (const vp of vps) {
      if (ONLY && !ONLY.includes(vp)) continue;
      const langs = arm === 'row' ? ['fr', 'en'] : arm === 'edit' ? [vp === '390x844' ? 'fr' : 'en'] : ['en'];
      for (const lang of langs) if (!LANG || LANG === lang) plan.push([arm, vp, lang]);
    }
  }
  for (const [arm, vp, lang] of plan) await driveCell(arm, vp, lang);
  let failed = 0;
  for (const cell of cells) {
    const names = Object.keys(cell.clauses);
    const bad = names.filter((n) => !cell.clauses[n]);
    const ok = cell.reached && bad.length === 0 && cell.notes.length === 0;
    if (!ok) failed++;
    console.log(`${cell.arm.padEnd(8)} ${cell.lang} ${cell.vp.padEnd(9)} ${cell.reached ? `${names.length - bad.length}/${names.length} clauses` : 'NOT REACHED'}${bad.length ? `  failed: ${bad.join(', ')}` : ''}`);
    for (const n of bad) console.log(`    ${n}: ${cell.saw[n]}`);
    for (const n of cell.notes) console.log(`    · ${n}`);
  }
  console.log(failed === 0 ? `ALL PASS across ${cells.length} cells` : `NOT ALL PASS: ${failed} of ${cells.length} cells`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
