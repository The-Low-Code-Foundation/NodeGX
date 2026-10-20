// The page test: a copy of the app, the editor's own server, headless Chrome, and a person's clicks and keys.
// Then what Save wrote is read back from disk: the cells changed, the kit's schemas pass, only the touched
// components' files and the registry differ, and the real runtime (@nodegx/preview, in the page) builds the app.
//
//   node tools/page-test.mjs [app-folder]      (default ../todo-list, which is only read)
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { copyTree } from './copy-tree.mjs';
import { launch } from './cdp.mjs';
import { startServer } from '../server.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { readProjectTree } = require('@nodegx/project-contract/editor-suite-node.js');
const { validateStructure } = require('@nodegx/project-contract/editor-suite.js');

const app = resolve(process.argv[2] ?? join(here, '..', '..', 'todo-list'));
const copy = mkdtempSync(join(tmpdir(), 'table-editor-page-'));
copyTree(app, copy);
const before = readProjectTree(copy);

const results = [];
const check = (what, ok, detail = '') => {
  results.push({ what, ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? ' — ' + detail : ''}`);
};
const nodesOf = (files, key) => JSON.parse(files[`components/${key}/nodes.json`]).nodes;
const wiresOf = (files, key) => JSON.parse(files[`components/${key}/connections.json`]).connections;

const server = await startServer({ dir: copy, port: 0 });
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await launch();
let page;
try {
  page = await browser.newPage(url);
  await page.waitFor(`document.querySelector('#table tbody tr')`);
  check('the page opens the app and draws a table', true);

  // The runtime's node list, read once from @nodegx/preview in the page (skipped when already cached).
  const vocab = await page.waitFor(`(() => { const s = document.getElementById('status').textContent;
    return /described|Could not read/.test(s) ? s : (/Reading/.test(s) ? '' : 'cached'); })()`, 60000);
  check('the runtime\'s node list is read (or was cached)', !/Could not/.test(vocab), vocab);

  // Opening wrote nothing.
  const afterOpen = readProjectTree(copy);
  check('opening wrote nothing', Object.keys(before).every((f) => before[f] === afterOpen[f]) && Object.keys(afterOpen).length === Object.keys(before).length);

  // Pick Todo/Header in the component list.
  await page.click(`#component-list button[data-key="Todo/Header"]`);
  await page.waitFor(`document.getElementById('component-title').textContent === 'Todo/Header'`);
  const shape = await page.eval(`({ rows: document.querySelectorAll('#table tbody tr').length, cols: document.querySelectorAll('#table thead th').length })`);
  check('Todo/Header: one row per node', shape.rows === nodesOf(before, 'Todo/Header').length, `${shape.rows} rows, ${shape.cols} columns`);

  // 1. Type a new title into hdTitle's text cell, press Enter.
  await page.click(`td[data-node="hdTitle"][data-col="in:text"]`);
  await page.waitFor(`document.activeElement && document.activeElement.id === 'ed-text'`);
  await page.selectAll();
  await page.type('Hello table');
  await page.key('Enter');
  await page.waitFor(`document.querySelector('td[data-node="hdTitle"][data-col="in:text"]').textContent === 'Hello table'`);
  check('typing in a value cell changes it', true);

  // 2. A number: fontSize 28 (the port is a number, so 28 is stored as a number).
  await page.click(`td[data-node="hdTitle"][data-col="in:fontSize"]`);
  await page.waitFor(`document.activeElement && document.activeElement.id === 'ed-text'`);
  await page.selectAll();
  await page.type('28');
  await page.key('Enter');
  await page.waitFor(`document.querySelector('td[data-node="hdTitle"][data-col="in:fontSize"]').textContent === '28'`);

  // 3. Clear a value with the Delete key on the focused cell.
  await page.eval(`document.querySelector('td[data-node="hdDone"][data-col="in:color"]').focus()`);
  await page.key('Delete');
  await page.waitFor(`document.querySelector('td[data-node="hdDone"][data-col="in:color"]').textContent === ''`);
  check('Delete clears a value cell', true);

  // 4. A refusal is said, not swallowed: a position that is not two numbers.
  await page.click(`td[data-node="hdLook"][data-col="position"]`);
  await page.waitFor(`document.activeElement && document.activeElement.id === 'ed-text'`);
  await page.selectAll();
  await page.type('left');
  await page.key('Enter');
  const refusal = await page.waitFor(`document.getElementById('ed-error')?.textContent`);
  check('a bad position is refused in a sentence', /two numbers/.test(refusal), refusal);
  await page.selectAll();
  await page.type('900, 120');
  await page.key('Enter');
  await page.waitFor(`document.querySelector('td[data-node="hdLook"][data-col="position"]').textContent === '900, 120'`);

  // 5. Remove a wire: hdLog.onClick → hdOut.pickLog, from hdLog's onClick output cell.
  await page.click(`td[data-node="hdLog"][data-col="out:onClick"]`);
  await page.waitFor(`document.querySelector('#editor [data-unwire="0"]')`);
  await page.click(`#editor [data-unwire="0"]`);
  await page.waitFor(`!document.querySelector('td[data-node="hdLog"][data-col="out:onClick"]') || document.querySelector('td[data-node="hdLog"][data-col="out:onClick"]').textContent === ''`);
  await page.key('Escape');
  check('the ✕ on a wire removes it', true);

  // 6. Add a node through the dialog: a Text under hdRoot, second place.
  await page.click('#add-node');
  await page.waitFor(`document.getElementById('add-dialog').open`);
  await page.click('#add-form [name=type]');
  await page.type('Text');
  await page.click('#add-form [name=label]');
  await page.type('Subtitle');
  await page.eval(`(() => { const s = document.querySelector('#add-form [name=parent]'); s.value = 'hdRoot'; s.dispatchEvent(new Event('change')); })()`);
  await page.click('#add-form [name=place]');
  await page.type('2');
  await page.click('#add-form button[value=add]');
  await page.waitFor(`!document.getElementById('add-dialog').open`);
  const newId = await page.waitFor(`[...document.querySelectorAll('td.label')].find((td) => td.textContent === 'Subtitle')?.dataset.node`);
  check('the Add node dialog adds a row', Boolean(newId), newId);

  // 7. Wire hdIn.tab into the new Text's text: from the new row's text cell, type the other end.
  await page.click(`td[data-node="${newId}"][data-col="in:text"]`);
  await page.waitFor(`document.getElementById('wire-end')`);
  await page.click('#wire-end');
  await page.type('hdIn.tab');
  await page.key('Enter');
  await page.waitFor(`document.querySelector('td[data-node="${newId}"][data-col="in:text"]')?.textContent.includes('hdIn') || document.querySelector('td[data-node="${newId}"][data-col="in:text"]')?.textContent.includes('tab')`);
  await page.key('Escape');
  check('a wire is added from a cell', true);

  // 8. Rename hdNav, and move hdTheme under the new Text... no: under hdRoot, first place.
  await page.click(`td[data-node="hdNav"][data-col="label"]`);
  await page.waitFor(`document.activeElement && document.activeElement.id === 'ed-text'`);
  await page.selectAll();
  await page.type('Navigation');
  await page.key('Enter');
  await page.click(`td[data-node="hdTheme"][data-col="parent"]`);
  await page.waitFor(`document.activeElement && document.activeElement.id === 'ed-text'`);
  await page.selectAll();
  await page.type('hdRoot #1');
  await page.key('Enter');
  await page.waitFor(`document.querySelector('td[data-node="hdTheme"][data-col="parent"]').textContent === 'hdRoot #1'`);

  // 9. Remove a row (the confirm is accepted by the driver).
  await page.click(`button[data-remove="hdSignOut"]`);
  await page.waitFor(`!document.querySelector('td[data-node="hdSignOut"]')`);
  check('✕ on a row removes the node', true);

  // 10. A JSON value on a port the type does not declare, through "Show every port" → no: through an existing cell.
  await page.click(`td[data-node="hdList"][data-col="in:label"]`);
  await page.waitFor(`document.activeElement && document.activeElement.id === 'ed-text'`);
  await page.selectAll();
  await page.type('42');
  await page.key('Enter');
  // (hdList.label also has a wire coming in, so the cell shows the value and the wire.)
  await page.waitFor(`document.querySelector('td[data-node="hdList"][data-col="in:label"]').textContent.startsWith('42 ←')`);

  // Save.
  await page.click('#save');
  const saved = await page.waitFor(`(() => { const s = document.getElementById('status'); return /Saved|not saved|changed on disk/.test(s.textContent) ? s.textContent : ''; })()`);
  check('Save writes', /Saved Todo\/Header/.test(saved), saved);

  // Read back what was written.
  const after = readProjectTree(copy);
  const changed = Object.keys(after).filter((f) => before[f] !== after[f]).sort();
  check('only Todo/Header and the registry changed', JSON.stringify(changed) === JSON.stringify(['components/Todo/Header/component.json', 'components/Todo/Header/connections.json', 'components/Todo/Header/nodes.json', 'components/_registry.json'].filter((f) => changed.includes(f))) && changed.every((f) => f.startsWith('components/Todo/Header/') || f === 'components/_registry.json'), changed.join(', '));
  const nodes = nodesOf(after, 'Todo/Header');
  const byId = new Map(nodes.map((n) => [n.id, n]));
  check('hdTitle.text is "Hello table"', byId.get('hdTitle').parameters.text === 'Hello table');
  check('hdTitle.fontSize is the number 28', byId.get('hdTitle').parameters.fontSize === 28);
  check('hdDone.color is unset', !('color' in byId.get('hdDone').parameters));
  check('hdList.label is the string "42"', byId.get('hdList').parameters.label === '42');
  check('hdLook moved to 900, 120', byId.get('hdLook').x === 900 && byId.get('hdLook').y === 120);
  check('hdNav renamed', byId.get('hdNav').label === 'Navigation');
  check('hdSignOut gone, and its wire', !byId.has('hdSignOut') && !wiresOf(after, 'Todo/Header').some((w) => w.fromId === 'hdSignOut' || w.toId === 'hdSignOut') && !byId.get('hdNav').children.includes('hdSignOut'));
  const root = byId.get('hdRoot');
  check('new Text is hdRoot\'s child and hdTheme its first', root.children[0] === 'hdTheme' && root.children.includes(newId) && byId.get(newId).parent === 'hdRoot' && byId.get('hdTheme').parent === 'hdRoot' && !byId.get('hdNav').children.includes('hdTheme'), root.children.join(','));
  check('a child carries no x and y', byId.get(newId).x === undefined && byId.get(newId).y === undefined);
  const wires = wiresOf(after, 'Todo/Header');
  check('wire hdIn.tab → new.text is there', wires.some((w) => w.fromId === 'hdIn' && w.fromProperty === 'tab' && w.toId === newId && w.toProperty === 'text'));
  check('wire hdLog.onClick → hdOut.pickLog is gone', !wires.some((w) => w.fromId === 'hdLog' && w.toId === 'hdOut' && w.toProperty === 'pickLog'));
  const project = JSON.parse(after['nodegx.project.json']);
  check('the project file is untouched (id, version 4)', after['nodegx.project.json'] === before['nodegx.project.json'], `version ${project.version}`);
  const structural = validateStructure(after);
  check('the kit\'s schema validator passes every file', structural.length === 0, structural.slice(0, 3).join(' | '));
  const reg = JSON.parse(after['components/_registry.json']);
  check('the registry counts are true', reg.components['Todo/Header'].nodeCount === nodes.length && reg.components['Todo/Header'].connectionCount === wires.length);

  // The real runtime builds the saved app (the preview walks children; the server reads flat — both must agree).
  const render = (files) => page.eval(`(async () => {
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:900px;height:700px;z-index:99;background:white';
    document.body.appendChild(host);
    if (!window.NodegxPreview) await new Promise((ok, fail) => { const s = document.createElement('script'); s.src = '/kit/preview/noodl-preview-in-page.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
    const p = await NodegxPreview.mountPreview(host, { runtimeBase: '/runtime/' });
    const r = await p.update(${JSON.stringify(files)});
    await new Promise((ok) => setTimeout(ok, 2500));
    const doc = p.frame?.contentDocument;
    const text = doc?.body?.innerText ?? '';
    const elements = doc?.querySelectorAll('#root *').length ?? 0;
    p.dispose(); host.remove();
    return { status: r.status, message: r.message, warnings: (r.warnings || []).length, elements, text: text.replace(/\\s+/g, ' ').slice(0, 160) };
  })()`);
  const builtBefore = await render(before);
  const built = await render(after);
  check('@nodegx/preview builds the saved app as it builds the original', built.status === 'ok' && builtBefore.status === 'ok',
    `original: ${JSON.stringify(builtBefore)}; saved: ${JSON.stringify(built)}`);

  // A change on disk after opening is refused at Save, not overwritten.
  await page.click(`td[data-node="hdTitle"][data-col="in:text"]`);
  await page.waitFor(`document.activeElement && document.activeElement.id === 'ed-text'`);
  await page.selectAll();
  await page.type('Mine');
  await page.key('Enter');
  await page.waitFor(`document.querySelector('td[data-node="hdTitle"][data-col="in:text"]').textContent === 'Mine'`);
  const file = join(copy, 'components/Todo/Header/nodes.json');
  const theirs = JSON.parse(readFileSync(file, 'utf8'));
  theirs.nodes.find((n) => n.id === 'hdTitle').parameters.text = 'Theirs';
  writeFileSync(file, JSON.stringify(theirs, null, 2) + '\n');
  await page.click('#save');
  const conflict = await page.waitFor(`(() => { const s = document.getElementById('status'); return /changed on disk|Saved/.test(s.textContent) ? s.textContent : ''; })()`);
  const onDisk = JSON.parse(readFileSync(file, 'utf8')).nodes.find((n) => n.id === 'hdTitle').parameters.text;
  check('a file changed on disk since opening is refused, not overwritten', /changed on disk/.test(conflict) && onDisk === 'Theirs', conflict);

  mkdirSync(join(here, '..', 'test-copies'), { recursive: true });
  writeFileSync(join(here, '..', 'test-copies', 'page-test.png'), await page.screenshot());
  const errors = page.logs.filter((l) => /^(error|exception)/.test(l));
  check('no errors in the page console', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (err) {
  check(`the run finished (${err.message})`, false);
  if (page) {
    try {
      writeFileSync(join(here, '..', 'test-copies', 'page-test-failure.png'), await page.screenshot());
      console.log((await page.eval(`document.getElementById('status').textContent`)) ?? '');
      console.log(page.logs.slice(-10).join('\n'));
    } catch {}
  }
} finally {
  await browser.close();
  server.close();
  rmSync(copy, { recursive: true, force: true });
}
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} of ${results.length} checks failed.` : `\nAll ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
