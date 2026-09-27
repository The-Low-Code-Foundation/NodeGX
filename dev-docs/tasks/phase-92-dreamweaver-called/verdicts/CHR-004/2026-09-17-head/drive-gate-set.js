// CHR-009 AC5 / CHR-004 — the look gate over §3.6's verdict set, on a DEV BUILD (i.e. at HEAD).
//
// Everything CHR-004 §6.3 measured came from packaged 0.2.4, which predates CHR-003, CHR-005 and
// the whole of CHR-009. Those findings are the gate working, not a defect list for this tree. This
// points the same gate — unchanged, `scripts/look-gate/run.js` shelled out per reading, so the
// instrument being run is the one 39 specs grade — at the eight node types AC1 was ruled on.
//
// 🔴 The gate connects its OWN CDP client. This driver's job is only to put the panel into the
// state each reading is about (select node N) and then hand over; it never collects or judges, so
// there is no second copy of the judgement to drift.
//
// 🔴 A node must be SELECTED and its rows must be PRESENT before the gate collects, or the gate
// reads whatever the panel was showing before and attributes it to this node. `must()` waits on the
// rows, not on a sleep.
//
// 🔴 Refuses to drive anything but a scratch copy: selecting nodes autosaves, and opening a project
// writes three files into it.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-gate-set.js --expect=<scratch copy> [--only=group,text]
//     [--state=rest|all]  (`all` forces hover/focus/active too — 4× the readings)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
const { appTarget, connect, evaluate } = require(path.join(ROOT, 'scripts/devtools/cdp.js'));

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
// 🔴 ABSOLUTE. `run.js` is spawned with `cwd: ROOT`, so a relative `--json` lands beside the repo
// root and the read-back fails with ENOENT *after* the gate has already measured — which reads as
// "the gate could not measure" when in fact only the driver could not find its own output.
const outDir = path.resolve(__dirname, opt('out', 'out'));
const EXPECT = opt('expect', '');
const ONLY = opt('only', '').split(',').filter(Boolean);
const STATE = opt('state', 'rest');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// §3.6's set, verbatim from `CHR-009/2026-09-17/set/drive-set.js` — the Group is also the TabGroup
// node (per-edge borders, corner radii) and the Button is the PopoutGroup node (Label Text Style).
const TARGETS = [
  { label: 'group', type: 'Group' },
  { label: 'text', type: 'Text' },
  { label: 'image', type: 'Image' },
  { label: 'function', type: 'JavaScriptFunction' },
  { label: 'query-records', type: 'DbCollection2' },
  { label: 'columns', type: 'net.noodl.visual.columns' },
  { label: 'states', type: 'States' },
  { label: 'button-popout', type: 'net.noodl.controls.button' }
].filter((t) => !ONLY.length || ONLY.includes(t.label));

const P = `document.querySelector('.sidebar-property-editor')`;
const mod = (p) => `window.webpackChunknoodl_editor && (() => { let m; window.webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { m = r; }]); return m(Object.keys(m.m).find((k) => k.includes(${JSON.stringify(p)}))); })()`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget('editor'));
  const ev = (expr) => evaluate(client, expr);
  const must = async (expr, ms, what) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await ev(expr)) return true;
      await sleep(500);
    }
    throw new Error(`timed out waiting for ${what}`);
  };

  // A reload leaves the editor on the LAUNCHER: `__nodeGraphEditor` never appears until the card
  // is clicked again.
  if (!(await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent && window.__nodeGraphEditor.getActiveComponent())`))) {
    await must(`[...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].length > 0`, 600000, 'launcher');
    await sleep(2500);
    const clicked = await ev(`(() => { const c = [...document.querySelectorAll('[class*="LauncherCard-module__Card"]')][0]; if (!c) return false; c.click(); return true; })()`);
    if (!clicked) throw new Error('no project card to open');
  }
  await must(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`, 180000, 'editor');
  await sleep(4000);

  const dir = await ev(`${mod('models/projectmodel.ts')}.ProjectModel.instance._retainedProjectDirectory`);
  console.log('project:', dir);
  if (!EXPECT || dir !== EXPECT) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);

  await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName('/App'), { pushHistory: false }); })()`);
  await sleep(3000);

  const results = {};
  let totalFindings = 0;
  let totalGraded = 0;

  for (const t of TARGETS) {
    const id = `chr004-gate-${t.label}`;
    const added = await ev(`(() => {
      const ed = window.__nodeGraphEditor; const c = ed.getActiveComponent().owner.getComponentWithName('/App');
      if (c.graph.findNodeWithId('${id}')) return 'existing';
      const { NodeGraphNode } = ${mod('models/nodegraphmodel/NodeGraphNode.ts')};
      c.graph.addRoot(NodeGraphNode.fromJSON({ type: '${t.type}', id: '${id}', x: 1200, y: 40 }));
      return 'added';
    })()`);
    await must(`!!window.__nodeGraphEditor.findNodeWithId('${id}')`, 20000, 'view node for ' + id);
    const sel = await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId('${id}'); ed.selectNode(n); return n.model.type.name; })()`);
    // 🔴 The rows, not a sleep: without this the gate can collect the PREVIOUS node's panel and
    // report it under this node's name.
    await must(`!!${P} && !!${P}.querySelector('.property-group, .property-panel-row, [class*="PropertyPanelInput-module__Root"]')`, 30000, 'panel rows for ' + t.label);
    await sleep(1500);
    const rows = await ev(`${P}.querySelectorAll('[class*="PropertyPanelInput-module__Root"], .property-panel-row').length`);
    console.log(`\n=== ${t.label} (${t.type}) ${added}, selected ${sel}, ${rows} rows ===`);

    // The gate itself, unchanged and out of process. It sets the theme, forces the states, collects
    // in the renderer and judges in Node; its exit status is the gate.
    const json = path.join(outDir, `gate-${t.label}.json`);
    let status = 0;
    let log = '';
    try {
      log = execFileSync(
        process.execPath,
        [path.join(ROOT, 'scripts/look-gate/run.js'), '--surface=property-panel', '--theme=both', `--state=${STATE}`, `--json=${json}`],
        { cwd: ROOT, env: { ...process.env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch (e) {
      status = e.status === undefined ? 2 : e.status;
      log = `${e.stdout || ''}${e.stderr || ''}`;
    }
    process.stdout.write(log);
    fs.writeFileSync(path.join(outDir, `gate-${t.label}.log`), log);
    // 🔴 Gate on the exit status, never on the last line of the log. 2 = could not measure at all,
    // which is a failure of the RUN and must never be summarised as "no findings".
    if (status === 2) throw new Error(`the gate could not measure ${t.label} — see gate-${t.label}.log`);

    const readings = JSON.parse(fs.readFileSync(json, 'utf8'));
    const findings = readings.reduce((s, r) => s + r.findings.length, 0);
    const graded = readings.reduce((s, r) => s + Object.values(r.population.graded).reduce((a, b) => a + b, 0), 0);
    totalFindings += findings;
    totalGraded += graded;
    results[t.label] = {
      type: t.type,
      rows: Number(rows),
      exit: status,
      findings,
      graded,
      byRule: readings.reduce((acc, r) => {
        for (const f of r.findings) acc[f.rule] = (acc[f.rule] || 0) + 1;
        return acc;
      }, {}),
      detail: readings.map((r) => ({
        theme: r.meta.theme,
        state: r.meta.state,
        findings: r.findings.map((f) => ({ rule: f.rule, element: f.element, value: f.value, detail: f.detail }))
      }))
    };
  }

  fs.writeFileSync(path.join(outDir, 'gate-set-results.json'), JSON.stringify(results, null, 2));
  console.log('\n──────── CHR-009 AC5 · the look gate over §3.6, dev build, state=' + STATE + ' ────────');
  for (const [label, r] of Object.entries(results)) {
    console.log(
      `${label.padEnd(15)} rows ${String(r.rows).padStart(3)}  graded ${String(r.graded).padStart(5)}  findings ${String(r.findings).padStart(3)}  ${JSON.stringify(r.byRule)}`
    );
  }
  console.log(`\nTOTAL: ${totalFindings} finding(s) over ${totalGraded} reading(s), ${Object.keys(results).length} nodes × 2 themes`);
  console.log('wrote', outDir);
  // 🔴 A gate that graded nothing is not a gate that passed.
  if (!totalGraded) process.exit(2);
  process.exit(totalFindings ? 1 : 0);
})().catch((e) => {
  console.error('FAILED', e.stack || e.message);
  process.exit(2);
});
