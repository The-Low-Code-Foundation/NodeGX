/**
 * P112 OWN-004 slice 2 — serves what a home-made editor needs to show the real app beside it:
 *
 *   /runtime/*            the deploy runtime (`packages/noodl-editor/src/external/deploy/`, `npm run build:editor:_viewer`)
 *   /preview.js           `@noodl/preview`'s in-page build (`npm --prefix packages/noodl-preview run build`)
 *   /project/<name>.json  a project folder beside this file, every text file as one path → text map
 *   anything else         the files in this folder
 *
 *   node serve.mjs [port]      (default: a free loopback port; the URL is printed; `/` opens orbit.html)
 *
 *   node serve.mjs --out <dir> [--runtime <deploy dir>] [--allow-development-engine]
 *                              the same files as a static folder (orbit.html as its index.html), to put on
 *                              any web server at any path — nodegx.io/orbit/ is this. A public copy needs a
 *                              production runtime: `OUT_PATH=<dir> npx webpack --config
 *                              webpack-configs/webpack.deploy.prod.js` in `packages/noodl-viewer-react`, then
 *                              `--runtime <dir>/deploy`. The dev runtime (~17 MB) is refused without the flag.
 *
 * Nothing here knows NodeGX: the page holds the project in memory and the preview turns it into the app.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..', '..');
const flag = (name) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
};
const out = flag('--out');
const runtimeDir = flag('--runtime') ?? join(repo, 'packages/noodl-editor/src/external/deploy');
const bundle = join(repo, 'packages/noodl-preview/dist/browser/noodl-preview-in-page.js');
for (const [what, at] of [['the deploy runtime', join(runtimeDir, 'noodl.deploy.js')], ['the in-page preview bundle', bundle]]) {
  if (!existsSync(at)) {
    console.error(`serve: no ${what} at ${at}`);
    process.exit(2);
  }
}

const types = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };

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

/** Every folder beside this file that is a project: what `/project/<name>.json` answers for. */
const projectNames = () => readdirSync(here).filter((name) => existsSync(join(here, name, 'nodegx.project.json')));

if (out) {
  const engine = join(runtimeDir, 'noodl.deploy.js');
  if (statSync(engine).size > 5e6 && !process.argv.includes('--allow-development-engine')) {
    console.error(`serve: ${engine} is a development build (${(statSync(engine).size / 1e6).toFixed(1)} MB); build a production one (see the header) or pass --allow-development-engine`);
    process.exit(2);
  }
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'project'), { recursive: true });
  mkdirSync(join(out, 'runtime'));
  copyFileSync(join(here, 'orbit.html'), join(out, 'index.html'));
  for (const file of ['look.js', 'specs.js']) copyFileSync(join(here, file), join(out, file));
  copyFileSync(bundle, join(out, 'preview.js'));
  // what the preview reads: the template and its index.js, and the three scripts the template names
  for (const file of ['index.html', 'index.js', 'noodl.deploy.js', 'react.production.min.js', 'react-dom.production.min.js']) copyFileSync(join(runtimeDir, file), join(out, 'runtime', file));
  for (const name of projectNames()) writeFileSync(join(out, 'project', `${name}.json`), JSON.stringify(projectFiles(join(here, name))));
  console.log(`serve: wrote ${out} (projects: ${projectNames().join(', ')})`);
  process.exit(0);
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
    res.writeHead(302, { location: '/orbit.html' });
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
