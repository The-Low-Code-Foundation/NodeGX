#!/usr/bin/env node
/**
 * Assemble what goes inside the Nightbook installer (TPL-011-DESKTOP DESK-1):
 *
 *   shell/build-output/app/      the exported app, its backend endpoint baked to the shell's origin
 *   shell/build-output/backend/  nodegx-backend's single-file bundle (dist/cli.js)
 *   shell/build-output/policy/   the app's nodegx.security.json, installed on the backend's first start
 *   shell/build-output/BUILD.json what went in, with hashes
 *
 * Run from the repo root, after the viewer, the deploy engine and the backend are built:
 *
 *   node dev-docs/tasks/phase-78-the-templates/nightbook-desktop/build-app.js [--project templates/todo-list]
 *        [--allow-development-engine]   (a LOCAL smoke only — never for an installer anyone gets)
 *
 * The DESK-1 app is the todo list (a real two-page app with sign-up and records); the journal's
 * own graph replaces it when it exists.
 */
'use strict';

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HERE = __dirname;
const REPO = path.resolve(HERE, '../../../..');
const config = require('./shell/nightbook.json');
const ORIGIN = `http://127.0.0.1:${config.port}`;

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const PROJECT = path.resolve(REPO, opt('--project', 'templates/todo-list'));
const OUT = path.join(HERE, 'shell', 'build-output');
const DEPLOY_CLI = path.join(REPO, 'packages/noodl-preview/dist/nodegx-deploy.cjs');
const BACKEND = path.join(REPO, 'packages/nodegx-backend/dist/cli.js');
const POLICY = 'nodegx.security.json';

function fail(msg) {
  console.error(`build-app: ${msg}`);
  process.exit(1);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

for (const [what, file] of [
  ['project', path.join(PROJECT, 'nodegx.project.json')],
  ['deploy engine (npm run build --workspace @noodl/preview)', DEPLOY_CLI],
  ['backend bundle (npm --prefix packages/nodegx-backend run build)', BACKEND],
  ['policy', path.join(PROJECT, POLICY)]
]) {
  if (!fs.existsSync(file)) fail(`missing ${what}: ${file}`);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'backend'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'policy'), { recursive: true });

// 1. A copy of the project with the endpoint baked in. The source is never edited.
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'nightbook-app-'));
const project = path.join(work, 'project');
fs.cpSync(PROJECT, project, { recursive: true });
const manifestFile = path.join(project, 'nodegx.project.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
manifest.metadata = { ...(manifest.metadata || {}), cloudservices: { appId: config.appId, endpoint: ORIGIN, type: 'nodegx' } };
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

// 2. Export it with the real deploy engine.
const deployArgs = [DEPLOY_CLI, project, path.join(OUT, 'app')];
if (argv.includes('--allow-development-engine')) deployArgs.push('--allow-development-engine');
execFileSync(process.execPath, deployArgs, { stdio: 'inherit', cwd: REPO });

// 3. The policy is the backend's, not the page's: out of the served folder, into its own.
fs.copyFileSync(path.join(PROJECT, POLICY), path.join(OUT, 'policy', POLICY));
fs.rmSync(path.join(OUT, 'app', POLICY), { force: true });

// 4. The backend bundle.
fs.copyFileSync(BACKEND, path.join(OUT, 'backend', 'cli.js'));

// 5. Measure the bake, don't assume it: the hashed bundle must carry the shell's origin.
const bundles = fs.readdirSync(path.join(OUT, 'app')).filter((f) => /^index-[0-9a-f]+\.js$/.test(f));
if (bundles.length !== 1) fail(`expected one hashed index-*.js in the export, found ${bundles.length}: ${bundles.join(', ')}`);
const bundle = fs.readFileSync(path.join(OUT, 'app', bundles[0]), 'utf8');
if (!bundle.includes(ORIGIN)) fail(`${bundles[0]} does not carry the endpoint ${ORIGIN}`);
if (!fs.existsSync(path.join(OUT, 'app', 'index.html'))) fail('the export has no index.html');

const build = {
  builtAt: new Date().toISOString(),
  origin: ORIGIN,
  project: path.relative(REPO, PROJECT),
  bundle: bundles[0],
  developmentEngine: argv.includes('--allow-development-engine'),
  sha256: {
    backend: sha256(path.join(OUT, 'backend', 'cli.js')),
    bundle: sha256(path.join(OUT, 'app', bundles[0])),
    policy: sha256(path.join(OUT, 'policy', POLICY))
  }
};
fs.writeFileSync(path.join(OUT, 'BUILD.json'), JSON.stringify(build, null, 2));
fs.rmSync(work, { recursive: true, force: true });
console.log(`build-app: ok — ${bundles[0]} bakes ${ORIGIN}; backend ${build.sha256.backend.slice(0, 12)}`);
