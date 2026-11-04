// P132 BWF-008 AC2, s21: Studio's half of the crossing, by presses in Studio's Electron app (CDP 9461), while the
// NodeGX dev editor has the same Greenhouse copy open (CDP 9222). Both share one backend (`~/.noodl/backends`; Studio
// adopts the editor's). Usage, Studio already running on the copy:
//   node crossing-studio.mjs <project dir> add-return   — opens When a plant is watered, adds a Return after its last step
//   node crossing-studio.mjs <project dir> read         — what Studio's Backend tab draws for When a plant is watered
// Reads, it does not grade: it prints what it measured.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, what] = process.argv.slice(2);
const { attach } = await import('/Users/richardosborne/vscode_projects/nodegx-studio/editor/cdp.mjs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await attach({ port: 9461, width: 1600, height: 1000, match: (t) => /^http:\/\/127\.0\.0\.1:\d+\/?$/.test(t.url) });
const ev = (x) => b.evaluate(x);
const at = async (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
const press = async (sel) => {
  const p = await at(sel);
  if (!p) throw new Error(`nothing at ${sel}`);
  await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y }); await wait(40);
  await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1 }); await wait(60);
  await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await wait(400);
};
const until = async (js, n = 40) => { for (let i = 0; i < n && !(await ev(js)); i++) await wait(250); return ev(js); };
const wf = () => JSON.parse(readFileSync(join(dir, 'nodegx.automations.json'), 'utf8')).workflows.find((w) => w.id === 'when-watered');
const open = async () => {
  if (!(await ev(`document.querySelector('#steps .autoview')?.dataset.workflow === 'when-watered'`))) {
    await ev(`document.querySelector('#rail [data-tab=backend]').click()`); // the rail is not the thing under test
    await until(`!!document.querySelector('.wfback .row[data-workflow="when-watered"]')`);
    await wait(1000); // P132-PRESSLOSTINREDRAW
    await press('.wfback .row[data-workflow="when-watered"]');
    await until(`document.querySelector('#steps .autoview')?.dataset.workflow === 'when-watered'`);
  }
};
const cards = () => ev(`[...document.querySelectorAll('#steps .autoview .step')].map((s) => s.dataset.id + ': ' + s.querySelector('h3')?.textContent)`);
try {
  await open();
  if (what === 'add-return') {
    console.log('studio before', JSON.stringify(await cards()), 'file steps', wf().steps.length);
    await press('#steps .autoview .step[data-id="mark"] h3');
    await until(`!!document.querySelector('#wfinspect [data-act=addafter]')`);
    await press('#wfinspect [data-act=addafter]');
    await until(`!!document.querySelector('.menu .item[data-kind="return"]')`);
    await press('.menu .item[data-kind="return"]');
    for (let i = 0; i < 40 && wf().steps.length < 3; i++) await wait(250);
    console.log('studio after', JSON.stringify(await cards()), 'file steps', JSON.stringify(wf().steps.map((s) => `${s.id}:${s.kind}`)));
  } else if (what === 'rename-mark') {
    // the step's name is the panel's first box; typed over, then left (Studio saves on leaving the box)
    const name = process.argv[4];
    await press('#steps .autoview .step[data-id="mark"] h3');
    await until(`!!document.querySelector('#wfinspect input')`);
    await press('#wfinspect input');
    await ev(`document.querySelector('#wfinspect input').select()`);
    await b.send('Input.insertText', { text: name }); await wait(300);
    await press('#steps .autoview .event-card h2');
    for (let i = 0; i < 40 && wf().steps.find((s) => s.id === 'mark')?.name !== name; i++) await wait(250);
    console.log('studio renamed mark; file', JSON.stringify(wf().steps.map((s) => `${s.id}:${s.name ?? ''}`)));
  } else {
    await wait(500);
    console.log('studio draws', JSON.stringify(await cards()));
    console.log('studio toast', JSON.stringify(await ev(`document.getElementById('toast')?.textContent`)));
    console.log('file', JSON.stringify(wf().steps.map((s) => `${s.id}:${s.kind}${s.name ? ' ' + s.name : ''}`)));
  }
} finally {
  b.close?.();
}
