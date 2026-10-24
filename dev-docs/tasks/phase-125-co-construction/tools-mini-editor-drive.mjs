// P125 CCN-008 — the mini editor driven end to end: the real server (bundled from src), a real Studio, a fake MCP Apps
// host at a foreign origin, headless Chrome.
//
//   node tools-mini-editor-drive.mjs 2d <project-copy> <out-dir>   (a copy of a project with Sections/Hero)
//   node tools-mini-editor-drive.mjs 3d <project-copy> <out-dir>   (a copy of parked/three-in-nodes/fixture + the kit)
//
// Run with the Bash sandbox off (Chrome cannot start its own sandbox inside it). The server is bundled into <out-dir>,
// never into packages/noodl-mcp/dist (that is the build Claude Desktop runs). Prints one line per check and exits 1
// on the first check that fails; screenshots go to <out-dir>.
//
// The host answers like Claude Desktop does as far as it is known: ui/initialize, then the tool's result as
// ui/notifications/tool-result; ui/message and ui/update-model-context are logged for the drive to read.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..', '..', '..');
const MCP = path.join(REPO, 'packages', 'noodl-mcp');
const req = (m) => import(path.join(REPO, 'node_modules', m));
const { default: WebSocket } = await req('ws/index.js');
const { Client } = await req('@modelcontextprotocol/sdk/dist/esm/client/index.js');
const { StdioClientTransport } = await req('@modelcontextprotocol/sdk/dist/esm/client/stdio.js');

const [mode, projectDir, outDir] = process.argv.slice(2);
if (!['2d', '3d'].includes(mode) || !projectDir || !outDir) {
  console.log('usage: node tools-mini-editor-drive.mjs 2d|3d <project-copy> <out-dir>');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!ok) failed++;
};

// ─── The server, from src ────────────────────────────────────────────────────
const bundle = path.join(outDir, 'noodl-mcp-drive.cjs');
{
  const { default: esbuild } = await import(path.join(REPO, 'node_modules', 'esbuild', 'lib', 'main.js'));
  const { common } = await import(path.join(MCP, 'build-common.mjs'));
  await esbuild.build({ ...common, absWorkingDir: MCP, entryPoints: [path.join(MCP, 'src', 'cli.ts')], target: 'node18', outfile: bundle, logLevel: 'error' });
}
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [bundle, projectDir, '--allow-writes'],
  env: { ...process.env, NODEGX_STUDIO_NO_OPEN: '1', NODEGX_STUDIO_PORT_FILE: 'none', NODEGX_KIT_EXTRACT: path.join(MCP, 'dist', 'kit-extract.cjs') },
  stderr: 'pipe'
});
let serverLog = '';
transport.stderr?.on('data', (d) => (serverLog += d.toString()));
const client = new Client(
  { name: 'claude-ai', version: '0.1.0' },
  { capabilities: { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: ['text/html;profile=mcp-app'] } } } }
);
await client.connect(transport);
const tool = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content?.[0]?.text ?? '';
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { isError: !!r.isError, data, raw: r };
};
const resource = async (uri) => (await client.readResource({ uri })).contents[0].text;

// ─── The host ────────────────────────────────────────────────────────────────
const panels = {}; // name -> { html, result }
const hostHtml = `<!doctype html><body style="margin:0;background:#262624;font:12px monospace;color:#ddd"><pre id="log" style="white-space:pre-wrap;margin:0;padding:6px"></pre><div id="frames"></div><script>
window.results = {}; window.heights = {}; window.messages = []; window.contexts = [];
window.addPanel = (name, src, result) => {
  window.results[name] = result;
  const f = document.createElement('iframe'); f.id = name; f.src = src;
  f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
  f.style.cssText = 'width:760px;height:700px;display:block;border:0;margin:8px';
  document.getElementById('frames').append(f);
};
const log = (s) => { document.getElementById('log').textContent += s + '\\n'; };
window.addEventListener('message', (ev) => {
  const m = ev.data; if (!m || m.jsonrpc !== '2.0') return;
  const f = [...document.querySelectorAll('iframe')].find((x) => x.contentWindow === ev.source); if (!f) return;
  const reply = (result) => ev.source.postMessage({ jsonrpc: '2.0', id: m.id, result }, '*');
  if (m.method === 'ui/initialize') reply({ protocolVersion: m.params.protocolVersion, hostInfo: { name: 'fake-host', version: '0' }, hostCapabilities: { message: {}, updateModelContext: {} }, hostContext: { displayMode: 'inline', availableDisplayModes: ['inline', 'fullscreen'], theme: 'dark' } });
  else if (m.method === 'ui/notifications/initialized') ev.source.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: window.results[f.id] }, '*');
  else if (m.method === 'ui/notifications/size-changed') { window.heights[f.id] = m.params.height; f.style.height = m.params.height + 'px'; }
  else if (m.method === 'ui/message') { window.messages.push({ from: f.id, params: m.params }); log('ui/message from ' + f.id + ': ' + JSON.stringify(m.params)); reply({}); }
  else if (m.method === 'ui/update-model-context') { window.contexts.push({ from: f.id, params: m.params }); reply({}); }
  else if (m.id !== undefined) reply({});
});
</script>`;
const host = http
  .createServer((q, r) => {
    const u = new URL(q.url, 'http://x');
    const p = panels[u.pathname.slice(1)];
    r.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    r.end(p ? p.html : hostHtml);
  })
  .listen(0, '127.0.0.1');
await new Promise((r) => host.once('listening', r));
const hostOrigin = `http://127.0.0.1:${host.address().port}`;

// ─── Chrome ──────────────────────────────────────────────────────────────────
const cdpPort = 9400 + Math.floor(Math.random() * 400);
const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-drive-udd-'));
const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${udd}`, '--use-mock-keychain', '--no-first-run', '--window-size=800,1600',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'],
  { stdio: 'ignore' }
);
let ws;
let seq = 0;
const pend = new Map();
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++seq;
    pend.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => pend.has(i) && rej(new Error(`cdp timeout ${method}`)), 60000);
  });
const evalTop = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
async function inPanel(name, expression) {
  const tree = (await send('Page.getFrameTree')).frameTree;
  const c = (tree.childFrames || []).find((x) => x.frame.name === name || x.frame.url.endsWith(`/${name}`));
  if (!c) return `no frame ${name}`;
  const { executionContextId } = await send('Page.createIsolatedWorld', { frameId: c.frame.id, worldName: `w${Math.random()}` });
  const v = await send('Runtime.evaluate', { contextId: executionContextId, expression, returnByValue: true, awaitPromise: true });
  return v.result.value ?? `EXC ${v.exceptionDetails?.exception?.description ?? v.exceptionDetails?.text}`;
}
// The panel's own world (its page scripts' globals): the isolated world above cannot see window.__mini.
async function inPanelMain(name, expression) {
  const tree = (await send('Page.getFrameTree')).frameTree;
  const c = (tree.childFrames || []).find((x) => x.frame.url.endsWith(`/${name}`));
  if (!c) return `no frame ${name}`;
  const ctx = contexts.find((x) => x.auxData?.frameId === c.frame.id && x.auxData?.isDefault);
  if (!ctx) return 'no context';
  const v = await send('Runtime.evaluate', { contextId: ctx.id, expression, returnByValue: true, awaitPromise: true });
  return v.result.value ?? `EXC ${v.exceptionDetails?.exception?.description ?? v.exceptionDetails?.text}`;
}
const contexts = [];
const shot = async (file) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(path.join(outDir, file), Buffer.from(data, 'base64'));
};
async function until(label, fn, ms = 30000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < ms) {
    last = await fn();
    if (last === true) return true;
    await sleep(400);
  }
  check(label, false, `timed out; last: ${JSON.stringify(last)}`);
  return false;
}
const nodesOf = (rel) => JSON.parse(fs.readFileSync(path.join(projectDir, 'components', rel, 'nodes.json'), 'utf8')).nodes;

async function mount(name, uri, result) {
  panels[name] = { html: await resource(uri) };
  await evalTop(`addPanel(${JSON.stringify(name)}, ${JSON.stringify(`${hostOrigin}/${name}`)}, ${JSON.stringify(result)})`);
}
const MINI_STATE = `JSON.stringify({ id: window.__mini?.id, quiet: window.__mini?.quiet, stage: document.querySelector('.me-stage-note')?.textContent ?? null, hidden: document.querySelector('.me-stage-note')?.hidden, frames: document.querySelectorAll('.me-stage iframe').length, status: window.__mini?.record?.status, error: window.__mini?.error, sent: window.__mini?.sent })`;

try {
  let list;
  for (let t = 0; t < 50; t++) {
    try {
      list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
      break;
    } catch {
      await sleep(200);
    }
  }
  ws = new WebSocket(list.find((x) => x.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));
  ws.on('message', (d) => {
    const m = JSON.parse(d);
    if (m.method === 'Runtime.executionContextCreated') contexts.push(m.params.context);
    if (m.id && pend.has(m.id)) {
      const p = pend.get(m.id);
      pend.delete(m.id);
      m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: `${hostOrigin}/` });
  await sleep(800);

  const tools = (await client.listTools()).tools.map((t) => t.name);
  check('the server says the client renders MCP Apps', /renders MCP Apps: yes/.test(serverLog), serverLog.split('\n').find((l) => /client claude/.test(l))?.slice(0, 90) ?? '');
  check('show_mini_editor and get_mini_editor are in the first tool list (Desktop indexes once)', tools.includes('show_mini_editor') && tools.includes('get_mini_editor'));

  // 1. Studio first, as a turn that builds would have it.
  const studio = await tool('open_studio');
  check('open_studio answers', !studio.isError, studio.isError ? JSON.stringify(studio.data) : studio.data.onScreen);
  await mount('studio1', 'ui://nodegx/studio.html', studio.raw);
  await sleep(mode === '3d' ? 9000 : 7000);

  // 2. The mini editor.
  const args =
    mode === '2d'
      ? {
          title: 'The hero',
          ask: 'Is this the first thing you want people to see? Change the headline size or the button colour if not.',
          show: { component: '/Sections/Hero' },
          settings: [
            { node: 'Headline', port: 'text', label: 'Headline' },
            { node: 'Headline', port: 'fontSize', label: 'Headline size', choices: ['var(--display-sm)', 'var(--display-md)', 'var(--display-lg)'] },
            { node: 'Primary action', port: 'label', label: 'Button words' },
            { node: 'Primary action', port: 'backgroundColor', label: 'Button colour' }
          ],
          variants: [
            { name: 'Warm', values: { 'Primary action.backgroundColor': 'var(--primary)' } },
            { name: 'Calm', values: { 'Primary action.backgroundColor': 'var(--secondary)' } }
          ]
        }
      : {
          title: 'The robot',
          ask: 'This is the robot the player meets first. Pick its colours and size.',
          show: { component: '/Pages/Home', node: 'Robot' },
          settings: [
            { node: 'robotBody', port: 'colour', label: 'Body colour', choices: ['#ffa502', '#3742fa', '#2ed573'] },
            { node: 'robotHead', port: 'colour', label: 'Head colour' },
            { port: 'scale', label: 'Size', min: 0.5, max: 3, step: 0.1 },
            { port: 'rotationY', label: 'Turn', min: 0, max: 360, step: 5 }
          ],
          variants: [
            { name: 'Classic', values: { 'robotBody.colour': '#ffa502', scale: 1 } },
            { name: 'Big blue', values: { 'robotBody.colour': '#3742fa', scale: 2 } }
          ]
        };
  const shown = await tool('show_mini_editor', args);
  check('show_mini_editor answers with an id and a panel id', !shown.isError && /^me-/.test(shown.data.miniEditorId ?? ''), shown.isError ? JSON.stringify(shown.data) : shown.data.onScreen);
  if (shown.isError) throw new Error('no editor');
  const id = shown.data.miniEditorId;
  await mount('mini1', 'ui://nodegx/mini-editor.html', shown.raw);

  await until('the mini editor draws the part (the stage note clears)', async () => {
    const s = JSON.parse(await inPanelMain('mini1', MINI_STATE));
    return s.id === id && s.frames === 1 && s.hidden === true ? true : s;
  }, 60000);
  await sleep(mode === '3d' ? 4000 : 1500);
  await shot(`${mode}-01-mini-editor.png`);

  // R1: the Studio panel in the older message went quiet.
  const studioQuiet = await inPanel('studio1', `document.documentElement.dataset.quiet || ''`);
  check('R1: the Studio panel in the older message went quiet', studioQuiet === 'booted', studioQuiet);

  if (mode === '2d') {
    // Only the part is drawn: the hero's buttons, not the nav's.
    const VISIBLE = `(() => { const d = window.__mini.preview.frame.contentDocument; const t = d.querySelector('[data-me-target]'); return JSON.stringify({ found: !!t, buttons: t ? [...t.querySelectorAll('button')].map((b) => b.textContent.trim()) : [], scale: window.__mini.scale }); })()`;
    console.log('      probe elementsOf:', await inPanelMain('mini1', `JSON.stringify(Object.fromEntries(['sec_hero', 'hero_band', 'hero_cta', 'page', 'sec_nav'].map((id) => [id, (window.__mini.preview.elementsOf(id) || []).map((e) => e.tagName + ':' + Math.round(e.getBoundingClientRect().height))])))`));
    const v0 = JSON.parse(await inPanelMain('mini1', VISIBLE));
    check('only the hero is drawn (the nav\'s "Adopt a pup" is not in it)', v0.found && v0.buttons.includes('Meet the puppies') && !v0.buttons.includes('Adopt a pup'), JSON.stringify(v0));
    const swatches = await inPanelMain('mini1', `[...document.querySelectorAll('.me-field')].find((f) => f.textContent.startsWith('Button colour')).querySelectorAll('.me-swatches button').length`);
    check('the colour control offers the project\'s colours', swatches >= 6, `${swatches} swatches`);
    // The live part answers a control without a rebuild.
    await inPanelMain('mini1', `(() => { window.__frameMark = window.__mini.preview.frame; return 'marked'; })()`);
    await inPanelMain('mini1', `(() => { const el = [...document.querySelectorAll('.me-field')].find((f) => f.textContent.startsWith('Button words')).querySelector('input'); el.value = 'Book a visit'; el.dispatchEvent(new Event('input', { bubbles: true })); return 'typed'; })()`);
    await sleep(1600);
    const v1 = JSON.parse(await inPanelMain('mini1', VISIBLE));
    const sameFrame = await inPanelMain('mini1', `String(window.__frameMark === window.__mini.preview.frame)`);
    check('a typed setting shows in the live part', v1.buttons.includes('Book a visit') && !v1.buttons.includes('Meet the puppies'), `${v0.buttons.join('|')} → ${v1.buttons.join('|')}`);
    check('… without rebuilding the preview', sameFrame === 'true', sameFrame);
    const onDisk = nodesOf('Sections/Hero').find((n) => n.id === 'hero_cta').parameters.label;
    check('… and is written to the project file', onDisk === 'Book a visit', onDisk);
    // A token choice.
    await inPanelMain('mini1', `(() => { const f = [...document.querySelectorAll('.me-field')].find((x) => x.textContent.startsWith('Headline size')); const b = [...f.querySelectorAll('button')].find((x) => x.textContent === 'display-lg'); b.click(); return 'clicked'; })()`);
    await sleep(1200);
    const size = nodesOf('Sections/Hero').find((n) => n.id === 'hero_head').parameters.fontSize;
    check('a token choice is written as the token', size === 'var(--display-lg)', size);
    // A variant.
    await inPanelMain('mini1', `(() => { [...document.querySelectorAll('.me-variants button')].find((b) => b.textContent === 'Calm').click(); return 'ok'; })()`);
    await sleep(1500);
    const bg = nodesOf('Sections/Hero').find((n) => n.id === 'hero_cta').parameters.backgroundColor;
    check('a variant writes its values', bg === 'var(--secondary)', bg);
    const v2 = JSON.parse(await inPanelMain('mini1', VISIBLE));
    const kept = await inPanelMain('mini1', `String(window.__frameMark === window.__mini.preview.frame)`);
    check('… and the live part is still there, the same frame (a re-render never moves it)', v2.found && v2.buttons.includes('Book a visit') && kept === 'true', JSON.stringify(v2));
    await shot('2d-02-after-changes.png');
  } else {
    const census = `(() => { const el = window.__mini.preview.frame.contentDocument.querySelector('[data-three-scene]'); const e = el && el.__threeKit; if (!e) return JSON.stringify({ engine: false }); const vis = e.scene.children.filter((o) => o.userData && o.userData.nodeId).map((o) => o.userData.nodeId + ':' + o.visible); return JSON.stringify({ engine: true, paused: e.isPaused(), vis }); })()`;
    const c0 = JSON.parse(await inPanelMain('mini1', census));
    check('3D: the Scene runs in the stage', c0.engine === true, JSON.stringify(c0));
    if (c0.engine) {
      check('3D: the game is paused (Edit, not Play)', c0.paused === true);
      // the lights stay on (a robot in the dark is black): every other object outside the robot is hidden
      const visible = c0.vis.filter((v) => v.endsWith(':true')).map((v) => v.split(':')[0]).filter((v) => v !== 'sky' && v !== 'sun');
      check('3D: only the robot\'s objects are drawn (the lights stay on)', visible.length > 0 && visible.every((v) => ['robot', 'robotBody', 'robotHead', 'robotEye'].includes(v)), c0.vis.join(' '));
    }
    const colourOf = `(() => { const e = window.__mini.preview.frame.contentDocument.querySelector('[data-three-scene]').__threeKit; let hex = null; e.scene.traverse((o) => { if (o.userData && o.userData.nodeId === 'robotBody' && o.material) hex = '#' + o.material.color.getHexString(); }); return hex; })()`;
    const before = await inPanelMain('mini1', colourOf);
    await inPanelMain('mini1', `(() => { document.querySelector('.me-field[data-key$="robotBody.colour"] button[data-v="#2ed573"]').click(); return 'ok'; })()`);
    await sleep(1200);
    const after = await inPanelMain('mini1', colourOf);
    check('3D: a swatch recolours the body live', after === '#2ed573', `${before} → ${after}`);
    const onDisk = nodesOf('Pages/Home').find((n) => n.id === 'robotBody').parameters.colour;
    check('3D: … and the colour is in the project file', onDisk === '#2ed573', onDisk);
    await inPanelMain('mini1', `(() => { [...document.querySelectorAll('.me-variants button')].find((b) => b.textContent === 'Big blue').click(); return 'ok'; })()`);
    await sleep(1500);
    const scale = nodesOf('Pages/Home').find((n) => n.id === 'robot').parameters.scale;
    const live = await inPanelMain('mini1', `(() => { const e = window.__mini.preview.frame.contentDocument.querySelector('[data-three-scene]').__threeKit; let s = null; e.scene.traverse((o) => { if (o.userData && o.userData.nodeId === 'robot') s = o.scale.x; }); return s; })()`);
    check('3D: a variant (Big blue) scales the robot live and in the file', scale === 2 && live === 2, `file ${scale}, live ${live}`);
    await sleep(800);
    await shot('3d-02-after-changes.png');
  }

  // Approve: the decision reaches the conversation as the person's message.
  await inPanelMain('mini1', `(() => { document.querySelector('.me-addnote').click(); const t = document.querySelector('.me-note textarea'); t.value = 'Looks great.'; t.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('.me-primary').click(); return 'ok'; })()`);
  await until('Approve sends a ui/message', async () => ((await evalTop('window.messages.length')) > 0 ? true : await evalTop('window.messages.length')));
  const msg = await evalTop(`window.messages[0] && window.messages[0].params.content[0].text`);
  check('… worded as the person\'s answer, with what they changed and their note', /^Approved: "The (hero|robot)"/.test(msg ?? '') && (mode === '3d' ? /Body colour/.test(msg) : /Button words "Meet the puppies" → "Book a visit"|Button words Meet the puppies → Book a visit/.test(msg)) && /Looks great\.$/.test(msg), msg);
  const read = await tool('get_mini_editor', { id });
  check('get_mini_editor reads the decision', read.data.status === 'approved', JSON.stringify(read.data.changed));
  await shot(`${mode}-03-approved.png`);

  // R1 again, the other way: Studio asked for again in a newer message quiets the mini editor.
  const studio2 = await tool('open_studio');
  await mount('studio2', 'ui://nodegx/studio.html', studio2.raw);
  await until('R1: a newer Studio panel quiets the mini editor', async () => {
    const s = JSON.parse(await inPanelMain('mini1', MINI_STATE));
    return s.quiet === 'booted' ? true : s;
  });

  // R2: a fresh editor left unanswered, superseded, brought back.
  const second = await tool('show_mini_editor', { ...args, title: mode === '2d' ? 'The hero, again' : 'The robot, again' });
  await mount('mini2', 'ui://nodegx/mini-editor.html', second.raw);
  await until('the second mini editor draws', async () => {
    const s = JSON.parse(await inPanelMain('mini2', MINI_STATE));
    return s.frames === 1 && s.hidden === true ? true : s;
  }, 60000);
  const studio3 = await tool('open_studio');
  await mount('studio3', 'ui://nodegx/studio.html', studio3.raw);
  await until('… and goes quiet under a newer Studio, unanswered', async () => {
    const s = JSON.parse(await inPanelMain('mini2', MINI_STATE));
    return s.quiet === 'booted' ? true : s;
  });
  const words = await inPanelMain('mini2', `document.querySelector('.me-quiet')?.textContent ?? ''`);
  check('… saying it is not answered and how to bring it back', /Not answered yet\. Ask Claude to show/.test(words), words);
  const back = await tool('show_mini_editor', { reopen: second.data.miniEditorId });
  check('R2: reopen draws it again', !back.isError && back.data.reopened === true && back.data.status === 'open');
  await mount('mini3', 'ui://nodegx/mini-editor.html', back.raw);
  await until('… live in the newest message, with the same id', async () => {
    const s = JSON.parse(await inPanelMain('mini3', MINI_STATE));
    return s.id === second.data.miniEditorId && !s.quiet && s.frames === 1 && s.hidden === true ? true : s;
  }, 60000);
  const studio3Quiet = await inPanel('studio3', `document.documentElement.dataset.quiet || ''`);
  check('… and the Studio before it went quiet', studio3Quiet === 'booted', studio3Quiet);
  await sleep(1500);
  await shot(`${mode}-04-whole-conversation.png`);
  const heights = await evalTop('JSON.stringify(window.heights)');
  console.log(`      panel heights: ${heights}`);
} catch (e) {
  check('the drive ran', false, e.stack);
} finally {
  try {
    ws?.close();
  } catch {}
  chrome.kill('SIGTERM');
  host.close();
  await client.close().catch(() => {});
  await sleep(600);
  fs.rmSync(udd, { recursive: true, force: true });
  console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}
