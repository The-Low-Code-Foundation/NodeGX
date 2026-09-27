#!/usr/bin/env node
/**
 * TPL-006 §9b — play the DEPLOYED story engine in a real browser, and grade it.
 *
 * This drives the output of the shipped deploy engine, not `render-from-disk`'s
 * reconstruction of the export contract. That distinction is the whole point
 * here: AC7 asks whether the thing a person deploys works, and only one of the
 * two instruments has been through `Exporter.exportToJSON`.
 *
 * It is also the control for the three wires the `deploy-from-disk` devtool's
 * health census reports as dropped (D52). All three are the one `For Each`'s
 * item ports — `itemOutput-goto`, `itemOutput-gives`, `itemOutputSignal-picked`
 * — and all three are on the click path of a choice, so a run that takes a
 * `gives` choice and then reads a `requires` choice cannot pass without them.
 *
 * ## 🔴 Two traps this script exists to stop the next person paying for
 *
 * 1. **The choice rows are `Group`s carrying `cssClassName: "story-choice"`,
 *    not `<button>`s.** A drive selecting `button` finds only *Start again* and
 *    *Write your own story*, reports `NOT FOUND` on every choice, and reads
 *    every screen as identical — which is indistinguishable from a template
 *    whose clicks are dead. A drive that finds nothing has two explanations and
 *    the instrument is the likelier one.
 * 2. **Both halves of the `requires` pair have to be read.** Present-after
 *    alone grades nothing: a choice that was always there passes it. The second
 *    arm is reached by a full page navigation so the app-wide `Variable`s reset
 *    and the only difference between the arms is the `gives` choice.
 *
 * 🔴 **ARM A's pass is worthless on its own, and it passed on the broken build.**
 * Run against a deploy with the three item-port wires missing, the reader never
 * leaves the first passage — so the gallery is never reached, the `requires`
 * choice is absent for the wrong reason, and the absence assertion goes green.
 * An absence is only evidence beside a signal known to fire, and here that
 * signal is ARM B. Read the pair, never ARM A alone.
 *
 * ⚠️ That negative control is also what says this gate can fail at all: it
 * scores **9/16 and exits 1** on the devtool's build and **16/16** on the
 * shipped engine's, from the same project. And it does it with **0 console
 * errors** — three dropped wires render perfectly and say nothing.
 *
 * Clicks are real CDP mouse events at the element's own centre, and
 * `elementFromPoint` checks nothing is on top of it first — `el.click()` proves
 * a handler is bound, not that a person can reach it.
 *
 * Usage:
 *   node scripts/devtools/deploy-from-disk.cjs <project> --out /tmp/story   # or the shipped engine
 *   node scripts/devtools/drive-tpl006-story.js /tmp/story [--shots <dir>] [--path <urlPath>]
 *   node scripts/devtools/drive-tpl006-story.js https://nodegx.io --path /templates/story-engine/
 *
 * 🔴 `--path` is for a deploy built with `--base-url /templates/<slug>/`, which is how
 * nodegx.io serves its template demos. Point the directory at the SITE ROOT and the path at
 * the sub-directory: served at `/` instead, such a build asks for
 * `/templates/<slug>/index-<hash>.js`, gets the server's 404 page, and renders **blank** —
 * and a blank page is the one failure this gate's clauses cannot tell apart from a bad
 * selector. Both are covered: every clause fails together.
 *
 * Exits 0 when every clause passed, 1 when any did — it is a gate, not a
 * report, so a silent failure is not one of its outcomes.
 */
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const shotsFlag = process.argv.indexOf('--shots');
const SHOTS = shotsFlag === -1 ? null : process.argv[shotsFlag + 1];
const pathFlag = process.argv.indexOf('--path');
/** Where the app lives under the served root. Trailing slash, because it is a directory. */
const BASE = pathFlag === -1 ? '/' : process.argv[pathFlag + 1].replace(/\/?$/, '/');

if (!DIR) {
  console.error('usage: drive-tpl006-story.js <deploy-dir> [--shots <dir>]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The reading page as text: the choices on offer, the buttons, and the body. */
const READ = `(() => {
  const choices = [...document.querySelectorAll('.story-choice')]
    .map((e) => e.innerText.replace(/^→\\s*/, '').trim());
  const buttons = [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean);
  return { choices, buttons, text: document.body.innerText };
})()`;

/** Where is it, and is anything on top of it? */
const LOCATE = (label) => `(() => {
  const rows = [...document.querySelectorAll('.story-choice')];
  const btns = [...document.querySelectorAll('button')];
  const hit =
    rows.find((e) => e.innerText.replace(/^→\\s*/, '').trim() === ${JSON.stringify(label)}) ||
    btns.find((b) => b.innerText.trim() === ${JSON.stringify(label)});
  if (!hit) return { found: false };
  const r = hit.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return { found: true, x, y, reachable: hit === top || hit.contains(top), onTop: top && String(top.className) };
})()`;

const GALLERY = 'Take the stairs to the gallery';
const GIVES = 'Read the log';
const REQUIRES = 'Light the oil lamp first, then take the north stair';
const CARRIED = 'what Aldis wrote';
const EMPTY_CARRY = 'Nothing yet.';

const results = [];
const check = (name, ok, saw) => {
  results.push({ name, ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${saw}`}`);
};

// A URL drives the LIVE host; a path drives a folder served from disk here.
const LIVE = /^https?:\/\//.test(DIR || '');
withDeployedSite(LIVE ? { origin: DIR } : { dir: DIR, port: 0 }, async (page) => {
  const snap = async (name) => {
    const r = await page.evaluate(READ);
    if (SHOTS) await page.screenshot(path.join(SHOTS, name + '.png'));
    return r;
  };
  const click = async (label) => {
    const at = await page.evaluate(LOCATE(label));
    if (!at.found) return false;
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.client.send('Input.dispatchMouseEvent', {
        type,
        x: Math.round(at.x),
        y: Math.round(at.y),
        button: 'left',
        clickCount: 1
      });
    }
    if (!at.reachable) console.warn(`  ⚠ "${label}" was clicked THROUGH a blocker (${at.onTop})`);
    await wait(700);
    return true;
  };

  await page.setViewport({ width: 1100, height: 1400 });
  if (BASE !== '/') {
    await page.navigate(BASE);
    await wait(400);
  }
  await wait(800);

  const first = await snap('1-first-load');
  check('the story opens on its first passage, with its choices', first.choices.length === 3, JSON.stringify(first.choices));
  check('the reader starts carrying nothing', first.text.includes(EMPTY_CARRY), 'no empty-carry line');

  // ARM A — the requires choice must be ABSENT before.
  await click(GALLERY);
  const armA = await snap('2-gallery-carrying-nothing');
  check('a choice moves passages (itemOutput-goto)', armA.choices.length > 0 && !armA.choices.includes(GIVES), JSON.stringify(armA.choices));
  check('ARM A — the `requires` choice is ABSENT carrying nothing', !armA.choices.includes(REQUIRES), JSON.stringify(armA.choices));

  // ARM B — same passage, the gives choice the only variable. Navigate to reset the Variables.
  await page.navigate(BASE);
  await wait(1000);
  await click(GIVES);
  const gave = await snap('3-after-the-gives-choice');
  check('a `gives` choice puts the thing in the inventory (itemOutput-gives)', gave.text.includes(CARRIED), 'inventory unchanged');
  check('and the empty-state line is gone', !gave.text.includes(EMPTY_CARRY), 'empty-carry line still there');

  await click(GALLERY);
  const armB = await snap('4-gallery-carrying-it');
  check('ARM B — the `requires` choice is PRESENT once carrying it', armB.choices.includes(REQUIRES), JSON.stringify(armB.choices));
  check('and it is the ONLY difference between the arms', armB.choices.length === armA.choices.length + 1, `${armA.choices.length} vs ${armB.choices.length}`);

  await click(REQUIRES);
  const ending = await snap('5-the-gated-ending');
  check('the gated ending is reachable, and it offers no choices', ending.choices.length === 0, JSON.stringify(ending.choices));
  check('an ending says so', /AN ENDING/i.test(ending.text), 'no ending eyebrow');
  check('an ending offers a restart', ending.buttons.includes('Start again'), JSON.stringify(ending.buttons));

  await click('Start again');
  const restarted = await snap('6-after-restart');
  check('a restart returns to the first passage', restarted.choices.length === 3, JSON.stringify(restarted.choices));
  check('a restart clears the inventory', restarted.text.includes(EMPTY_CARRY) && !restarted.text.includes(CARRIED), 'inventory survived the restart');

  await click('Write your own story');
  await wait(1000);
  const box = await page.evaluate(
    `(() => { const t = document.querySelector('textarea'); return t ? { chars: t.value.length, head: t.value.slice(0, 40) } : null; })()`
  );
  if (SHOTS) await page.screenshot(path.join(SHOTS, '7-remix.png'));
  check('the remix box opens holding the story that is playing', Boolean(box && box.chars > 1000 && box.head.includes('"id"')), JSON.stringify(box));

  check('no console errors', page.consoleErrors.length === 0, JSON.stringify(page.consoleErrors.slice(0, 3)));
  check('no network errors', page.networkErrors.length === 0, JSON.stringify(page.networkErrors.slice(0, 3)));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} clauses passed`);
  if (failed.length) process.exitCode = 1;
}).catch((e) => {
  console.error((e && e.stack) || String(e));
  process.exit(1);
});
