#!/usr/bin/env node
/**
 * HLT-014 AC7 — every shipped use of Show Popup, driven on the built viewer.
 *
 *   node scripts/devtools/drive-hlt014-templates.js
 *
 * Three uses exist (`grep -rl '"NavigationShowPopup"' templates library`), and each is asked the
 * question AC7 asks: did this popup rely on the old behaviour — Escape doing nothing, the page staying
 * live behind it — and if so is it opted out or correct to change?
 *
 * - **landing-pages `Site/WorkCard` → `Site/CaseStudy`** — a read-only case study. A dialog; closing it
 *   on Escape is correct.
 * - **`library/prefabs/image-cropper`** — a crop dialog with its own Cancel. A dialog; Escape is the
 *   same as Cancel. Its only title is a plain Text, so it had no accessible name until its Show Popup
 *   was given one. Opened here by a probe Show Popup, because the example opens it only after the OS
 *   file picker, which a headless drive cannot operate.
 * - 🔴 **`library/prefabs/toast`** — a TOAST shown through Show Popup (`Show On Top`, closed by its own
 *   3-second timer). Not a dialog. Modal by default, it made the whole page inert while it showed: a
 *   press on a field underneath did nothing. It sets `Modal` off; the toast arm is the reading that
 *   decides whether that holds.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { withRenderedPage } = require('./render-report');
const { buildDriveProject } = require(path.join(REPO_ROOT, 'scripts/library/drives/harness'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
let total = 0;
const check = (label, passed, detail) => {
  total++;
  if (!passed) failed++;
  console.log(`  ${passed ? 'pass' : 'FAIL'}  ${label}${detail !== undefined ? `  (${detail})` : ''}`);
};

/** Real input and Chrome's own AX tree — the same instruments as `drive-hlt014-popup.js`. */
function tools(s) {
  const send = (m, p) => s.client.send(m, p);
  const pressAt = async (selectorJs) => {
    const at = JSON.parse(
      await s.evaluate(`JSON.stringify((() => {
        const el = (${selectorJs})();
        if (!el) return { error: 'not found' };
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })())`)
    );
    if (at.error) throw new Error(`cannot press ${selectorJs}: ${at.error}`);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
    }
    await sleep(400);
  };
  const key = async (name) => {
    const code = { Escape: 27, Tab: 9 }[name];
    const base = { key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    await sleep(400);
  };
  const axDialogs = async () => {
    const doc = await send('DOM.getDocument', { depth: 0 });
    const r = await send('Accessibility.queryAXTree', { backendNodeId: doc.root.backendNodeId, role: 'dialog' });
    return (r.nodes || []).filter((n) => !n.ignored).map((n) => (n.name && n.name.value) || '');
  };
  const read = async () =>
    JSON.parse(
      await s.evaluate(`JSON.stringify({
        popups: document.querySelectorAll('.noodl-popup').length,
        dialogs: document.querySelectorAll('[role="dialog"][aria-modal="true"]').length,
        inert: document.querySelectorAll('[inert]').length,
        active: (() => { const a = document.activeElement; return !a ? 'null' : a === document.body ? 'body' : a.tagName.toLowerCase() + (a.closest('.noodl-popup') ? '@popup' : '@page'); })()
      })`)
    );
  const setup = async () => {
    await s.setViewport({ width: 1280, height: 900 });
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await send('Accessibility.enable', {});
  };
  return { pressAt, key, axDialogs, read, setup };
}

/**
 * Errors these arms read on the HEAD build too (2026-09-21, same drive, HEAD viewer bundle) — so they
 * are not this change's, and they are counted and printed rather than silently dropped:
 * - `Layout is "node"`: every popup container, since NDA-012 (see `drive-hlt014-popup.js`).
 * - the toast prefab's own script: `Toast Component`'s JavaScriptFunction reads `.style` of a null on
 *   every toast shown.
 * - `starter-imagery/…webp`: the landing-pages copy served from disk has no `starter-imagery` module.
 * 🔴 All three are renderer-error classes HLT-010's budget has to name.
 */
const KNOWN = [
  /group\/layout-not-a-flex-direction|Layout is "node"/,
  /Toast Component\): The script threw: Cannot read properties of null \(reading 'style'\)/,
  /The image could not be loaded: \/noodl_modules\/starter-imagery\//
];
const isKnown = (e) => KNOWN.some((k) => k.test(e));
const newErrors = (s, from) => {
  const all = s.consoleErrors.slice(from).filter((e) => !/favicon/.test(e));
  const known = all.filter(isKnown);
  if (known.length) console.log(`  pre-existing errors (also on HEAD): ${known.length}`);
  return all.filter((e) => !isKnown(e));
};

async function toast() {
  console.log('\n── toast prefab: Show On Top, closed by its own timer ──');
  const dir = buildDriveProject('toast', {
    subjectParameters: { Message: 'Saved', Type: 'Success' },
    nodes: [
      { id: 'field', type: 'net.noodl.controls.textinput', onPage: true, parameters: { placeholder: 'Your name' } },
      { id: 'save', type: 'net.noodl.controls.button', onPage: true, parameters: { label: 'Save' } }
    ],
    connections: [{ sourceId: 'save', sourcePort: 'onClick', targetId: 'subject', targetPort: 'Do' }]
  });
  await withRenderedPage({ projectDir: dir }, async (s) => {
    const t = tools(s);
    await t.setup();
    const from = s.consoleErrors.length;
    await t.pressAt(`() => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Save')`);
    const shown = await t.read();
    const shownText = await s.evaluate(`!!Array.from(document.querySelectorAll('.noodl-popup')).find((p) => /Saved/.test(p.textContent))`);
    // The person goes back to typing while the toast is up.
    await t.pressAt(`() => document.querySelector('input')`);
    const typing = await t.read();
    await sleep(3600);
    const gone = await t.read();
    console.log(`  shown   ${JSON.stringify(shown)} toastText=${shownText}`);
    console.log(`  typing  ${JSON.stringify(typing)}`);
    console.log(`  gone    ${JSON.stringify(gone)}`);
    check('reach: the toast showed', shown.popups === 1 && shownText, `popups=${shown.popups}`);
    check('the toast is not announced as a dialog', shown.dialogs === 0, `dialogs=${shown.dialogs}`);
    check('nothing goes inert behind a toast', shown.inert === 0, `inert=${shown.inert}`);
    check('a press on the field underneath focuses it', typing.active === 'input@page', typing.active);
    check('the toast still closes itself', gone.popups === 0, `popups=${gone.popups}`);
    const errs = newErrors(s, from);
    check('no new console errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  });
}

async function cropper() {
  console.log('\n── image-cropper prefab: the crop dialog ──');
  const dir = buildDriveProject('image-cropper', {
    nodes: [
      { id: 'open-crop', type: 'net.noodl.controls.button', onPage: true, parameters: { label: 'Open cropper' } },
      // The example's own Show Popup, re-read so the probe carries exactly its parameters.
      { id: 'crop-show', type: 'NavigationShowPopup', parameters: cropperShowParameters() }
    ],
    connections: [{ sourceId: 'open-crop', sourcePort: 'onClick', targetId: 'crop-show', targetPort: 'show' }]
  });
  await withRenderedPage({ projectDir: dir }, async (s) => {
    const t = tools(s);
    await t.setup();
    const from = s.consoleErrors.length;
    await t.pressAt(`() => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Open cropper')`);
    const open = await t.read();
    const names = await t.axDialogs();
    await t.key('Escape');
    const after = await t.read();
    console.log(`  open    ${JSON.stringify(open)} ax=${JSON.stringify(names)}`);
    console.log(`  escape  ${JSON.stringify(after)}`);
    check('reach: the crop dialog opened', open.popups === 1, `popups=${open.popups}`);
    check('it is a named dialog', names.length === 1 && names[0].length > 0, JSON.stringify(names));
    check('focus moved into it', open.active.endsWith('@popup'), open.active);
    check('Escape cancels it, as its own Cancel does', after.popups === 0, `popups=${after.popups}`);
    check('focus back on the button that opened it', after.active === 'button@page', after.active);
    const errs = newErrors(s, from);
    check('no new console errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  });
}

function cropperShowParameters() {
  const p = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'library/prefabs/image-cropper/project/project.json'), 'utf8'));
  let found;
  const walk = (ns) => ns.forEach((n) => (n.type === 'NavigationShowPopup' ? (found = n) : walk(n.children || [])));
  walk(p.components[0].graph.roots);
  return { ...found.parameters };
}

async function workCard() {
  console.log('\n── landing-pages template: WorkCard → CaseStudy ──');
  // Drive a COPY: nothing here should write to a template, and a copy makes that certain.
  const copy = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'drive-hlt014-landing-')), 'p');
  fs.cpSync(path.join(REPO_ROOT, 'templates/landing-pages'), copy, { recursive: true });
  try {
    await withRenderedPage({ projectDir: copy }, async (s) => {
      const t = tools(s);
      await t.setup();
      const from = s.consoleErrors.length;
      // `card-lift` alone also matches the SERVICE cards (the first run pressed one and read "nothing
      // opened"); a WorkCard's root carries all three of these classes.
      const CARD = '.card-lift.photo-zoom.pressable';
      const cards = await s.evaluate(`document.querySelectorAll('${CARD}').length`);
      await t.pressAt(`() => document.querySelector('${CARD}')`);
      const open = await t.read();
      const names = await t.axDialogs();
      const title = await s.evaluate(`(document.querySelector('${CARD} h3') || {}).textContent || ''`);
      await t.key('Escape');
      const after = await t.read();
      console.log(`  cards=${cards} title=${JSON.stringify(title)}`);
      console.log(`  open    ${JSON.stringify(open)} ax=${JSON.stringify(names)}`);
      console.log(`  escape  ${JSON.stringify(after)}`);
      check('reach: a case study opened from a card', cards > 0 && open.popups === 1, `cards=${cards} popups=${open.popups}`);
      check('it is a dialog named by its own title', names.length === 1 && names[0] === title.trim(), `${JSON.stringify(names)} vs ${JSON.stringify(title)}`);
      check('focus moved into it', open.active.endsWith('@popup'), open.active);
      check('Escape closes it', after.popups === 0, `popups=${after.popups}`);
      // The card is a Group with onClick — not focusable, so there is no opener to return to and the
      // layer falls back to the app. Recorded, not graded as a pass of the opener rule: see the verdict.
      check('focus is not left on body', after.active !== 'body', after.active);
      const errs = newErrors(s, from);
    check('no new console errors', errs.length === 0, errs.slice(0, 2).join(' | '));
    });
  } finally {
    fs.rmSync(path.dirname(copy), { recursive: true, force: true });
  }
}

(async () => {
  await toast();
  await cropper();
  await workCard();
  console.log(`\n${total - failed}/${total} held`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e.stack || e);
  process.exit(2);
});
