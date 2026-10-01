#!/usr/bin/env node
/**
 * THE SITE A REAL CLIENT LOADS, DERIVED FROM THE TEMPLATE (TASK-L183 §4).
 *
 *   node tools/build-production-site.mjs --origin https://training.digitalbricks.io \
 *     --engine <dir holding a PRODUCTION noodl.deploy.js + its .LICENSE.txt> --out <dir>
 *
 * The template's Home is built for a developer on their own machine: two doors
 * that PREFILL the demo world's addresses (sprint 49 decision 8) and a note that
 * says so. On a real client's site those doors would offer to sign somebody in
 * as an invented learner. So, like the public demo (build-demo.mjs, TASK-L180),
 * the production site is DERIVED, never edited: every file is the template's
 * except the NAMED LIST below, and the output is refused if it carries anything
 * of the demo world.
 *
 * THE NAMED LIST, and nothing else:
 *   - the project's endpoint is --origin (the site and its backend are one
 *     origin behind Caddy, so no CORS is involved).
 *   - Pages/Home: the coach's door and the demo note go (hm_coach, hm_go_people,
 *     t_hm_coach, hm_note, t_hm_note, and their wires); the learner's door keeps
 *     its place and loses its PREFILLED address (hm_go's pm-email). It is a
 *     plain way to the sign-in page. Who is staff was never decided by a door.
 *   - two Home strings: the door says "Sign in", and the lede loses its "Look at
 *     it from either side:" (it takes the signed-in lede, which is the same
 *     sentence without the doors).
 *   - App's router loses /Pages/Palette. The kit's specimen is a developer's
 *     page; on a client's site it is a lesson about an invented person.
 *
 * Then nodegx-deploy, and the ENGINE is replaced: the working tree's
 * noodl.deploy.js is whatever a peer last built (L180), so the production
 * viewer is built separately (hosting/README.md §2) and passed as --engine. The
 * output is refused if the engine carries an inline source map, if backend/,
 * tools/, hosting/ or the security file were published, if any @example.test
 * address or the Palette route survived, or if the origin is not in it.
 */
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const OPENNOODL = resolve(TEMPLATE, '..', '..');
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const ORIGIN = String(arg('origin') || '').replace(/\/$/, '');
const ENGINE = arg('engine');
const OUT = arg('out');
if (!/^https?:\/\/[^/]+$/.test(ORIGIN) || !ENGINE || !OUT) {
  console.error('build-production-site: --origin <https://host>, --engine <dir> and --out <dir> are required.');
  process.exit(2);
}
for (const f of ['noodl.deploy.js', 'noodl.deploy.js.LICENSE.txt']) {
  if (!existsSync(join(ENGINE, f))) {
    console.error(`build-production-site: ${join(ENGINE, f)} is missing — build the production viewer first (hosting/README.md §2).`);
    process.exit(2);
  }
}

export const REMOVED_HOME_NODES = ['hm_coach', 'hm_go_people', 't_hm_coach', 'hm_note', 't_hm_note'];
export const HOME_STRINGS = { openCourse: 'Sign in' }; // + lede := signedIn.lede
export const DROPPED_ROUTES = ['/Pages/Palette'];

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
// This project's on-disk format: indent 2, no trailing newline (sprint 46).
const write = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2));

// ── 1. A copy of the template, without what is not the app ──────────────────
const work = mkdtempSync(join(tmpdir(), 'dbt-production-'));
const proj = join(work, 'project');
cpSync(TEMPLATE, proj, {
  recursive: true,
  filter: (src) => !/[/\\](backend|tools|hosting|docs)([/\\]|$)/.test(src.slice(TEMPLATE.length))
});

// ── 2. The named list ──────────────────────────────────────────────────────
const project = read(join(proj, 'nodegx.project.json'));
project.metadata.cloudservices = { ...(project.metadata.cloudservices || {}), endpoint: ORIGIN };
write(join(proj, 'nodegx.project.json'), project);

const homeDir = join(proj, 'components', 'Pages', 'Home');
const home = read(join(homeDir, 'nodes.json'));
const gone = new Set(REMOVED_HOME_NODES);
const missing = REMOVED_HOME_NODES.filter((id) => !home.nodes.some((n) => n.id === id));
if (missing.length) throw new Error(`Home no longer has ${missing.join(', ')} — the named list is out of date`);
home.nodes = home.nodes
  .filter((n) => !gone.has(n.id))
  .map((n) => (n.children ? { ...n, children: n.children.filter((c) => !gone.has(c)) } : n));
const door = home.nodes.find((n) => n.id === 'hm_go');
if (!door || !('pm-email' in door.parameters)) throw new Error("Home's learner door has no prefill to remove — the named list is out of date");
delete door.parameters['pm-email'];
door.label = '→ Sign in';
door.metadata = { comment: 'PRODUCTION (build-production-site.mjs): a plain way to the sign-in page, with no address filled in.' };
write(join(homeDir, 'nodes.json'), home);
const homeWires = read(join(homeDir, 'connections.json'));
const wireList = Array.isArray(homeWires) ? homeWires : homeWires.connections;
const keptWires = wireList.filter((w) => !gone.has(w.fromId) && !gone.has(w.toId));
write(join(homeDir, 'connections.json'), Array.isArray(homeWires) ? keptWires : { ...homeWires, connections: keptWires });

const stringsPath = join(proj, 'components', 'Data', 'Strings', 'nodes.json');
const strings = read(stringsPath);
const graph = strings.nodes.find((n) => n.id === 'str_graph');
const table = JSON.parse(graph.parameters.json);
table[0].home = { ...table[0].home, ...HOME_STRINGS, lede: table[0].home.signedIn.lede };
graph.parameters.json = JSON.stringify(table);
write(stringsPath, strings);

const appPath = join(proj, 'components', 'App', 'nodes.json');
const app = read(appPath);
const router = app.nodes.find((n) => n.id === 'app_router');
const pages = router && router.parameters.pages;
if (!pages || !Array.isArray(pages.routes) || !DROPPED_ROUTES.every((r) => pages.routes.includes(r))) {
  throw new Error("App's router does not list the routes the named list drops — the named list is out of date");
}
pages.routes = pages.routes.filter((r) => !DROPPED_ROUTES.includes(r));
write(appPath, app);

const registryPath = join(proj, 'components', '_registry.json');
if (existsSync(registryPath)) {
  const registry = read(registryPath);
  const entry = (registry.components || registry)['Pages/Home'];
  if (entry) {
    entry.nodeCount = home.nodes.length;
    entry.connectionCount = keptWires.length;
  }
  write(registryPath, registry);
}

// ── 3. Deploy, then the production engine ──────────────────────────────────
rmSync(OUT, { recursive: true, force: true });
const deploy = spawnSync(
  process.execPath,
  [join(OPENNOODL, 'packages', 'noodl-preview', 'dist', 'nodegx-deploy.cjs'), proj, OUT, '--allow-development-engine'],
  { encoding: 'utf8' }
);
if (deploy.status !== 0) throw new Error(`nodegx-deploy failed:\n${deploy.stdout}\n${deploy.stderr}`);
for (const f of ['noodl.deploy.js', 'noodl.deploy.js.LICENSE.txt']) cpSync(join(ENGINE, f), join(OUT, f));
rmSync(join(OUT, 'nodegx.security.json'), { force: true });
rmSync(work, { recursive: true, force: true });

// ── 4. Refuse anything that is not a client's site ─────────────────────────
const failures = [];
const files = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(OUT);
for (const dir of ['backend', 'tools', 'hosting', 'docs']) if (existsSync(join(OUT, dir))) failures.push(`${dir}/ was published`);
if (existsSync(join(OUT, 'nodegx.security.json'))) failures.push('the security file was published');
const engine = readFileSync(join(OUT, 'noodl.deploy.js'), 'utf8');
// Searched in the WHOLE file: the map's marker opens a 10 MB base64 tail, so a
// check on the end of the file measured nothing (it passed a development engine).
if (/\/\/[#@] sourceMappingURL=data:/.test(engine)) failures.push('the engine carries an inline source map (a development build)');
const lines = engine.split('\n').length;
if (lines > 20000) failures.push(`the engine is ${lines} lines long, so it is not minified (a development build)`);
let originSeen = false;
let routesSeen = false;
for (const f of files) {
  if (!/\.(js|json|html)$/.test(f) || f.endsWith('noodl.deploy.js') || f.includes(`${join(OUT, 'noodl_modules')}`)) continue;
  const text = readFileSync(f, 'utf8');
  if (/@example\.test/.test(text)) failures.push(`${f.slice(OUT.length + 1)} holds an @example.test address`);
  // The router's route list, wherever the bundle put it: the list that holds
  // /Pages/Home must not hold a dropped route.
  for (const m of text.matchAll(/"routes":\s*(\[[^\]]*\])/g)) {
    let routes;
    try {
      routes = JSON.parse(m[1]);
    } catch {
      continue;
    }
    if (routes.includes('/Pages/Home')) {
      routesSeen = true;
      for (const r of DROPPED_ROUTES) if (routes.includes(r)) failures.push(`${f.slice(OUT.length + 1)} still routes ${r}`);
    }
  }
  if (text.includes(ORIGIN)) originSeen = true;
}
if (!routesSeen) failures.push('the router\'s route list was not found in the site, so the Palette check tested nothing');
if (!originSeen) failures.push(`the origin ${ORIGIN} is nowhere in the site`);

if (failures.length) {
  console.error('build-production-site: REFUSED —\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log(
  `build-production-site: ${files.length} files in ${OUT} for ${ORIGIN}; production engine (${(engine.length / 1e6).toFixed(2)} MB); ` +
    'no demo address, no Palette route, no source folders.'
);
