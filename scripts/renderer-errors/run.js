#!/usr/bin/env node
/**
 * HLT-010 — the renderer-error gate.
 *
 * P99 found 264 renderer error events in 42 minutes of ordinary use while every suite was green:
 * nothing in CI read the renderer log, so a green suite and a noisy editor were compatible states.
 * This is the gate that reads it. It launches its own dev stack against a throwaway profile and a
 * COPY of a shipped template, drives the surfaces Richard's session reached, stops the stack, and
 * grades the log it wrote against `budget.json`.
 *
 *   npm run renderer-errors                         # launch, drive, grade (the CI form)
 *   npm run renderer-errors -- --log .logs/dev.log  # grade a log you already have — e.g. your own session
 *   npm run renderer-errors -- --keep               # leave the temp profile/fixture/log behind
 *   npm run renderer-errors -- --port 9123          # the editor's web server port: 0 (default), a number, or `unset`
 *
 * Exit status is the gate: 0 green, 1 an error class over budget or UNKNOWN, 2 could not measure
 * (the stack never came up, a surface was never reached, or a sentinel went missing). 🔴 Gate on
 * the exit status, never the last line.
 *
 * ## What "0" means here, and what it cannot mean
 *
 * - 🔴 **A quiet log is also what a dead instrument writes.** Three SENTINELS are fired in the
 *   renderer after the project opens — a `console.error`, an uncaught throw and a refused request —
 *   one through each writer the classifier reads. Each must come back as exactly ONE event: that
 *   proves the mirror, CDP's exception channel and CDP's network channel were all live for the
 *   window being graded, and that a doubled event is counted once
 *   ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
 * - Every surface is a REACH arm. A drive that never mounted the board reads 0 board errors.
 * - 🔴 **It drives a scripted session, so it will not find what a person finds by clicking
 *   around** ([[a-gate-that-replays-against-your-own-output-cannot-see-a-humans-input]]). It is a
 *   floor under regressions, not a replacement for somebody using the product. `--log` exists so a
 *   person's own session can be graded against the same budget.
 * - ⚠️ It reads the EDITOR's renderer. The preview's `<webview>` (the user's app) is not attached,
 *   so the runtime classes HLT-014 found (HLT-010 §2b) are outside it.
 *
 * ## Sharing a machine
 *
 * `scripts/start.ts` reaps every dev process it finds before it starts. So this refuses to launch
 * while any dev stack is up — it would kill a peer's — and says whose ([[do-not-pile-cpu-work-on-a-shared-box]]).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

const { parseLog, countEvents, grade, validateBudget, DEAD, deathReason } = require('./lib/classify');

const ROOT = path.join(__dirname, '..', '..');
const BUDGET = require('./budget.json');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const FIXTURE_SOURCE = path.join(ROOT, 'templates', opt('template', 'landing-pages'));
/** `--port 0` (default), a concrete port, or `unset` — HLT-021 AC3 drives all three. */
const LAUNCH_PORT = opt('port', '0');
const LAUNCH_TIMEOUT_MS = Number(opt('launch-timeout', 12 * 60)) * 1000;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The sentinels. Their text is what the gate looks for; nothing in the product says it. */
const SENTINEL = {
  console: 'HLT-010 SENTINEL console.error',
  uncaught: 'HLT-010 SENTINEL uncaught',
  // A refused connection is logged by Chromium's network stack, which is the `browser` writer.
  browserUrl: 'http://127.0.0.1:9/hlt-010-sentinel'
};
const STEP_MARK = '[hlt-010 step]';
const SENTINEL_RULES = [
  { id: 'sentinel/console', match: SENTINEL.console, budget: 1, reason: 'the gate’s own known-firing signal' },
  { id: 'sentinel/uncaught', match: SENTINEL.uncaught, budget: 1, reason: 'the gate’s own known-firing signal' },
  { id: 'sentinel/browser', match: 'hlt-010-sentinel', budget: 1, reason: 'the gate’s own known-firing signal' }
];

const arms = [];
function arm(name, ok, detail) {
  arms.push({ name, ok, detail });
  console.log(`${ok ? 'ok  ' : 'MISS'}  ${name}${detail !== undefined ? ` — ${detail}` : ''}`);
  return ok;
}

// ── grading ──────────────────────────────────────────────────────────────────

/** The drive step in progress at each log line, from the markers `step()` writes. */
function stepsByLine(text) {
  const out = [];
  let current = 'launch';
  text.split('\n').forEach((l, i) => {
    const at = l.indexOf(STEP_MARK);
    if (at !== -1) current = l.slice(at + STEP_MARK.length).trim();
    out[i + 1] = current;
  });
  return out;
}

function gradeLog(text, { requireSentinels }) {
  const budget = { classes: SENTINEL_RULES.concat(BUDGET.classes) };
  const counts = countEvents(parseLog(text), budget);
  const stepAt = stepsByLine(text);
  const product = {};
  for (const [id, c] of Object.entries(counts)) if (!id.startsWith('sentinel/')) product[id] = c;
  const verdict = grade(product, BUDGET);

  if (requireSentinels) {
    for (const s of SENTINEL_RULES) {
      const c = counts[s.id] || { events: 0, lines: 0 };
      arm(`sentinel ${s.id} came back as exactly one event`, c.events === 1, `${c.events} events on ${c.lines} lines`);
    }
  }

  console.log('\n── classes seen ─────────────────────────────────────────────');
  const rows = Object.entries(product).sort((a, b) => b[1].events - a[1].events);
  if (!rows.length) console.log('  (none)');
  for (const [id, c] of rows) {
    const rule = BUDGET.classes.find((r) => r.id === id);
    const tag = !rule ? 'UNKNOWN' : c.events > rule.budget ? 'OVER' : 'ok';
    console.log(`  ${tag.padEnd(7)} ${String(c.events).padStart(4)} / ${rule ? rule.budget : '-'}  ${id}`);
    if (tag !== 'ok')
      for (const s of c.samples)
        console.log(`            line ${s.line}, during "${stepAt[s.line]}" [${s.channel}${s.where ? ` ${s.where}` : ''}] ${s.message}`);
  }

  console.log('\n── the allowlist (every class with a budget above 0, and why) ──');
  for (const r of BUDGET.classes.filter((c) => c.budget > 0)) console.log(`  ${r.id} ≤ ${r.budget} — ${r.reason}`);

  return verdict;
}

function finish(verdict) {
  const missed = arms.filter((a) => !a.ok);
  if (missed.length) {
    console.log(`\nCOULD NOT MEASURE — ${missed.length} precondition(s) missed; a quiet log here proves nothing.`);
    return 2;
  }
  if (!verdict.ok) {
    for (const o of verdict.over) console.log(`\nFAIL  ${o.id}: ${o.events} events, budget ${o.budget}`);
    for (const u of verdict.unknown)
      console.log(`\nFAIL  UNKNOWN class ${u.id} (${u.events} events) — fix it, or give it a named budget with a reason in scripts/renderer-errors/budget.json`);
    return 1;
  }
  console.log('\nPASSED — every error class within budget, no unknown class.');
  return 0;
}

// ── the stack ────────────────────────────────────────────────────────────────

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

function liveDevStack() {
  try {
    return require(path.join(ROOT, 'scripts/devtools/dev-processes.js')).findDevProcesses();
  } catch (e) {
    return [];
  }
}

function buildWorkspace() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'hlt010-'));
  const profile = path.join(work, 'profile');
  const project = path.join(work, 'Renderer Error Gate');
  fs.mkdirSync(profile, { recursive: true });
  fs.cpSync(FIXTURE_SOURCE, project, { recursive: true });
  // Without this the first-run legal notice opens a native dialog over the launcher.
  fs.writeFileSync(path.join(profile, 'firstRunLegal.json'), JSON.stringify({ shown: true, version: 'hlt-010' }));
  fs.writeFileSync(
    path.join(profile, 'recently_opened_project.json'),
    JSON.stringify({
      recentProjects: [
        { retainedProjectDirectory: project, latestAccessed: Date.now(), id: 'hlt-010-gate', name: 'Renderer Error Gate', thumbURI: '' }
      ]
    })
  );
  return { work, profile, project, log: path.join(work, 'dev.log') };
}

function launch(ws, cdpPort) {
  const env = {
    ...process.env,
    NOODL_USER_DATA_DIR: ws.profile,
    NOODL_REMOTE_DEBUG_PORT: String(cdpPort),
    NOODL_DEV_LOG_FILE: ws.log,
    // The editor's project web server on whatever port the OS gives — so an installed NodeGX
    // holding 8574 cannot make this editor die at startup. 0 on purpose, not a concrete port the
    // gate picks: until HLT-021 the renderer read the REQUESTED port and dialled
    // `ws://localhost:0/` (28 events a drive), so every run of this gate also grades that fix —
    // see the HLT-021 arms in drive().
    NOODLPORT: LAUNCH_PORT
  };
  if (LAUNCH_PORT === 'unset') delete env.NOODLPORT;
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts/devtools/dev-debug.js'), '--quiet'], {
    cwd: ROOT,
    env,
    stdio: 'ignore',
    detached: true
  });
  return child;
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const gone = new Promise((r) => child.once('exit', r));
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch (e) {
    child.kill('SIGTERM');
  }
  await Promise.race([gone, wait(20000)]);
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch (e) {
    /* already gone */
  }
}

// ── the drive ────────────────────────────────────────────────────────────────

async function drive(ws, cdp) {
  const { appTarget, connect, evaluate, elementCentre, dispatchClick } = cdp;

  // Wait for the editor to exist and React to have mounted into it.
  const deadline = Date.now() + LAUNCH_TIMEOUT_MS;
  let editor = null;
  // Electron dying does not take the webpack servers with it, so the stack stays "up" with no
  // editor in it. Read the log for that, or the first run waits the whole timeout for nothing.
  while (Date.now() < deadline) {
    const sofar = fs.existsSync(ws.log) ? fs.readFileSync(ws.log, 'utf8') : '';
    if (DEAD.test(sofar) || (ws.child && ws.child.exitCode !== null)) {
      arm('the editor launched and React mounted', false, `the editor process died: ${deathReason(sofar)}`);
      return;
    }
    try {
      const target = await appTarget('editor');
      const client = await connect(target);
      const mounted = await evaluate(client, `!!(document.getElementById('root') && document.getElementById('root').children.length)`);
      if (mounted) {
        editor = client;
        break;
      }
      client.close();
    } catch (e) {
      /* not up yet */
    }
    await wait(3000);
  }
  if (!arm('the editor launched and React mounted', !!editor, editor ? '' : `none within ${LAUNCH_TIMEOUT_MS / 1000}s`)) return;

  const ev = (expr) => evaluate(editor, expr);
  // Every failure the gate prints names the step it happened in — the log carries the markers.
  const step = (name) => ev(`console.info(${JSON.stringify(`${STEP_MARK} ${name}`)})`).catch(() => {});
  const click = async (selector) => {
    const at = await elementCentre(editor, selector);
    if (!at) return false;
    await dispatchClick(editor, at);
    return true;
  };

  // A hidden or unfocused window never fires requestAnimationFrame, and a dead editor reads as a
  // quiet one. Make it active, then PROVE a frame happens.
  await editor.send('Page.enable').catch(() => {});
  await editor.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  const raf = await ev(`new Promise((r) => { const t = setTimeout(() => r(false), 3000); requestAnimationFrame(() => { clearTimeout(t); r(true); }); })`);
  arm('requestAnimationFrame fires in the driven window', raf === true);

  await ev(`(() => { if (typeof window.__wreq !== 'function') webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); return typeof window.__wreq; })()`);
  const W = (p) => `window.__wreq(${JSON.stringify(p)})`;
  const PROJECT = `${W('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
  const ED = `${W('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx')}.NodeGraphContextTmp.nodeGraph`;
  const opened = () => ev(`(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);

  await step('launcher');
  // ═ the launcher ═
  const CARD = '[data-test="launcher-project-card"]';
  let cards = 0;
  for (let i = 0; i < 20 && !cards; i++) {
    cards = await ev(`document.querySelectorAll('${CARD}').length`);
    if (!cards) await wait(1000);
  }
  arm('REACH the launcher drew the seeded project card', cards > 0, `${cards} cards`);
  // The launcher's community layer asks `/api/v1/me` on every launch with no credential — HLT-004
  // §2a's known-firing signal that the launcher's network surfaces ran at all.
  // Polled: the request is made after the grid draws, not before (0 on one run that read it at once).
  let me = 0;
  for (let i = 0; i < 15 && !me; i++) {
    me = await ev(`performance.getEntriesByType('resource').filter((e) => e.name.includes('/api/v1/me')).length`);
    if (!me) await wait(1000);
  }
  arm('REACH the launcher’s community layer ran (`/api/v1/me` requested)', me > 0, `${me} requests`);

  // ═ open the fixture the way a person does: press its card ═
  const openByCard = async () => {
    await click(CARD);
    for (let i = 0; i < 40; i++) {
      await wait(1000);
      if (path.resolve(String(await opened())) === path.resolve(ws.project)) return true;
    }
    return false;
  };
  if (!arm('REACH the fixture opened from its launcher card', await openByCard(), String(await opened()))) return;
  await wait(4000);

  await step('sentinels');
  // ═ the sentinels — one through each writer, fired while every writer should be live ═
  await ev(`(() => {
    console.error(${JSON.stringify(SENTINEL.console)});
    setTimeout(() => { throw new Error(${JSON.stringify(SENTINEL.uncaught)}); }, 0);
    fetch(${JSON.stringify(SENTINEL.browserUrl)}).catch(() => {});
    return 'fired';
  })()`);
  await wait(1500);

  const inject = opt('inject', null);
  if (inject) console.log(`injected ${inject}: ${await ev(fs.readFileSync(inject, 'utf8'))}`);

  await step('components and node selection');
  // ═ components, and nodes in each: build the property editor and tear it down ═
  // One selection per turn, from Node — ten inside one JS turn are batched by React into one
  // render and the teardown HLT-001 measured never happens (its first drive read 0 that way).
  const names = await ev(`JSON.stringify((${PROJECT}.instance.getComponents() || []).map((c) => c.fullName).slice(0, 10))`).then(JSON.parse);
  let selections = 0;
  for (const name of names) {
    await ev(`(() => {
      const { EventDispatcher } = ${W('./src/shared/utils/EventDispatcher.ts')};
      const c = ${PROJECT}.instance.getComponentWithName(${JSON.stringify(name)});
      if (c) EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
      return !!c;
    })()`);
    await wait(1000);
    const ids = await ev(`JSON.stringify((() => {
      const ed = ${ED}; if (!ed) return [];
      const all = []; const walk = (n) => { all.push(n); (n.children || []).forEach(walk); };
      (ed.roots || []).forEach(walk);
      return all.map((n) => n.model && n.model.id).filter(Boolean).slice(0, 6);
    })())`).then(JSON.parse);
    for (const id of ids) {
      const ok = await ev(`(() => {
        const ed = ${ED}; if (!ed) return false;
        const all = []; const walk = (n) => { all.push(n); (n.children || []).forEach(walk); };
        (ed.roots || []).forEach(walk);
        const node = all.find((n) => n.model && n.model.id === ${JSON.stringify(id)});
        if (!node) return false;
        ed.selectionActions ? ed.selectionActions.selectNode(node, {}) : ed.selector.selectNode(node);
        return true;
      })()`);
      if (ok) selections++;
      await wait(400);
    }
    await ev(`(() => { const ed = ${ED}; try { ed.selector && ed.selector.deselectAll && ed.selector.deselectAll(); } catch (e) {} return true; })()`);
    await wait(600);
  }
  arm('REACH components visited and nodes selected', names.length > 0 && selections > 0, `${names.length} components, ${selections} selections`);

  await step('canvas context menu');
  // ═ a context menu on the canvas, opened and dismissed ═
  for (let i = 0; i < 2; i++) {
    await ev(`(() => {
      const c = document.querySelector('.nodegraph-canvas, canvas'); if (!c) return false;
      const r = c.getBoundingClientRect();
      c.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: Math.round(r.left + r.width / 2), clientY: Math.round(r.top + r.height / 2) }));
      return true;
    })()`);
    await wait(600);
    await ev(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await wait(400);
  }

  await step('board, workbench and app preview');
  // ═ the three preview scopes. App long enough for a thumbnail tick (20 s — HLT-002's path). ═
  const scope = async (which) => {
    await click('[data-test="preview-scope-chip"]');
    await wait(800);
    const ok = await click(`[data-test="preview-scope-${which}"]`);
    await wait(1200);
    return ok;
  };
  const FRAMES = `document.querySelectorAll('[data-test^="board-frame-"]').length`;
  const board = await scope('board');
  await wait(3000);
  // A fresh profile's board is empty: put every component on it, the way a person does.
  if (!(await ev(FRAMES))) {
    (await click('[data-test="board-empty-add"]')) || (await click('[data-test="board-add"]'));
    await wait(800);
    // Three rows, one press each. Not `board-add-all`: it is offered only below ADD_ALL_LIMIT,
    // and the fixture has more components than that.
    for (let i = 0; i < 3; i++) {
      const tagged = await ev(`(() => {
        const row = [...document.querySelectorAll('[data-test^="board-pick-"]')].find((r) => r.getAttribute('aria-selected') !== 'true');
        document.querySelectorAll('[data-hlt010-pick]').forEach((r) => r.removeAttribute('data-hlt010-pick'));
        if (row) row.setAttribute('data-hlt010-pick', '1');
        return !!row;
      })()`);
      if (tagged) await click('[data-hlt010-pick]');
      await wait(1500);
    }
    await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await wait(6000);
  }
  const frames = await ev(FRAMES);
  arm('REACH the board mounted and drew frames', board && frames > 0, `${frames} frames`);
  // The Workbench: a component target from the same menu.
  await click('[data-test="preview-scope-chip"]');
  await wait(800);
  const bench = await click('[data-test^="preview-scope-target-"]');
  await wait(4000);
  arm('REACH a component was put on the Workbench', bench);
  const app = await scope('app');
  await wait(25000);
  const webview = await ev(`document.querySelectorAll('webview').length`);
  arm('REACH the app preview ran a thumbnail tick', app && webview > 0, `${webview} webviews, 25 s`);

  // ═ HLT-021 — the launch asked for port 0; every renderer surface must use the port main BOUND ═
  // Read on the surfaces themselves, not on the helper: the preview's relay socket, the canvas
  // webview's address, and the JSON inspector's image URL (rendered here — a person reaches it by
  // hovering an image-valued connection, which a scripted drive cannot find reliably).
  const ports = await ev(`JSON.stringify((() => {
    const portOf = (u) => { try { return Number(new URL(u).port) || null; } catch (e) { return null; } };
    const bound = require('@electron/remote').getGlobal('noodlBoundPort');
    const vc = ${W('./src/editor/src/ViewerConnection.ts')}.ViewerConnection.instance;
    const socket = vc && vc.ws ? { port: portOf(vc.ws.url), open: vc.ws.readyState === 1 } : null;
    const views = [...document.querySelectorAll('webview')].map((w) => w.getAttribute('src') || '').filter((u) => u.startsWith('http://localhost:'));
    return { bound, socket, canvas: views.map(portOf) };
  })())`).then(JSON.parse);
  const inspector = await ev(`new Promise((resolve) => {
    // node_modules are webpack externals in the dev build, so this is the bundle's own React.
    const React = require('react');
    const { InspectPopup } = ${W('./src/editor/src/views/nodegrapheditor/InspectJSONView/InspectPopup.tsx')};
    const { createReactRoot, unmountReactRoot } = ${W('./src/shared/utils/unmountReactRoot.ts')};
    // An inert document: no browsing context, so the <img> is built but never requested — the
    // probe must not add a 404 of its own to the log it is graded against.
    const doc = document.implementation.createHTMLDocument('hlt-021');
    const host = doc.createElement('div');
    doc.body.appendChild(host);
    const root = createReactRoot(host);
    root.render(React.createElement(InspectPopup, { debugValue: { type: 'image', value: 'hlt-021.png' }, pinned: false, onPinClicked: () => {} }));
    setTimeout(() => {
      const img = host.querySelector('img');
      const src = img ? img.getAttribute('src') : null;
      unmountReactRoot(root);
      setTimeout(() => { host.remove(); resolve(src); }, 50);
    }, 500);
  })`);
  const inspectorPort = (() => { try { return Number(new URL(inspector).port) || null; } catch (e) { return null; } })();
  const bound = ports.bound;
  const asked = LAUNCH_PORT === 'unset' ? 8574 : Number(LAUNCH_PORT);
  arm(`HLT-021 main bound a real port for NOODLPORT=${LAUNCH_PORT}`, Number.isInteger(bound) && bound > 0 && (asked === 0 || bound === asked), `bound ${bound}`);
  arm('HLT-021 REACH the preview relay socket is open on the bound port', !!ports.socket && ports.socket.open && ports.socket.port === bound, JSON.stringify(ports.socket));
  arm('HLT-021 REACH the canvas webview loads from the bound port', ports.canvas.length > 0 && ports.canvas.every((p) => p === bound), `webview ports ${JSON.stringify(ports.canvas)}`);
  arm('HLT-021 REACH the JSON inspector builds its image URL on the bound port', inspectorPort === bound, String(inspector));

  await step('save');
  // ═ save twice — the path that bracketed Richard's bursts ═
  for (let i = 0; i < 2; i++) {
    await ev(`(() => { const p = ${PROJECT}.instance; if (p && p.save) p.save(); return true; })()`);
    await wait(2000);
  }

  await step('back to the launcher and reopen');
  // ═ back to the launcher and in again — tears the whole editor down and rebuilds it ═
  const routed = await ev(`(() => {
    const root = document.getElementById('root');
    let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
    for (let d = 0; f && d < 60; d++, f = f.child) {
      const pr = f.memoizedProps;
      if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { pr.route.router.route({ to: 'projects' }); return true; }
    }
    return false;
  })()`);
  await wait(3000);
  arm('REACH back to the launcher', routed === true);
  arm('REACH the fixture reopened from its card', await openByCard());
  await wait(8000);

  editor.close();
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const problems = validateBudget(BUDGET);
  if (problems.length) {
    console.error(`budget.json is invalid:\n  ${problems.join('\n  ')}`);
    return 2;
  }

  const given = opt('log', null);
  if (given) {
    console.log(`grading ${given} (no drive, no sentinels)`);
    return finish(gradeLog(fs.readFileSync(given, 'utf8'), { requireSentinels: false }));
  }

  const live = liveDevStack();
  if (live.length) {
    console.error(
      `A dev stack is running (${live.length} processes, e.g. pid ${live[0].pid}). This gate launches its own, and\n` +
        `scripts/start.ts reaps every dev process it finds — it would kill that one. Stop it first\n` +
        `(npm run dev:stop -- --list shows whose it is), or grade its log instead with --log.`
    );
    return 2;
  }

  const ws = buildWorkspace();
  const cdpPort = await freePort();
  process.env.NOODL_REMOTE_DEBUG_PORT = String(cdpPort); // cdp.js reads this when required
  const cdp = require(path.join(ROOT, 'scripts/devtools/cdp.js'));
  console.log(`workspace ${ws.work}\nCDP port  ${cdpPort}\nfixture   ${path.relative(ROOT, FIXTURE_SOURCE)}\n`);

  const child = launch(ws, cdpPort);
  ws.child = child;
  const onSignal = async () => {
    await stop(child);
    process.exit(2);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  const started = Date.now();
  try {
    await drive(ws, cdp);
  } catch (e) {
    arm('the drive ran to the end', false, e.message.split('\n')[0]);
  } finally {
    // 🔴 Only what the SESSION wrote is graded. Stopping the stack kills the renderer, and main
    // logs that as `process gone: killed` — the gate's own act, not the product's.
    ws.gradedBytes = fs.existsSync(ws.log) ? fs.statSync(ws.log).size : 0;
    await stop(child);
  }
  console.log(`\ndrive + teardown took ${Math.round((Date.now() - started) / 1000)} s`);

  const text = fs.existsSync(ws.log) ? fs.readFileSync(ws.log).subarray(0, ws.gradedBytes).toString('utf8') : '';
  arm('the log exists and CDP attached to the editor', /\[cdp\] attached to renderer/.test(text), `${text.split('\n').length} lines`);
  const verdict = gradeLog(text, { requireSentinels: true });
  const code = finish(verdict);

  const keep = flag('keep') || code !== 0;
  if (keep) console.log(`\nlog kept: ${ws.log}`);
  else fs.rmSync(ws.work, { recursive: true, force: true });
  return code;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e);
    process.exit(2);
  }
);
