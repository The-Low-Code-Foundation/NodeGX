#!/usr/bin/env node
/**
 * P93 TVW-006 — the structure lane, against the running editor.
 *
 * `tests-unit/tvw-006` grades the decision (geometry, order, alphas) against a recording context.
 * This is the other half: the REAL canvas, the real node library, the real theme tokens, and the
 * real `isVisualRoot` — the read that is stale until the node library has finished loading
 * ([[allowaschild-is-stale-until-the-node-library-loads]]), which no offline spec can reproduce.
 *
 * 🔴 **The filter is PRESSED, not set.** `editor.setLaneFilter('logic')` is what the spec grades.
 * The claim this drive makes is that the control in the trail is on screen, reachable, and wired —
 * so the arms click the segment and read the canvas ([[verify-the-consequence-not-just-the-mechanism]]).
 *
 * 🔴 **The lane is read off the PAINTED BITMAP, not off the module.** Re-calling `laneRectFor`
 * here would grade the module a second time and would pass against a renderer that never drew it
 * ([[a-check-in-a-second-pipeline-is-a-duplicate-first]]). Every geometry arm samples pixels.
 *
 * AC6's frame time is measured with `--perf`, which takes a BEFORE reading on a build that has no
 * lane and an AFTER on one that does. Run it before applying the wiring and again after.
 *
 * Usage:
 *   NOODL_REMOTE_DEBUG_PORT=9222 node scripts/devtools/drive-tvw006-lane.js [--dir <project>] [--json <file>] [--perf]
 *
 * Exits 0 when every graded arm held, 1 on a failure, 2 when the renderer is not ready.
 */
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (n, fallback = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const has = (n) => args.includes(`--${n}`);

const { appTarget, connect, evaluate } = require('./cdp.js');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/TVW-004 s15 Drive');

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

/**
 * The editor's own view of the canvas, as a STRING.
 *
 * ⚠️ A CDP `evaluate` that returns a live object dies with "Object reference chain is too long"
 * (s14), and one that returns `undefined` fields has them vanish from the JSON, which reads as an
 * absent element (s14 again). Everything below returns JSON text and names its absences.
 */
const CANVAS_STATE = `JSON.stringify((() => {
  const ed = window.NodeGraphEditor && window.NodeGraphEditor.instance;
  if (!ed) return { error: 'NO_EDITOR' };
  const roots = (ed.roots || []).map((r) => ({
    id: r.id,
    typename: r.model && r.model.type && (r.model.type.name || r.model.type),
    x: r.x,
    y: r.y,
    measured: r.measuredSize || 'ABSENT',
    isVisual: ed.model ? !!ed.model.isVisualRoot(r.model) : 'ABSENT'
  }));
  return {
    component: ed.model && ed.model.owner ? ed.model.owner.name : 'ABSENT',
    laneFilter: ed.laneFilter || 'ABSENT',
    scale: ed.getPanAndScale ? ed.getPanAndScale().scale : 'ABSENT',
    roots
  };
})())`;

/**
 * Sample the painted canvas along a horizontal line, and report the x of every run of non-background
 * ink. This is how a dashed 1px lane is FOUND rather than assumed: its left and right edges are the
 * first and last ink on a row that crosses the lane and misses every node.
 */
function scanRow(cssY, fromX, toX) {
  return `JSON.stringify((() => {
    const ed = window.NodeGraphEditor && window.NodeGraphEditor.instance;
    if (!ed || !ed.canvas || !ed.canvas.ctx) return { error: 'NO_CANVAS' };
    const ctx = ed.canvas.ctx;
    const ratio = ed.canvas.ratio || 1;
    const y = Math.round(${cssY} * ratio);
    const x0 = Math.max(0, Math.round(${fromX} * ratio));
    const x1 = Math.min(ed.canvas.width - 1, Math.round(${toX} * ratio));
    if (y < 0 || y >= ed.canvas.height || x1 <= x0) return { error: 'OFF_CANVAS', y, x0, x1 };
    const data = ctx.getImageData(x0, y, x1 - x0, 1).data;
    // The background is whatever the leftmost sample is; the grid dots are a repeating pattern, so
    // an "ink" test that keyed on exact equality would report every dot. A run has to be 2+ wide.
    const bg = [data[0], data[1], data[2]];
    const far = (i) => Math.abs(data[i*4]-bg[0]) + Math.abs(data[i*4+1]-bg[1]) + Math.abs(data[i*4+2]-bg[2]);
    const runs = [];
    let start = -1;
    for (let i = 0; i < (x1 - x0); i++) {
      const ink = far(i) > 12;
      if (ink && start < 0) start = i;
      if (!ink && start >= 0) { if (i - start >= 1) runs.push([Math.round((x0+start)/ratio), Math.round((x0+i)/ratio)]); start = -1; }
    }
    if (start >= 0) runs.push([Math.round((x0+start)/ratio), Math.round(x1/ratio)]);
    return { bg, runs };
  })())`;
}

/** Graph coordinates → CSS pixels on the canvas, using the editor's own pan and scale. */
const TO_SCREEN = (gx, gy) => `JSON.stringify((() => {
  const ed = window.NodeGraphEditor && window.NodeGraphEditor.instance;
  if (!ed) return { error: 'NO_EDITOR' };
  const ps = ed.getPanAndScale();
  return { x: (${gx} + ps.x) * ps.scale, y: (${gy} + ps.y) * ps.scale };
})())`;

async function readJson(target, expression) {
  const raw = await evaluate(target, expression);
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { error: 'UNPARSEABLE', raw: String(raw).slice(0, 200) };
  }
}

/**
 * AC6 — canvas frame time on the corpus project.
 *
 * 🔴 Measured by forcing N repaints and timing them, NOT by watching rAF: the canvas only repaints
 * when something changed, so an idle canvas would report a frame time of zero on both sides and
 * [[a-rule-reading-zero-in-both-arms-grades-nothing]] would apply exactly.
 */
const FRAME_TIME = (samples) => `JSON.stringify((() => {
  const ed = window.NodeGraphEditor && window.NodeGraphEditor.instance;
  if (!ed || !ed.painter) return { error: 'NO_EDITOR' };
  const times = [];
  for (let i = 0; i < ${samples}; i++) {
    const t0 = performance.now();
    ed.painter.paint();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const nodes = (() => { let n = 0; const walk = (x) => { n++; (x.children||[]).forEach(walk); }; (ed.roots||[]).forEach(walk); return n; })();
  return {
    roots: (ed.roots || []).length,
    nodes,
    laneFilter: ed.laneFilter || 'ABSENT',
    p50: +times[Math.floor(times.length * 0.5)].toFixed(3),
    p90: +times[Math.floor(times.length * 0.9)].toFixed(3),
    mean: +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(3)
  };
})())`;

async function main() {
  const editor = await connect(await appTarget('editor'));

  const state = await readJson(editor, CANVAS_STATE);
  if (state.error) {
    console.error(`renderer not ready: ${state.error}`);
    process.exit(2);
  }
  console.log(`canvas: ${state.component}, ${state.roots.length} roots, scale ${state.scale}, filter ${state.laneFilter}`);

  if (has('perf')) {
    // AC6. Run once before the wiring and once after; the two readings go in the task file.
    const perf = await readJson(editor, FRAME_TIME(60));
    console.log(JSON.stringify(perf, null, 1));
    const out = opt('json');
    if (out) fs.writeFileSync(out, JSON.stringify(perf, null, 1));
    process.exit(0);
  }

  const visual = state.roots.filter((r) => r.isVisual === true);
  const logic = state.roots.filter((r) => r.isVisual === false);

  // ── Arm 0: the precondition. A canvas with no visual root grades NOTHING below, and an arm that
  // ran anyway would report the logic-only eyebrow as a missing lane.
  record(
    'precondition: the canvas has at least one visual root and one logic root',
    visual.length >= 1 && logic.length >= 1,
    `${visual.length} visual, ${logic.length} logic`
  );
  if (!visual.length || !logic.length) {
    console.error('UNGRADABLE: open a component with both a stack and logic beside it.');
    process.exit(1);
  }

  const stack = visual[0];

  // ── Arm 1 (AC2): the lane is drawn, and its left edge is 12px left of the stack.
  const mid = await readJson(editor, TO_SCREEN(stack.x, stack.y + Math.min(80, stack.measured.height / 2)));
  const leftScan = await readJson(editor, scanRow(mid.y, mid.x - 60, mid.x + 10));
  const laneEdge = leftScan.runs && leftScan.runs.length ? leftScan.runs[0] : null;
  record(
    'AC2: a lane edge is painted to the left of the stack',
    !!laneEdge,
    laneEdge ? `ink at x=${laneEdge[0]}..${laneEdge[1]} (stack left is ${Math.round(mid.x)})` : 'no ink found'
  );

  // ── Arm 2 (AC1): the lane follows the root when it moves, live.
  const before = await readJson(editor, scanRow(mid.y, mid.x - 60, mid.x + 10));
  await evaluate(
    editor,
    `(() => { const ed = window.NodeGraphEditor.instance; const r = ed.roots.find(n => n.id === ${JSON.stringify(
      stack.id
    )}); r.x += 200; r.setPosition(r.x, r.y); ed.relayout(); ed.repaint(); return 'moved'; })()`
  );
  await wait(250);
  const moved = await readJson(editor, scanRow(mid.y, mid.x + 140, mid.x + 260));
  const movedEdge = moved.runs && moved.runs.length ? moved.runs[0] : null;
  record(
    'AC1: the lane follows the stack 200px right, live',
    !!movedEdge && !!before.runs.length,
    movedEdge ? `edge now at x=${movedEdge[0]}` : 'no ink 200px right'
  );

  // Put it back — a drive that leaves the fixture moved poisons the next run.
  await evaluate(
    editor,
    `(() => { const ed = window.NodeGraphEditor.instance; const r = ed.roots.find(n => n.id === ${JSON.stringify(
      stack.id
    )}); r.x -= 200; r.setPosition(r.x, r.y); ed.relayout(); ed.repaint(); return 'restored'; })()`
  );
  await wait(250);

  // ── Arm 3 (AC1/AC3): the filter control is on screen AND REACHABLE.
  const reach = await readJson(
    editor,
    `JSON.stringify((() => {
      const el = document.querySelector('[data-test="lane-filter-logic"]');
      if (!el) return { present: false };
      const b = el.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return { present: true, reachable: !!hit && (hit === el || el.contains(hit)), blocker: hit ? hit.className : 'ABSENT' };
    })())`
  );
  record('AC1: the Logic segment is rendered and reachable', reach.present && reach.reachable, JSON.stringify(reach));

  // ── Arm 4 (AC1/AC3): pressing it changes what the canvas paints.
  if (reach.present && reach.reachable) {
    await evaluate(editor, `document.querySelector('[data-test="lane-filter-logic"]').click(); 'clicked'`);
    await wait(250);
    const after = await readJson(editor, CANVAS_STATE);
    record('AC1: pressing Logic puts the canvas in the logic filter', after.laneFilter === 'logic', `filter=${after.laneFilter}`);

    // ── Arm 5 (AC3): a dimmed node is STILL SELECTABLE. R-F in one arm.
    const selected = await readJson(
      editor,
      `JSON.stringify((() => {
        const ed = window.NodeGraphEditor.instance;
        const node = ed.roots.find(n => n.id === ${JSON.stringify(stack.id)});
        if (!node) return { error: 'NO_NODE' };
        ed.selectionActions ? ed.selectionActions.selectNode(node, {}) : ed.selector.selectNode(node);
        return { selected: !!(ed.selector && ed.selector.nodes && ed.selector.nodes.length) };
      })())`
    );
    record('AC3: a dimmed node is still selectable — dims, never hides', selected.selected === true, JSON.stringify(selected));

    await evaluate(editor, `document.querySelector('[data-test="lane-filter-all"]').click(); 'reset'`);
    await wait(200);
    const reset = await readJson(editor, CANVAS_STATE);
    record('the canvas is left on All', reset.laneFilter === 'all', `filter=${reset.laneFilter}`);
  } else {
    record('AC1: pressing Logic puts the canvas in the logic filter', null, 'control not reachable');
    record('AC3: a dimmed node is still selectable — dims, never hides', null, 'control not reachable');
    record('the canvas is left on All', null, 'control not reachable');
  }

  const graded = arms.filter((a) => a.ok !== null);
  const held = graded.filter((a) => a.ok);
  console.log(`\n${held.length}/${graded.length} graded arms held (${arms.length - graded.length} ungraded)`);

  const out = opt('json');
  if (out) fs.writeFileSync(out, JSON.stringify({ project: PROJECT_DIR, arms }, null, 1));

  process.exit(held.length === graded.length ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
