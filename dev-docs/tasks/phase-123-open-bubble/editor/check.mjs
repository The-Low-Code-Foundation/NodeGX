/**
 * P123 Open Bubble — the gate. Copies the repo's todo-list template, starts an ephemeral backend for the copy, serves
 * the editor on it and drives every tab in headless Chrome over CDP: select, type, resize, reorder, add, delete,
 * undo (Design); the spacing guide; a custom state; a composed expression that runs in the app; the event list, a
 * step's settings, an added action, a branch with a No chain and a Yes chain (Workflow); a new type, a field, a row,
 * an option set (Data); a style saved from one button and worn by another (Styles).
 * Every assertion reads the files the kit's store wrote, the backend, or the app on screen — never the editor's
 * own claim.
 *
 *   node check.mjs            PASS n/n and exit 0, or the failing lines and exit 1
 *   node check.mjs --shots    also writes ../look/s2-*.png
 *
 * Needs the deploy runtime, the in-page preview bundle and Orbit's look.js / specs.js (serve.mjs says which is missing).
 */
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browser } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..', '..', '..');
const shots = process.argv.includes('--shots');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const lineFrom = (proc, pattern, ms = 30000) => new Promise((ok, no) => {
  let out = ''; const t = setTimeout(() => no(new Error(`no "${pattern}" in ${ms} ms:\n${out.slice(-800)}`)), ms);
  const on = (d) => { out += d; const m = out.match(pattern); if (m) { clearTimeout(t); ok(m); } };
  proc.stdout.on('data', on); proc.stderr.on('data', on);
});

const tmp = mkdtempSync(join(tmpdir(), 'open-bubble-check-'));
const project = join(tmp, 'todo-list');
cpSync(join(repo, 'templates/todo-list'), project, { recursive: true });
const children = [];
const results = [];
const ok = (cond, what, detail) => { results.push({ cond: !!cond, what, detail }); console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${what}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 260) : ''}`); };
let b;
try {
  const backendPort = await freePort();
  const backend = spawn(process.execPath, [join(repo, 'packages/nodegx-backend/bin/nodegx-backend.js'), 'serve', '--data-dir', join(tmp, 'backend'), '--port', String(backendPort), '--token', 'open-bubble-check', '--backend-id', 'open_bubble_check', '--backend-name', 'Open Bubble check', '--ephemeral'], { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(backend);
  await lineFrom(backend, /NODEGX_BACKEND_READY/);
  const pjPath = join(project, 'nodegx.project.json');
  const pj = JSON.parse(readFileSync(pjPath, 'utf8'));
  pj.metadata ??= {};
  pj.metadata.cloudservices = { instanceId: 'open_bubble_check', endpoint: `http://127.0.0.1:${backendPort}`, appId: 'open_bubble_check', type: 'nodegx' };
  writeFileSync(pjPath, JSON.stringify(pj, null, 2));
  const port = await freePort();
  const server = spawn(process.execPath, [join(here, 'serve.mjs'), project, '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(server);
  await lineFrom(server, /open-bubble: http/);
  const url = `http://127.0.0.1:${port}/`;

  b = await browser({ port: await freePort(), width: 1600, height: 1000 });
  await b.goto(url);
  const title = await b.waitTitle((t) => t.startsWith('ready'), 90000);
  console.log(`check: ${title}`);
  await wait(1200);
  const page = () => b.evaluate('document.getElementById("pagepick").value');
  const comp = (key) => b.evaluate(`JSON.stringify(__ob.store.readComponent(${JSON.stringify(key)}).files)`).then(JSON.parse);
  const onDisk = (rel) => JSON.parse(readFileSync(join(project, rel), 'utf8'));
  const SIGN = 'components/Pages/Sign in/';
  const centreOf = (id) => b.evaluate(`(() => { const el = __ob.preview.elementsOf(${JSON.stringify(id)})[0]; if (!el) return null; const r = el.getBoundingClientRect(); const o = document.getElementById('overlay').getBoundingClientRect(); return { x: Math.round(o.left + r.left + r.width/2), y: Math.round(o.top + r.top + r.height/2), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(o.top + r.top) }; })()`);
  const appText = () => b.evaluate('__ob.preview.frame.contentDocument.body.innerText');
  const shows = () => b.evaluate('__ob.shows || 0');
  const rebuilt = async (n0) => { await b.until(`(__ob.shows || 0) > ${n0} && document.getElementById("status").textContent.startsWith("App on screen")`, 30000); await wait(300); };
  const status = () => b.evaluate('document.getElementById("status").textContent');
  const clickText = async (sel, text) => { const at = await b.evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.textContent.trim().startsWith(${JSON.stringify(text)})); if (!el) return null; el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) }; })()`); if (!at) throw new Error(`no "${text}" in ${sel}`); await b.click(at.x, at.y); return at; };
  const menuItem = async (text) => { await b.until(`[...document.querySelectorAll('.menu .item')].some(e => e.textContent.includes(${JSON.stringify(text)}))`, 4000); await clickText('.menu .item', text); await wait(250); };
  const shot = async (name) => { if (shots) { await wait(400); await b.screenshot(join(here, '..', 'look', `s2-${name}.png`)); } };
  const select = async (id) => { const at = await centreOf(id); await b.click(at.x, at.y); await wait(350); };

  console.log('check: Design');
  ok((await page()) === 'Pages/Sign in' && (await appText()).includes('Sign in'), 'the editor shows the page the app is on (Todo redirects a visitor to Sign in)', { page: await page() });
  const sign = await comp('Pages/Sign in');
  const title1 = sign.nodes.nodes.find((n) => n.label === 'App name').id;
  const lead = sign.nodes.nodes.find((n) => n.label === 'What this is').id;
  const card = sign.nodes.nodes.find((n) => n.label === 'Sign-in card').id;
  const signInBtn = sign.nodes.nodes.find((n) => n.label === 'Sign in' && n.type === 'net.noodl.controls.button').id;
  const createBtn = sign.nodes.nodes.find((n) => n.label === 'Create account').id;
  await select(title1);
  ok((await b.evaluate('document.querySelector("#right .head input")?.value')) === 'App name', 'clicking the app name in the page selects it and the property editor shows it');
  {
    // the spacing guide: four red distances from the element to its parent's content box, read back and compared with the frame's own geometry
    const guides = await b.evaluate(`[...document.querySelectorAll('#overlay .guide')].map(g => Number(g.dataset.n))`);
    const truth = await b.evaluate(`(() => { const w = __ob.preview.frame.contentWindow; const el = __ob.preview.elementsOf(${JSON.stringify(title1)})[0]; const pe = __ob.preview.elementsOf(${JSON.stringify(card)})[0]; const r = el.getBoundingClientRect(), pr = pe.getBoundingClientRect(), cs = w.getComputedStyle(pe); const p = (v) => Math.round(parseFloat(v) || 0); return [r.top - (pr.top + p(cs.paddingTop)), (pr.bottom - p(cs.paddingBottom)) - r.bottom, r.left - (pr.left + p(cs.paddingLeft)), (pr.right - p(cs.paddingRight)) - r.right].map(Math.round); })()`);
    const bands = await b.evaluate(`document.querySelectorAll('#overlay .band.pad').length`);
    ok(guides.length === truth.filter((n) => n > 0).length && truth.filter((n) => n > 0).every((n) => guides.includes(n)), 'the selected element wears the red distance lines to its parent\'s content box, each px value the frame\'s own geometry', { guides, truth, paddingBands: bands });
    await shot('design-selected');
  }
  {
    const fields = await b.evaluate(`[...document.querySelectorAll('#right .field')].map(f => f.querySelector('label').textContent)`);
    const idx = fields.indexOf('Text');
    const n0 = await shows();
    await b.evaluate(`(() => { const f = [...document.querySelectorAll('#right .field')][${idx}]; const i = f.querySelector('input,textarea'); i.focus(); i.select(); })()`);
    await b.type('Open Bubble todo');
    await rebuilt(n0);
    ok(onDisk(SIGN + 'nodes.json').nodes.find((n) => n.id === title1).parameters.text === 'Open Bubble todo' && (await appText()).includes('Open Bubble todo'), 'typing in the Text field is written to nodes.json on disk and the app shows it');
  }
  {
    const n0 = await shows(); const before = (await centreOf(title1)).w;
    const hnd = await b.rectOf('.handle.e');
    await b.drag({ x: hnd.x, y: hnd.y }, { x: hnd.x - 100, y: hnd.y });
    await rebuilt(n0);
    const n = onDisk(SIGN + 'nodes.json').nodes.find((n) => n.id === title1);
    const after = (await centreOf(title1)).w;
    ok(n.parameters.width?.unit && after < before - 60, 'pulling the east handle writes a width the app then has', { before, after, width: n.parameters.width });
  }
  {
    const n0 = await shows(); const from = await centreOf(lead); const to = await centreOf(title1);
    await b.drag({ x: from.x, y: from.y }, { x: to.x, y: to.top + 4 }, 16);
    await rebuilt(n0);
    const kids = onDisk(SIGN + 'nodes.json').nodes.find((n) => n.id === card).children;
    ok(kids.indexOf(lead) < kids.indexOf(title1), 'dragging the lead above the title reorders the card\'s children on disk', { order: kids.slice(0, 3) });
  }
  {
    let n0 = await shows();
    await b.clickSel('#palette button:nth-child(3)');
    const at = await centreOf(title1); await b.click(at.x, at.y); await rebuilt(n0);
    const added = onDisk(SIGN + 'nodes.json').nodes.find((n) => n.type === 'net.noodl.controls.button' && n.parameters?.label === 'Button');
    ok(added && added.parent === card && (await appText()).includes('Button'), 'a Button from the palette lands in the card on disk and in the app', { parent: added?.parent });
    n0 = await shows(); await b.evaluate('document.activeElement && document.activeElement.blur()'); await b.key('Delete', 'Delete', 46); await rebuilt(n0);
    ok(!onDisk(SIGN + 'nodes.json').nodes.some((n) => n.parameters?.label === 'Button'), 'the Delete key removes it from disk');
    n0 = await shows(); await b.clickSel('#undo'); await rebuilt(n0);
    ok(onDisk(SIGN + 'nodes.json').nodes.some((n) => n.parameters?.label === 'Button'), 'Undo puts it back on disk');
  }
  {
    // P123-S4-CANVASSCROLL: the overlay took the wheel, so a page could not be scrolled while editing (Richard, on the template)
    await select(title1);
    const before = await b.evaluate(`(() => { const w = __ob.preview.frame.contentWindow; w.document.body.style.minHeight = '4000px'; const s = document.querySelector('#overlay .box.sel'); return { y: w.scrollY, box: s ? s.getBoundingClientRect().top : null }; })()`);
    const at = await centreOf(title1); for (let i = 0; i < 3; i++) { await b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: at.x, y: at.y, deltaX: 0, deltaY: 200 }); await wait(120); } await wait(400);
    const after = await b.evaluate(`(() => { const w = __ob.preview.frame.contentWindow; const s = document.querySelector('#overlay .box.sel'); return { y: w.scrollY, box: s ? s.getBoundingClientRect().top : null, stage: document.getElementById('stage').scrollTop }; })()`);
    ok(after.y >= 500 && after.box !== null && before.box !== null && Math.abs((before.box - after.box) - (after.y - before.y)) < 2 && after.stage === 0, 'Design: a wheel over the app scrolls the page and the selection box follows', { before, after });
    await b.evaluate(`(() => { const w = __ob.preview.frame.contentWindow; w.scrollTo(0, 0); w.document.body.style.minHeight = ''; })()`); await wait(300);
  }
  console.log('check: custom states and the composer');
  let stateId;
  {
    // a custom state on the card, with a default (the card is picked in the tree: its centre on the page is the Email input)
    await clickText('#tree .row', 'Sign-in card'); await wait(350);
    let n0 = await shows();
    await clickText('#right .states button', 'New state'); await rebuilt(n0);
    const v = onDisk(SIGN + 'nodes.json').nodes.find((n) => n.type === 'Variable2' && n.metadata?.customState?.of === card);
    stateId = v?.id;
    ok(v && v.metadata.customState.name === 'state' && v.parameters?.name === 'signInCard.state', 'New state on the card writes a Variable node that remembers the card (metadata.customState) with the name signInCard.state', { name: v?.parameters?.name });
    n0 = await shows();
    await b.evaluate(`(() => { const i = document.querySelector('#right .states td:nth-child(3) input'); i.focus(); i.select(); })()`);
    await b.type('Hello'); await b.evaluate(`document.querySelector('#right .states td:nth-child(3) input').dispatchEvent(new Event('change'))`); await rebuilt(n0);
    ok(onDisk(SIGN + 'nodes.json').nodes.find((n) => n.id === stateId)?.parameters?.value === 'Hello', 'its default value is the Variable\'s value parameter on disk');
    await shot('design-states');
  }
  {
    // the composer: the title's Text = the card's state + " world", as a chip in the mixed view, then JavaScript typed beside it
    await select(title1);
    const fields = await b.evaluate(`[...document.querySelectorAll('#right .field')].map(f => f.querySelector('label').textContent)`);
    const idx = fields.indexOf('Text');
    await b.evaluate(`[...document.querySelectorAll('#right .field')][${idx}].querySelector('.from button').click()`); await wait(250);
    const sources = await b.evaluate(`[...document.querySelectorAll('.menu .item')].map(e => e.textContent)`);
    ok(sources.some((s) => s.includes("Sign-in card's state")) && sources.some((s) => s.startsWith('Compose an expression')), 'Insert dynamic data lists the custom state and the composer', sources.slice(0, 4));
    await menuItem('Compose an expression');
    ok(await b.evaluate(`!!document.querySelector('.composer')`), 'the composer opens');
    await b.evaluate(`[...document.querySelectorAll('.composer .seg button')].find(b => b.dataset.m === 'mixed').click()`); await wait(100);
    await clickText('.composer .tools button', 'Insert dynamic data'); await wait(250);
    await menuItem("Sign-in card's state");
    const chipNames = await b.evaluate(`[...document.querySelectorAll('.composer .mixed .chip')].map(c => c.dataset.name)`);
    ok(chipNames.length === 1 && /^signInCard/i.test(chipNames[0]), 'the state becomes a chip in the mixed view, a name in the text', chipNames);
    await b.evaluate(`[...document.querySelectorAll('.composer .seg button')].find(b => b.dataset.m === 'js').click()`); await wait(100);
    const jsBefore = await b.evaluate(`document.querySelector('.composer textarea').value`);
    await b.evaluate(`(() => { const t = document.querySelector('.composer textarea'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); })()`);
    await b.type('+ " world"');
    const jsAfter = await b.evaluate(`document.querySelector('.composer textarea').value`);
    await b.evaluate(`[...document.querySelectorAll('.composer .seg button')].find(b => b.dataset.m === 'chips').click()`); await wait(100);
    const chipsView = await b.evaluate(`[...document.querySelectorAll('.composer .chips > *')].map(e => e.classList.contains('chip') ? '[' + e.textContent + ']' : e.textContent)`);
    ok(jsAfter.trim() === `${jsBefore.trim()} + " world"` && chipsView[0]?.startsWith("[Sign-in card's state") && chipsView.includes('"world"') === false && chipsView.some((t) => t.includes('world')), 'the JavaScript view shows the same text with the chip as a name; the composer view shows the chip, the operator and the literal', { js: jsAfter, chips: chipsView });
    await shot('composer');
    const n0 = await shows();
    await clickText('.composer .foot button', 'Save'); await rebuilt(n0);
    const nodes = onDisk(SIGN + 'nodes.json').nodes; const wires = onDisk(SIGN + 'connections.json').connections;
    const expr = nodes.find((n) => n.type === 'Expression' && n.metadata?.composedFor?.node === title1 && n.metadata.composedFor.port === 'text');
    const name = expr && Object.keys(expr).length && (expr.parameters.expression.match(/[A-Za-z_$][\w$]*/) || [])[0];
    const chipWire = expr && wires.find((w) => w.fromId === stateId && w.fromProperty === 'value' && w.toId === expr.id && w.toProperty === name);
    const resultWire = expr && wires.find((w) => w.fromId === expr.id && w.fromProperty === 'result' && w.toId === title1 && w.toProperty === 'text');
    ok(expr && chipWire && resultWire, 'Save writes one Expression node for the field: the chip is a name wired from the state\'s value, the result is wired into the title\'s Text', { text: expr?.parameters?.expression, chipWire: !!chipWire, resultWire: !!resultWire });
    await wait(600);
    ok((await appText()).includes('Hello world'), 'the app shows "Hello world": the state\'s default through the composed expression into the title', { text: (await appText()).slice(0, 80) });
  }
  console.log('check: Workflow');
  await b.clickSel('[data-tab=workflow]'); await wait(300);
  const events = await b.evaluate('[...document.querySelectorAll("#events .row")].map(r => r.firstChild.textContent)');
  ok(events.some((e) => /^When Sign in: /.test(e)) && events.some((e) => /^When Create account: /.test(e)), 'the sign-in page lists its button events', events);
  await b.evaluate(`[...document.querySelectorAll("#events .row")].find(r => r.firstChild.textContent.startsWith("When Sign in: ")).click()`); await wait(300);
  const steps = await b.evaluate('[...document.querySelectorAll("#steps .step h3")].map(r => r.firstChild.textContent)');
  ok(steps.length >= 1 && /Log In/i.test(steps[0]), 'the Sign in click\'s first step is the Log In action', steps);
  await b.clickSel('#steps .step .acts button'); await wait(200);
  const fields = await b.evaluate(`[...document.querySelectorAll('#steps .step .settings')].filter(p => p.style.display !== 'none').flatMap(p => [...p.querySelectorAll('.field label')].map(l => l.textContent))`);
  ok(fields.length > 0, 'a step opens its settings as fields', fields.slice(0, 6));
  await b.clickSel('#steps .step .acts button'); await wait(100);
  {
    // a new workflow on the card's own event, with a branch: Yes gets "Set state", No gets "Go to page", the condition is composed
    await b.clickSel('#newevent'); await wait(250);
    await b.type('Sign-in card'); await wait(200);
    const first = await b.evaluate(`document.querySelector('.menu .item')?.textContent`);
    await b.clickSel('.menu .item'); await wait(300);
    const evPort = (first.match(/: (.+?)[A-Z][a-z]+ *$/) || [])[1];
    await clickText('#steps .addrow button', 'Add a branch'); await wait(300);
    await b.until('document.querySelector("#steps .step.cond")', 5000);
    let wires = onDisk(SIGN + 'connections.json').connections; let nodes = onDisk(SIGN + 'nodes.json').nodes;
    const cond = nodes.find((n) => n.type === 'Condition' && wires.some((w) => w.fromId === card && w.toId === n.id && w.toProperty === 'eval'));
    ok(cond, 'Add a branch on the card\'s event writes a Condition node wired from that signal into Evaluate', { event: first, condition: cond?.id });
    const cols = await b.evaluate(`[...document.querySelectorAll('#steps .branch h4')].map(h => h.textContent)`);
    ok(cols.join(',') === 'Yes,No', 'the branch shows a Yes column and a No column under the step', cols);
    await clickText('#steps .branch.no .addrow button', 'Add an action'); await wait(250);
    await b.type('Go to page'); await wait(200); await menuItem('Go to page');
    await wait(500);
    wires = onDisk(SIGN + 'connections.json').connections; nodes = onDisk(SIGN + 'nodes.json').nodes;
    const noNav = nodes.find((n) => n.type === 'RouterNavigate' && wires.some((w) => w.fromId === cond.id && w.fromProperty === 'onfalse' && w.toId === n.id && w.toProperty === 'navigate'));
    const yesEmpty = !wires.some((w) => w.fromId === cond.id && w.fromProperty === 'ontrue');
    ok(noNav && yesEmpty, 'an action added in the No column is a Navigate wired from the Condition\'s On False; the Yes column is still empty', { noNav: !!noNav, yesEmpty });
    await clickText('#steps .branch.yes .addrow button', 'Add an action'); await wait(250);
    await b.type('custom state'); await wait(200); await menuItem('Set a custom state');
    await b.until(`[...document.querySelectorAll('.menu .item')].some(e => e.textContent.includes("Sign-in card's state"))`, 4000);
    await menuItem("Sign-in card's state"); await wait(500);
    wires = onDisk(SIGN + 'connections.json').connections; nodes = onDisk(SIGN + 'nodes.json').nodes;
    const setV = nodes.find((n) => n.type === 'Set Variable' && wires.some((w) => w.fromId === cond.id && w.fromProperty === 'ontrue' && w.toId === n.id && w.toProperty === 'do'));
    ok(setV && setV.parameters?.name === 'signInCard.state', 'Set a custom state in the Yes column is a Set Variable step wired from On True, its name the card\'s state', { name: setV?.parameters?.name });
    // the condition, composed in JavaScript
    await clickText('#steps .step.cond button', 'Set the condition'); await wait(250);
    await menuItem('Compose an expression');
    await b.evaluate(`[...document.querySelectorAll('.composer .seg button')].find(b => b.dataset.m === 'js').click()`); await wait(100);
    await b.evaluate(`document.querySelector('.composer textarea').focus()`); await b.type('1 > 2');
    await shot('workflow-branch');
    await clickText('.composer .foot button', 'Save'); await wait(800);
    wires = onDisk(SIGN + 'connections.json').connections; nodes = onDisk(SIGN + 'nodes.json').nodes;
    const condExpr = nodes.find((n) => n.type === 'Expression' && n.metadata?.composedFor?.node === cond.id && n.metadata.composedFor.port === 'condition');
    ok(condExpr && condExpr.parameters.expression === '1 > 2' && wires.some((w) => w.fromId === condExpr.id && w.fromProperty === 'result' && w.toId === cond.id && w.toProperty === 'condition'), 'the branch\'s condition is an Expression (1 > 2) wired into the Condition\'s input', { expression: condExpr?.parameters?.expression });
    const shown = await b.evaluate(`document.querySelector('#steps .step.cond .cond-line')?.textContent`);
    ok(/1 > 2/.test(shown || ''), 'the branch card reads the condition back', shown);
  }
  console.log('check: Data');
  await b.clickSel('[data-tab=data]'); await wait(300);
  await b.evaluate(`window.prompt = () => 'Note'`); await b.clickSel('#newtype'); await wait(800);
  ok(onDisk('nodegx.project.json').metadata.dbCollections.some((c) => c.name === 'Note'), 'a new data type is written into nodegx.project.json');
  await b.evaluate(`window.prompt = () => 'title'`); await clickText('#datamain .bar button', 'New field'); await wait(800);
  ok(onDisk('nodegx.project.json').metadata.dbCollections.find((c) => c.name === 'Note').columns.some((c) => c.name === 'title'), 'a new field is written into the type');
  await wait(1200);
  await clickText('#datamain .bar button', 'New entry'); await wait(1500);
  const rows = await fetch(`http://127.0.0.1:${backendPort}/classes/Note?limit=10`, { headers: { 'X-Parse-Application-Id': 'open_bubble_check' } }).then((r) => r.json());
  ok(rows.results?.length === 1, '"+ New entry" creates a row on the backend', { rows: rows.results?.length });
  await shot('data');
  {
    await b.clickSel('#data .subtabs button[data-sub=options]'); await wait(200);
    await b.evaluate(`window.prompt = () => 'Priorities'`); const n0 = await shows(); await b.clickSel('#newoptset'); await rebuilt(n0);
    const key = 'components/Option sets/Priorities/';
    ok(existsSync(join(project, key + 'nodes.json')) && onDisk('components/_registry.json').components['Option sets/Priorities']?.type === 'logic' && onDisk(key + 'nodes.json').nodes.some((n) => n.type === 'Static Data'), 'a new option set is a logic component on disk with a Static Data node, in the registry');
    await b.evaluate(`window.prompt = () => 'rank'`); await clickText('#optmain .bar button', 'New attribute'); await wait(700);
    for (const name of ['High', 'Low']) { await b.evaluate(`(() => { const i = document.querySelector('#optmain input[placeholder^="New option"]'); i.focus(); i.value = ''; })()`); await b.type(name); await b.key('Enter', 'Enter', 13); await wait(700); }
    const data = onDisk(key + 'nodes.json').nodes.find((n) => n.type === 'Static Data');
    const json = JSON.parse(data.parameters.json);
    const attrs = onDisk(key + 'component.json').metadata?.optionSet?.attributes?.map((a) => a.name);
    ok(json.length === 2 && json[0].display === 'High' && json[1].display === 'Low' && attrs?.includes('rank'), 'two options and an attribute are the Static Data\'s JSON and the component\'s metadata on disk', { json, attrs });
    await shot('option-sets');
    await wait(800);
    ok((await status()).startsWith('App on screen'), 'the app still validates and draws with the option set in the project', await status());
  }
  console.log('check: Styles');
  await b.clickSel('[data-tab=design]'); await wait(400);
  {
    await select(signInBtn);
    const bgSign0 = await b.evaluate(`__ob.preview.frame.contentWindow.getComputedStyle(__ob.preview.elementsOf(${JSON.stringify(signInBtn)})[0]).backgroundColor`);
    await b.evaluate(`window.prompt = () => 'Primary'`);
    let n0 = await shows(); await clickText('#right button', 'Save as a style'); await rebuilt(n0);
    const styles = onDisk('nodegx.styles.json');
    const v = styles.variants?.find((x) => x.name === 'Primary' && x.typename === 'net.noodl.controls.button');
    ok(v && v.parameters.backgroundColor === 'var(--primary)' && onDisk(SIGN + 'nodes.json').nodes.find((n) => n.id === signInBtn).variant === 'Primary', 'Save as a style writes a variant of the button type into nodegx.styles.json with the button\'s look, and the button wears it', { parameters: Object.keys(v?.parameters || {}).length });
    const bgBefore = await b.evaluate(`__ob.preview.frame.contentWindow.getComputedStyle(__ob.preview.elementsOf(${JSON.stringify(createBtn)})[0]).backgroundColor`);
    await select(createBtn);
    n0 = await shows();
    await b.evaluate(`(() => { const s = [...document.querySelectorAll('#right select')].find(s => s.options[0].textContent === '(no style)'); s.value = 'Primary'; s.dispatchEvent(new Event('change')); })()`);
    await rebuilt(n0);
    const bgSign = await b.evaluate(`__ob.preview.frame.contentWindow.getComputedStyle(__ob.preview.elementsOf(${JSON.stringify(signInBtn)})[0]).backgroundColor`);
    const bgAfter = await b.evaluate(`__ob.preview.frame.contentWindow.getComputedStyle(__ob.preview.elementsOf(${JSON.stringify(createBtn)})[0]).backgroundColor`);
    // P123-S2-VARIANTLOST: the first button must keep the colour it had before it wore the style (the kit's export used to drop every node's variant, and both buttons went the runtime's default black)
    ok(onDisk(SIGN + 'nodes.json').nodes.find((n) => n.id === createBtn).variant === 'Primary' && bgAfter === bgSign && bgBefore !== bgAfter && bgSign === bgSign0, 'picking the style on the other button writes its variant and the app draws it as the first, which kept its own colour', { bgBefore, bgAfter, bgSign, bgSign0 });
    await b.clickSel('[data-tab=styles]'); await wait(300);
    await b.evaluate(`[...document.querySelectorAll('#stylelist .row')].find(r => r.textContent.includes('Primary')).click()`); await wait(300);
    const wearers = await b.evaluate(`document.querySelector('#stylemain .card h4')?.textContent`);
    ok(/· 2$/.test(wearers || ''), 'the Styles tab lists the two buttons wearing it', wearers);
    await shot('styles');
    await b.clickSel('[data-tab=design]'); await wait(300); await shot('design');
    await b.clickSel('[data-tab=workflow]'); await wait(300); await shot('workflow');
  }
  ok((await status()).startsWith('App on screen'), 'after every edit the app still validates and draws', await status());
  const problems = b.problems.filter((p) => !/Invalid connection|doesn't have a port|Failed to load resource|fonts\.g|^\[noodl\]/.test(p)); // `[noodl]` lines are the app's own runtime (a Navigate with no target yet), not the editor
  ok(problems.length === 0, 'no exceptions in the editor page', problems.slice(0, 3));
} catch (err) {
  ok(false, `the gate itself: ${err.message.split('\n')[0]}`);
  console.log(err.stack?.split('\n').slice(0, 4).join('\n'));
} finally {
  try { await b?.close(); } catch { /* gone */ }
  for (const c of children) c.kill();
  rmSync(tmp, { recursive: true, force: true });
}
const passed = results.filter((r) => r.cond).length;
console.log(`check: ${passed === results.length ? 'PASS' : 'FAIL'} ${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
