#!/usr/bin/env node
/**
 * Export a project with the WORKING-TREE exporter, bundle the emitted app, serve it, and hand a
 * headless Chrome page to a drive — the exported-app twin of `render-report.js`'s `withRenderedPage`.
 *
 * Built for HLT-014 AC6 (one drive graded against both the viewer and an export of the same fixture),
 * because nothing in the repo did all four steps: the export suites stop at `tsc` (HLS-004 says why —
 * `vite build` wants an `npm install` per fixture), and every earlier exported-app drive used a Vite
 * harness prepared by hand in a session scratchpad that did not survive the session.
 *
 * ## What it does instead of Vite, and what that costs
 *
 * - **The exporter** is bundled from `packages/nodegx-export/src` by esbuild on every call, so a
 *   reading is about the source in the tree, never a stale `dist/` ([[a-stale-mcp-dist-hides-a-merged-vocabulary-field]]).
 * - **The app** is bundled by esbuild from the emitted `src/main.tsx`, resolving `react`, `react-dom`,
 *   `react-router-dom` and `@nodegx/core` from the checkout's own `node_modules`. `*.module.css` goes
 *   through esbuild's `local-css` loader, which is Vite's CSS-modules contract (a default export of
 *   class names).
 * - ⚠️ **Not graded here:** the emitted app's `tsc -b` (the export package's `typecheck-emitted`
 *   suite owns that), PostCSS, and anything Vite-specific beyond `import.meta.env`. A drive through
 *   this harness is evidence about BEHAVIOUR in a browser, not about the build.
 *
 * Usage from a drive:
 *   const { withExportedPage } = require('./exported-app-harness');
 *   await withExportedPage({ projectDir }, async (page) => { await page.evaluate('…'); });
 */
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { findChrome } = require('./render-report');

function esbuild() {
  return require(path.join(REPO_ROOT, 'node_modules', 'esbuild'));
}

/** The working-tree exporter, freshly bundled. */
function loadExporter(scratch) {
  const outfile = path.join(scratch, 'exporter', 'exporter.cjs');
  esbuild().buildSync({
    entryPoints: [path.join(REPO_ROOT, 'packages/nodegx-export/src/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
    logLevel: 'error',
    external: ['esbuild']
  });
  // `catalogPath()` looks beside itself first — the packaged layout.
  fs.copyFileSync(
    path.join(REPO_ROOT, 'packages/noodl-types/src/node-catalog.json'),
    path.join(path.dirname(outfile), 'node-catalog.json')
  );
  return require(outfile);
}

/**
 * The emitted app's dependencies the checkout does not hold. The checkout's `react-router-dom` is v5
 * (the editor's); every exported app asks for v7. Installed ONCE into a shared temp directory, at the
 * range the emitted `package.json` names, with `--legacy-peer-deps` so npm does not bring a second
 * React — `react`/`react-dom` are aliased to the checkout's single copy below.
 */
function appDeps(appPackageJson) {
  const range = JSON.parse(appPackageJson).dependencies['react-router-dom'];
  const dir = path.join(os.tmpdir(), 'nodegx-exported-app-deps', `react-router-dom@${range}`.replace(/[^\w@.-]/g, '_'));
  if (!fs.existsSync(path.join(dir, 'node_modules', 'react-router-dom', 'package.json'))) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), '{"private":true}');
    require('child_process').execFileSync(
      'npm',
      ['install', '--no-save', '--no-audit', '--no-fund', '--legacy-peer-deps', '--prefer-offline', `react-router-dom@${range}`],
      { cwd: dir, stdio: 'ignore' }
    );
  }
  return path.join(dir, 'node_modules');
}

/**
 * Export `projectDir` into `<scratch>/app` and bundle it into `<scratch>/app/dist`.
 * @returns {{ appDir: string, distDir: string, notes: string[], files: string[] }}
 */
function buildExportedApp(projectDir, scratch, transform) {
  const exporter = loadExporter(scratch);
  const catalog = exporter.loadCatalog();
  const ir = exporter.parseProject(projectDir, catalog);
  const app = exporter.emitApp(ir, catalog);
  // A drive's mutant arm: edit the emitted text before it is bundled (e.g. remove one attribute to
  // prove the check that reads it can fail). Returns the files to write.
  if (transform) app.files = transform({ ...app.files });
  const appDir = path.join(scratch, 'app');
  for (const [rel, text] of Object.entries(app.files)) {
    const to = path.join(appDir, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, text);
  }
  // 🔴 The non-text channel: a writer that only writes `files` drops every font and sprite silently.
  for (const copy of app.copies || []) {
    const to = path.join(appDir, copy.to);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.isAbsolute(copy.from) ? copy.from : path.join(projectDir, copy.from), to);
  }

  const distDir = path.join(appDir, 'dist');
  const deps = appDeps(app.files['package.json']);
  const repoModules = path.join(REPO_ROOT, 'node_modules');
  esbuild().buildSync({
    entryPoints: [path.join(appDir, 'src/main.tsx')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    outfile: path.join(distDir, 'app.js'),
    jsx: 'automatic',
    loader: { '.module.css': 'local-css', '.css': 'css', '.svg': 'file', '.png': 'file', '.woff2': 'file' },
    nodePaths: [deps, repoModules],
    // One React. Two copies is a hooks crash that reads as an export defect.
    alias: {
      react: path.join(repoModules, 'react'),
      'react-dom': path.join(repoModules, 'react-dom'),
      'react-router-dom': path.join(deps, 'react-router-dom')
    },
    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.env': JSON.stringify({ DEV: false, PROD: true, MODE: 'production', BASE_URL: '/', SSR: false })
    },
    logLevel: 'error'
  });
  const css = fs.existsSync(path.join(distDir, 'app.css')) ? '<link rel="stylesheet" href="/app.css">' : '';
  fs.writeFileSync(
    path.join(distDir, 'index.html'),
    `<!doctype html><html><head><meta charset="utf-8">${css}</head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>`
  );
  return { appDir, distDir, notes: app.notes || [], files: Object.keys(app.files) };
}

/** A static server with the SPA fallback Vite's preview has. */
function serve(distDir) {
  const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(distDir, url);
    if (!file.startsWith(distDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(distDir, 'index.html');
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function connectCdp(wsUrl, onEvent) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method) onEvent(msg);
  };
  return {
    send(method, params = {}) {
      const id = ++nextId;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((res, rej) => pending.set(id, { res, rej }));
    },
    close() {
      ws.close();
    }
  };
}

/**
 * Export, bundle, serve and open `projectDir`; hand `fn` a page shaped like `withRenderedPage`'s
 * (`client`, `evaluate`, `setViewport`, `goto`, `consoleErrors`). Everything is torn down after,
 * including on a throw — a teardown that only runs on the happy path is not a teardown.
 */
async function withExportedPage({ projectDir, transform }, fn) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'exported-app-'));
  let server;
  let chrome;
  let client;
  try {
    const built = buildExportedApp(projectDir, scratch, transform);
    server = await serve(built.distDir);
    const port = server.address().port;

    const { chrome: chromeBin } = findChrome();
    if (!chromeBin) throw new Error('No Chrome found (set CHROME_PATH)');
    const profile = path.join(scratch, 'profile');
    chrome = spawn(chromeBin, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], {
      stdio: 'ignore'
    });
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await new Promise((r) => setTimeout(r, 100));
    const debugPort = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    const target = targets.find((t) => t.type === 'page');

    const consoleErrors = [];
    client = await connectCdp(target.webSocketDebuggerUrl, (msg) => {
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      }
    });
    await client.send('Runtime.enable');
    await client.send('Page.enable');

    const evaluate = async (expression) => {
      const r = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const goto = async (urlPath, ceilingMs = 4000) => {
      await client.send('Page.navigate', { url: `http://127.0.0.1:${port}${urlPath}` });
      // Settled when the app has mounted something into #root, or at the ceiling.
      const until = Date.now() + ceilingMs;
      while (Date.now() < until) {
        const ready = await evaluate(`!!document.querySelector('#root') && document.querySelector('#root').children.length > 0`).catch(() => false);
        if (ready) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      await new Promise((r) => setTimeout(r, 200));
    };
    const setViewport = (v) =>
      client.send('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: 1, mobile: false });

    await goto('/');
    return await fn({ client, evaluate, goto, setViewport, consoleErrors, built });
  } finally {
    if (client) client.close();
    if (chrome) chrome.kill('SIGKILL');
    if (server) server.close();
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

module.exports = { buildExportedApp, withExportedPage };
