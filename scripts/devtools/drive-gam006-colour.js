#!/usr/bin/env node
/**
 * P88 GAM-006 AC3 + AC5 + AC6 — does a colour a States node switches REACH the deployed page, and glide there?
 *
 * Two instruments, read together, because each alone lies:
 *
 *   publishes — every value a States node publishes for a colour, recorded at the source. The hook is on
 *               the prototype that owns `flagOutputDirty`, so a node created after it (a remounted
 *               passage) is still recorded. Each value is judged by `CSS.supports('color', v)`. This is
 *               AC3's "every frame is a valid CSS colour", and it sees the frames a browser throws away.
 *   screen    — the element's computed colour, sampled every animation frame. A browser rejects an
 *               invalid colour and keeps what it drew last, so this is what a person sees. A glide is
 *               three or more distinct colours; a jump is two; "never arrives" is one.
 *
 * 🔴 The screen instrument cannot tell a States glide from a CSS one. `landing-pages`' `.pill` carries a
 * 150 ms CSS transition on background, border and colour, so there a jump at the end ALSO reads as a
 * handful of in-between colours. Where the element has a CSS transition, only `publishes` discriminates.
 *
 * The known-firing signal beside every colour reading is a string or a label on the same page: the pill a
 * person clicked, the passage's eyebrow text, the banner headline.
 *
 * It grades nothing on its own. Run it on a deploy folder, then on the same folder with only
 * `noodl.deploy.js` swapped, and compare: that is the control pair.
 *
 * Usage:
 *   drive-gam006-colour.js pill   <landing-pages deploy>                   click a FilterPill
 *   drive-gam006-colour.js story  <story-engine deploy, psLook transitions on>   write `storyAt` to an ending
 *   drive-gam006-colour.js pixel  <pixel-game deploy>                      set the banner/board `currentState`
 *   drive-gam006-colour.js rocket <rocket-school deploy> --label <choice> [--pre <label>]...
 *   every mode takes [--json out.json]
 *
 * Exits 0 after printing its readings; 2 on a usage error; 1 when the drive itself could not run
 * (no runtime found, no element found). It is a reader, not a gate: the verdict is the pair.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const MODE = process.argv[2];
const DIR = process.argv[3];
const argOf = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};
const argsOf = (name) => process.argv.flatMap((a, i) => (a === name ? [process.argv[i + 1]] : []));
const JSON_OUT = argOf('--json');
const MODES = { pill: ['bg', 'fg', 'edge'], story: ['rule', 'tone'], pixel: ['tone', 'edge'], rocket: ['bg', 'fg', 'edge'] };
if (!MODES[MODE] || !DIR || (MODE === 'rocket' && !argOf('--label'))) {
  console.error('usage: drive-gam006-colour.js pill|story|pixel|rocket <deploy-dir> [--label <choice>] [--pre <label>]... [--json out.json]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Colour value names this drive watches, per States node. */
const WATCH = MODES[MODE];

/**
 * Install the publish recorder. 🔴 There is no runtime global: walk a rendered element's React fiber up
 * to the `noodlRuntime` prop.
 */
const INSTALL = `(() => {
  const WATCH = ${JSON.stringify(WATCH)};
  let rt = null;
  for (const el of document.querySelectorAll('body *')) {
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
    if (!key) continue;
    for (let f = el[key]; f && !rt; f = f.return) if (f.memoizedProps && f.memoizedProps.noodlRuntime) rt = f.memoizedProps.noodlRuntime;
    if (rt) break;
  }
  if (!rt) return { ok: false, why: 'no noodlRuntime on any fiber' };
  const nodes = rt.rootComponent.nodeScope.getAllNodesRecursive();
  const states = nodes.filter((n) => n._internal && n._internal.currentValues && WATCH.some((w) => w in n._internal.currentValues));
  window.__gam006 = Object.assign(window.__gam006 || { rec: [], recording: false }, { states });
  // A page that has not reached the node yet (Rocket School opens on its profiles) is not a failure:
  // \`rocket\` installs again after its \`--pre\` clicks and requires the nodes there.
  if (!states.length) return { ok: ${MODE === 'rocket'}, why: 'no States node carries ' + WATCH.join('/'), nodes: nodes.length, statesNodes: 0 };
  let proto = Object.getPrototypeOf(states[0]);
  while (proto && !Object.prototype.hasOwnProperty.call(proto, 'flagOutputDirty')) proto = Object.getPrototypeOf(proto);
  if (!proto) return { ok: false, why: 'no prototype owns flagOutputDirty' };
  // 🔴 Patch ONCE. A second install would wrap the wrapper and record every publish twice.
  if (!proto.__gam006Patched) {
    const ids = new WeakMap();
    let next = 0;
    const orig = proto.flagOutputDirty;
    proto.flagOutputDirty = function (name) {
      const g = window.__gam006;
      if (g.recording && WATCH.includes(name) && this._internal && this._internal.currentValues) {
        if (!ids.has(this)) ids.set(this, next++);
        const v = this._internal.currentValues[name];
        g.rec.push({ t: performance.now(), node: ids.get(this), name, v: typeof v === 'string' ? v : JSON.stringify(v) });
      }
      return orig.apply(this, arguments);
    };
    proto.__gam006Patched = true;
  }
  return { ok: true, nodes: nodes.length, statesNodes: states.length };
})()`;

/**
 * Sample, every frame for \`ms\`, the props each finder's element carries. Finders are re-run every frame,
 * because a remounted passage or a banner that mounts on the state change is a NEW element. Starts the
 * publish recorder too, so both instruments share t0. Call it BEFORE the action.
 */
const SAMPLE = (finders, ms) => `(() => {
  const finders = { ${Object.entries(finders)
    .map(([k, f]) => `${JSON.stringify(k)}: { find: ${f.find}, props: ${JSON.stringify(f.props)} }`)
    .join(', ')} };
  const out = (window.__gam006.samples = []);
  const t0 = performance.now();
  window.__gam006.rec = [];
  window.__gam006.recording = true;
  window.__gam006.t0 = t0;
  const tick = () => {
    const row = { t: performance.now() - t0 };
    for (const [k, f] of Object.entries(finders)) {
      const el = f.find();
      for (const p of f.props) row[k + '.' + p] = el ? getComputedStyle(el)[p] : null;
      if (f.props.includes('text')) row[k + '.text'] = el ? el.innerText.trim() : null;
    }
    out.push(row);
    if (performance.now() - t0 < ${ms}) requestAnimationFrame(tick);
    else window.__gam006.recording = false;
  };
  requestAnimationFrame(tick);
  return true;
})()`;

/** Judge what was recorded. Values resolve through an ATTACHED probe element so tokens compare as colours. */
const READOUT = `(() => {
  const g = window.__gam006;
  const probe = document.createElement('div');
  document.body.appendChild(probe);
  const resolve = (v) => { probe.style.color = ''; probe.style.color = v; return getComputedStyle(probe).color; };
  const rec = g.rec.map((r) => ({ ...r, t: Math.round(r.t - g.t0), valid: CSS.supports('color', r.v) }));
  // ⚠️ The probe stays attached until every value is resolved: a detached element's computed colour is
  // '', which read every glide as ONE distinct colour.
  const byKey = {};
  for (const r of rec) (byKey[r.node + ':' + r.name] = byKey[r.node + ':' + r.name] || []).push(r);
  const series = Object.entries(byKey).map(([k, rs]) => ({
    key: k,
    frames: rs.length,
    invalid: rs.filter((r) => !r.valid).length,
    first: rs[0].v,
    last: rs[rs.length - 1].v,
    distinctResolved: new Set(rs.filter((r) => r.valid).map((r) => resolve(r.v))).size,
    sampleInvalid: (rs.find((r) => !r.valid) || {}).v || null
  }));
  probe.remove();
  const screen = {};
  for (const p of Object.keys((g.samples && g.samples[0]) || {}).filter((p) => p !== 't')) {
    const seq = g.samples.map((s) => s[p]);
    const distinct = [...new Set(seq)];
    screen[p] = { samples: seq.length, distinct: distinct.length, first: seq[0], last: seq[seq.length - 1], through: distinct.slice(1, -1).slice(0, 3) };
  }
  return { series, screen };
})()`;

async function clickAt(page, locateSrc) {
  const at = await page.evaluate(locateSrc);
  if (!at || !at.found) return at;
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
  }
  return at;
}

/** The OUTERMOST visible element whose whole text is `label` and that draws a border, else the outermost. */
const FIND_LABELLED = (label) => `() => {
  const all = [...document.querySelectorAll('body *')].filter((e) => e.getClientRects().length && e.innerText && e.innerText.replace(/^→\\s*/, '').trim() === ${JSON.stringify(label)});
  const outer = all.filter((e) => !all.some((o) => o !== e && o.contains(e)));
  const bordered = all.filter((e) => parseFloat(getComputedStyle(e).borderTopWidth) > 0);
  return bordered[0] || outer[0] || null;
}`;

const LOCATE = (label) => `(() => {
  const hit = (${FIND_LABELLED(label)})();
  if (!hit) return { found: false };
  hit.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = hit.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return { found: true, x, y, reachable: hit === top || hit.contains(top) };
})()`;

async function pill(page) {
  const LABEL = 'The second kind of work';
  const findPill = `() => [...document.querySelectorAll('.pill')].find((e) => e.innerText.trim() === ${JSON.stringify(LABEL)})`;
  if (!(await page.evaluate(`!!(${findPill})()`))) throw new Error('no .pill labelled ' + LABEL);
  await page.evaluate(SAMPLE({ pill: { find: findPill, props: ['backgroundColor', 'borderTopColor'] } }, 1200));
  const clicked = await clickAt(page, LOCATE(LABEL));
  await wait(1500);
  return { clicked, ...(await page.evaluate(READOUT)) };
}

async function story(page) {
  // 🔴 No clicks. The `deploy-from-disk` build drops `/Pages/Read`'s three choice wires (D52:
  // `itemOutput-goto`, `itemOutput-gives`, `itemOutputSignal-picked`), so no choice moves a passage
  // and a clicked walk reads a page that never changed, in both arms alike. The drive writes the
  // story's own `storyAt` Variable instead, which is what a choice's `Set Variable` writes.
  const goTo = async (id) => {
    const ok = await page.evaluate(
      `(() => { if (!window.Noodl || !Noodl.Variables) return false; Noodl.Variables.storyAt = ${JSON.stringify(id)}; return true; })()`
    );
    await wait(900);
    return { goTo: id, ok };
  };
  const findEyebrow = `() => [...document.querySelectorAll('.ndl-visual-text')].find((e) => /^(you are here|an ending)$/i.test(e.innerText.trim()))`;
  const findWrap = `() => { let w = (${findEyebrow})(); while (w && w !== document.body && parseFloat(getComputedStyle(w).borderLeftWidth) === 0) w = w.parentElement; return w && w !== document.body ? w : null; }`;
  const walked = [await goTo('gallery')];
  await page.evaluate(SAMPLE({ eyebrow: { find: findEyebrow, props: ['color', 'text'] }, passage: { find: findWrap, props: ['borderLeftColor'] } }, 1500));
  walked.push(await goTo('ending-light'));
  await wait(1200);
  return { walked, ...(await page.evaluate(READOUT)) };
}

async function pixel(page) {
  // 🔴 Not a person's move. A hit and a death need an enemy to reach the player; a random walk is not a
  // drive. The page's own States nodes are handed the state their gates would send: the `to-<state>`
  // signal and a written `currentState` both call `scheduleGoToState` (`states.ts`), so the colour path
  // is the one a real hit takes.
  const findBoard = `() => document.querySelector('.game-board')`;
  const findTitle = `() => [...document.querySelectorAll('h2')].find((e) => e.getClientRects().length && e.innerText.trim() === 'They got you.')`;
  if (!(await page.evaluate(`!!(${findBoard})()`))) throw new Error('no .game-board on the page');
  await page.evaluate(SAMPLE({ board: { find: findBoard, props: ['borderTopColor'] }, title: { find: findTitle, props: ['color', 'text'] } }, 1500));
  // 🔴 The WIRED signal, not `currentState`: neither node has a `currentState` wire or parameter, so that
  // input is never registered and `setInputValue` on it does nothing (the first run read nothing in all
  // three arms, the headline included). `to-dead`/`to-died` are wired from the gates, so they exist.
  const set = await page.evaluate(FIRE([
    { has: 'edge', signal: 'to-dead' },
    { has: 'tone', signal: 'to-died' }
  ]));
  await wait(1800);
  return { set, ...(await page.evaluate(READOUT)) };
}

/**
 * Fire a `to-<state>` signal input on every recorded States node carrying a value name. The input is
 * edge-triggered (`EdgeTriggeredInput`), so it is set true and then back to false. Reports, per target,
 * how many nodes carried the value and how many had the input registered: a zero there is the instrument.
 */
const FIRE = (targets) => `(() => {
  const s = window.__gam006.states;
  return ${JSON.stringify(targets)}.map(({ has, signal, onlyIn }) => {
    const nodes = s.filter((n) => has in n._internal.currentValues && (!onlyIn || n._internal.currentState === onlyIn));
    let fired = 0;
    for (const n of nodes) {
      if (!n.hasInput(signal)) continue;
      n.setInputValue(signal, true);
      n.setInputValue(signal, false);
      fired++;
    }
    return { has, signal, nodes: nodes.length, fired };
  });
})()`;

async function rocket(page) {
  const pre = [];
  for (const label of argsOf('--pre')) {
    pre.push({ label, ...(await clickAt(page, LOCATE(label))) });
    await wait(1200);
  }
  // `--set name=<json>` writes an app Variable, for a screen this build cannot open by its own click.
  // ⚠️ In the `deploy-from-disk` build of Rocket School, *New player* is a reachable BUTTON and clicking it
  // changes nothing on the page, with no console error. Not attributed here.
  for (const pair of argsOf('--set')) {
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq);
    const value = JSON.parse(pair.slice(eq + 1));
    const ok = await page.evaluate(
      `(() => { if (!window.Noodl || !Noodl.Variables) return false; Noodl.Variables[${JSON.stringify(name)}] = ${JSON.stringify(value)}; return true; })()`
    );
    pre.push({ set: name, value, ok });
    await wait(1500);
  }
  // Re-install: a page change can build new nodes, and the recorder counts what exists at install.
  const reinstalled = await page.evaluate(INSTALL);
  const LABEL = argOf('--label');
  if (!(await page.evaluate(`!!(${FIND_LABELLED(LABEL)})()`))) throw new Error('no element labelled ' + LABEL + ' after ' + JSON.stringify(pre));
  await page.evaluate(SAMPLE({ choice: { find: FIND_LABELLED(LABEL), props: ['backgroundColor', 'borderTopColor', 'color'] } }, 1200));
  // 🔴 Not a click. The `deploy-from-disk` build drops `/Game/Choice row`'s For Each item-port wires
  // (D52), so a picked choice never becomes selected in any arm. Every Choice's States node is handed
  // the `to-on` signal its `chIsOn` Condition sends when a choice is selected: the same
  // `scheduleGoToState`, on every pill on the screen, the labelled one among them.
  const fired = await page.evaluate(FIRE([{ has: 'bg', signal: 'to-on' }]));
  await wait(1500);
  return { pre, reinstalled, fired, ...(await page.evaluate(READOUT)) };
}

withDeployedSite({ dir: DIR, port: 0 }, async (page) => {
  await page.setViewport({ width: 1100, height: 1400 });
  await wait(800);
  const bundle = await page.evaluate(
    `fetch('noodl.deploy.js').then((r) => r.text()).then((t) => ({ bytes: t.length, reader: t.includes('states/unreadable-color') }))`
  );
  const installed = await page.evaluate(INSTALL);
  if (!installed || !installed.ok) {
    console.error('INSTALL failed: ' + JSON.stringify(installed));
    process.exitCode = 1;
    return;
  }
  const reading = await { pill, story, pixel, rocket }[MODE](page);
  const out = { mode: MODE, dir: DIR, bundle, installed, ...reading, consoleErrors: page.consoleErrors, networkErrors: page.networkErrors };
  console.log(JSON.stringify(out, null, 1));
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
}).catch((e) => {
  console.error((e && e.stack) || String(e));
  process.exit(1);
});
