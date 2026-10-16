#!/usr/bin/env node
// preview-solo — the real app alone in a browser tab, no editor chrome: the kit's in-page preview over a project folder.
//   node preview-solo.mjs <project-dir> [--port n]        then open http://127.0.0.1:<port>/            (?page=<urlPath> to start on a page)
// Same pieces as the editor's serve.mjs (the deploy runtime, the preview bundle, the project's text files), none of its editing.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import http from 'node:http';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..', '..', '..');
const flag = (name) => { const at = process.argv.indexOf(name); return at === -1 ? undefined : process.argv[at + 1]; };
const projectDir = resolve(process.argv.slice(2).find((a) => !a.startsWith('--') && process.argv[process.argv.indexOf(a) - 1] !== '--port') ?? '.');
if (!existsSync(join(projectDir, 'nodegx.project.json'))) { console.error(`preview-solo: ${projectDir} has no nodegx.project.json`); process.exit(2); }
const runtimeDir = flag('--runtime') ?? join(repo, 'packages/noodl-editor/src/external/deploy');
const bundle = join(repo, 'packages/noodl-preview/dist/browser/noodl-preview-in-page.js');
for (const [what, at] of [['the deploy runtime', join(runtimeDir, 'noodl.deploy.js')], ['the in-page preview bundle', bundle]]) if (!existsSync(at)) { console.error(`preview-solo: no ${what} at ${at}`); process.exit(2); }

const types = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css', '.woff2': 'font/woff2' };
const TEXT = ['.json', '.js', '.css', '.md', '.html', '.txt'];
const SKIP = new Set(['node_modules', '.git', '.nodegx', 'noodl_modules']);
function projectFiles(dir) {
  const files = {};
  const walk = (folder) => { for (const name of readdirSync(folder)) { if (SKIP.has(name) || name.startsWith('.')) continue; const full = join(folder, name); if (statSync(full).isDirectory()) walk(full); else if (TEXT.includes(extname(name))) files[relative(dir, full).split(sep).join('/')] = readFileSync(full, 'utf8'); } };
  walk(dir); return files;
}
const under = (root, rel) => { const file = resolve(root, rel); return file.startsWith(root + sep) || file === root ? file : undefined; };

const page = `<!doctype html><html><head><meta charset="utf-8"><title>preview</title>
<style>html,body{margin:0;height:100%;background:#fff}#app{position:fixed;inset:0}#status{position:fixed;left:8px;bottom:8px;font:12px system-ui;color:#555;background:#fff;padding:4px 8px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.2);z-index:9}</style>
<script src="/preview.js"></script></head><body><div id="app"></div><div id="status">loading…</div><script type="module">
const status = (t) => (document.getElementById('status').textContent = t);
const opened = await (await fetch('/api/project')).json();
const files = NodegxPreview.memoryFiles(opened.files);
const preview = await NodegxPreview.mountPreview(document.getElementById('app'), { runtimeBase: '/runtime/' });
const s = await preview.update(files.entries());
window.__preview = preview;
if (s.status !== 'ok') { const first = s.report?.diagnostics?.find((d) => d.severity === 'error'); status('not shown: ' + (first ? first.message.slice(0, 200) : s.message || s.status)); }
else {
  status(opened.name + ' · ' + Math.round(s.exportMs) + ' ms export, ' + Math.round(s.frameMs) + ' ms draw' + (s.warnings?.length ? ' · ' + s.warnings.length + ' warning(s)' : ''));
  const want = new URLSearchParams(location.search).get('page');
  if (want) setTimeout(() => { try { preview.frame.contentWindow.Noodl.Navigation.navigateToPath('/' + want.replace(/^\\//, '')); } catch (e) { console.warn(e); } }, 400);
  setTimeout(() => document.getElementById('status').remove(), 6000);
}
</script></body></html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (status, body, type) => { res.writeHead(status, { 'content-type': type ?? types['.json'], 'cache-control': 'no-store' }); res.end(body); };
  try {
    if (url.pathname === '/') return send(200, page, types['.html']);
    if (url.pathname === '/preview.js') return send(200, readFileSync(bundle), types['.js']);
    if (url.pathname === '/api/project') return send(200, JSON.stringify({ dir: projectDir, name: projectDir.split(sep).pop(), files: projectFiles(projectDir) }));
    if (url.pathname.startsWith('/runtime/')) { const f = under(runtimeDir, decodeURIComponent(url.pathname.slice('/runtime/'.length))); if (f && existsSync(f) && statSync(f).isFile()) return send(200, readFileSync(f), types[extname(f)] ?? 'application/octet-stream'); }
    const asset = under(projectDir, decodeURIComponent(url.pathname.slice(1)));
    if (asset && existsSync(asset) && statSync(asset).isFile()) return send(200, readFileSync(asset), types[extname(asset)] ?? 'application/octet-stream');
    res.writeHead(404); res.end();
  } catch (err) { send(500, JSON.stringify({ error: err.message })); }
});
server.listen(Number(flag('--port')) || 0, '127.0.0.1', () => console.log(`preview-solo: http://127.0.0.1:${server.address().port}/  (${projectDir})`));
