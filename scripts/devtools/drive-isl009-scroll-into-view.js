#!/usr/bin/env node
/**
 * P109 ISL-009 AC2/AC4 — "Scroll Into View" on a deployed page, graded by what a person can see.
 *
 * The page is `dev-docs/tasks/phase-109-the-defects-the-island-found/isl009-scroll-into-view`, deployed with
 * `nodegx deploy`: a row of buttons at the top, 2,200 px of spacer, then three cards — one on the page itself, one
 * inside a Group scrolling the native way (200 px tall, 1,000 px of spacer above the card), one inside a Group with
 * Native Scroll off (iScroll, same shape) — and each button's `onClick` wired to one card's `scrollIntoView`. A fourth
 * button is wired to the Page's own `scrollIntoView` (Scroll Align: Start).
 *
 * Per arm, from a fresh load: read whether the card is SEEN (`elementFromPoint` at its centre, inside the viewport,
 * lands inside the card — a rect is not visibility), press the button with a real mouse event at its centre (checked
 * reachable first), wait for the smooth scroll to end, read again. The "to top" arm scrolls the window down by hand
 * first, then presses "to top" through the DOM (it has scrolled away), and reads whether the button row is seen.
 *
 * `--control` drives a copy of the deploy folder whose bundle's call to `scrollNodeIntoView` is replaced by
 * `undefined`: the wires and presses are identical, and nothing may move. Proves the instrument sees a press that
 * does nothing.
 *
 * Usage: drive-isl009-scroll-into-view.js <deploy-dir> [--control] [--width 1024] [--height 768] [--shot prefix]
 * Exits 0 when every arm reads as expected for its mode, 1 when one does not or the drive could not run, 2 on usage.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const args = process.argv.slice(2);
const flagValue = (name) => (args.indexOf(name) === -1 ? null : args[args.indexOf(name) + 1]);
const SRC = args[0];
const CONTROL = args.includes('--control');
const WIDTH = Number(flagValue('--width') || 1024);
const HEIGHT = Number(flagValue('--height') || 768);
const SHOT = flagValue('--shot');
if (!SRC || SRC.startsWith('--')) {
  console.error('usage: drive-isl009-scroll-into-view.js <deploy-dir> [--control] [--width N] [--height N] [--shot prefix]');
  process.exit(2);
}

const CALL = 'var reason = scrollNodeIntoView(node, align);';
function controlCopy(dir) {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'isl009-control-'));
  fs.cpSync(dir, copy, { recursive: true });
  const bundle = path.join(copy, 'noodl.deploy.js');
  const text = fs.readFileSync(bundle, 'utf8');
  const hits = text.split(CALL).length - 1;
  if (hits !== 1) throw new Error(`control: expected the call once in noodl.deploy.js, found ${hits}`);
  fs.writeFileSync(bundle, text.replace(CALL, 'var reason = undefined;'));
  return copy;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Whether a person can see the element: its centre is inside the viewport and the topmost hit there is inside it. */
const SEEN = (cls) => `(() => {
  const el = document.querySelector('.${cls}');
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const inViewport = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight;
  const hit = inViewport ? document.elementFromPoint(x, y) : null;
  return { found: true, seen: Boolean(hit && el.contains(hit)), top: Math.round(r.top), scrollY: Math.round(scrollY),
    nativeScrollTop: Math.round((document.querySelector('.isl009-nativeBox') || {}).scrollTop || 0),
    // iScroll moves its one scroller child with a transform, and the Group itself never scrolls natively (AC4).
    iscrollTransform: (() => { const b = document.querySelector('.isl009-iscrollBox'); const c = b && b.children[0];
      return c ? getComputedStyle(c).transform : null; })(),
    iscrollBoxScrollTop: Math.round((document.querySelector('.isl009-iscrollBox') || {}).scrollTop || 0) };
})()`;

const CENTRE = (cls) => `(() => {
  const el = document.querySelector('.${cls}');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const hit = document.elementFromPoint(x, y);
  return { x, y, reachable: Boolean(hit && el.contains(hit)) };
})()`;

async function press(client, evaluate, cls) {
  const at = await evaluate(CENTRE(cls));
  if (!at || !at.reachable) throw new Error(`the button .${cls} is not reachable: ${JSON.stringify(at)}`);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await client.send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
  }
}

const ARMS = [
  { name: 'page card (body scroll)', button: 'isl009-bPage', target: 'isl009-pageCard' },
  { name: 'card in a native-scroll Group', button: 'isl009-bNative', target: 'isl009-nativeCard' },
  { name: 'card in an iScroll Group (Native Scroll off)', button: 'isl009-bIscroll', target: 'isl009-iscrollCard' },
  { name: 'the Page itself, Scroll Align Start', scrollFirst: 2500, button: 'isl009-bTop', target: 'isl009-bTop' }
];

const DIR = CONTROL ? controlCopy(SRC) : SRC;

withDeployedSite({ dir: DIR }, async ({ client, evaluate, navigate, setViewport, consoleErrors, screenshot }) => {
  await setViewport({ width: WIDTH, height: HEIGHT });
  const results = [];
  for (const arm of ARMS) {
    await navigate('/');
    for (let i = 0; i < 20 && !(await evaluate(SEEN(arm.button))).found; i++) await wait(250);
    if (arm.scrollFirst) {
      await evaluate(`window.scrollTo(0, ${arm.scrollFirst})`);
      await wait(500);
    }
    const before = await evaluate(SEEN(arm.target));
    if (!arm.scrollFirst) await press(client, evaluate, arm.button);
    else {
      // The "to top" button scrolled away with the page; press it where the page put it is not possible, so press
      // it through the DOM — what is graded is the scroll, not the press.
      await evaluate(`document.querySelector('.${arm.button}').click()`);
    }
    await wait(1500);
    const after = await evaluate(SEEN(arm.target));
    if (SHOT) await screenshot(`${SHOT}-${results.length}.png`);
    results.push({ arm: arm.name, before, after });
  }
  return { dir: SRC, mode: CONTROL ? 'control (the call replaced by undefined)' : 'as deployed', viewport: `${WIDTH}x${HEIGHT}`, results, consoleErrors: consoleErrors.slice(0, 10) };
})
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    const ok = result.results.every((r) =>
      CONTROL ? r.before.seen === false && r.after.seen === false : r.before.seen === false && r.after.seen === true
    );
    if (CONTROL) fs.rmSync(DIR, { recursive: true, force: true });
    console.log(ok ? 'DRIVE OK' : 'DRIVE FAILED');
    process.exit(ok ? 0 : 1);
  })
  .catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  });
