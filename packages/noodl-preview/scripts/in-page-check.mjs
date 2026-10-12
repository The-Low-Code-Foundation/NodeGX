/**
 * P112 OWN-004, in headless Chrome, per template:
 *
 *  - **parity** — the export the page makes from in-memory files is the export `nodegx deploy` publishes from
 *    the folder: every component identical, and every top-level field (the cloud-services block aside, which
 *    a preview blanks on purpose). It found P112-S3-IGNOREINEXPORT on its first run: the deploy published
 *    `htmlTitle` in `settings`, and the page — reading the runtime's real library — rightly did not. This is what holds "nothing about the export is re-implemented" true.
 *  - **AC1** — a page with no editor process shows the template's real app from those files, and a change
 *    written through the format's store (`V2ProjectStore`) appears without the page reloading.
 *  - **AC2's source** — the page receives live values from the running app (the runtime's own trace).
 *
 *   node scripts/in-page-check.mjs [template ...] [--all] [--screenshot <png>]   (default: todo-list)
 *
 * Serves on a free loopback port the deploy runtime (`noodl-editor/src/external/deploy/`) at /runtime/, the
 * in-page bundle (`npm run build` first), each template's files as one JSON map, its deploy (made here by
 * `dist/nodegx-deploy.cjs` into a temporary folder), and a check page that writes its verdict into <title>,
 * read over CDP in real time (`--virtual-time-budget` would freeze every duration the page measures at 0).
 * Exits 2 without Chrome, the runtime or the bundle; 1 when any template FAILs; 0 when all PASS.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, cpSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const args = process.argv.slice(2);
const shotAt = args.indexOf('--screenshot');
const screenshot = shotAt >= 0 ? args[shotAt + 1] : undefined;
const named = args.filter((a, i) => !a.startsWith('--') && (shotAt < 0 || i !== shotAt + 1));
const templatesDir = join(repo, 'templates');
const templates = args.includes('--all')
  ? readdirSync(templatesDir).filter((t) => existsSync(join(templatesDir, t, 'nodegx.project.json')))
  : named.length ? named : ['todo-list'];

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const runtimeDir = join(repo, 'packages/noodl-editor/src/external/deploy');
const bundle = join(here, '..', 'dist/browser/noodl-preview-in-page.js');
const deployCli = join(here, '..', 'dist/nodegx-deploy.cjs');
for (const [what, at] of [['Chrome', chrome], ['the deploy runtime (npm run build:editor:_viewer)', join(runtimeDir, 'noodl.deploy.js')], ['the in-page bundle and the deploy CLI (npm run build)', bundle], ['the deploy CLI (npm run build)', deployCli]]) {
  if (!existsSync(at)) {
    console.log(`in-page-check: no ${what} at ${at}`);
    process.exit(2);
  }
}

/** Every text file of the project, path → text, as a page holding it in memory would. */
function projectFiles(dir) {
  const files = {};
  const walk = (folder) => {
    for (const name of readdirSync(folder)) {
      const full = join(folder, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (['.json', '.js', '.css', '.md'].includes(extname(name))) files[relative(dir, full).split(sep).join('/')] = readFileSync(full, 'utf8');
    }
  };
  walk(dir);
  return files;
}

/**
 * What `nodegx deploy` publishes for the template: `window.projectData` out of the hashed `index-*.js` and
 * every component of every bundle it names. Deployed from a copy — opening a project can write into it.
 */
function deployed(template, scratch) {
  const copy = join(scratch, 'copy', template);
  const out = join(scratch, 'out', template);
  cpSync(join(templatesDir, template), copy, { recursive: true });
  const run = spawnSync(process.execPath, [deployCli, copy, out, '--allow-development-engine'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const result = JSON.parse(run.stdout.trim().split('\n').pop() || '{}');
  if (!result.ok) throw new Error(`nodegx deploy refused ${template}: ${result.message}`);
  const index = readdirSync(out).find((f) => /^index-.*\.js$/.test(f));
  const sandbox = {};
  sandbox.window = sandbox;
  vm.runInNewContext(readFileSync(join(out, index), 'utf8'), sandbox);
  const data = sandbox.projectData;
  const components = [...data.components];
  for (const id of Object.keys(data.componentIndex || {})) components.push(...JSON.parse(readFileSync(join(out, 'noodl_bundles', `${id}.json`), 'utf8')));
  return JSON.stringify({ ...data, components, componentIndex: undefined });
}

const checkPage = `<!doctype html><meta charset="utf-8"><title>pending</title>
<style>body{margin:0} #app{width:420px;height:760px}</style>
<div id="app"></div>
<script src="/preview.js"></script>
<script>
(async () => {
  const say = (verdict) => { document.title = verdict; };
  const t = new URLSearchParams(location.search).get('t');
  try {
    window.__hostDocument = Math.random();   // still here at the end ⇒ the page never reloaded
    const host = window.__hostDocument;
    const files = NodegxPreview.memoryFiles(await (await fetch('/t/' + t + '/project.json')).json());
    const store = new NodegxPreview.V2ProjectStore(files);

    const kitless = Object.fromEntries(Object.entries(files.entries()).filter(([p]) => !p.startsWith('noodl_modules/')));
    const shadow = document.createElement('div');
    shadow.style.cssText = 'position:absolute;left:-10000px;width:400px;height:400px';
    document.body.appendChild(shadow);
    const bare = await NodegxPreview.mountPreview(shadow, { runtimeBase: '/runtime/' });
    await bare.update(kitless);
    const bareLibrary = bare.nodeLibrary;
    bare.dispose();
    shadow.remove();
    console.info('in-page-check: kit-less library read');   // the Node side counts console problems from here
    const tMount = performance.now();
    const preview = await NodegxPreview.mountPreview(document.getElementById('app'), { runtimeBase: '/runtime/' });
    const mountMs = performance.now() - tMount;
    const batches = [];
    preview.onTrace((b) => batches.push(b));

    const first = await preview.update(files.entries());
    if (first.status !== 'ok') return say('FAIL first render: ' + JSON.stringify(first).slice(0, 400));
    // Parity (after the first update, which reads the node library with the project's kits loaded): the page's export against the deploy's, component by component.
    const J = (v) => JSON.stringify(v === undefined ? null : v);
    // Read first, and its console left out of the report (its app runs without the kits it uses).
    // The CLI's node library has no kits (its headless runtime loads none), so parity is graded with the same
    // input: a library booted from the project without its kits. The export the page RENDERS has the kits'
    // node types, and where that changes a component is counted (kitDiffer), not failed — the editor's own
    // deploy reads its library from a viewer with the kits loaded, as the page does.
    const mine = NodegxPreview.exportInPage(files.entries(), bareLibrary);
    const rendered = NodegxPreview.exportInPage(files.entries(), preview.nodeLibrary);
    if (mine.status !== 'ok') return say('FAIL export: ' + JSON.stringify(mine).slice(0, 400));
    const theirs = await (await fetch('/t/' + t + '/deployed.json')).json();
    const byName = new Map(mine.projectData.components.map((c) => [c.name, c]));
    const differ = theirs.components.filter((c) => J(byName.get(c.name)) !== J(c)).map((c) => c.name);
    const extra = mine.projectData.components.filter((c) => !theirs.components.some((d) => d.name === c.name)).map((c) => c.name);
    const top = ['settings', 'routerIndex', 'rootComponent', 'rootNode', 'variants', 'scripts']
      .filter((k) => J(mine.projectData[k]) !== J(theirs[k]));
    const strip = (m) => { const { cloudservices, ...rest } = m || {}; return rest; };
    if (J(strip(mine.projectData.metadata)) !== J(strip(theirs.metadata))) top.push('metadata');
    if (top.includes('settings')) {
      const keys = new Set([...Object.keys(mine.projectData.settings || {}), ...Object.keys(theirs.settings || {})]);
      top[top.indexOf('settings')] = 'settings(' + [...keys].filter((k) => J(mine.projectData.settings?.[k]) !== J(theirs.settings?.[k])).map((k) => k + ':' + J(mine.projectData.settings?.[k]).slice(0, 40) + '≠' + J(theirs.settings?.[k]).slice(0, 40)).join(';') + ')';
    }
    const parity = differ.length === 0 && extra.length === 0 && top.length === 0;
    const kitDiffer = rendered.status === 'ok' ? rendered.projectData.components.filter((c) => J(c) !== J(byName.get(c.name))).length : -1;
    // Where the first differing component differs: its first differing node and fields, or its own fields.
    let where = '';
    if (differ.length) {
      const d = theirs.components.find((c) => c.name === differ[0]), m = byName.get(differ[0]);
      const flat = (ns, out = []) => { for (const n of ns || []) { out.push(n); flat(n.children, out); } return out; };
      const dn = flat(d.nodes), mn = flat(m && m.nodes);
      const node = dn.find((n) => J(n) !== J(mn.find((x) => x.id === n.id)));
      if (node) {
        const twin = mn.find((x) => x.id === node.id) || {};
        where = ' firstDiff=' + node.type + ':' + Object.keys({ ...node, ...twin }).filter((k) => J(node[k]) !== J(twin[k])).map((k) => k + '(page ' + J(twin[k]).slice(0, 60) + ' / deploy ' + J(node[k]).slice(0, 60) + ')').join(',');
      } else {
        const keys = Object.keys({ ...d, ...m }).filter((k) => J(d[k]) !== J(m && m[k]));
        const show = (k) => {
          if (k !== 'ports') return k + '(page ' + J(m && m[k]).slice(0, 80) + ' / deploy ' + J(d[k]).slice(0, 80) + ')';
          const i = Math.max(d.ports.length, m.ports.length);
          for (let j = 0; j < i; j++) if (J(d.ports[j]) !== J(m.ports[j])) return 'ports[' + j + '](page ' + J(m.ports[j]) + ' / deploy ' + J(d.ports[j]) + ')';
          return 'ports';
        };
        where = ' firstDiff=component:' + keys.map(show).join(',');
      }
    }

    await new Promise((r) => setTimeout(r, 1500));   // let the app settle and the trace pump run
    const before = preview.frame.contentDocument.body.innerText;

    // The first Text node whose words are on screen and nowhere else in the project (the todo template
    // says "Todo list" in its header and on its sign-in page), changed through the store.
    const texts = {};
    for (const key of store.componentKeys()) for (const n of store.readComponent(key).files.nodes.nodes) if (n.type === 'Text') texts[n.parameters?.text] = (texts[n.parameters?.text] || 0) + 1;
    let target;
    for (const key of store.componentKeys()) {
      const c = store.readComponent(key);
      const node = c.files.nodes.nodes.find((n) => n.type === 'Text' && typeof n.parameters?.text === 'string' && n.parameters.text.length > 3 && texts[n.parameters.text] === 1 && before.includes(n.parameters.text));
      if (node) { target = { key, c, node }; break; }
    }
    let changed = 'none', newTextShown = false, oldTextGone = false, second = { exportMs: NaN, frameMs: NaN };
    if (target) {
      const was = target.node.parameters.text;
      const now = 'Changed through the store at ' + Date.now();
      target.node.parameters.text = now;
      store.writeComponent(target.key, target.c.files, { ifRevision: target.c.revision });
      second = await preview.update(files.entries());
      if (second.status !== 'ok') return say('FAIL second render: ' + JSON.stringify(second).slice(0, 400));
      await new Promise((r) => setTimeout(r, 800));
      const after = preview.frame.contentDocument.body.innerText;
      changed = target.key; newTextShown = after.includes(now); oldTextGone = !after.includes(was);
    }

    const events = batches.reduce((n, b) => n + b.events.length, 0);
    const dict = batches.filter((b) => b.dictionary).pop()?.dictionary;
    const wires = new Set(batches.flatMap((b) => b.events.map((e) => e.fromNode + '.' + e.fromPort + '>' + e.toNode + '.' + e.toPort)));
    // A template whose first screen has no unique Text cannot grade the change; it still grades the rest.
    const changeOk = target ? newTextShown && oldTextGone : true;
    // A template that does not carry the kits it uses (see missingKits, Node side) may have nothing moving: named, not failed.
    const { missingKits } = await (await fetch('/t/' + t + '/meta.json')).json();
    const liveOk = (events > 0 || missingKits.length > 0) && dict && Object.keys(dict.nodes).length > 0;
    const ok = parity && changeOk && window.__hostDocument === host && liveOk;
    say((ok ? 'PASS' : 'FAIL') +
      ' template=' + t +
      ' parity=' + mine.projectData.components.length + '/' + theirs.components.length + (kitDiffer ? ' kitDiffer=' + kitDiffer : '') + (differ.length ? ' differ=' + differ.length + JSON.stringify(differ.slice(0, 3)) + where : '') + (extra.length ? ' extra=' + JSON.stringify(extra.slice(0, 3)) : '') + (top.length ? ' topDiffer=' + top : '') +
      ' mountMs=' + Math.round(mountMs) +
      ' firstExportMs=' + Math.round(first.exportMs) + ' firstFrameMs=' + Math.round(first.frameMs) +
      ' secondExportMs=' + Math.round(second.exportMs) + ' secondFrameMs=' + Math.round(second.frameMs) +
      ' changed=' + JSON.stringify(changed) + ' newTextShown=' + newTextShown + ' oldTextGone=' + oldTextGone +
      ' samePage=' + (window.__hostDocument === host) +
      ' traceEvents=' + events + ' wiresSeen=' + wires.size + ' liveNodes=' + (dict ? Object.keys(dict.nodes).length : 0) +
      ' liveWires=' + (dict ? dict.edges.length : 0) +
      (missingKits.length ? ' missingKits=' + JSON.stringify(missingKits) : '') +
      ' warnings=' + JSON.stringify(first.warnings));
  } catch (e) { say('FAIL ' + (e && e.stack || e)); }
})();
</script>`;

const scratch = mkdtempSync(join(tmpdir(), 'noodl-preview-in-page-'));
const served = {};
/**
 * Kits a template's `kit-provenance.json` says were imported from a library entry but whose folder it does not
 * carry (bot-garden's game-kit, garden-kit, garden-3d-kit): a project made from the template gets them at
 * creation, the folder never had them, so its app cannot run them here or in a deploy of the folder.
 */
function missingKits(dir) {
  const provenance = join(dir, 'noodl_modules', 'kit-provenance.json');
  if (!existsSync(provenance)) return [];
  return JSON.parse(readFileSync(provenance, 'utf8'))
    .map((row) => row.module)
    .filter((kit) => !existsSync(join(dir, 'noodl_modules', kit)));
}
for (const t of templates) {
  const dir = join(templatesDir, t);
  served[t] = { files: JSON.stringify(projectFiles(dir)), deployed: deployed(t, scratch), meta: JSON.stringify({ missingKits: missingKits(dir) }) };
}

const types = { '.js': 'application/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (body, type) => { res.writeHead(200, { 'content-type': type }); res.end(body); };
  if (url.pathname === '/check.html') return send(checkPage, 'text/html');
  if (url.pathname === '/preview.js') return send(readFileSync(bundle), 'application/javascript');
  const m = url.pathname.match(/^\/t\/([^/]+)\/(project|deployed|meta)\.json$/);
  if (m && served[m[1]]) return send(m[2] === 'project' ? served[m[1]].files : m[2] === 'meta' ? served[m[1]].meta : served[m[1]].deployed, 'application/json');
  if (url.pathname.startsWith('/runtime/')) {
    const file = join(runtimeDir, url.pathname.slice('/runtime/'.length));
    if (file.startsWith(runtimeDir) && existsSync(file) && statSync(file).isFile()) return send(readFileSync(file), types[extname(file)] ?? 'application/octet-stream');
  }
  res.writeHead(404);
  res.end();
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const { connect, evaluate } = createRequire(import.meta.url)(join(repo, 'scripts/devtools/cdp.js'));
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => r(port)); }); });
const cdpPort = await freePort();
const profile = join(scratch, 'profile');
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--window-size=460,800', 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const verdicts = [];
let client;
try {
  let target;
  for (let i = 0; i < 80 && !target; i++) {
    await wait(250);
    try {
      target = await new Promise((resolve, reject) => http.get({ host: '127.0.0.1', port: cdpPort, path: '/json/list' }, (res) => { let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => { try { resolve(JSON.parse(b).find((t) => t.type === 'page')); } catch (e) { reject(e); } }); }).on('error', reject));
    } catch { /* not up yet */ }
  }
  if (!target) throw new Error('no page target');
  client = await connect(target);
  let problems = [];
  client.on((message) => {
    if (message.method === 'Runtime.consoleAPICalled' && message.params.args[0]?.value === 'in-page-check: kit-less library read') problems = [];
    if (message.method === 'Runtime.exceptionThrown') problems.push('exception: ' + (message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text).split('\n')[0]);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') problems.push('console.error: ' + message.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200));
  });
  await client.send('Runtime.enable');
  await client.send('Page.enable');
  for (const t of templates) {
    problems = [];
    await client.send('Page.navigate', { url: `${base}/check.html?t=${encodeURIComponent(t)}` });
    let title = 'pending';
    for (let i = 0; i < 600 && title === 'pending'; i++) {
      await wait(200);
      title = await evaluate(client, 'document.title').catch(() => 'pending');
    }
    if (title === 'pending') title = `FAIL template=${t} timed out`;
    console.log(`in-page-check: ${title}`);
    // Errors from any frame on the page, the app's own included: a template that logs is reported, not failed.
    if (problems.length) console.log(`  ${problems.length} console problem(s):\n    ` + [...new Set(problems)].slice(0, 10).join('\n    '));
    verdicts.push(title);
    if (screenshot && templates.length === 1) {
      const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(screenshot, Buffer.from(data, 'base64'));
      console.log(`in-page-check: screenshot ${screenshot}`);
    }
  }
} catch (err) {
  verdicts.push('FAIL ' + (err && err.message));
  console.log(`in-page-check: FAIL ${err && err.message}`);
} finally {
  try { client?.close(); } catch { /* gone */ }
  const exited = new Promise((r) => proc.once('exit', r));
  proc.kill();
  await exited;
  server.close();
  rmSync(scratch, { recursive: true, force: true, maxRetries: 5 });
}
const passed = verdicts.filter((v) => v.startsWith('PASS')).length;
console.log(`in-page-check: ${passed} / ${verdicts.length} PASS`);
process.exit(passed === verdicts.length ? 0 : 1);
