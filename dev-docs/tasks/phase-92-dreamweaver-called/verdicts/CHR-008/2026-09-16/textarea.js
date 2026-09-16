// CHR-008 §3.1 slice 4 — drive EVERY path the converted `textArea` row has.
//
// 🔴 Why this script exists: s10 shipped a half-broken FB-017 AC4 with jest AND tsc green, because
// the feature drew on one of its two paths (§9.6). This row has five, and the one most likely to
// fail silently is the redraw: a converted row has no React root, so `renderReact()` raises
// ROW_CHANGED on the view's own bus and the mounted component is expected to be listening. If that
// subscription is wrong, undo writes the model and the field keeps showing the old text.
//
// 🔴 TYPING IS DONE WITH REAL KEYSTROKES (CDP Input.insertText), NOT SYNTHETIC EVENTS.
// The first version of this drive set `.value` through the native setter and dispatched
// input/change. `PropertyPanelTextArea` is a CONTROLLED component that keeps typed text in
// `displayedValue` and commits it on BLUR — the synthetic route never updated that state, so the
// blur committed the unchanged value, `shouldCommitTextArea` correctly refused, and all four arms
// read as product failures. They were instrument failures. A probe with Input.insertText showed the
// commit and the undo-redraw both working.
//
// 🔴 ARM 0 IS NOT A FORMALITY. Every arm below would read identically on the OLD code path, so the
// first thing measured is whether the component path was taken: a converted row has NO
// `.property-row-control` host (that div is `ControlHost`, rendered only by the legacy path) while
// every unconverted row on the same panel still has one. If arm 0 fails, nothing after it means
// anything.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node textarea.js <outDir>
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) || '.';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// NOTE: no backticks anywhere inside this template literal. A backtick in a comment here ends the
// string and breaks the file at parse time -- which killed one run of this drive outright.
const HELPERS = `
  window.__ta = window.__ta || {};
  __ta.sel = '.sidebar-property-editor';
  __ta.rows = () => [...document.querySelectorAll(__ta.sel + ' .property-panel-row')];
  __ta.field = () => document.querySelector(__ta.sel + ' textarea');
  __ta.rowOf = (el) => el && el.closest('.property-panel-row');

  // EVERY Text node, across every component -- the caller picks which one can actually be driven.
  // The first target this drive chose had its text port CONNECTED, and FB-018 replaces a connected
  // row's control with the binding chip. The row was present and correct and held no textarea,
  // which arm 0 was about to report as a vanished row. Choose the target by the property the drive
  // needs, never by position.
  // forEachNode STOPS on a truthy return, so these callbacks must return nothing: braces, no value.
  __ta.candidates = () => {
    const ed = window.__nodeGraphEditor;
    const owner = ed.getActiveComponent().owner;
    const out = [];
    (owner.components || []).forEach((c) => {
      c.forEachNode((n) => {
        const tn = (n.type && (n.type.name || n.type.localName)) || n.typename;
        if (tn === 'Text') { out.push({ component: c.name, nodeId: n.id }); }
      });
    });
    return JSON.stringify(out);
  };
  __ta.selected = null;
  __ta.selectAt = (component, nodeId) => {
    const ed = window.__nodeGraphEditor;
    const owner = ed.getActiveComponent().owner;
    const comp = owner.getComponentWithName(component);
    if (comp) { ed.switchToComponent(comp); }
    const n = ed.findNodeWithId(nodeId);
    if (!n) return null;
    ed.selectNode(n);
    __ta.selected = nodeId;
    return nodeId;
  };
  __ta.isChipped = () => {
    const f = __ta.field();
    const row = document.querySelector(__ta.sel + ' .property-panel-row[title]');
    return !f && !!(row && row.querySelector('[class*="BindingChip"]'));
  };

  // findNodeWithId hands back the VIEW node; the model -- and the parameters -- is at .model.
  __ta.rawNode = () => (__ta.selected ? window.__nodeGraphEditor.findNodeWithId(__ta.selected) : null);
  __ta.node = () => { const n = __ta.rawNode(); return n ? (n.model || n) : null; };
  __ta.param = () => { const n = __ta.node(); return n && n.parameters ? JSON.stringify(n.parameters.text ?? null) : null; };

  __ta.state = () => {
    const f = __ta.field();
    const row = __ta.rowOf(f);
    return {
      rows: __ta.rows().length,
      hasTextarea: !!f,
      value: f ? f.value : null,
      controlHostsInRow: row ? row.querySelectorAll(':scope .property-row-control').length : -1,
      controlHostsOnPanel: document.querySelectorAll(__ta.sel + ' .property-row-control').length,
      focusedIsField: document.activeElement === f,
      caret: f ? f.selectionStart : null,
      param: __ta.param()
    };
  };

  __ta.focusAll = () => { const f = __ta.field(); if (!f) return false; f.focus(); f.select(); return true; };
  __ta.focusAt = (pos) => { const f = __ta.field(); if (!f) return null; f.focus(); f.setSelectionRange(pos, pos); return f.selectionStart; };
  __ta.blur = () => { const f = __ta.field(); if (f) { f.blur(); } return true; };
`;

(async () => {
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = (e) => evaluate(client, e);
  const J = async (e) => JSON.parse(await ev(`JSON.stringify(${e})`));

  /** Replace the field's contents with a real keystroke sequence, then commit by blurring. */
  const typeReal = async (text) => {
    await ev(`__ta.focusAll()`);
    await client.send('Input.insertText', { text });
    await sleep(300);
    await ev(`__ta.blur()`);
    await sleep(700);
  };

  /**
   * Bounded retry, for the same reason `settleScroll` and `settleHints` use one: React commits
   * asynchronously, so a single snapshot taken N ms after an action measures the clock as much as
   * the behaviour. The first run of ARM 3 read once at 900ms, reported the field disagreeing with
   * the model, and ARM 4 then showed the very same redraw working — a disagreement between two
   * arms of one drive is a disagreement about timing.
   */
  const settle = async (predicate, attempts = 16, gap = 250) => {
    let s = null;
    for (let i = 0; i < attempts; i++) {
      s = await J(`__ta.state()`);
      if (predicate(s)) return { state: s, attempts: i + 1, ms: i * gap, agreed: true };
      await sleep(gap);
    }
    return { state: s, attempts, ms: attempts * gap, agreed: false };
  };

  await ev(HELPERS);
  fs.mkdirSync(outDir, { recursive: true });
  const results = {};

  const candidates = JSON.parse(await ev(`__ta.candidates()`));
  let chosen = null;
  let chipped = 0;
  for (const c of candidates) {
    await ev(`__ta.selectAt(${JSON.stringify(c.component)}, ${JSON.stringify(c.nodeId)})`);
    await sleep(900);
    if ((await ev(`!!__ta.field()`)) === true) { chosen = c; break; }
    if ((await ev(`__ta.isChipped()`)) === true) chipped++;
  }
  if (!chosen) {
    console.log(`🔴 none of ${candidates.length} Text nodes rendered an editable textarea`);
    console.log(`   (${chipped} drew FB-018's binding chip = a CONNECTED port, not a missing row).`);
    process.exit(1);
  }
  results.target = { ...chosen, candidates: candidates.length, chipOnlySkipped: chipped };
  console.log('driving:', JSON.stringify(results.target));

  // ── ARM 0 — is the component path even being taken? ────────────────────────────────────────
  results.arm0_path = await J(`__ta.state()`);
  console.log('ARM 0 path:', JSON.stringify(results.arm0_path));
  if (!results.arm0_path.hasTextarea) { console.log('🔴 row not on screen'); process.exit(1); }
  if (results.arm0_path.controlHostsInRow !== 0) console.log('🔴 row still has a ControlHost — OLD path is running');
  if (results.arm0_path.controlHostsOnPanel === 0) console.log('⚠️ no ControlHost anywhere: "0 in this row" cannot distinguish new path from an empty panel');

  // ── ARM 1 — a real edit commits on blur ───────────────────────────────────────────────────
  const start = await J(`__ta.state()`);
  await typeReal('chr008 slice4');
  const afterEdit = await J(`__ta.state()`);
  results.arm1_liveEdit = {
    paramBefore: start.param, paramAfter: afterEdit.param, shows: afterEdit.value,
    committed: afterEdit.param !== start.param && afterEdit.param === JSON.stringify('chr008 slice4')
  };
  console.log('ARM 1 live edit:', JSON.stringify(results.arm1_liveEdit));

  // ── ARM 2 — a blur that changed nothing writes nothing ────────────────────────────────────
  // 🔴 Behavioural, not a queue-depth count: `undoQueue` is not reachable from the renderer and the
  // first version of this arm read -1 in BOTH readings, which grades nothing. Instead: blur without
  // typing, then undo ONCE. If the no-op blur had written an entry, the undo would consume it and
  // the text would still read 'chr008 slice4'; it must go back past it to the starting value.
  await ev(`__ta.focusAt(0)`);
  await sleep(200);
  await ev(`__ta.blur()`);
  await sleep(600);
  const afterNoop = await J(`__ta.state()`);
  await ev(`window.__nodeGraphEditor.undo()`);
  const settled = await settle((s) => JSON.stringify(s.value) === s.param);
  const afterUndo1 = settled.state;
  results.arm2_noopBlur = {
    paramAfterNoopBlur: afterNoop.param,
    unchangedByNoop: afterNoop.param === afterEdit.param,
    paramAfterOneUndo: afterUndo1.param,
    wentPastTheEdit: afterUndo1.param === start.param
  };
  console.log('ARM 2 no-op blur:', JSON.stringify(results.arm2_noopBlur));

  // ── ARM 3 — undo redraws the row (the ROW_CHANGED subscription) ───────────────────────────
  // 🔴 The arm most likely to fail silently: the model is written either way, so only the value
  // SHOWN IN THE FIELD distinguishes a working subscription from a dead one.
  results.arm3_undoRedraws = {
    param: afterUndo1.param, shown: afterUndo1.value,
    fieldAgreesWithModel: JSON.stringify(afterUndo1.value) === afterUndo1.param,
    settledAfterMs: settled.ms, attempts: settled.attempts, agreedWithinBudget: settled.agreed
  };
  console.log('ARM 3 undo redraw:', JSON.stringify(results.arm3_undoRedraws));

  // ── ARM 4 — the caret survives a rebuild (the §3.5-shaped win for this row) ───────────────
  // 🔴 Only meaningful if a rebuild ACTUALLY happened: the arm records whether the parameter moved,
  // so "focus kept" cannot be claimed from an undo that had nothing to undo.
  await typeReal('abcdefgh');
  const armedParam = await J(`__ta.state()`);
  await ev(`__ta.focusAt(3)`);
  await sleep(200);
  const armed = await J(`__ta.state()`);
  await ev(`window.__nodeGraphEditor.undo()`);
  await sleep(900);
  const after = await J(`__ta.state()`);
  results.arm4_caret = {
    rebuildActuallyHappened: after.param !== armedParam.param,
    armed: { focused: armed.focusedIsField, caret: armed.caret, value: armed.value, param: armed.param },
    after: { focused: after.focusedIsField, caret: after.caret, value: after.value, param: after.param }
  };
  console.log('ARM 4 caret through a rebuild:', JSON.stringify(results.arm4_caret));
  if (!results.arm4_caret.rebuildActuallyHappened) {
    console.log('⚠️ ARM 4 GRADED NOTHING: the parameter did not move, so there was no rebuild to survive.');
  }

  fs.writeFileSync(path.join(outDir, 'textarea-results.json'), JSON.stringify(results, null, 2));
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'textarea-row.png'), Buffer.from(data, 'base64'));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
