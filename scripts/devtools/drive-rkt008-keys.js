#!/usr/bin/env node
/**
 * P87 RKT-008 AC7 — the on-screen keyboard follows the child's real keyboard.
 *
 * "I'm on a French keyboard on this Macbook, but the keyboard that is animated on the lesson page is qwerty" … "Either auto detect or
 * why don't we have a little dropdown next to the keyboard with like FR, UK, US or something?" — Richard, 2026-09-13
 *
 * One fresh Chrome per arm, EN 1366×768, an ENGLISH player (so the profile starts QWERTY, as Richard's did), a typing race.
 * The map is read by where its keys are drawn: on AZERTY `a` sits above `q`, on QWERTY `q` sits above `a` (`data-key`).
 *
 * Arms:
 *   detect (AC7c) — no menu, no dropdown:
 *     before     known-firing: the map is QWERTY and the store says qwerty
 *     detected   one physical press of the Q key typing "a" (a French keyboard) → the store says azerty, not picked
 *     redrawn    the map is AZERTY
 *   pick (AC7b):
 *     dropdown   a FR / UK / US dropdown is on screen beside the map, showing US
 *     picked     choosing FR → the store says azerty, picked
 *     redrawn    the map is AZERTY
 *     drills     the next typing questions drill AZERTY: over three, a q or an m and no a (QWERTY's home row has a, not q or m)
 *     override   a press of the Q key typing "q" (a QWERTY keyboard) leaves the child's FR
 *     kept       after a reload the store still says azerty, picked; a new typing race draws AZERTY and the dropdown shows FR
 *   every arm: quiet — no console error
 *
 * Usage: node scripts/devtools/drive-rkt008-keys.js <deploy-dir> [--arm detect|pick] [--shots <dir>]
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
  console.error('usage: drive-rkt008-keys.js <deploy-dir> [--arm detect|pick] [--shots <dir>]');
  process.exit(2);
}
const SHOTS = arg('--shots');
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ARMS = arg('--arm') ? [arg('--arm')] : ['detect', 'pick'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const LOOK = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const keyTop = (k) => { const e = [...document.querySelectorAll('[data-key]')].find((x) => vis(x) && x.getAttribute('data-key') === k); return e ? e.getBoundingClientRect().top : null; };
  const a = keyTop('a'), q = keyTop('q');
  const map = a === null || q === null ? null : a < q ? 'azerty' : q < a ? 'qwerty' : 'same row';
  const select = [...document.querySelectorAll('select')].find(vis) || null;
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
      if (app) { const p = app.profiles.find((x) => x.id === app.activeId); if (p) stored = { layout: p.layout, picked: p.layoutPicked === true, answered: p.model ? p.model.answered : 0 }; break; }
    }
  } catch (e) { stored = { error: String(e) }; }
  // The prompt: the largest text that is not a button's.
  let prompt = null, size = 0;
  for (const e of [...document.querySelectorAll('.ndl-visual-text')].filter(vis)) {
    if (e.closest('button') || e.closest('[data-key]')) continue;
    const f = parseFloat(getComputedStyle(e).fontSize);
    if (f > size) { size = f; prompt = e.innerText.trim(); }
  }
  const field = document.querySelector('.gk-pad input:not([disabled])');
  const fr = field ? field.getBoundingClientRect() : null;
  return {
    map, select: select ? { value: select.value, options: [...select.options].map((o) => o.textContent.trim()), x: select.getBoundingClientRect().left } : null,
    stored, prompt, field: fr ? { x: fr.left + fr.width / 2, y: fr.top + fr.height / 2 } : null,
    body: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 200)
  };
})()`;

const cells = [];

async function driveArm(arm) {
  const cell = { arm, clauses: {}, saw: {}, notes: [], reached: false };
  cells.push(cell);
  const clause = (name, ok, saw) => {
    cell.clauses[name] = !!ok;
    if (!ok) cell.saw[name] = saw;
  };
  const note = (t) => cell.notes.push(t);

  await withDeployedSite({ dir: DIR }, async ({ client, evaluate, consoleErrors }) => {
    const send = (m, p) => client.send(m, p || {});
    await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
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
    const click = async (label) => {
      const at = await evaluate(`(() => { const hit = [...document.querySelectorAll('body *')].reverse().find((e) => e.getClientRects().length && e.innerText && e.innerText.trim() === ${JSON.stringify(label)}); if (!hit) return null; hit.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = hit.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (!at) return false;
      await clickAt(at.x, at.y);
      await wait(900);
      return true;
    };
    /** One physical key: its code, and the character that keyboard types for it. */
    const press = async (code, key) => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key, text: key, unmodifiedText: key });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key });
      await wait(900);
    };
    const shoot = async (label) => {
      if (!SHOTS) return;
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `rkt008-keys-${arm}-${label}.png`), Buffer.from(data, 'base64'));
    };
    const typingRace = async () => {
      if (!(await click('Rocket Race'))) return false;
      await click('Typing');
      await click('Practice');
      if (!(await click('Start'))) return false;
      return until((r) => r.map === 'azerty' || r.map === 'qwerty', 6000);
    };
    /** Type the prompt into the pad and press Enter, wait for the grade, then Next; returns the prompt it answered. */
    const answer = async () => {
      const q = await until((r) => r.field && r.prompt, 5000);
      if (!q.field) return null;
      await clickAt(q.field.x, q.field.y);
      await send('Input.insertText', { text: q.prompt });
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await until((r) => r.stored && r.stored.answered > (q.stored ? q.stored.answered : 0), 4000);
      await click('Next');
      await wait(600);
      return q.prompt;
    };

    if (!(await click('New player'))) return note('no "New player"');
    const at = await evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((i) => i.offsetParent !== null); if (!i) return null; const r = i.getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; })()`);
    if (at) await clickAt(at.x, at.y);
    await send('Input.insertText', { text: 'Sam' });
    await click('CE2');
    if (!(await click('Let’s go!'))) return note('no "Let’s go!"');
    await wait(1500);
    const race = await typingRace();
    if (!race || !race.map) return note(`no keyboard map in a typing race — ${race && race.body}`);
    cell.reached = true;
    await shoot('before');

    if (arm === 'detect') {
      clause('before', race.map === 'qwerty' && race.stored && race.stored.layout === 'qwerty', JSON.stringify({ map: race.map, stored: race.stored }));
      await press('KeyQ', 'a');
      const after = await until((r) => r.stored && r.stored.layout === 'azerty', 4000);
      await shoot('detected');
      clause('detected', after.stored.layout === 'azerty' && after.stored.picked === false, JSON.stringify(after.stored));
      const drawn = await until((r) => r.map === 'azerty', 3000);
      clause('redrawn', drawn.map === 'azerty', JSON.stringify({ map: drawn.map }));
    }

    if (arm === 'pick') {
      clause('dropdown', race.select && race.select.value === 'qwerty' && ['FR', 'UK', 'US'].every((o) => race.select.options.includes(o)), JSON.stringify(race.select));
      if (!race.select) return note('no dropdown');
      await evaluate(`(() => { const s = [...document.querySelectorAll('select')].find((x) => x.getClientRects().length); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, 'azerty'); s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      const picked = await until((r) => r.stored && r.stored.layout === 'azerty', 4000);
      clause('picked', picked.stored.layout === 'azerty' && picked.stored.picked === true, JSON.stringify(picked.stored));
      const drawn = await until((r) => r.map === 'azerty', 3000);
      await shoot('picked');
      clause('redrawn', drawn.map === 'azerty', JSON.stringify({ map: drawn.map }));
      await answer();
      const prompts = [];
      for (let i = 0; i < 3; i++) prompts.push(await answer());
      const letters = prompts.join('');
      clause('drills', /[qm]/.test(letters) && !/a/.test(letters), JSON.stringify(prompts));
      await press('KeyQ', 'q');
      const still = await look();
      clause('override', still.stored.layout === 'azerty' && still.stored.picked === true, JSON.stringify(still.stored));
      await send('Page.reload', {});
      await wait(3500);
      const back = await look();
      await click('Home');
      await click('Accueil');
      const again = await typingRace();
      await shoot('reloaded');
      clause('kept', back.stored && back.stored.layout === 'azerty' && back.stored.picked && again && again.map === 'azerty' && again.select && again.select.value === 'azerty', JSON.stringify({ stored: back.stored, map: again && again.map, select: again && again.select }));
    }

    clause('quiet', consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 3)));
  });
}

(async () => {
  for (const arm of ARMS) await driveArm(arm);
  let failed = 0;
  for (const cell of cells) {
    const names = Object.keys(cell.clauses);
    const bad = names.filter((n) => !cell.clauses[n]);
    const ok = cell.reached && !bad.length && !cell.notes.length;
    if (!ok) failed++;
    console.log(`${cell.arm.padEnd(7)} en 1366x768  ${cell.reached ? `${names.length - bad.length}/${names.length} clauses` : 'NOT REACHED'}${bad.length ? `  failed: ${bad.join(', ')}` : ''}`);
    for (const n of bad) console.log(`    ${n}: ${cell.saw[n]}`);
    for (const n of cell.notes) console.log(`    · ${n}`);
  }
  console.log(failed === 0 ? `ALL PASS across ${cells.length} arms` : `NOT ALL PASS: ${failed} of ${cells.length} arms`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
