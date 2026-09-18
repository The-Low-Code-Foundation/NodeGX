#!/usr/bin/env node
/**
 * P93 TVW-002 — the preview says what it is not showing. The drive.
 *
 * The strip is a claim about two surfaces at once, so a spec can grade its sentence but only a
 * drive can grade the thing the sentence is about: that the preview did not move. That is AC3, the
 * phase's standing rule as a gate — **the app preview never changes route or mode because the
 * canvas moved** — and it is asserted here as a before/after pair around every single canvas
 * switch, not once at the end.
 *
 * 🔴 **The negative arm needs a known-firing signal beside it**, or "the preview did not move" is
 * indistinguishable from "this drive cannot move the preview". So the run ends by pressing the
 * strip's own `Go to` door, which SHOULD move it — an arm that does not see that move invalidates
 * every "did not move" above it, and the script says so rather than passing.
 *
 * Reads, per component put on the canvas:
 *   shape   — `data-shape` on `[data-test="preview-strip"]`, or `agree` when there is no strip
 *   text    — the sentence a person reads, verbatim
 *   doors   — the buttons, by label
 *   src     — the app webview's `src` before and after the canvas switch  (AC3)
 *   mode    — `[data-preview-mode]` before and after the canvas switch    (AC3)
 *
 * Usage:
 *   NOODL_REMOTE_DEBUG_PORT=9444 node scripts/devtools/drive-tvw002-strip.js \
 *     [--shots <dir>] [--json <file>] [--components "/A,/B"]
 *
 * Exits 0 only when every AC3 pair held AND the known-firing navigation was seen.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : null;
};

// 🔴 `cdp.js` reads NOODL_REMOTE_DEBUG_PORT at REQUIRE time — anything that sets it must do so
// before this line, which is why it is not set here.
const { appTarget, connect, evaluate, elementCentre, dispatchClick } = require('./cdp.js');

const shots = opt('shots');
if (shots) fs.mkdirSync(shots, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const STRIP = '[data-test="preview-strip"]';

/**
 * What both surfaces are showing, as one reading. The pair AC3 compares.
 *
 * 🔴 The comments that belong to this snippet live OUT here, not inside it. A backtick inside a
 * template literal ends the template literal, and the first draft of this file was a syntax error
 * for exactly that reason — caught by running node over it before the drive, not during one.
 *
 * - the sentence is read by CLASS, not by querySelector('span'): the strip's sentence is a span
 *   containing a strong and another span, so "the first span" is a coincidence, not a reading;
 * - the webview's src is read as the PROPERTY first (CanvasView assigns the property), with the
 *   attribute only as a fallback — a property write that never reflected would make every AC3 pair
 *   hold for the wrong reason;
 * - the dismiss button is in `doors` too, as a bare multiplication sign. Left in on purpose: a run
 *   where it is missing is a run where the strip did not render what this script thinks it did.
 */
const SURFACES = `(() => {
  const bg = document.querySelector('[data-preview-mode]');
  const webview = document.querySelector('[data-test="app-preview"] webview');
  const strip = document.querySelector('${STRIP}');
  const text = strip && strip.querySelector('[class*="StripText"]');
  return {
    mode: bg ? bg.getAttribute('data-preview-mode') : null,
    src: webview ? webview.src || webview.getAttribute('src') : null,
    shape: strip ? strip.getAttribute('data-shape') : 'agree',
    tone: strip ? strip.getAttribute('data-tone') : null,
    stripPresent: !!strip,
    stripHeight: strip ? Math.round(strip.getBoundingClientRect().height) : 0,
    dismissable: strip ? !!strip.querySelector('[data-test="preview-strip-dismiss"]') : false,
    text: text ? text.innerText.replace(/\\s+/g, ' ').trim() : '',
    doors: strip ? Array.from(strip.querySelectorAll('button')).map((b) => b.innerText.trim()) : []
  };
})()`;

/**
 * TVW-002 AC1 — what the RUNNING APP is actually outlining, asked of the app itself.
 *
 * 🔴 **Read in the guest, not in the editor.** The editor can tell you what it *sent*; only the
 * running app can tell you what is *drawn*, and this drive exists because the two are different
 * questions.
 *
 * 🔴 **AND IT READS THE RECT, NOT THE COUNT — because the count was true of the broken version.**
 * Session 13's first AC1 build pointed the outline at the node that *places* the component. That
 * node passes the highlighter's `getRef` filter, so it enters `selectedNodes` and
 * `selectedNodes.size` reads a healthy **1**; it then has no `getDOMElement`, so `updateHighlights`
 * removes the div again on the very next frame and nothing is ever on screen. A count-based arm
 * would have reported AC1 green over an outline nobody could see.
 *
 * So this returns the measured box of the outline div itself — `w`/`h` greater than zero is the
 * only reading that means a person can see a line. `verify-the-consequence-not-just-the-mechanism`.
 *
 * ⚠️ **No backticks in the guest source.** It travels inside a template literal in this file; a
 * backtick would end the literal. Single quotes and concatenation only.
 */
const OUTLINE = `(async () => {
  const w = document.querySelector('[data-test="app-preview"] webview');
  if (!w) return { error: 'no webview' };
  const probe = '(() => {' +
    ' const api = window.NoodlEditorHighlightAPI;' +
    ' if (!api || !api.highlighter) return { api: false };' +
    ' const h = api.highlighter;' +
    ' const boxes = [];' +
    ' const kids = h.highlightRootDiv ? h.highlightRootDiv.children : [];' +
    ' for (var i = 0; i < kids.length; i++) {' +
    '   var r = kids[i].getBoundingClientRect();' +
    '   boxes.push({ w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) });' +
    ' }' +
    ' var drawn = boxes.filter(function (b) { return b.w > 0 && b.h > 0; });' +
    ' var chip = document.querySelector("[data-noodl-box-overlay-chip]");' +
    ' var cr = chip ? chip.getBoundingClientRect() : null;' +
    ' var chipRect = cr && cr.width > 0 && cr.height > 0 ? cr : null;' +
    ' return {' +
    '   api: true,' +
    '   placed: h.placedNodes ? h.placedNodes.size : -1,' +
    '   selected: h.selectedNodes ? h.selectedNodes.size : -1,' +
    '   drawn: drawn.length,' +
    '   boxes: drawn.slice(0, 3),' +
    '   designMode: h.designMode,' +
    '   chip: chipRect ? { w: Math.round(chipRect.width), h: Math.round(chipRect.height) } : null' +
    ' };' +
    '})()';
  try {
    return await w.executeJavaScript(probe);
  } catch (e) {
    return { error: String(e && e.message ? e.message : e) };
  }
})()`;

async function main() {
  const client = await connect(await appTarget('editor'));
  const ev = async (expr) => {
    const result = await evaluate(client, expr);
    return result;
  };

  const project = await ev(`(() => {
    const p = window.__wreq && window.__wreq('./src/editor/src/models/projectmodel.ts');
    return p ? { name: p.ProjectModel.instance.name, components: p.ProjectModel.instance.getComponents().length } : null;
  })()`);

  // `__wreq` is how every P93 drive reaches an editor module; seeded once, read in a later eval.
  if (!project) {
    await ev(`webpackChunknoodl_editor.push([[Symbol()],{},(r)=>{window.__wreq=r;}])`);
    await wait(200);
  }

  const info = await ev(`(() => {
    const p = window.__wreq('./src/editor/src/models/projectmodel.ts').ProjectModel.instance;
    return { name: p.name, components: p.getComponents().length, root: p.getRootComponent() && p.getRootComponent().name };
  })()`);
  console.log(`project: ${JSON.stringify(info)}`);

  /**
   * 🔴 REFUSE TO READ A SCREEN THAT HAS NO PREVIEW ON IT.
   *
   * AC3's whole assertion is `before.src === after.src`. On the launcher — no project open — both
   * reads are `null`, `null === null` is true, and this script would print HELD for every switch
   * against a window with no preview and no canvas in it. A negative arm whose two sides are both
   * missing passes hardest.
   *
   * Learned from a peer the same day (P92, 2026-09-18): their look gate rooted its `launcher`
   * surface at `body`, so with a project open it silently graded the EDITOR and filed the findings
   * under "launcher". Same shape, opposite direction — the reading names the surface you asked
   * for, not the one you got. They made theirs exit 2; so does this.
   */
  const ready = await ev(`(() => ({
    preview: !!document.querySelector('[data-test="app-preview"] webview'),
    canvas: !!document.querySelector('[data-test="component-tree"]')
  }))()`);
  if (!ready.preview || !ready.canvas) {
    console.error(
      `refusing: this renderer is not showing a project (preview=${ready.preview}, componentTree=${ready.canvas}). ` +
        'Open the project first — on the launcher every AC3 pair is null === null, which reads as HELD.'
    );
    process.exit(2);
  }

  /**
   * 🔴 **PUT THE PREVIEW BACK BEFORE READING IT.**
   *
   * This script ENDS by pressing a `Go to` door — that is its known-firing control — so it leaves
   * the preview on another page. Run twice, the second run reads a different screen from the first:
   * session 13 got five different sentences, one fewer agree row, no outline, and `no Go to door
   * was on screen`, all of them correct answers to a question nobody had asked. Nothing was broken.
   *
   * A drive whose own exit state changes its next result is not an instrument. So it resets, and
   * the reset is ASSERTED — a navigation that silently did not happen would put the whole run back
   * where it started, invisibly.
   */
  const startRoute = await ev(`(() => {
    const { EventDispatcher } = window.__wreq('./src/shared/utils/EventDispatcher.ts');
    EventDispatcher.instance.emit('setPreviewRoute', { url: '/#/' });
    return 'asked';
  })()`);
  await wait(1500);
  const atStart = await ev(SURFACES);
  console.log(`reset to the start page: ${startRoute} -> ${atStart.src}`);
  if (!atStart.src || /\/(?!#?\/?$)[a-z]/i.test(new URL(atStart.src).pathname + new URL(atStart.src).hash.replace('#', ''))) {
    console.error(`refusing: the preview is on ${atStart.src}, not the start page. Every sentence below would be about the wrong screen.`);
    process.exit(2);
  }

  const targets = (opt('components') || '').split(',').filter(Boolean);
  if (targets.length === 0) {
    console.error('pass --components "/A,/B" — pick them with the fixture probe, not by guessing');
    process.exit(2);
  }

  const rows = [];
  let navigationSeen = false;

  for (const target of targets) {
    const before = await ev(SURFACES);

    // The canvas switch, through the same event the components panel emits — a canvas move, which
    // is precisely the thing that must not move the preview.
    await ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const { EventDispatcher } = window.__wreq('./src/shared/utils/EventDispatcher.ts');
      const component = ProjectModel.instance.getComponentWithName(${JSON.stringify(target)});
      if (!component) return 'MISSING';
      EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component, pushHistory: true });
      return 'ok';
    })()`);
    await wait(500);

    const after = await ev(SURFACES);
    // AC1 — when the two surfaces agree the preview should be pointing at the placement. Read after
    // the switch has settled, from the guest.
    const outline = await ev(OUTLINE);
    // Both sides must be REAL, not merely equal — see the refusal above for why `null === null` is
    // the failure this guards.
    const read = Boolean(before.src && after.src && before.mode && after.mode);
    const held = read && before.src === after.src && before.mode === after.mode;

    rows.push({ target, before, after, outline, ac3: held });
    console.log(
      `${held ? '✅' : '🔴'} ${target}\n    shape=${after.shape} tone=${after.tone} present=${after.stripPresent} h=${after.stripHeight}px\n    "${after.text}"\n    doors=[${after.doors.join(' | ')}]\n    outline=${JSON.stringify(outline)}\n    src ${before.src} -> ${after.src}  mode ${before.mode} -> ${after.mode}`
    );

    if (shots) await shot(client, path.join(shots, `tvw002-${slug(target)}.png`));
  }

  // 🔴 The known-firing arm must run while a shape-1 strip is ON SCREEN. The first run of this
  // script looked for the door after the loop had ended on an `agree` component, found none, and
  // reported "no control" — an instrument fault that would have left five HELD readings with
  // nothing to tell them apart from a drive that cannot move the preview at all. So the canvas goes
  // back to the first target, which is the one chosen to produce shape 1.
  await ev(`(() => {
    const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
    const { EventDispatcher } = window.__wreq('./src/shared/utils/EventDispatcher.ts');
    const component = ProjectModel.instance.getComponentWithName(${JSON.stringify(targets[0])});
    if (component) EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component, pushHistory: true });
    return 'ok';
  })()`);
  await wait(600);

  // The known-firing signal: press the strip's `Go to` door and watch the preview move.
  const door = await ev(`(() => {
    const b = document.querySelector('[data-test="preview-strip-goto"]');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), label: b.innerText.trim() };
  })()`);

  if (door) {
    const before = await ev(SURFACES);
    await dispatchClick(client, { x: door.x, y: door.y });
    await wait(1200);
    const after = await ev(SURFACES);
    // AC1 — when the two surfaces agree the preview should be pointing at the placement. Read after
    // the switch has settled, from the guest.
    const outline = await ev(OUTLINE);
    navigationSeen = before.src !== after.src;
    console.log(
      `${navigationSeen ? '✅' : '🔴'} known-firing arm: pressed "${door.label}" — src ${before.src} -> ${after.src}, strip now ${after.shape}`
    );
    rows.push({ target: `door:${door.label}`, before, after, navigated: navigationSeen });
    if (shots) await shot(client, path.join(shots, 'tvw002-after-goto.png'));
  } else {
    console.log('🔴 no `Go to` door was on screen — the negative arm below has no control beside it');
  }

  const json = opt('json');
  if (json) fs.writeFileSync(json, JSON.stringify({ project: info, rows }, null, 2));

  const ac3Rows = rows.filter((r) => r.ac3 !== undefined);
  const ac3Held = ac3Rows.length > 0 && ac3Rows.every((r) => r.ac3);
  console.log(`\nAC3 (preview did not move on any canvas switch): ${ac3Held ? 'HELD' : 'BROKEN'}`);
  console.log(`known-firing navigation seen: ${navigationSeen}`);

  /**
   * 🔴 **Richard's 2026-09-18 ruling, as an arm rather than as a screenshot.** The row is drawn in
   * EVERY case now, including `agree` — the seam is the point, and the first build's whole defect
   * was that the separator went away in the common case. A run where some row is missing is a run
   * where the ruling has been undone.
   */
  const everyRowPresent = ac3Rows.every((r) => r.after.stripPresent && r.after.stripHeight > 0);
  const agreeRows = ac3Rows.filter((r) => r.after.shape === 'agree');
  console.log(`the row is drawn on every reading: ${everyRowPresent} (${ac3Rows.length} readings)`);
  console.log(`  of which agree: ${agreeRows.length} — tones ${JSON.stringify(agreeRows.map((r) => r.after.tone))}`);

  /**
   * ⚠️ The agree arm needs its own known-firing signal: `quiet` tone AND words. A quiet row that is
   * present but silent is exactly what a broken sentence looks like, and it is also a legitimate
   * state (bench mode, no canvas) — so this asserts the population that should SPEAK.
   */
  const agreeSpeaks = agreeRows.length > 0 && agreeRows.every((r) => r.after.tone === 'quiet' && r.after.text.length > 0);
  console.log(`agree rows are quiet and say something: ${agreeSpeaks}`);

  /**
   * 🔴 `selected > 0` is NOT the arm — see `OUTLINE`. A drawn box is one with a non-zero rect.
   *
   * The agree rows are the population that should have one: the divergent shapes are about things
   * that are *not* on this screen, so an outline on one of those would be a defect of its own.
   */
  const drawnOn = ac3Rows.filter((r) => r.outline && r.outline.drawn > 0);
  const claimedOn = ac3Rows.filter((r) => r.outline && r.outline.placed > 0);
  console.log(`AC1 outline DRAWN (non-zero box) on: ${drawnOn.map((r) => r.target).join(', ') || 'NOTHING'}`);
  console.log(`   …placement merely CLAIMED on: ${claimedOn.map((r) => r.target).join(', ') || 'NOTHING'}`);
  if (claimedOn.length > drawnOn.length) {
    console.log('   🔴 a claimed placement with no box is the instance-node trap — read the rect, not the count');
  }

  /**
   * ⚠️ **The chip ELEMENT always exists** — `BoxModelOverlay` builds it in its constructor and
   * sizes it to nothing when cleared. A first version of this arm asked whether the element was in
   * the DOM and reported the defect on all seven rows, including the four that never had an
   * outline at all. An arm that fires everywhere is not measuring the thing it is named after.
   *
   * 🔴 **The defect the FIRST drive found, kept as an arm.** Sent down the selection channel the
   * outline drew the right line and brought the box-model chip with it — five lines of CSS facts
   * over the running app, because the author changed which component the canvas was on. No number
   * in this script saw it; the screenshot did. It is a number now.
   */
  const chipped = ac3Rows.filter((r) => r.outline && r.outline.chip);
  const chipOk = chipped.length === 0;
  console.log(`no inspector chip over the app: ${chipOk}${chipOk ? '' : ' — 🔴 on ' + chipped.map((r) => r.target).join(', ')}`);
  const designMode = ac3Rows.some((r) => r.outline && r.outline.designMode);
  if (!designMode) {
    console.log('   ⚠️ the app reports designMode=false — no outline is pushed in Preview mode at all');
  }

  process.exit(ac3Held && navigationSeen && everyRowPresent && agreeSpeaks && chipOk ? 0 : 1);
}

async function shot(client, file) {
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
}

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
