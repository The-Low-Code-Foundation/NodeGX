#!/usr/bin/env node
/**
 * THE SITE A REAL LEARNER LOADS (DBU-12).
 *
 *   node tools/build-production-site.mjs --origin https://training.digitalbricks.io \
 *     --engine <dir holding a PRODUCTION noodl.deploy.js + its .LICENSE.txt> --out <dir>
 *
 * Shaped on digital-bricks-training/tools/build-production-site.mjs. DERIVED, never edited: every page
 * graph is the template's. THE NAMED LIST, and nothing else:
 *   - the project's endpoint is --origin (the site and its backend are one origin behind Caddy).
 *   - published without backend/, tools/, hosting/, docs/ and the policy (.noodlignore says so; checked here),
 *     apart from hosting/privacy.html, published as /privacy.html.
 *
 * Then nodegx-deploy, and the ENGINE is replaced by a production build (hosting/README.md §2): the
 * working tree's noodl.deploy.js is whatever was last built, usually a development build.
 *
 * REFUSED if: the engine carries an inline source map or is not minified; a source folder or the policy
 * was published; the example world's people (Camille, the fixtures' @example.com learners) or a local
 * address (127.0.0.1, localhost) is in the site; the origin is not in it.
 */
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { APP, arg, readJson } from './lib/local.mjs';

const ORIGIN = String(arg('origin') || '').replace(/\/$/, '');
const ENGINE = arg('engine');
const OUT = arg('out');
if (!/^https:\/\/[^/]+$/.test(ORIGIN) || !ENGINE || !OUT) {
  console.error('build-production-site: --origin <https://host>, --engine <dir> and --out <dir> are required.');
  process.exit(2);
}
for (const f of ['noodl.deploy.js', 'noodl.deploy.js.LICENSE.txt']) {
  if (!existsSync(join(ENGINE, f))) {
    console.error(`build-production-site: ${join(ENGINE, f)} is missing: build the production viewer first (hosting/README.md §2).`);
    process.exit(2);
  }
}
const DEPLOY = [process.env.NODEGX_DEPLOY_BIN, join(homedir(), 'vscode_projects', 'OpenNoodl', 'packages', 'noodl-preview', 'dist', 'nodegx-deploy.cjs')]
  .filter(Boolean)
  .find((p) => existsSync(p));
if (!DEPLOY) {
  console.error('build-production-site: no nodegx-deploy.cjs (set NODEGX_DEPLOY_BIN).');
  process.exit(2);
}
export const NOT_PUBLISHED = ['backend', 'tools', 'hosting', 'docs', '.previews', 'nodegx.security.json', 'nodegx.automations.json'];

// 1. A copy of the project, without what is not the app.
const work = mkdtempSync(join(tmpdir(), 'dbu-production-'));
const proj = join(work, 'project');
cpSync(APP, proj, {
  recursive: true,
  filter: (src) => {
    const rel = src.slice(APP.length + 1);
    return !rel || !(NOT_PUBLISHED.includes(rel.split(/[/\\]/)[0]) || ['.mcp.json', 'CLAUDE.md', '.gitignore'].includes(rel));
  }
});

// 2. The named list: the endpoint.
const project = readJson('nodegx.project.json');
project.metadata = { ...project.metadata, cloudservices: { ...(project.metadata.cloudservices || {}), endpoint: ORIGIN } };
writeFileSync(join(proj, 'nodegx.project.json'), JSON.stringify(project, null, 2));

// 3. Deploy, then the production engine.
rmSync(OUT, { recursive: true, force: true });
const deploy = spawnSync(process.execPath, [DEPLOY, proj, OUT, '--allow-development-engine'], { encoding: 'utf8' });
if (deploy.status !== 0) throw new Error(`nodegx-deploy failed:\n${deploy.stdout}\n${deploy.stderr}`);
for (const f of ['noodl.deploy.js', 'noodl.deploy.js.LICENSE.txt']) cpSync(join(ENGINE, f), join(OUT, f));
for (const f of NOT_PUBLISHED) rmSync(join(OUT, f), { recursive: true, force: true });
// nodegx-deploy's kit for running the site on a laptop (a Node file server, its package.json and notes): Caddy serves
// the site here, so they are not published.
for (const f of ['serve.js', 'package.json', 'DEPLOY.md']) rmSync(join(OUT, f), { force: true });
// The privacy notice of THIS deployment (hosting/privacy.html names who runs it), linked from Sign in.
cpSync(join(APP, 'hosting', 'privacy.html'), join(OUT, 'privacy.html'));
rmSync(work, { recursive: true, force: true });

// 4. Refuse anything that is not the real site.
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
const engine = readFileSync(join(OUT, 'noodl.deploy.js'), 'utf8');
if (/\/\/[#@] sourceMappingURL=data:/.test(engine)) failures.push('the engine carries an inline source map (a development build)');
if (engine.split('\n').length > 20000) failures.push('the engine is not minified (a development build)');
const fixtures = readJson('backend', 'fixtures', 'learners.json');
const learnerAddresses = fixtures.learners.map((l) => l.email);
let originSeen = false;
for (const f of files) {
  if (!/\.(js|json|html|css)$/.test(f) || f.endsWith('noodl.deploy.js') || f.includes(join(OUT, 'noodl_modules'))) continue;
  const text = readFileSync(f, 'utf8');
  const rel = f.slice(OUT.length + 1);
  for (const a of learnerAddresses) if (text.includes(a)) failures.push(`${rel} holds the example world's ${a}`);
  if (/127\.0\.0\.1|localhost:/.test(text)) failures.push(`${rel} holds a local address`);
  if (text.includes(ORIGIN)) originSeen = true;
}
if (!originSeen) failures.push(`the origin ${ORIGIN} is nowhere in the site`);
if (!existsSync(join(OUT, 'index.html'))) failures.push('no index.html');
if (!existsSync(join(OUT, 'privacy.html'))) failures.push('no privacy.html');

if (failures.length) {
  console.error('build-production-site: REFUSED\n  ' + [...new Set(failures)].join('\n  '));
  process.exit(1);
}
console.log(
  `build-production-site: ${files.length} files in ${OUT} for ${ORIGIN}; production engine (${(engine.length / 1e6).toFixed(2)} MB); ` +
    'no source folders, no policy, no example people, no local address.'
);
