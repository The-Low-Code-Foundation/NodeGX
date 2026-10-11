/**
 * P117 Tchac-Boum — serves what the wall needs to show the real app beside it. The same map as P112's
 * `prototype/real/serve.mjs`, kept apart so the two prototypes never edit one file:
 *
 *   /runtime/*            the deploy runtime (`packages/noodl-editor/src/external/deploy/`, `npm run build:editor:_viewer`)
 *   /preview.js           `@noodl/preview`'s in-page build (`npm --prefix packages/noodl-preview run build`)
 *   /project/<name>.json  a project folder beside this file (`tchac/`), every text file as one path → text map
 *   anything else         the files in this folder
 *
 *   node serve.mjs [port]      (default: a free loopback port; the URL is printed; `/` opens tchac-boum.html)
 *
 * Nothing here knows NodeGX: the page holds the project in memory and the preview turns it into the app.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import http from 'node:http';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');
const runtimeDir = join(repo, 'packages/noodl-editor/src/external/deploy');
const bundle = join(repo, 'packages/noodl-preview/dist/browser/noodl-preview-in-page.js');
for (const [what, at] of [['the deploy runtime', join(runtimeDir, 'noodl.deploy.js')], ['the in-page preview bundle', bundle]]) {
  if (!existsSync(at)) {
    console.error(`serve: no ${what} at ${at}`);
    process.exit(2);
  }
}

const types = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml' };

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

function fileUnder(root, rel) {
  const file = join(root, rel);
  return file.startsWith(root) && existsSync(file) && statSync(file).isFile() ? file : undefined;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (body, type) => {
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(body);
  };
  if (url.pathname === '/') {
    res.writeHead(302, { location: '/tchac-boum.html' });
    return res.end();
  }
  if (url.pathname === '/preview.js') return send(readFileSync(bundle), types['.js']);
  const project = url.pathname.match(/^\/project\/([\w-]+)\.json$/);
  if (project && existsSync(join(here, project[1], 'nodegx.project.json'))) return send(JSON.stringify(projectFiles(join(here, project[1]))), types['.json']);
  const [root, rel] = url.pathname.startsWith('/runtime/') ? [runtimeDir, url.pathname.slice('/runtime/'.length)] : [here, url.pathname.slice(1) || 'index.html'];
  const file = fileUnder(root, decodeURIComponent(rel));
  if (file) return send(readFileSync(file), types[extname(file)] ?? 'application/octet-stream');
  res.writeHead(404);
  res.end();
});
server.listen(Number(process.argv[2]) || 0, '127.0.0.1', () => console.log(`serve: http://127.0.0.1:${server.address().port}/`));
