/**
 * NodeGX Studio — the run timeline's gate (STU-031).
 *
 * First on fixtures (no browser): ./timeline.mjs reads a request into a page data row with its start and end, a card's
 * event and the signals into what it reaches into one workflow row, a signal no card explains into a minor row,
 * changes to one element close together into one screen row, and leaves out what happened before Record.
 *
 * Then on the todo-list template, with a backend, in headless Chrome: a visitor signs up in the app and adds a task;
 * Todo is opened in Studio and "Record the page opening" pressed; Stop. Every assertion is checked against a witness
 * read straight from the app's frame, not from Studio's rows: the probe's own request log, the runtime's own trace
 * and the frame's document.
 *   - the Task query's row starts and ends on the millisecond the request did (the probe's log), and names the query
 *     node whose `items` came out with the answer (the trace), linking to the element on the page that holds it;
 *   - the task list's row is after the Task query's end and carries the task's title, which the list holds now;
 *   - the page-open workflow is one row, linked to its card; clicking it opens that card, clicking the query's row
 *     selects its element in Design;
 *   - then Record from now, a second task added: the Add button's card is a row, before the create request's row.
 *   - Record waits for the app and stops by itself once the run is over (STU-033); the steps of every run are marks
 *     on the Workflows lane, and ▶ / ← go through them one at a time with their in and out; a write whose answer is
 *     held 3 s at the network keeps the recording open until it comes.
 *   - a run that leaves the page (Sign out on Todo lands on Sign in): Sign in's Did Mount is a run of its own card,
 *     and its row opens Sign in at that card.
 *
 *   node editor/timeline-check.mjs [--shots]     PASS n/n and exit 0, or the failing lines and exit 1
 *   TIMELINE_DUMP=1 node editor/timeline-check.mjs   also prints every row of the page opening's recording
 */
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browser } from '/Users/richardosborne/vscode_projects/nodegx-studio/editor/cdp.mjs';
import { buildTimeline, lastRunOf, msText, shotAt, stepValues } from '/Users/richardosborne/vscode_projects/nodegx-studio/editor/timeline.mjs';
import { runOver, lastActivity, QUIET_MS } from '/Users/richardosborne/vscode_projects/nodegx-studio/editor/runwatch.mjs';
import { kit } from '/Users/richardosborne/vscode_projects/nodegx-studio/lib/nodegx.mjs';

const here = '/Users/richardosborne/vscode_projects/nodegx-studio/editor';
const shots = process.argv.includes('--shots');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (cond, what, detail) => { results.push(!!cond); console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${what}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, cond ? 300 : 2400) : ''}`); };

console.log('timeline: fixtures');
{
  const label = (id) => ({ btn: 'Save', step1: 'Create a record', step2: 'Go to the list', list: 'Task list', inner: 'Row text', js: 'Run JavaScript' }[id] ?? id);
  const pageNode = (id) => (id === 'inner' ? 'list' : ['btn', 'step1', 'step2', 'list'].includes(id) ? id : null);
  const cards = [{ node: 'btn', port: 'onClick', name: 'Save → Go to the list', when: 'When Save: Click', reach: new Set(['step1', 'step2']) }];
  const trace = [
    { seq: 1, t: 90, kind: 'signal', fromNode: 'btn', fromPort: 'onClick', toNode: 'step1', toPort: 'store' }, // before Record
    { seq: 2, t: 110, kind: 'signal', fromNode: 'btn', fromPort: 'onClick', toNode: 'step1', toPort: 'store' },
    { seq: 3, t: 112, kind: 'value', fromNode: 'btn', fromPort: 'label', toNode: 'step1', toPort: 'x' },
    { seq: 4, t: 140, kind: 'signal', fromNode: 'step1', fromPort: 'stored', toNode: 'step2', toPort: 'navigate' },
    { seq: 5, t: 150, kind: 'signal', fromNode: 'js', fromPort: 'done', toNode: 'inner', toPort: 'refresh' },
    { seq: 6, t: 141, kind: 'value', fromNode: 'q1', fromPort: 'items', toNode: 'list', toPort: 'items' }
  ];
  const log = [
    { kind: 'request', method: 'POST', path: '/classes/Task', body: { _method: 'GET' }, t0: 80, t1: 95, status: 200, rows: 2 }, // before Record
    { kind: 'request', method: 'POST', path: '/classes/Task', body: { _method: 'GET' }, t0: 120, t1: 140.4, status: 200, rows: 3 },
    { kind: 'request', method: 'POST', path: '/classes/Project', body: { _method: 'GET' }, t0: 125, t1: 160, status: 200, rows: 0 },
    { kind: 'request', method: 'POST', path: '/classes/Task', body: { title: 'x' }, t0: 111, t1: 130, status: 201 },
    { kind: 'nav', path: '/todo', t: 145 }
  ];
  const screen = [{ t: 141, node: 'list', added: 2, removed: 0, text: 'Buy milk' }, { t: 150, node: 'list', added: 1, removed: 0, text: 'Water the plants' }, { t: 200, node: 'list', added: 0, removed: 0, text: '' }, { t: 151, node: null, added: 4, removed: 3, text: '' }];
  const asked = [];
  const asker = (collection, e) => { asked.push(collection); return collection === 'Task' ? { name: 'Tasks', link: { node: 'list' } } : null; };
  const tl = buildTimeline({ t0: 100, t1: 300, trace, log, screen, cards, label, pageNode, asker });
  const of = (lane) => tl.rows.filter((r) => r.lane === lane);
  const q = of('data').find((r) => r.collection === 'Task' && r.text.includes('asks'));
  ok(q && q.t === 20 && Math.abs(q.end - 40.4) < 1e-9 && q.text === 'Tasks asks for Task' && q.link?.node === 'list' && /3 rows/.test(q.sub), 'a query is one page data row: its start and end from Record, its rows, named by the query that asked', q);
  ok(!of('data').some((r) => r.t < 0) && of('data').length === 3, 'a request made before Record is not in the recording', of('data').map((r) => r.text));
  const js = of('data').find((r) => r.collection === 'Project');
  ok(js && js.text === 'JavaScript asks for Project' && js.link === null, 'a query no query node asks for was asked from JavaScript, and links nowhere', js);
  ok(of('data').some((r) => r.text === 'The app creates a Task' && !asked.includes(undefined)) && asked.length === 2, 'a write is said as what it does, and only a query is given an asker', { asked });
  const runs = of('workflow').filter((r) => !r.minor);
  ok(runs.length === 1 && runs[0].t === 10 && runs[0].end === 40 && runs[0].link?.card?.node === 'btn' && /2 steps/.test(runs[0].sub), "a card's event and the signals into what it reaches are one workflow row, linked to the card", runs);
  const minor = of('workflow').filter((r) => r.minor);
  ok(minor.length === 1 && minor[0].link?.node === 'list' && tl.loose === 1, 'a signal no card starts is a minor row, linked to the page element holding it', minor);
  const sc = of('screen');
  const listRow = sc.find((r) => r.node === 'list' && r.t === 41);
  ok(listRow && /3 elements drawn/.test(listRow.sub) && listRow.texts.join('|') === 'Buy milk|Water the plants', 'changes to one element within 30 ms are one screen row, its elements and its words added up', listRow);
  ok(sc.some((r) => r.node === 'list' && r.t === 100 && /empty/.test(r.sub)) && sc.some((r) => r.text === 'The page draws' && r.link === null) && sc.some((r) => r.text === 'The app goes to /todo'), 'a later change to the same element is its own row, a change outside every element is the page, a move is a row', sc.map((r) => `${r.t} ${r.text} ${r.sub}`));
  ok(tl.rows.every((r, i, a) => i === 0 || a[i - 1].t <= r.t), 'the rows are in the order things happened', tl.rows.map((r) => r.t));
  ok(tl.length === 200 && tl.span >= 100 && tl.span < 110 && tl.from === 0, 'the axis runs to the last thing that happened, not to Stop', { length: tl.length, span: tl.span, from: tl.from });
  ok(runs[0]?.steps?.map((x) => `${x.name}.${x.port}@${x.t}`).join('|') === 'Create a record.store@10|Go to the list.navigate@40', "a run carries its steps, each the node a signal ran, on the recording's clock", runs[0]?.steps);
  // STU-032: a step's inputs and outputs, off the trace
  {
    const tr = [
      { seq: 1, t: 1, kind: 'value', fromNode: 'input', fromPort: 'text', toNode: 'make', toPort: 'title', value: '"Milk"' },
      { seq: 2, t: 2, kind: 'value', fromNode: 'input', fromPort: 'text', toNode: 'make', toPort: 'title', value: '"Buy milk"' },
      { seq: 3, t: 5, kind: 'signal', fromNode: 'btn', fromPort: 'onClick', toNode: 'make', toPort: 'store', value: '' },
      { seq: 4, t: 6, kind: 'value', fromNode: 'make', fromPort: 'id', toNode: 'list', toPort: 'id', value: '"a1"' },
      { seq: 5, t: 7, kind: 'value', fromNode: 'input', fromPort: 'text', toNode: 'make', toPort: 'title', value: '"later"' },
      { seq: 6, t: 25, kind: 'signal', fromNode: 'make', fromPort: 'stored', toNode: 'nav', toPort: 'go', value: '' },
      { seq: 7, t: 25, kind: 'signal', fromNode: 'make', fromPort: 'stored', toNode: 'toast', toPort: 'show', value: '' },
      { seq: 8, t: 40, kind: 'signal', fromNode: 'btn', fromPort: 'onClick', toNode: 'make', toPort: 'store', value: '' },
      { seq: 9, t: 41, kind: 'value', fromNode: 'make', fromPort: 'id', toNode: 'list', toPort: 'id', value: '"b2"' }
    ];
    const io = stepValues(tr)(tr[2], [['collection', 'Task'], ['title', 'unused: wired'], ['store', true]]);
    ok(JSON.stringify(io.ins) === JSON.stringify([{ port: 'title', value: '"Buy milk"' }, { port: 'collection', value: '"Task"', set: true }]),
      "a step's inputs: the last value into each wired input before its signal (not one after), then its settings where nothing is wired", io.ins);
    ok(JSON.stringify(io.outs) === JSON.stringify([{ port: 'id', value: '"a1"', t: 1 }, { port: 'stored', signal: true, t: 20 }]),
      "its outputs: what it sent after its signal and before the next signal into it, a signal once however many wires", io.outs);
    ok(shotAt([{ t: 10 }, { t: 20 }, { t: 30 }], 5) === -1 && shotAt([{ t: 10 }, { t: 20 }, { t: 30 }], 20) === 1 && shotAt([{ t: 10 }, { t: 20 }, { t: 30 }], 29.9) === 1 && shotAt([{ t: 10 }, { t: 20 }, { t: 30 }], 99) === 2,
      'the screen at a moment is the last copy taken at or before it, none before the first');
  }
  // STU-033: when a recorded run is over
  {
    const req = (t0, t1) => ({ kind: 'request', t0, t1 });
    const v1 = runOver({ now: 20000, t0: 100, last: 120, requests: [req(110)] });
    const v2 = runOver({ now: 20000, t0: 100, last: 120, requests: [req(50)] });
    ok(!v1.done && /answer from the backend/.test(v1.waiting) && v2.done,
      'a run is not over while a request it made waits for its answer, however long; a request from before the run does not hold it', { v1, v2 });
    const v3 = runOver({ now: 120 + QUIET_MS - 1, t0: 100, last: 120 }), v4 = runOver({ now: 120 + QUIET_MS, t0: 100, last: 120 });
    ok(!v3.done && v4.done && v3.waiting === null, `quiet for ${QUIET_MS} ms with nothing waiting, the run is over (a Did Mount a moment after a click is the same run)`, { v3, v4 });
    const v5 = runOver({ now: 5000, t0: 100, last: 120, timers: 1 }), v6 = runOver({ now: 40000, t0: 100, last: 120, timers: 1 });
    ok(!v5.done && v5.waiting === 'a timer' && v6.done, 'a timer the run set holds it open, for 30 s at most', { v5, v6 });
    ok(lastActivity(100, 120, [req(110, 3000), req(50, 9000)]) === 3000, "an answer is the run's last activity when it comes after its last signal (an answer to a request from before the run is not)");
  }
  // a card's event through a component's inputs: true then false, values, as Component Inputs sends a signal on
  {
    const cmdCards = [{ node: 'in', port: 'do', name: 'Add the task', when: 'When What to do: do', reach: new Set(['js', 'make']) }];
    const tr = [
      { seq: 1, t: 10, kind: 'value', fromNode: 'in', fromPort: 'title', toNode: 'js', toPort: 'in-title', value: '"Milk"' },
      { seq: 2, t: 10, kind: 'value', fromNode: 'in', fromPort: 'do', toNode: 'js', toPort: 'run', value: 'true' },
      { seq: 3, t: 10, kind: 'value', fromNode: 'in', fromPort: 'do', toNode: 'js', toPort: 'run', value: 'false' },
      { seq: 4, t: 11, kind: 'signal', fromNode: 'js', fromPort: 'out-go', toNode: 'make', toPort: 'store', value: '' }
    ];
    const cmdRuns = buildTimeline({ t0: 0, t1: 100, trace: tr, cards: cmdCards, label: (id) => id, pageNode: () => null, asker: () => null }).rows.filter((r) => r.lane === 'workflow');
    ok(cmdRuns.length === 1 && !cmdRuns[0].minor && cmdRuns[0].steps?.map((x) => x.node).join() === 'js,make' && JSON.stringify(cmdRuns[0].steps[0].ins) === JSON.stringify([{ port: 'in-title', value: '"Milk"' }]),
      "a card started by a signal into its component (a true out of Component Inputs) is a run with its steps, and the true and false are not among the step's inputs", cmdRuns);
  }
  const late = buildTimeline({ t0: 0, t1: 3000, log: [{ kind: 'request', method: 'POST', path: '/classes/Event', body: {}, t0: 2000, t1: 2100, status: 201 }], label, pageNode, asker });
  ok(late.from > 1900 && late.from < 2000 && late.rows[0].text === 'The app creates an Event', 'recorded from now, the axis starts at the first thing that happened; a word starting with a vowel takes "an"', { from: late.from, text: late.rows[0]?.text });
  // STU-026: a card's last run, lit up on the card: the wires it crossed, the steps it ran, the side its branch took
  {
    const both = [{ node: 'btn', port: 'onClick', reach: new Set(['cond', 'yes1', 'no1', 'after']) }, { node: 'other', port: 'onClick', reach: new Set(['after', 'more']) }];
    const tr = [
      { seq: 1, t: 10, kind: 'signal', fromNode: 'btn', fromPort: 'onClick', toNode: 'cond', toPort: 'eval' },
      { seq: 2, t: 10, kind: 'signal', fromNode: 'cond', fromPort: 'onfalse', toNode: 'no1', toPort: 'do' },
      { seq: 3, t: 50, kind: 'signal', fromNode: 'btn', fromPort: 'onClick', toNode: 'cond', toPort: 'eval' },
      { seq: 4, t: 50, kind: 'signal', fromNode: 'cond', fromPort: 'ontrue', toNode: 'yes1', toPort: 'do' },
      { seq: 5, t: 52, kind: 'signal', fromNode: 'yes1', fromPort: 'done', toNode: 'after', toPort: 'do' },
      { seq: 6, t: 80, kind: 'signal', fromNode: 'other', fromPort: 'onClick', toNode: 'after', toPort: 'do' },
      { seq: 7, t: 81, kind: 'signal', fromNode: 'after', fromPort: 'done', toNode: 'more', toPort: 'do' }
    ];
    const lr = lastRunOf(tr, both, { node: 'btn', port: 'onClick' });
    ok(lr && [...lr.edges].join() === 'btn>cond,cond>yes1,yes1>after' && [...lr.ran].sort().join() === 'after,btn,cond,yes1' && lr.sides.cond === 'yes' && lr.steps === 3 && lr.t === 50,
      "a card's last run is its latest one (Yes, not the No before it): the wires it crossed and the steps it ran; another card's run through a shared step is not it", lr && { edges: [...lr.edges], ran: [...lr.ran], sides: lr.sides });
    const first = lastRunOf(tr, both, { node: 'btn', port: 'onClick' }, 10);
    ok(first && [...first.edges].join() === 'btn>cond,cond>no1' && first.sides.cond === 'no' && first.t === 10 && lastRunOf(tr, both, { node: 'btn', port: 'onClick' }, 30) === null,
      "asked for the run that started at a time (a timeline row's), it is that one (No), not the latest; no run started then, none", first && { edges: [...first.edges], sides: first.sides });
    ok(lastRunOf(tr.slice(5), both, { node: 'btn', port: 'onClick' }) === null && lastRunOf([], [], { node: 'btn', port: 'onClick', reach: new Set() }) === null, 'a card that has not run in what the trace holds has no last run');
  }
}

// ---------------- the drive
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const lineFrom = (proc, pattern, ms = 30000) => new Promise((res, rej) => {
  let out = ''; const t = setTimeout(() => rej(new Error(`no "${pattern}" in ${ms} ms:\n${out.slice(-800)}`)), ms);
  const on = (d) => { out += d; const m = out.match(pattern); if (m) { clearTimeout(t); res(m); } };
  proc.stdout.on('data', on); proc.stderr.on('data', on);
});
const tmp = mkdtempSync(join(tmpdir(), 'nodegx-studio-timeline-'));
const project = join(tmp, 'todo-list');
cpSync(join(kit.templates, 'todo-list'), project, { recursive: true });
const children = [];
let b;
try {
  console.log('timeline: the todo template');
  const backendPort = await freePort();
  const backend = spawn(process.execPath, [kit.backendCli, 'serve', '--data-dir', join(tmp, 'backend'), '--port', String(backendPort), '--token', 'nodegx-studio-timeline', '--backend-id', 'nodegx_studio_timeline', '--backend-name', 'NodeGX Studio timeline', '--ephemeral'], { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(backend);
  await lineFrom(backend, /NODEGX_BACKEND_READY/);
  const pjPath = join(project, 'nodegx.project.json');
  const pj = JSON.parse(readFileSync(pjPath, 'utf8'));
  pj.metadata ??= {};
  pj.metadata.cloudservices = { instanceId: 'studio_timeline', endpoint: `http://127.0.0.1:${backendPort}`, appId: 'studio_timeline', type: 'nodegx' };
  writeFileSync(pjPath, JSON.stringify(pj, null, 2));
  const port = await freePort();
  const server = spawn(process.execPath, [join(here, 'serve.mjs'), project, '--port', String(port), ...(process.env.RUNTIME_DIR ? ['--runtime', process.env.RUNTIME_DIR] : [])], { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(server);
  await lineFrom(server, /nodegx-studio: http/);
  b = await browser({ port: await freePort(), width: 1600, height: 1000 });
  await b.goto(`http://127.0.0.1:${port}/`);
  await b.waitTitle((t) => t.startsWith('ready'), 90000);
  await wait(1500);

  const W = '__ob.preview.frame.contentWindow';
  const files = (key) => ({ nodes: JSON.parse(readFileSync(join(project, 'components', key, 'nodes.json'), 'utf8')).nodes, connections: JSON.parse(readFileSync(join(project, 'components', key, 'connections.json'), 'utf8')).connections });
  const shows = () => b.evaluate('__ob.shows || 0');
  const rebuilt = async (n0) => { await b.until(`(__ob.shows || 0) > ${n0} && document.getElementById("status").textContent.startsWith("App on screen")`, 30000); await wait(400); };
  const typeInto = (expr, text) => b.evaluate(`(() => { const w = ${W}; const input = ${expr}; if (!input) return false; input.focus(); w.Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(text)}); input.dispatchEvent(new w.Event('input', { bubbles: true })); return true; })()`);
  const inputOf = (id) => `(() => { const el = __ob.preview.elementsOf(${JSON.stringify(id)})[0]; return el && (el.matches('input') ? el : el.querySelector('input')); })()`;
  const addTask = async (title) => {
    const typed = await typeInto(`[...${W}.document.querySelectorAll('input[type=text], input:not([type])')].find(i => i.offsetParent)`, title);
    await wait(300);
    const pressed = await b.evaluate(`(() => { const btn = [...${W}.document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Add' && e.offsetParent); if (!btn) return false; btn.click(); return true; })()`);
    const shown = await b.until(`${W}.document.body.innerText.includes(${JSON.stringify(title)})`, 10000);
    return typed && pressed && !!shown;
  };
  const rowsNow = async () => JSON.parse(await b.evaluate(`JSON.stringify([...document.querySelectorAll('#tlrows .tlrow')].map(r => ({ lane: r.dataset.lane, t: Number(r.dataset.t), end: r.dataset.end === undefined ? null : Number(r.dataset.end), link: r.dataset.link || null, text: r.querySelector('.what').firstChild.textContent, sub: r.querySelector('small').textContent })))`));
  const recState = () => b.evaluate(`document.getElementById('recbtn').textContent`);

  // a visitor signs up in the app (Todo sends a signed-out visitor to Sign in) and adds a task
  const sign = files('Pages/Sign in').nodes, idOf = (l) => sign.find((n) => n.label === l)?.id;
  await typeInto(inputOf(idOf('Email')), `timeline${Date.now()}@example.com`); await typeInto(inputOf(idOf('Password')), 'timeline-password-1');
  await wait(300);
  await b.evaluate(`(() => { const el = __ob.preview.elementsOf(${JSON.stringify(idOf('Create account'))})[0]; (el.matches('button') ? el : el.querySelector('button') || el).click(); })()`);
  const signedUp = await b.until(`${W}.__studioLog.some(e => e.kind === 'nav' && /todo/i.test(e.path))`, 15000);
  await wait(2500);
  const TITLE = 'Read the run timeline';
  ok(signedUp && await addTask(TITLE), 'the visitor signs up in the app and adds a task', { signedUp });

  // Todo opened in Studio; the visitor is still signed in, so the app stays on it
  let n0 = await shows();
  await b.evaluate(`(() => { const s = document.getElementById('pagepick'); s.value = 'Pages/Todo'; s.dispatchEvent(new Event('change')); })()`);
  await rebuilt(n0); await wait(1200);
  ok((await b.evaluate('document.getElementById("pagepick").value')) === 'Pages/Todo' && (await b.evaluate(`${W}.document.body.innerText.includes(${JSON.stringify(TITLE)})`)), 'Studio shows Todo, signed in, the task in its list');

  // ---- Record the page opening, Stop
  await b.clickSel('#recbtn'); await wait(300);
  ok(/^Waiting for the app/.test(await recState()) && !(await b.evaluate(`document.getElementById('timeline').hidden`)) && !(await b.evaluate('!!__ob.timeline')), 'Record waits for the app (nothing recorded yet) and opens the timeline under the page', await recState());
  n0 = await shows();
  await b.clickSel('#tlopen');
  await rebuilt(n0);
  // no Stop: the opening's queries answered and its lists drawn, it stops by itself
  const stoppedItself = await b.until(`/^Record/.test(document.getElementById('recbtn').textContent) && !!__ob.timeline`, 20000);
  ok(stoppedItself, 'the page opening is recorded and the recording stops by itself once the page has finished opening', await recState());
  const rows = await rowsNow();

  // the witnesses, read from the frame: the probe's requests, the runtime's trace, the document
  const truth = JSON.parse(await b.evaluate(`JSON.stringify((() => {
    const w = ${W}, ctx = w.Noodl.Navigation._noodlRuntime.context;
    const reqs = w.__studioLog.filter(e => e.kind === 'request' && /\\/classes\\/Task$/.test(e.path) && e.body && e.body._method === 'GET');
    const outs = ctx.getTraceEvents(0).filter(e => e.fromPort === 'items').map(e => ({ node: e.fromNode, t: e.t }));
    return { reqs: reqs.map(e => ({ t0: e.t0, t1: e.t1, rows: e.rows })), outs, fresh: w.performance.now() };
  })())`));
  // the query node: a Task query in the files whose items came out with the first Task answer
  const where = new Map();
  for (const key of Object.keys(JSON.parse(readFileSync(join(project, 'components/_registry.json'), 'utf8')).components)) for (const n of files(key).nodes) where.set(n.id, { key, node: n });
  const taskQueries = [...where.values()].filter(({ node }) => node.type === 'DbCollection2' && node.parameters?.collectionName === 'Task');
  const first = truth.reqs[0];
  const asked = first && taskQueries.find(({ node }) => truth.outs.some((o) => o.node === node.id && Math.abs(o.t - first.t1) <= 5));
  const todo = files('Pages/Todo').nodes;
  const holderOf = (key) => todo.find((n) => n.type === '/' + key)?.id;
  const holder = asked && (holderOf(asked.key) ?? null);
  const dataRow = first && rows.find((r) => r.lane === 'data' && r.t === Math.round(first.t0));
  ok(first && dataRow && dataRow.end === Math.round(first.t1), "the Task query's row starts and ends where the request did (the probe's log)", { first, dataRow });
  ok(asked && dataRow?.text.startsWith(asked.node.label || 'Query Task') && dataRow.link === `node:${holder}`, "it names the query whose items came out with the answer (the trace) and links to the element holding it", { asked: asked?.node.label, key: asked?.key, holder, row: dataRow && { text: dataRow.text, link: dataRow.link } });
  const listId = todo.find((n) => n.type === '/Todo/Task list')?.id;
  // the copy draws through its roots (the preview maps no element to a copy): read them off the runtime
  const listHolds = await b.evaluate(`(() => { const c = ${W}.Noodl.Navigation._noodlRuntime.context.rootComponent.nodeScope.getNodesWithIdRecursive(${JSON.stringify(listId)})[0]; return (c?.getRoots?.() || []).some((r) => (r.getDOMElement?.()?.innerText || '').includes(${JSON.stringify(TITLE)})); })()`);
  const listRow = rows.find((r) => r.lane === 'screen' && r.link === `node:${listId}` && r.sub.includes(TITLE));
  ok(listHolds && listRow && listRow.t >= dataRow?.end, "the task list draws its task after the query's answer (the list holds it now)", { listHolds, listRow, queryEnd: dataRow?.end, screen: rows.filter((r) => r.lane === 'screen').slice(0, 12).map((r) => `${r.t} ${r.link} ${r.text} | ${r.sub.slice(0, 60)}`) });
  // the page-open workflow: the Page's Did Mount, wired in the files
  const pageNode = todo.find((n) => n.type === 'Page')?.id;
  const opens = files('Pages/Todo').connections.filter((c) => c.fromId === pageNode && /mount/i.test(c.fromProperty));
  const openRow = rows.find((r) => r.lane === 'workflow' && opens.some((c) => r.link === `card:${pageNode}.${c.fromProperty}`));
  ok(opens.length && openRow, "the page's own workflow on open is a row, linked to its card", { opens: opens.map((c) => c.fromProperty), openRow });
  ok(rows.length && rows.every((r, i) => i === 0 || rows[i - 1].t <= r.t), 'the rows are in time order', rows.slice(0, 6).map((r) => r.t));
  if (shots) await b.screenshot(join(here, '..', 'docs', 'look', 'stu-031-timeline.png'));

  // ---- STU-032: the screen as it was. A row clicked moves the playhead to it; the pane draws the probe's copy of
  // the page then. Graded against what the rows say happened (the list draws the task after the query's answer) and
  // against the app itself (at the end the copy says what the app says now)
  const replay = () => b.evaluate(`JSON.stringify((() => { const f = document.getElementById('tlsframe'), d = f.contentDocument; return { pane: !document.getElementById('tlscreen').hidden, at: document.getElementById('tlsat').textContent, note: document.getElementById('tlsnote').textContent, shot: f.dataset.shot, shown: !f.hidden, none: !document.getElementById('tlsnone').hidden, text: f.hidden || !d?.body ? '' : d.body.innerText, fields: f.hidden || !d?.body ? [] : [...d.body.querySelectorAll('input')].map(i => i.value), scripts: f.hidden || !d?.body ? 0 : d.body.querySelectorAll('script').length, ran: !!(f.contentWindow && f.contentWindow.Noodl), seen: { copy: getComputedStyle(f).display !== 'none', none: getComputedStyle(document.getElementById('tlsnone')).display !== 'none', big: (() => { const r = document.getElementById('tlbig').getBoundingClientRect(), p = document.getElementById('tlscreen').getBoundingClientRect(); return r.width > 30 && r.right <= p.right + 0.5; })() } }; })())`).then(JSON.parse);
  const loaded = async (shot) => { if (shot === '-1' || shot === undefined || shot === null) return; await b.until(`document.getElementById('tlsframe').dataset.shot === ${JSON.stringify(String(shot))} && document.getElementById('tlsframe').contentDocument?.readyState === 'complete' && document.getElementById('tlsframe').contentDocument.body?.innerText.length > 0`, 8000); await wait(150); };
  const atRow = async (sel) => { await b.evaluate(`${sel}.click()`); await wait(300); const shot = await b.evaluate(`document.getElementById('tlsframe').dataset.shot`); await loaded(shot); return replay(); };
  const nShots = await b.evaluate(`__ob.timeline.shots?.list.length || 0`);
  const end = await replay();
  const live = await b.evaluate(`${W}.document.body.innerText`);
  ok(nShots >= 2 && end.pane && end.shown && end.text.includes(TITLE) && end.seen.copy && !end.seen.none && end.seen.big && end.text.replace(/\s+/g, ' ').trim() === live.replace(/\s+/g, ' ').trim() && !end.ran,
    'the screen as it was: at the end of the recording the copy says what the app says now, drawn without running the app, on screen with nothing over it and its Larger button whole', { nShots, end: { ...end, text: end.text.slice(0, 120) }, live: live.slice(0, 120) });
  const before = dataRow && await atRow(`[...document.querySelectorAll('#tlrows .tlrow')].find(r => r.dataset.lane === 'data' && Number(r.dataset.t) === ${dataRow.t})`);
  const after = listRow && await atRow(`[...document.querySelectorAll('#tlrows .tlrow')].find(r => r.dataset.lane === 'screen' && Number(r.dataset.t) === ${listRow.t} && r.querySelector('small').textContent.includes(${JSON.stringify(TITLE)}))`);
  ok(before && after && !before.text.includes(TITLE) && before.at === `The screen at ${msText(dataRow.t)}` && after.text.includes(TITLE) && after.at === `The screen at ${msText(listRow.end ?? listRow.t)}` && !after.text.includes('enable JavaScript') && after.scripts === 0,
    "scrubbed to the Task query's start the list has no task on screen; to the row where the list draws it, it does (with its values, and none of the page's scripts or its no-JavaScript notice)", { before: before && { ...before, text: before.text.slice(0, 160) }, after: after && { ...after, text: after.text.slice(0, 160) } });
  // dragging on the axis moves the playhead to where it is let go, and the screen with it
  // pressed on the time labels under the lanes, so the press is never on a row's mark
  const track = JSON.parse(await b.evaluate(`JSON.stringify(document.querySelector('#tlaxis .track').getBoundingClientRect())`));
  const ticks = JSON.parse(await b.evaluate(`JSON.stringify(document.querySelector('#tlaxis .ticks').getBoundingClientRect())`));
  // let go halfway between two rows in the middle of the recording, so some rows are before it and some after
  const aim = JSON.parse(await b.evaluate(`JSON.stringify((() => { const tl = __ob.timeline, ts = [...new Set(tl.rows.filter((r) => !r.minor).map((r) => Math.round(r.t)))].sort((a, b) => a - b), k = Math.floor(ts.length / 2) - 1, t = (ts[k] + ts[k + 1]) / 2; return { t, f: (t - tl.from) / (tl.span - tl.from) }; })())`));
  const y = ticks.y + ticks.height / 2, x0 = track.x + 4, x1 = track.x + track.width * aim.f;
  await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x0, y, button: 'left', clickCount: 1 });
  for (let k = 1; k <= 5; k++) await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0 + ((x1 - x0) * k) / 5, y, button: 'left', buttons: 1 });
  await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x1, y, button: 'left', clickCount: 1 });
  await wait(400);
  const dragged = JSON.parse(await b.evaluate(`JSON.stringify({ at: document.getElementById('tlsat').textContent, want: ${aim.t}, later: document.querySelectorAll('#tlrows .tlrow.later').length, rows: document.querySelectorAll('#tlrows .tlrow').length, left: document.getElementById('tlplay').style.left })`));
  const ms = Number(/at ([\d.]+) (m?s)/.exec(dragged.at)?.[1]) * (/ s$/.test(dragged.at) ? 1000 : 1);
  ok(Math.abs(ms - dragged.want) <= Math.max(3, dragged.want * 0.03) && Math.abs(parseFloat(dragged.left) - aim.f * 100) < 1 && dragged.later > 0 && dragged.later < dragged.rows,
    'dragging the playhead along the axis shows the screen at the moment it is let go, the rows after it marked as still to come', { ...dragged, aim });
  if (shots) {
    if (after) await atRow(`[...document.querySelectorAll('#tlrows .tlrow')].find(r => r.dataset.lane === 'screen' && Number(r.dataset.t) === ${listRow.t} && r.querySelector('small').textContent.includes(${JSON.stringify(TITLE)}))`);
    await b.screenshot(join(here, '..', 'docs', 'look', 'stu-032-scrub.png'));
  }
  {
    const flash = JSON.parse(await b.evaluate(`JSON.stringify((() => { const l = __ob.timeline.shots?.list || []; return { n: l.length, hits: l.filter((s) => />(Text|Label)</.test(s.html)).map((s) => ({ t: s.t, text: (s.text || '').slice(0, 160), m: (s.html.match(/>(Text|Label)</g) || []).length })) }; })())`));
    console.log('TEXTFLASH-PROBE ' + JSON.stringify(flash));
    const scr = JSON.parse(await b.evaluate(`JSON.stringify((__ob.timeline.rows || []).filter((r) => r.lane === 'screen').map((r) => ({ t: r.t, text: r.text, sub: r.sub })))`));
    console.log('TEXTFLASH-SCREEN ' + JSON.stringify(scr).slice(0, 3000));
  }
  if (process.env.TIMELINE_DUMP) console.log(rows.map((r) => `    ${String(r.t).padStart(5)} ${r.lane.padEnd(8)} ${r.text} | ${r.sub}`).join('\n'));

  // the links: the query's row selects its element in Design; the workflow's row opens its card
  if (dataRow) {
    await b.evaluate(`[...document.querySelectorAll('#tlrows .tlrow')].find(r => r.dataset.lane === 'data' && Number(r.dataset.t) === ${dataRow.t}).click()`); await wait(500);
    const selected = await b.evaluate(`document.querySelector('#right .head input')?.value`);
    ok(selected === (where.get(holder)?.node.label || 'Todo data'), "clicking the query's row selects the element holding it", { selected, want: where.get(holder)?.node.label });
  }
  if (openRow) {
    await b.evaluate(`document.querySelector('#tlrows .tlrow[data-link=${JSON.stringify(openRow.link)}]').click()`); await wait(600);
    const card = JSON.parse(await b.evaluate(`JSON.stringify({ shown: !document.getElementById('workflow').hidden, title: document.querySelector('#steps .wf h2')?.textContent })`));
    ok(card.shown && card.title === openRow.text, 'clicking the workflow row opens its card', card);
    // STU-026: with that run lit up, read off the recording: every step its row lists (Yes sends one signal into four:
    // four lanes side by side, s24), no other, and it says it is the recorded one
    const lit = JSON.parse(await b.evaluate(`JSON.stringify({ ran: [...document.querySelectorAll('#steps .flow .step.ran')].map(s => s.dataset.id).sort(), drawn: [...document.querySelectorAll('#steps .flow .step[data-id]')].map(s => s.dataset.id), lanes: [...document.querySelectorAll('#steps .branch.yes .lanes.fork > .lane')].map(l => [...l.querySelectorAll('.step[data-id]')].map(s => s.dataset.id).join('+')), fromYes: [...document.querySelectorAll('#steps svg.wires path[data-from=tdAuth][data-kind=yes]')].map(p => p.dataset.to).sort(), more: /more wired from the same signal/.test(document.getElementById('steps').textContent), want: [...new Set(__ob.timeline.rows.find(r => r.lane === 'workflow' && r.link?.card && 'card:' + r.link.card.node + '.' + r.link.card.port === ${JSON.stringify(openRow.link)} && Math.round(r.t) === ${openRow.t})?.steps.map(x => x.node) ?? [])].sort(), ev: !!document.querySelector('#steps .evnode.ran'), say: document.querySelector('#steps .flowlegend .lastrun')?.textContent, btn: document.querySelector('#steps button.showrun')?.textContent })`));
    // (Projects' lane goes on: its Changed refreshes the list, so that refresh is drawn there too, and lights in both places)
    const heads = lit.lanes.map((l) => l.split('+')[0]).sort();
    ok(lit.lanes.length === 4 && heads.join() === lit.fromYes.join() && lit.lanes.includes('tdProjects+tdData') && !lit.more,
      "Yes's one signal into four steps is four lanes side by side, each wired from the branch's Yes; no \"+ 3 more\"", { lanes: lit.lanes, fromYes: lit.fromYes, more: lit.more });
    ok([...new Set(lit.ran)].join() === lit.want.join() && lit.want.length === 5 && lit.ev && /^● The recorded run at .+ · \d+ steps?/.test(lit.say) && lit.btn === 'Hide this run',
      'the card opens with that run lit up: all five steps its row lists wear "ran", no other, and under the flow "The recorded run at …"', lit);
    await b.evaluate(`document.querySelector('#steps button.showrun').click()`); await wait(300);
    const hid = JSON.parse(await b.evaluate(`JSON.stringify({ ran: document.querySelectorAll('#steps .flow .ran').length, btn: document.querySelector('#steps button.showrun')?.textContent })`));
    ok(hid.ran === 0 && hid.btn === 'Show the last run', 'Hide this run puts it out', hid);
    await b.clickSel('[data-tab=design]'); await wait(400);
  }

  // ---- Record from now: a second task added. Record waits for the app; the click starts it; it stops by itself
  await b.clickSel('#recbtn'); await wait(800);
  const primed = { state: await recState(), same: await b.evaluate('__ob.timeline.fromOpen === true') };
  const SECOND = 'Second task, recorded';
  const added = await addTask(SECOND);
  const clickT = await b.evaluate(`${W}.performance.now()`);
  const ended = await b.until(`/^Record/.test(document.getElementById('recbtn').textContent) && __ob.timeline.fromOpen === false`, 20000);
  const endedAt = await b.evaluate(`${W}.performance.now()`);
  const rows2 = await rowsNow();
  const tl2 = JSON.parse(await b.evaluate('JSON.stringify({ length: __ob.timeline.length, first: __ob.timeline.rows[0]?.t, lanes: __ob.timeline.rows.map((r) => r.lane) })'));
  ok(/^Waiting for the app/.test(primed.state) && primed.same && ended && tl2.first !== undefined && tl2.first < 5 && tl2.length >= QUIET_MS && endedAt - clickT < 8000,
    "Record waits through 0.8 s of nothing (the last recording stays); the click's first signal starts the recording at 0 ms, and it stops by itself once the run is over", { primed, ended, tl2: { ...tl2, lanes: undefined }, after: Math.round(endedAt - clickT) });
  // the Add button is inside the task list: its card is the reusable's, shown here as the list's
  const addBtn = files('Todo/Task list').nodes.find((n) => n.type === 'net.noodl.controls.button' && n.label === 'Add')?.id;
  const addRow = rows2.find((r) => r.lane === 'workflow' && r.link?.startsWith(`card:${addBtn}.`));
  const create = rows2.find((r) => r.lane === 'data' && r.text === 'The app creates a Task');
  const drawn = rows2.find((r) => r.lane === 'screen' && r.sub.includes(SECOND));
  ok(added && addRow && create && addRow.t <= create.t && drawn && rows2.every((r) => r.t >= 0) && !rows2.some((r) => r.text === 'The app opens'), "recorded from now: the Add button's card, then the create request, and the new task drawn; nothing from before Record", { addBtn, addRow, create, drawn: !!drawn, rows: rows2.length, workflow: JSON.parse(await b.evaluate(`JSON.stringify(__ob.timeline.rows.filter((r) => r.lane === 'workflow').map((r) => r.t.toFixed(0) + ' ' + r.text + ' | ' + r.sub))`)) });
  if (shots) await b.screenshot(join(here, '..', 'docs', 'look', 'stu-031-timeline-add.png'));

  // ---- STU-032: the Add card's step, with what went in and what came out, and the screen when it ran
  const fn = files('Todo/Task list').nodes.find((n) => n.label === 'The title, if one was typed')?.id;
  const sent = JSON.parse(await b.evaluate(`JSON.stringify(${W}.Noodl.Navigation._noodlRuntime.context.getTraceEvents(0).filter(e => e.fromNode === ${JSON.stringify(fn)} && e.kind === 'value').map(e => e.fromPort + ' ' + e.value))`));
  const detail = () => b.evaluate(`JSON.stringify((() => { const d = document.getElementById('tldetail'), s = document.querySelector('#tlrows .tlstep.now'); return { node: s?.dataset.node ?? null, head: d.querySelector('.dh')?.textContent ?? '', name: d.querySelector('.dname')?.textContent ?? '', ins: d.querySelector('[data-io=in]')?.textContent ?? null, outs: d.querySelector('[data-io=out]')?.textContent ?? null, then: d.querySelector('[data-io=then]')?.textContent ?? null }; })())`).then(JSON.parse);
  await b.evaluate(`document.querySelector('#tlrows .tlstep[data-node=${JSON.stringify(fn)}]')?.click()`); await wait(300);
  const step = await detail();
  const q2 = JSON.stringify(SECOND);
  ok(fn && step.node === fn && step.ins?.includes(q2) && step.outs?.includes(q2) && sent.some((v) => v.startsWith('out-text ') && v.includes(q2)) && /sent/.test(step.outs),
    "the Add card's step shows the typed title going in and coming out, and its signal sent on (the runtime's own trace has that value out of that node)", { fn, step, sent });
  const atStep = step && await (async () => { await b.evaluate(`document.querySelector('#tlrows .tlstep[data-node=${JSON.stringify(fn)}]').click()`); await wait(300); await loaded(await b.evaluate(`document.getElementById('tlsframe').dataset.shot`)); return replay(); })();
  const drawnAt = drawn && await atRow(`[...document.querySelectorAll('#tlrows .tlrow')].find(r => r.dataset.lane === 'screen' && r.querySelector('small').textContent.includes(${q2}))`);
  ok(atStep && drawnAt && atStep.fields.includes(SECOND) && !atStep.text.includes(SECOND) && drawnAt.text.includes(SECOND),
    'scrubbed to that step, the screen has the title typed in the field and not yet in the list; at the row where the list draws it, it is in the list', { atStep: atStep && { ...atStep, text: atStep.text.slice(0, 100) }, drawnAt: drawnAt && { at: drawnAt.at, has: drawnAt.text.includes(SECOND) } });
  if (shots && atStep) { await b.evaluate(`document.querySelector('#tlrows .tlstep[data-node=${JSON.stringify(fn)}]').click()`); await wait(600); await b.screenshot(join(here, '..', 'docs', 'look', 'stu-032-step.png')); }

  // ---- STU-033: the steps on the waterfall, gone through one at a time. The second task's recording holds a run of
  // the Add task command (a reusable the Todo page places; its "do" arrives as a value out of Component Inputs)
  const cmd = files('Commands/Add task').nodes, cmdId = (l) => cmd.find((n) => n.label === l)?.id;
  const what = cmd.find((n) => n.type === 'Component Inputs')?.id, jsStep = cmdId('Is there anything to write?'), makeStep = cmdId('Add the task'), histStep = cmdId('Write the history line');
  const lane = JSON.parse(await b.evaluate(`JSON.stringify({ marks: document.querySelectorAll('#tlaxis .track[data-lane=workflow] .mark.step').length, steps: __ob.timeline.rows.filter((r) => !r.minor).reduce((n, r) => n + (r.steps?.length || 0), 0), lines: document.querySelectorAll('#tlrows .tlstep').length, cmd: __ob.timeline.rows.find((r) => r.link?.card?.node === ${JSON.stringify(what)})?.steps?.map((x) => x.node) ?? null })`));
  ok(lane.steps > 0 && lane.marks === lane.steps && lane.lines === lane.steps && lane.cmd?.join() === [jsStep, makeStep, histStep].join() && true,
    "every step of every run is a mark on the Workflows lane and a line under its run; the Add task command's run is there with its three steps (a card started through its component's inputs)", lane);
  // its run's mark on the lane puts the playhead on it; ▶ goes step by step, each step's in and out beside it
  const cmdK = await b.evaluate(`document.querySelector('#tlrows .tlrow[data-link=${JSON.stringify(`card:${what}.do`)}]')?.dataset.k ?? null`);
  if (cmdK !== null) await b.evaluate(`document.querySelector('#tlaxis .mark[data-k="${cmdK}"]').click()`);
  await wait(200);
  const seen = [];
  for (let i = 0; i < 3; i++) { await b.clickSel('#tlnext'); await wait(250); seen.push(await detail()); }
  const newId = JSON.parse(await b.evaluate(`JSON.stringify(${W}.Noodl.Navigation._noodlRuntime.context.getTraceEvents(0).filter(e => e.fromNode === ${JSON.stringify(makeStep)} && e.fromPort === 'id' && e.kind === 'value').map(e => e.value)) `));
  const [d1, d2, d3] = seen;
  ok(cmdK !== null && d1.node === jsStep && /^Step 1 of 3/.test(d1.head) && d1.ins?.includes(q2) && d2.node === makeStep && /^Step 2 of 3/.test(d2.head) && d2.ins?.includes(q2) && /creates a Task/.test(d2.then ?? '') && d3.node === histStep && newId.some((id) => d3.ins?.includes(id) && d2.outs?.includes(id)),
    "▶ from the run goes through its steps one at a time: step 1 reads the typed title, step 2 (the record's creation) reads it too and is followed by the create request, step 3 reads the new record's id that step 2 sent", { cmdK, seen, newId });
  await b.evaluate(`document.getElementById('timeline').focus()`);
  await b.key('ArrowLeft', 'ArrowLeft', 37); await wait(250);
  const back = await detail();
  if (shots) { await b.clickSel('#tlnext'); await wait(400); await b.screenshot(join(here, '..', 'docs', 'look', 'stu-033-steps.png')); await b.key('ArrowLeft', 'ArrowLeft', 37); await wait(200); }
  ok(back.node === makeStep && /^Step 2 of 3/.test(back.head), '← goes back one step', back);
  ok(/title "/.test(back.ins || '') && !/prop-/.test(back.ins || ''), 'the record\'s fields read as its fields ("title"), not as their ports ("prop-title")', back.ins);
  ok(/Data type "Task" \(set\)/.test(back.ins || '') && !/collectionName/.test(back.ins || ''), 'its data type reads "Data type", not its parameter ("collectionName")', back.ins);

  // a slow answer: the backend's reply to the next task's write is held 3 s at the network; the recording waits for it
  await b.send('Fetch.enable', { patterns: [{ urlPattern: '*/classes/Task*', requestStage: 'Request' }] });
  let heldWrites = 0;
  const unhook = b.on((m) => {
    if (m.method !== 'Fetch.requestPaused') return;
    const r = m.params.request, write = r.method === 'POST' && !/"_method"/.test(r.postData || '');
    if (write) heldWrites++;
    setTimeout(() => b.send('Fetch.continueRequest', { requestId: m.params.requestId }).catch(() => {}), write ? 3000 : 0);
  });
  await b.clickSel('#recbtn'); await wait(300);
  const SLOW = 'Waited for the backend';
  const slowAdded = await (async () => { await typeInto(`[...${W}.document.querySelectorAll('input[type=text], input:not([type])')].find(i => i.offsetParent)`, SLOW); await wait(300); return b.evaluate(`(() => { const btn = [...${W}.document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Add' && e.offsetParent); if (!btn) return false; btn.click(); return true; })()`); })();
  await wait(2200);
  const midway = await recState();
  await b.until(`/^Record/.test(document.getElementById('recbtn').textContent)`, 20000);
  unhook(); await b.send('Fetch.disable');
  const rows3 = await rowsNow();
  const slowCreate = rows3.find((r) => r.lane === 'data' && r.text === 'The app creates a Task');
  const slowDrawn = rows3.find((r) => r.lane === 'screen' && r.sub.includes(SLOW));
  const len3 = await b.evaluate('__ob.timeline.length');
  ok(slowAdded && heldWrites === 1 && /waiting for an answer from the backend/.test(midway) && slowCreate && slowCreate.end - slowCreate.t >= 2900 && slowDrawn && slowDrawn.t >= slowCreate.end && len3 >= slowCreate.end + QUIET_MS - 50,
    'a write whose answer takes 3 s: the recording says it is waiting for the answer, does not stop before it, and holds the list drawing the task after it', { heldWrites, midway, slowCreate, slowDrawn: slowDrawn && { t: slowDrawn.t, sub: slowDrawn.sub.slice(0, 80) }, len3 });

  // ---- a run that leaves the page: Sign out on Todo (the Header's click, then Todo's card that logs out and goes to
  // Sign in) lands on Sign in, whose Did Mount runs. Studio stays on Todo (it follows the app only after a rebuild), and
  // Sign in's card is a run of its own, not "a signal no workflow on this page starts"
  const signMount = files('Pages/Sign in').nodes.find((n) => n.type === 'Page')?.id;
  const already = files('Pages/Sign in').nodes.find((n) => n.label === 'Already signed in?')?.id;
  await b.clickSel('#recbtn'); await wait(300);
  const signedOut = await b.evaluate(`(() => { const btn = [...${W}.document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Sign out' && e.offsetParent); if (!btn) return false; btn.click(); return true; })()`);
  await b.until(`/^Record/.test(document.getElementById('recbtn').textContent)`, 20000);
  const left = JSON.parse(await b.evaluate(`JSON.stringify({ studio: document.getElementById('pagepick').value, app: ${W}.Noodl.Navigation._noodlRuntime.context.rootComponent.nodeScope.getNodesWithTypeRecursive('Router')[0]._internal.currentPage?.component, mount: __ob.timeline.rows.find((r) => r.link?.card?.node === ${JSON.stringify(signMount)} && r.link.card.port === 'didMount') ?? null, minor: __ob.timeline.rows.filter((r) => r.minor && r.link === null && (r.text.includes('Already signed in?'))).length, runs: __ob.timeline.rows.filter((r) => r.lane === 'workflow' && !r.minor).map((r) => r.text + ' | ' + r.sub) })`));
  ok(signedOut && left.studio === 'Pages/Todo' && left.app === '/Pages/Sign in' && left.mount && left.mount.link.card.component === 'Pages/Sign in' && /, on Sign in · /.test(left.mount.sub) && left.mount.steps?.some((x) => x.node === already) && left.minor === 0,
    "a recording that leaves the page: Studio still shows Todo, and Sign in's Did Mount is a run of its own card (\"…, on Sign in\"), its step the branch it reaches", { signedOut, ...left, mount: left.mount && { text: left.mount.text, sub: left.mount.sub, link: left.mount.link } });
  if (left.mount) {
    n0 = await shows();
    await b.evaluate(`document.querySelector('#tlrows .tlrow[data-link=${JSON.stringify(`card:${signMount}.didMount`)}]').click()`);
    await rebuilt(n0); await wait(600);
    const there = JSON.parse(await b.evaluate(`JSON.stringify({ page: document.getElementById('pagepick').value, shown: !document.getElementById('workflow').hidden, title: document.querySelector('#steps .wf h2')?.textContent })`));
    ok(there.page === 'Pages/Sign in' && there.shown && there.title === left.mount.text, "clicking that row opens Sign in and its card there", there);
  }

  const problems = b.problems.filter((p) => !/Invalid connection|doesn't have a port|Failed to load resource|fonts\.g|^\[noodl\]/.test(p));
  ok(problems.length === 0, 'no exceptions in the editor page', problems.slice(0, 3));
} catch (err) {
  ok(false, `the gate itself: ${err.message.split('\n')[0]}`);
  console.log(err.stack?.split('\n').slice(0, 4).join('\n'));
} finally {
  try { await b?.close(); } catch { /* gone */ }
  for (const c of children) try { c.kill(); } catch { /* gone */ }
  rmSync(tmp, { recursive: true, force: true });
}
const passed = results.filter(Boolean).length;
console.log(`timeline: ${passed === results.length ? 'PASS' : 'FAIL'} ${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
