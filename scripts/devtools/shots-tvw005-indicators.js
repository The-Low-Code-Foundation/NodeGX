#!/usr/bin/env node
/**
 * P93 TVW-005 AC5 — photographs of the drop indicators, both themes, for Richard's verdict.
 *
 * §2 names three: a 2px `primary` line between rows for a reorder, a `primary-bg` fill on a
 * container row for a reparent, and — added by the slice that built it — the drop-target strip on
 * the Layers tab header. Each is photographed **while the gesture is still in the air**, because
 * that is the only moment any of them exists.
 *
 * 🔴 **Nothing is dropped.** Every drag is released over a surface that is not a target (the tab
 * bar, which is inert while a *row* is being dragged), and the page's graph is compared byte for
 * byte at the end. A set of photographs that quietly rearranged the fixture would be a set of
 * photographs of a different page.
 *
 * ⚠️ The theme is flipped mid-drag, and then **read back off the DOM** before the shutter: a
 * `data-theme` written on `documentElement` is not applied to anything in the same evaluation
 * ([[a-theme-flip-does-not-apply-in-the-same-eval]]). The filename carries what was read.
 *
 * Usage:
 *   node scripts/devtools/shots-tvw005-indicators.js --out <dir> [--dir <project>]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (n, fallback = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const { appTarget, connect, evaluate } = require('./cdp.js');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/TVW-005 s17 Strip');
const PAGE = '/Pages/Main/Home';
const OUT = opt('out', path.join(process.cwd(), 'shots-tvw005'));
const THEMES = ['dark', 'light'];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const editor = await connect(await appTarget('editor'));
  const BOOT = `(() => { if (typeof window.__wreq !== 'function' && typeof webpackChunknoodl_editor !== 'undefined') { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } })();`;
  const ev = (expr) => evaluate(editor, `${BOOT}${expr}`);
  const mouse = (type, x, y, buttons = 1) =>
    editor.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons, clickCount: 1 });

  const shots = [];

  async function until(check, timeoutMs, what) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        if (await check()) return;
      } catch {
        /* mid-remount */
      }
      await wait(700);
    }
    throw new Error(`gave up after ${Math.round(timeoutMs / 1000)}s waiting for ${what}`);
  }

  const open = await ev(`(() => {
    const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
    return ProjectModel.instance ? ProjectModel.instance._retainedProjectDirectory : null;
  })()`);
  if (open !== PROJECT_DIR) {
    console.error(`refusing: the editor has ${open || 'no project'} open, not ${PROJECT_DIR}.`);
    process.exit(2);
  }

  const graphJson = async () =>
    ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      return JSON.stringify(ProjectModel.instance.getComponentWithName(${JSON.stringify(PAGE)}).graph.toJSON());
    })()`);

  /** The panel's own box, for a crop: a 2px line inside a 324px panel is invisible in a 1368px shot. */
  const panelBox = async () =>
    ev(`(() => {
      const tabs = document.querySelector('[data-test="panel-tabs"]');
      let panel = tabs;
      while (panel && panel.parentElement && panel.getBoundingClientRect().width < 100) panel = panel.parentElement;
      const box = panel ? panel.closest('[class*="SidePanel"]') || panel : null;
      if (!box) return null;
      const b = box.getBoundingClientRect();
      return { x: Math.round(b.left), y: Math.round(b.top), width: Math.round(b.width), height: Math.round(b.height) };
    })()`);

  const measured = async () =>
    ev(`(() => ({
      theme: document.documentElement.getAttribute('data-theme'),
      indicator: (() => {
        const row = document.querySelector('[data-test="layers-node"][data-drop], [data-test="layers-instance"][data-drop]');
        const tab = document.querySelector('[data-test="panel-tab-layers"]');
        return row ? 'row:' + row.getAttribute('data-drop') : (tab && tab.getAttribute('data-drop-strip') ? 'strip:' + tab.getAttribute('data-drop-strip') : 'NONE');
      })()
    }))()`);

  /**
   * The shutter. Both themes, each read back after the flip, cropped to the panel at 2×.
   *
   * 🔴 The **indicator on screen is read at the same moment**, and it goes in the manifest beside
   * the file. A photograph of a panel with no indicator in it would look exactly like a photograph
   * of the indicator, at this size, to anyone reading a list of filenames.
   */
  const photograph = async (state) => {
    for (const theme of THEMES) {
      await ev(`(() => { window.__wreq('./src/editor/src/models/ThemeManager.ts').ThemeManager.setMode(${JSON.stringify(theme)}); return 'ok'; })()`);
      await wait(800);
      const applied = await measured();
      const box = await panelBox();
      const file = path.join(OUT, `${state}--${applied.theme}.png`);
      const { data } = await editor.send('Page.captureScreenshot', {
        format: 'png',
        clip: { ...box, scale: 2 }
      });
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      shots.push({ state, theme: applied.theme, indicator: applied.indicator, file: path.basename(file) });
      console.log(`shot ${path.basename(file)} — ${applied.indicator}`);
    }
  };

  // ------------------------------------------------------------------ set up
  await ev(`(() => { window.__wreq('./src/editor/src/models/sidebar/index.ts').SidebarModel.instance.switch('components'); return 'ok'; })()`);
  await until(async () => ev(`(() => !!document.querySelector('[data-test="panel-tabs"]'))()`), 15000, 'the panel');
  await ev(`(() => {
    const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
    const { EventDispatcher } = window.__wreq('./src/shared/utils/EventDispatcher.ts');
    const c = ProjectModel.instance.getComponentWithName(${JSON.stringify(PAGE)});
    EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
    return 'ok';
  })()`);
  await wait(1500);
  await ev(`(() => { const t = document.querySelector('[data-test="panel-tab-layers"]'); if (t) t.click(); return 'ok'; })()`);
  await until(
    async () => ev(`(() => !!document.querySelector('[data-test="layers-tree"] [data-test="layers-instance"]'))()`),
    20000,
    'the Layers rows'
  );
  const before = await graphJson();

  // Collapse the page's own children so the siblings are next to each other — which is also what a
  // person does before dragging one above another.
  const siblings = await ev(`(() => {
    const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
    const c = ProjectModel.instance.getComponentWithName(${JSON.stringify(PAGE)});
    let page = null; c.graph.forEachNode((n) => { if (n.type && n.type.name === 'Page') page = n; });
    return page.children.map((k) => k.id);
  })()`);
  for (const id of siblings) {
    await ev(`(() => {
      const rows = Array.from(document.querySelectorAll('[data-test="layers-node"], [data-test="layers-instance"]'));
      const row = rows.find((r) => (r.getAttribute('data-node-path') || '').split('/').pop() === ${JSON.stringify(id)});
      const caret = row && row.querySelector('[data-test="layers-caret"]');
      if (caret && caret.className.includes('Expanded')) caret.click();
      return 'ok';
    })()`);
  }
  await wait(700);

  const rowRect = async (nodeId) =>
    ev(`(() => {
      const rows = Array.from(document.querySelectorAll('[data-test="layers-node"], [data-test="layers-instance"]'));
      const row = rows.find((r) => (r.getAttribute('data-node-path') || '').split('/').pop() === ${JSON.stringify(nodeId)});
      if (!row) return null;
      row.scrollIntoView({ block: 'center' });
      const b = row.getBoundingClientRect();
      const x = Math.round(b.left + b.width / 2);
      const y = Math.round(b.top + b.height / 2);
      const hit = document.elementFromPoint(x, y);
      return { x, top: Math.round(b.top), bottom: Math.round(b.bottom), height: Math.round(b.height), reachable: Boolean(hit && row.contains(hit)) };
    })()`);

  /** Where a drag is released so that NOTHING is dropped: the tab bar is inert for a row drag. */
  const neutral = await ev(`(() => { const b = document.querySelector('[data-test="panel-tabs"]').getBoundingClientRect(); return { x: Math.round(b.right - 4), y: Math.round(b.top + 2) }; })()`);

  const holdRowOver = async (fromId, toId, where) => {
    let to = await rowRect(toId);
    const from = await rowRect(fromId);
    to = await rowRect(toId);
    if (!from || !to || !from.reachable || !to.reachable) throw new Error(`rows not reachable (${fromId} → ${toId})`);
    const y =
      where === 'before' ? to.top + Math.round(to.height * 0.15)
      : where === 'after' ? to.bottom - Math.round(to.height * 0.15)
      : to.top + Math.round(to.height * 0.5);
    const startY = from.top + Math.round(from.height / 2);
    await mouse('mousePressed', from.x, startY);
    await wait(60);
    await mouse('mouseMoved', from.x + 6, startY + 18);
    await wait(120);
    await mouse('mouseMoved', to.x, y);
    await wait(150);
    await mouse('mouseMoved', to.x, y);
    await wait(250);
    return { x: to.x, y };
  };

  const release = async (at) => {
    // Away from every target first, so the gesture ends on a surface that cannot accept it.
    await mouse('mouseMoved', neutral.x, neutral.y);
    await wait(150);
    await mouse('mouseReleased', neutral.x, neutral.y, 0);
    await wait(600);
  };

  // --------------------------------------------------- the three row indicators
  const [first, , last] = [siblings[0], siblings[1], siblings[siblings.length - 1]];
  const container = siblings[1];

  await holdRowOver(last, first, 'before');
  await photograph('1-reorder-line-above');
  await release();

  await holdRowOver(first, last, 'after');
  await photograph('2-reorder-line-below');
  await release();

  await holdRowOver(last, container, 'inside');
  await photograph('3-reparent-fill');
  await release();

  // ------------------------------------------- the strip on the tab header
  await ev(`(() => { const t = document.querySelector('[data-test="panel-tab-components"]'); if (t) t.click(); return 'ok'; })()`);
  await wait(800);
  await ev(`(() => {
    const i = document.querySelector('input[placeholder="Filter components"]');
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    s.call(i, 'Divider');
    i.dispatchEvent(new Event('input', { bubbles: true }));
    return 'ok';
  })()`);
  await wait(900);
  const comp = await ev(`(() => {
    const r = Array.from(document.querySelectorAll('[data-test="component-tree-item"]')).find((x) => x.getAttribute('data-kind') === 'visual');
    if (!r) return null;
    r.scrollIntoView({ block: 'center' });
    const b = r.getBoundingClientRect();
    return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };
  })()`);
  const tab = await ev(`(() => { const b = document.querySelector('[data-test="panel-tab-layers"]').getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; })()`);
  if (comp) {
    await mouse('mousePressed', comp.x, comp.y);
    await wait(60);
    await mouse('mouseMoved', comp.x + 8, comp.y);
    await wait(150);
    await photograph('4-tab-strip-armed');
    await mouse('mouseMoved', tab.x, tab.y);
    await wait(200);
    await mouse('mouseMoved', tab.x, tab.y);
    await wait(250);
    await photograph('5-tab-strip-over');
    // Released on the panel's title, which is not a target: the filter row is the only thing this
    // drag could land on and it is not one either.
    const title = await ev(`(() => { const b = document.querySelector('[data-test="panel-tabs"]').getBoundingClientRect(); return { x: Math.round(b.right - 4), y: Math.round(b.bottom + 60) }; })()`);
    await mouse('mouseMoved', title.x, title.y);
    await wait(150);
    await mouse('mouseReleased', title.x, title.y, 0);
    await wait(700);
  } else {
    console.log('UNGRADED: no visual component row for the strip shots');
  }

  await ev(`(() => { window.__wreq('./src/editor/src/models/ThemeManager.ts').ThemeManager.setMode('dark'); return 'ok'; })()`);
  const after = await graphJson();
  const clean = before === after;
  console.log(`\nthe page is ${clean ? 'byte-identical' : 'CHANGED — these shots are of a page this script edited'}`);
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ page: PAGE, project: PROJECT_DIR, clean, shots }, null, 1));
  editor.close();
  process.exit(clean ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
