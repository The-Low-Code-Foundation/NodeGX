#!/usr/bin/env node
/**
 * P87 RKT-008 ruling (2026-09-13) — the language and Switch player are on Home, and never inside a live race.
 *
 * Richard: "i can't change the language once set so i'm stuck with decimal points … ah i can change in game but not on the home
 * screen, should be home screen too, just not inside a live game". Measured on RKT-005 build 2: Home showed no EN/FR and no Switch
 * player (D55: the header's row hung on an Expression Home never fed).
 *
 * One fresh Chrome per viewport, an ENGLISH player (the way Richard made his), then:
 * RKT-008 build 1 moved both into the player menu, which opens from the name; this drive opens it (AC4).
 *   homeSignal — Home's own words are on screen ("Rocket Race"): the known-firing signal beside every absence below
 *   homeLang   — Home's menu offers English and Français
 *   homeSwitch — Home's menu offers Switch player
 *   toFrench   — pressing Français there turns Home French ("Course de fusées", and "Rocket Race" gone)
 *   kept       — after a reload, Home is still French
 *   setupLang  — the race setup's menu still offers English and Français
 *   raceNoLang — inside the live race there is no EN, no FR and no Switch player (the ruling)
 *   frenchPad  — the live race's pad has "," and no "." (what Richard could not reach)
 *   quiet      — no console error
 * Usage: node scripts/devtools/drive-rkt008-home-lang.js <deploy-dir> [--only 1366x768,390x844] [--shots <dir>]
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
  console.error('usage: drive-rkt008-home-lang.js <deploy-dir> [--only 1366x768,390x844] [--shots <dir>]');
  process.exit(2);
}
const SHOTS = arg('--shots');
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const VIEWPORTS = { '1366x768': { width: 1366, height: 768, mobile: false }, '390x844': { width: 390, height: 844, mobile: true } };
const ONLY = arg('--only') ? arg('--only').split(',') : Object.keys(VIEWPORTS);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const LOOK = `(() => {
  const vis = (e) => e.getClientRects().length > 0;
  const leaf = (t) => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && vis(e) && e.textContent.trim() === t).length;
  const body = document.body.innerText;
  return {
    url: location.pathname,
    // RKT-008 build 1: the language is a pill row inside the player menu, which opens from the name.
    en: leaf('English'),
    fr: leaf('Français'),
    switchPlayer: leaf('Switch player') + leaf('Changer de joueur'),
    rocketRace: body.includes('Rocket Race'),
    courseDeFusees: body.includes('Course de fusées'),
    padKeys: [...document.querySelectorAll('[data-pad-key]')].filter(vis).map((b) => b.getAttribute('data-pad-key')).join(''),
    options: [...document.querySelectorAll('button')].filter((b) => vis(b) && !b.closest('.gk-pad') && /^[\\d\\s\\u00a0\\u202f.,/−-]+$/.test(b.innerText.trim())).length
  };
})()`;

const cells = [];

async function driveCell(vpName) {
  const vp = VIEWPORTS[vpName];
  const cell = { vp: vpName, clauses: {}, saw: {}, notes: [] };
  cells.push(cell);
  const clause = (name, ok, saw) => {
    cell.clauses[name] = ok;
    if (!ok) cell.saw[name] = saw;
  };
  await withDeployedSite({ dir: DIR }, async ({ client, evaluate, consoleErrors }) => {
    const send = (m, p) => client.send(m, p || {});
    await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
    await wait(1200);
    const click = async (label) => {
      const at = await evaluate(`(() => { const hit = [...document.querySelectorAll('*')].reverse().find((e) => e.getClientRects().length && e.innerText && e.innerText.trim() === ${JSON.stringify(label)}); if (!hit) return null; hit.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = hit.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (!at) return false;
      for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
      await wait(900);
      return true;
    };
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
    const shoot = async (name) => {
      if (!SHOTS) return;
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `rkt008-${vpName}-${name}.png`), Buffer.from(data, 'base64'));
    };

    // ── An English player, as Richard made his ──
    if (!(await click('New player'))) return cell.notes.push('no "New player" button');
    const at = await evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((i) => i.offsetParent !== null); if (!i) return null; const r = i.getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; })()`);
    if (at) for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
    await send('Input.insertText', { text: 'Léa' });
    await click('CM1');
    if (!(await click('Let’s go!'))) return cell.notes.push('no "Let’s go!" button');

    // ── Home ──
    await until((r) => r.rocketRace, 5000);
    await click('Léa');
    const home = await until((r) => r.en > 0, 3000);
    await shoot('home-en');
    clause('homeSignal', home.rocketRace, `Home never showed "Rocket Race" (${home.url})`);
    clause('homeLang', home.en > 0 && home.fr > 0, `English ${home.en}, Français ${home.fr} in Home's menu (${home.url})`);
    clause('homeSwitch', home.switchPlayer > 0, `Switch player ${home.switchPlayer} in Home's menu (${home.url})`);
    if (home.fr > 0) await click('Français');
    const french = await until((r) => r.courseDeFusees && !r.rocketRace, 4000);
    await shoot('home-fr');
    clause('toFrench', french.courseDeFusees && !french.rocketRace, `after FR on Home: "Course de fusées" ${french.courseDeFusees}, "Rocket Race" ${french.rocketRace}`);
    await send('Page.reload', {});
    await wait(3500);
    const reloaded = await until((r) => r.courseDeFusees, 5000);
    clause('kept', reloaded.courseDeFusees && !reloaded.rocketRace, `after a reload (${reloaded.url}): "Course de fusées" ${reloaded.courseDeFusees}, "Rocket Race" ${reloaded.rocketRace}`);

    // ── The race ──
    if (!(await click(reloaded.courseDeFusees ? 'Course de fusées' : 'Rocket Race'))) return cell.notes.push('no race card on Home');
    await wait(900);
    await click('Léa');
    const setup = await until((r) => r.en > 0, 3000);
    clause('setupLang', setup.en > 0 && setup.fr > 0, `English ${setup.en}, Français ${setup.fr} in the race setup's menu`);
    await click('Léa');
    await click(reloaded.courseDeFusees ? 'Entraînement' : 'Practice');
    if (!(await click(reloaded.courseDeFusees ? 'Commencer' : 'Start'))) return cell.notes.push('no Start on the setup');
    let race = await until((r) => r.padKeys || r.options, 5000);
    for (let i = 0; i < 8 && !race.padKeys; i++) {
      // An options question first: take the first option and go on until the pad shows.
      await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.getClientRects().length && !b.closest('.gk-pad') && /^[\\d\\s\\u00a0\\u202f.,/−-]+$/.test(b.innerText.trim())); if (b) b.click(); })()`);
      await wait(900);
      await click('Suivant');
      await click('Next');
      race = await until((r) => r.padKeys || r.options, 4000);
    }
    await shoot('race');
    clause('raceNoLang', race.en === 0 && race.fr === 0 && race.switchPlayer === 0, `inside the race: EN ${race.en}, FR ${race.fr}, Switch player ${race.switchPlayer}`);
    clause('frenchPad', race.padKeys.includes(',') && !race.padKeys.includes('.'), `pad keys ${JSON.stringify(race.padKeys)}`);
    clause('quiet', consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  });
}

(async () => {
  for (const vp of ONLY) await driveCell(vp);
  let failed = 0;
  for (const cell of cells) {
    const names = Object.keys(cell.clauses);
    const bad = names.filter((n) => !cell.clauses[n]);
    if (bad.length || cell.notes.length || names.length < 9) failed++;
    console.log(`\n[${bad.length || cell.notes.length || names.length < 9 ? 'FAIL' : 'pass'}] ${cell.vp} — ${names.length - bad.length}/${names.length} clauses (9 expected)`);
    for (const n of bad) console.log(`  ✗ ${n}: ${cell.saw[n]}`);
    for (const n of cell.notes) console.log(`  note: ${n}`);
  }
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} failing cells`} of ${cells.length}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
