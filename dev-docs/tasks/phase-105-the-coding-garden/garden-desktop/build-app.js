#!/usr/bin/env node
/**
 * Assemble what goes inside the Olive's Island installer (P105 CG-004; internally garden-desktop). Forked from Nightbook's build-app.js (TPL-011-DESKTOP
 * DESK-1) and parameterised by shell/garden.json.
 *
 *   shell/build-output/app/        the exported app, its backend endpoint baked to the shell's origin
 *   shell/build-output/backend/    nodegx-backend's single-file bundle (dist/cli.js)
 *   shell/build-output/policy/     the app's nodegx.security.json, installed on the backend's first start — or, for a
 *                                  project that ships none (the garden template: no backend, the family lives in
 *                                  localStorage), the shell's CLOSED policy (shell/policy.js CLOSED_POLICY)
 *   shell/build-output/workflows/  the app's cloud functions (<bundle>.workflow.json), from the project's
 *                                  `.garden-functions/` (garden.json functionsDir); the shell copies them into the data
 *                                  folder, because the backend's --project-dir installs the policy only
 *   shell/build-output/model/      the GGUF, put there by fetch-model.mjs (NEVER by this script, never committed);
 *                                  its sha256 is verified here again — a mismatch fails the build (AC6)
 *   shell/build-output/licenses/   Qwen (Apache 2.0), node-llama-cpp (MIT), llama.cpp (MIT), and the NOTICE
 *   shell/build-output/BUILD.json  what went in, with hashes
 *
 * Run from the repo root, after the viewer, the deploy engine and the backend are built, and after fetch-model.mjs:
 *
 *   node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/fetch-model.mjs [--from <local gguf>]
 *   node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/build-app.js
 *        [--project <dir>]              (default templates/bot-garden, relative to THIS checkout's root)
 *        [--allow-development-engine]   (a LOCAL smoke only — never for an installer anyone gets)
 *        [--no-model]                   (build without the owl: the game runs on its written lines, AC4)
 *
 * The project is copied and the copy is edited, never the source: the loopback origin is baked into its manifest (an
 * EMPTY endpoint means NO backend), and its page title becomes the game's name (garden.json `name`, P105 ruling 7).
 * The deploy engine answers with ONE JSON line and exits 0 even when it refuses (HLS-015): that line is read here.
 */
'use strict';

const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HERE = __dirname;
const REPO = path.resolve(HERE, '../../../..');
const config = require('./shell/garden.json');
const { CLOSED_POLICY } = require('./shell/policy');
const ORIGIN = `http://127.0.0.1:${config.port}`;

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const OUT = path.join(HERE, 'shell', 'build-output');
const DEPLOY_CLI = path.join(REPO, 'packages/noodl-preview/dist/nodegx-deploy.cjs');
const BACKEND = path.join(REPO, 'packages/nodegx-backend/dist/cli.js');
const POLICY = config.policy;
const FUNCTIONS_DIR = config.functionsDir || '.garden-functions';
const MODEL = path.join(OUT, 'model', config.model.file);

function fail(msg) {
  console.error(`build-app: ${msg}`);
  process.exit(1);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const DEFAULT_PROJECT = 'templates/bot-garden';
if (argv.includes('--project') && !opt('--project')) fail('--project needs a directory');
const PROJECT = path.resolve(REPO, opt('--project', DEFAULT_PROJECT));
// The project's own policy when it ships one; the shell's closed one when it does not (the garden template).
const PROJECT_POLICY = path.join(PROJECT, POLICY);
const policySource = fs.existsSync(PROJECT_POLICY) ? 'project' : 'shell-closed';

for (const [what, file] of [
  ['project', path.join(PROJECT, 'nodegx.project.json')],
  ['deploy engine (npm run build --workspace @noodl/preview)', DEPLOY_CLI],
  ['backend bundle (npm --prefix packages/nodegx-backend run build)', BACKEND]
]) {
  if (!fs.existsSync(file)) fail(`missing ${what}: ${file}`);
}
console.log(`build-app: project ${path.relative(REPO, PROJECT)}, policy ${policySource === 'project' ? PROJECT_POLICY : 'the shell’s CLOSED policy (the project ships none)'}`);

// The model is fetched by fetch-model.mjs, before; it is verified here, never removed by the clean below.
const withModel = !argv.includes('--no-model');
if (withModel) {
  if (!fs.existsSync(MODEL)) fail(`no model at ${MODEL} — run fetch-model.mjs first, or pass --no-model for a build without the owl`);
  const got = sha256(MODEL);
  if (got !== config.model.sha256) fail(`the model's sha256 is ${got}, garden.json says ${config.model.sha256} — refusing to build with it`);
}

for (const sub of ['app', 'backend', 'policy', 'workflows', 'licenses', 'BUILD.json']) fs.rmSync(path.join(OUT, sub), { recursive: true, force: true });
if (!withModel) fs.rmSync(path.join(OUT, 'model'), { recursive: true, force: true });
for (const sub of ['backend', 'policy', 'workflows', 'licenses', 'model']) fs.mkdirSync(path.join(OUT, sub), { recursive: true });

// 1. A copy of the project with the endpoint baked in. The source is never edited.
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-app-'));
const project = path.join(work, 'project');
fs.cpSync(PROJECT, project, { recursive: true });
const manifestFile = path.join(project, 'nodegx.project.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
// An EMPTY endpoint means NO backend to the runtime (resolveBackend.pure.ts): the loopback origin is baked.
manifest.metadata = { ...(manifest.metadata || {}), cloudservices: { appId: config.appId, endpoint: ORIGIN, type: 'nodegx' } };
// The page's <title> is the game's name (the shell pins the window title too; this is the first paint's).
manifest.settings = { ...(manifest.settings || {}), htmlTitle: config.name };
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

// 2. Export it with the real deploy engine. Its verdict is the JSON line on stdout, never its exit code: it exits 0 on a
// refusal (a development engine, a project it cannot read), and a refusal must stop the installer here.
const deployArgs = [DEPLOY_CLI, project, path.join(OUT, 'app')];
if (argv.includes('--allow-development-engine')) deployArgs.push('--allow-development-engine');
const deploy = spawnSync(process.execPath, deployArgs, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 });
const verdictLine = String(deploy.stdout || '').trim().split('\n').filter(Boolean).pop() || '';
let verdict = null;
try {
  verdict = JSON.parse(verdictLine);
} catch {
  fail(`the deploy engine printed no verdict (exit ${deploy.status}): ${verdictLine.slice(0, 300) || '(nothing)'}`);
}
if (!verdict || verdict.ok !== true) fail(`the deploy engine refused at stage "${verdict && verdict.stage}": ${verdict && verdict.message}`);

// 2b. The cloud functions are the backend's too: never served, installed by the shell.
const FUNCTIONS = path.join(PROJECT, FUNCTIONS_DIR);
const workflows = fs.existsSync(FUNCTIONS) ? fs.readdirSync(FUNCTIONS).filter((f) => f.endsWith('.workflow.json')) : [];
for (const f of workflows) fs.copyFileSync(path.join(FUNCTIONS, f), path.join(OUT, 'workflows', f));
fs.rmSync(path.join(OUT, 'app', FUNCTIONS_DIR), { recursive: true, force: true });
fs.rmSync(path.join(OUT, 'app', '.gitignore'), { force: true });
if (fs.existsSync(path.join(OUT, 'app', FUNCTIONS_DIR))) fail('the function bundle is still inside the served app');

// 3. The policy is the backend's, not the page's: out of the served folder, into its own.
if (policySource === 'project') fs.copyFileSync(PROJECT_POLICY, path.join(OUT, 'policy', POLICY));
else fs.writeFileSync(path.join(OUT, 'policy', POLICY), JSON.stringify(CLOSED_POLICY, null, 2) + '\n');
fs.rmSync(path.join(OUT, 'app', POLICY), { force: true });

// 4. The backend bundle.
fs.copyFileSync(BACKEND, path.join(OUT, 'backend', 'cli.js'));

// 5. The licences the owl owes (CG-004 §2): Qwen Apache 2.0, node-llama-cpp MIT, llama.cpp MIT, and the NOTICE.
for (const f of fs.readdirSync(path.join(HERE, 'licenses'))) fs.copyFileSync(path.join(HERE, 'licenses', f), path.join(OUT, 'licenses', f));

// 6. Measure the bake, don't assume it: the hashed bundle must carry the shell's origin.
const bundles = fs.readdirSync(path.join(OUT, 'app')).filter((f) => /^index-[0-9a-f]+\.js$/.test(f));
if (bundles.length !== 1) fail(`expected one hashed index-*.js in the export, found ${bundles.length}: ${bundles.join(', ')}`);
const bundle = fs.readFileSync(path.join(OUT, 'app', bundles[0]), 'utf8');
if (!bundle.includes(ORIGIN)) fail(`${bundles[0]} does not carry the endpoint ${ORIGIN}`);
if (!fs.existsSync(path.join(OUT, 'app', 'index.html'))) fail('the export has no index.html');

const build = {
  builtAt: new Date().toISOString(),
  origin: ORIGIN,
  project: path.relative(REPO, PROJECT),
  name: config.name,
  policySource,
  bundle: bundles[0],
  developmentEngine: argv.includes('--allow-development-engine'),
  workflows,
  model: withModel ? { file: config.model.file, sha256: config.model.sha256, bytes: fs.statSync(MODEL).size, url: config.model.url } : null,
  licenses: fs.readdirSync(path.join(OUT, 'licenses')),
  sha256: {
    backend: sha256(path.join(OUT, 'backend', 'cli.js')),
    bundle: sha256(path.join(OUT, 'app', bundles[0])),
    policy: sha256(path.join(OUT, 'policy', POLICY))
  }
};
fs.writeFileSync(path.join(OUT, 'BUILD.json'), JSON.stringify(build, null, 2));
fs.rmSync(work, { recursive: true, force: true });
console.log(`build-app: ok — ${bundles[0]} bakes ${ORIGIN}; backend ${build.sha256.backend.slice(0, 12)}; model ${withModel ? 'present, sha256 verified' : 'ABSENT (--no-model)'}`);
