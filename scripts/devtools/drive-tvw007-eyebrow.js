#!/usr/bin/env node
/**
 * TVW-007 — the four placements of the instance count, photographed on one real canvas.
 *
 * R-Z settled the count's TEXT (`· 3×`) and left its ROW open. Asked to choose between the four
 * shapes, Richard said he would need to see them — so this drive is the question, not an argument
 * about it. It puts the same graph on screen four ways and shoots each.
 *
 * 🔴 **The heights are the finding, not the decoration.** `titlebarHeight()` fixes every
 * connection-anchor position on a card (UIX-005), so `own-row` moves the ports on every instance
 * node in the project. This run reads the real node heights back out of the model per placement,
 * so the shot Richard rules on arrives with the number beside it rather than an adjective.
 *
 * ⚠️ The per-placement counts below are read from the PRODUCT's own decision, so they describe
 * what it drew — they do not verify it. The photograph is what verifies it
 * ([[verify-the-consequence-not-just-the-mechanism]]).
 *
 * Usage:
 *   node scripts/devtools/drive-tvw007-eyebrow.js [--dir <project>] [--shots <dir>]
 *
 * Exits 0 when every graded arm passed, 2 when the instrument itself is unusable.
 */
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

/** 🔴 A COPY. Opening a project writes three files into it and dirties every component. */
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/Noodl projects/TVW-007 s20 Eyebrow');
/**
 * 33 instance nodes, 7 of them renamed (so the sub-label row that `own-row` has to sit under is on
 * screen), longest component name 26 characters, and 25 of them with a project-wide count of 10 or
 * more — chosen by census over 128 projects so that every placement's failure mode is visible in
 * one frame rather than needing four canvases.
 */
const COMPONENT = opt('component', '/Pages/Logged in/Account');
const SHOTS = opt(
  'shots',
  path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-93-three-views-of-one-app', 'verdicts', 'TVW-007')
);

const PLACEMENTS = ['hover-only', 'own-row', 'reserve-width', 'inline-if-fits'];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const BOOT = `(() => { if (typeof window.__wreq !== 'function' && typeof webpackChunknoodl_editor !== 'undefined') { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } })();`;
const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const ED = `${WREQ('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx')}.NodeGraphContextTmp.nodeGraph`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;

async function readJson(client, expression) {
  const raw = await evaluate(client, expression);
  try {
    return JSON.parse(String(raw));
  } catch (error) {
    throw new Error(`not JSON: ${String(raw).slice(0, 300)}`);
  }
}

/**
 * The cards, read off the live view objects.
 *
 * `titlebarHeight()` is called rather than trusted from a cache: it is the number under test, and
 * the whole point is whether it moved.
 */
const CARDS = `JSON.stringify((() => {
  const ed = ${ED};
  if (!ed || !ed.activeComponent) return { error: 'no active component' };
  const out = [];
  const visit = (n) => {
    out.push({
      label: typeof n.labelText === 'function' ? String(n.labelText()) : '?',
      typename: n.model && n.model.typename,
      isInstance: typeof n.isComponent === 'function' ? !!n.isComponent() : false,
      titlebar: typeof n.titlebarHeight === 'function' ? Math.round(n.titlebarHeight()) : -1,
      height: n.nodeSize ? Math.round(n.nodeSize.height) : -1,
      y: Math.round(n.global ? n.global.y : n.y)
    });
    for (const c of n.children || []) visit(c);
  };
  for (const r of ed.roots || []) visit(r);
  return {
    component: ed.activeComponent.name,
    scale: ed.getPanAndScale ? ed.getPanAndScale().scale : null,
    cards: out
  };
})())`;

/**
 * Shoot the CANVAS, not the window.
 *
 * At the editor's default size the node graph is 988×359 of a 1368×784 window — a third of the
 * frame, under a preview and a notification bar, which is a photograph of the layout rather than
 * of the thing being ruled on. The viewport override below grows it to 1220×1075 and the clip
 * throws the rest away, so all four shots are the same rectangle of the same graph and the only
 * thing that varies between them is the one thing Richard is choosing.
 */
async function shoot(client, file, clip) {
  const { data } = await client.send('Page.captureScreenshot', clip ? { format: 'png', clip } : { format: 'png' });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  return fs.statSync(file).size;
}

/**
 * 🔴 Whose editor is on 9222?
 *
 * `cdp.js` attaches to whatever holds the port and never asks. This drive spent a session driving a
 * PEER's editor for exactly that reason: its own launcher died with exit 144 (the single-instance
 * lock), the port stayed occupied by a stack another session had started, and every arm below ran
 * green against somebody else's window — opening a project in it and reloading it twice.
 *
 * A port being busy is not the same as your stack being up. So walk the Electron's PPID chain to
 * the `claude` CLI that owns it and compare that with this process's own CLI. Attribution is by
 * PPID, never by the `electron/dist` path, which every MCP server on this checkout also matches.
 */
function ownerOfPort9222() {
  const { execSync } = require('child_process');
  const sh = (cmd) => {
    try {
      return execSync(cmd, { encoding: 'utf8' }).trim();
    } catch (error) {
      return '';
    }
  };

  const pid = sh(`lsof -nP -iTCP:9222 -sTCP:LISTEN -t`).split('\n')[0];
  if (!pid) return { pid: null, owner: null };

  let p = pid;
  for (let i = 0; i < 40; i++) {
    const args = sh(`ps -o args= -p ${p}`);
    if (/anthropic\.claude-code.*\/claude/.test(args)) return { pid, owner: String(p) };
    const pp = sh(`ps -o ppid= -p ${p}`);
    if (!pp || pp === '1' || pp === p) break;
    p = pp;
  }
  return { pid, owner: null };
}

/** This process's own CLI session, by the same walk. */
function ownCli() {
  const { execSync } = require('child_process');
  const sh = (cmd) => {
    try {
      return execSync(cmd, { encoding: 'utf8' }).trim();
    } catch (error) {
      return '';
    }
  };
  let p = String(process.pid);
  for (let i = 0; i < 40; i++) {
    const args = sh(`ps -o args= -p ${p}`);
    if (/anthropic\.claude-code.*\/claude/.test(args)) return String(p);
    const pp = sh(`ps -o ppid= -p ${p}`);
    if (!pp || pp === '1' || pp === p) break;
    p = pp;
  }
  return null;
}

async function main() {
  const { pid: electronPid, owner } = ownerOfPort9222();
  const mine = ownCli();
  if (!electronPid) {
    console.error('UNGRADABLE: nothing is listening on 9222 — no editor to drive.');
    process.exit(2);
  }
  if (!owner || !mine) {
    console.error(
      `REFUSING: could not attribute the editor on 9222 (pid ${electronPid}) to a session ` +
        `(owner=${owner || 'unknown'}, self=${mine || 'unknown'}).\n` +
        'An unattributable owner is NOT an absent one — this check failed open once and drove a peer\'s editor anyway.'
    );
    process.exit(2);
  }
  if (owner !== mine) {
    console.error(
      `REFUSING: the editor on 9222 (pid ${electronPid}) belongs to session ${owner}, not to this one (${mine}).\n` +
        'Driving it would open projects in a peer\'s window and reload it under them. Start your own stack, or ask that session.'
    );
    process.exit(2);
  }
  record('the editor on 9222 belongs to this session', true, `electron ${electronPid}, owner ${owner || 'unattributable'}`);

  const editor = await connect(await appTarget('editor'));

  // 🔴 A hidden Electron window never fires rAF, so `repaint()` does nothing and every placement
  // would photograph identically — a dead instrument reporting four identical designs.
  for (const [method, params] of [
    ['Page.setWebLifecycleState', { state: 'active' }],
    ['Emulation.setFocusEmulationEnabled', { enabled: true }]
  ]) {
    try {
      await editor.send(method, params);
    } catch (error) {
      console.log(`(${method} failed: ${error.message})`);
    }
  }
  await wait(600);

  // ⚠️ The override lives on THIS connection — it is reverted the moment the client disconnects,
  // so the shots have to be taken before this script ends, on this client.
  await editor.send('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 1500,
    deviceScaleFactor: 2,
    mobile: false
  });
  await wait(1200);

  await evaluate(editor, BOOT);

  const raf = await readJson(
    editor,
    `new Promise((res) => { let n = 0; const t = () => { n++; if (n < 3) requestAnimationFrame(t); }; requestAnimationFrame(t); setTimeout(() => res(JSON.stringify({ frames: n, hidden: document.hidden })), 900); })`
  );
  record('instrument: the window is awake and rAF fires', raf.frames >= 2, `frames=${raf.frames}, hidden=${raf.hidden}`);
  if (!(raf.frames >= 2)) {
    console.error('UNGRADABLE: rAF is not firing — every shot below would be of a canvas that never repainted.');
    process.exit(2);
  }

  // --- the project -------------------------------------------------------------------------
  // The editor's router is not reachable through the module graph — it lives on a React prop, so
  // it is walked out of the fiber tree. Same door P94's drives use, for the same reason.
  const router = await evaluate(
    editor,
    `(() => {
      if (window.__tvw007Router) return 'ok';
      const root = document.getElementById('root');
      let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
      let depth = 0;
      while (f && depth < 40) {
        const pr = f.memoizedProps;
        if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__tvw007Router = pr.route.router; break; }
        f = f.child; depth++;
      }
      return window.__tvw007Router ? 'ok' : 'NO ROUTER';
    })()`
  );
  record('the editor router was found', String(router) === 'ok', String(router));
  if (String(router) !== 'ok') process.exit(2);

  const already = await evaluate(editor, `(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
  if (path.resolve(String(already)) !== path.resolve(PROJECT_DIR)) {
    console.log(`opening ${PROJECT_DIR} (editor had ${already})`);
    await evaluate(editor, `(() => { window.__tvw007Router.route({ to: 'projects' }); return 'ok'; })()`);
    await wait(1500);
    await evaluate(
      editor,
      `(async () => {
        const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
        const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
        window.__tvw007Router.route({ to: 'editor', project: p });
        return 'ok';
      })()`
    );
    await wait(12000);
  }
  const dir = await evaluate(editor, `(() => ${PROJECT}.instance ? (${PROJECT}.instance._retainedProjectDirectory || 'NONE') : 'NONE')()`);
  record('the driven project is the copy this drive names', path.resolve(String(dir)) === path.resolve(PROJECT_DIR), String(dir));

  // --- the canvas --------------------------------------------------------------------------
  // ⚠️ NOT an async IIFE inside `JSON.stringify` — that stringifies the *Promise* as `{}`, and the
  // arm then grades `undefined === true` while the navigation it was checking worked perfectly.
  // The first run of this drive failed exactly that way and reported it as a canvas that had not
  // moved ([[a-new-instruments-first-drive-finds-instrument-faults]]).
  await evaluate(
    editor,
    `(() => {
      const ed = ${ED};
      const component = ${PROJECT}.instance.getComponentWithName(${JSON.stringify(COMPONENT)});
      if (component) ed.switchToComponent(component, { pushHistory: false });
      return component ? 'ok' : 'NO SUCH COMPONENT';
    })()`
  );
  await wait(2500);
  // Read the destination back out of the editor rather than trusting the call that set it.
  const landed = await evaluate(editor, `(() => { const c = ${ED}.activeComponent; return c ? c.name : 'NONE'; })()`);
  record('the canvas is on the component with the instances', String(landed) === COMPONENT, String(landed));

  // The preview strip's notification sits over the canvas; it is about where the preview is, not
  // about anything under test, and it would be in all four frames.
  await evaluate(
    editor,
    `(() => {
      const d = document.querySelector('[data-test="preview-strip-dismiss"]');
      if (d) { d.click(); return 'dismissed'; }
      return 'nothing to dismiss';
    })()`
  );
  await wait(700);

  // 100% zoom: §2 hides the count below 75%, so a shot taken at an arbitrary leftover zoom would
  // be a shot of the zoom rule rather than of the placement.
  await evaluate(editor, `(() => { ${ED}.setPanAndScale({ x: 40, y: 40, scale: 1 }); ${ED}.repaint(); return 'ok'; })()`);
  await wait(900);

  const clip = await readJson(
    editor,
    `JSON.stringify((() => {
      const el = document.querySelector('canvas.nodegraphcanvas') || document.querySelector('canvas');
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), scale: 1 };
    })())`
  );
  record('the canvas has room to be photographed', clip.width >= 1000 && clip.height >= 700, `${clip.width}×${clip.height} CSS px`);

  // --- the four placements -----------------------------------------------------------------
  const stamp = new Date().toISOString().slice(0, 10);
  const outDir = path.join(SHOTS, stamp);
  const readings = {};

  for (const placement of PLACEMENTS) {
    // Rebuild the view, not just the paint: `own-row` changes `titlebarHeight()`, and the node
    // views cache their size at construction. Re-switching is what makes the cards re-measure.
    await evaluate(
      editor,
      `(() => {
        window.noodlInstanceEyebrowPlacement = ${JSON.stringify(placement)};
        const ed = ${ED};
        const c = ed.activeComponent;
        ed.switchToComponent(null, { pushHistory: false });
        ed.switchToComponent(c, { pushHistory: false });
        ed.setPanAndScale({ x: 40, y: 40, scale: 1 });
        ed.repaint();
        return 'ok';
      })()`
    );
    await wait(1600);

    const reading = await readJson(editor, CARDS);
    const instances = (reading.cards || []).filter((c) => c.isInstance);
    const titlebars = instances.map((c) => c.titlebar);
    readings[placement] = {
      component: reading.component,
      scale: reading.scale,
      instanceCards: instances.length,
      titlebarMin: Math.min(...titlebars),
      titlebarMax: Math.max(...titlebars),
      sample: instances.slice(0, 6).map((c) => `${c.label} (titlebar ${c.titlebar}, card ${c.height})`)
    };

    const file = path.join(outDir, `tvw007-${placement}.png`);
    const size = await shoot(editor, file, clip);
    record(`shot: ${placement}`, size > 20000, `${path.basename(file)}, ${Math.round(size / 1024)}KB, ${instances.length} instance cards, titlebar ${readings[placement].titlebarMin}–${readings[placement].titlebarMax}px`);
  }

  // The comparison that decides the cost: does the card geometry move, and by how much.
  const base = readings['hover-only'];
  for (const placement of PLACEMENTS) {
    if (placement === 'hover-only') continue;
    const r = readings[placement];
    const moved = r.titlebarMin !== base.titlebarMin || r.titlebarMax !== base.titlebarMax;
    record(
      `${placement}: card geometry vs today`,
      true,
      moved
        ? `MOVES — titlebar ${base.titlebarMin}–${base.titlebarMax} → ${r.titlebarMin}–${r.titlebarMax}px, so every port on ${r.instanceCards} cards moves`
        : `unchanged — titlebar still ${r.titlebarMin}–${r.titlebarMax}px, no port moves`
    );
  }

  // Leave the editor as it was found: the default is what ships until the verdict.
  await evaluate(editor, `(() => { delete window.noodlInstanceEyebrowPlacement; ${ED}.repaint(); return 'ok'; })()`);

  fs.writeFileSync(path.join(outDir, 'readings.json'), JSON.stringify({ project: PROJECT_DIR, component: COMPONENT, readings, arms }, null, 2));
  console.log(`\nshots + readings in ${outDir}`);

  const failed = arms.filter((a) => a.ok === false);
  console.log(`\n${arms.length - failed.length}/${arms.length} arms passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

// 🔴 Only when RUN, never when required. `node -e "require('./drive-tvw007-eyebrow.js')"` — typed as
// a syntax check — executed the whole drive against a peer's editor. A syntax check is `node --check`.
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(2);
  });
}
