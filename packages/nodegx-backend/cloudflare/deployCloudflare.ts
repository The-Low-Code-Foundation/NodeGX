/**
 * P115 HST-014 — put a NodeGX app online on the person's own Cloudflare account: one command, the same address every
 * time, and never a wipe.
 *
 *   node packages/nodegx-backend/cloudflare/deploy.mjs <project> [options]
 *
 * What the HST-004/006 spike did by hand, in order:
 *   1. the cloud functions, bundled by the editor's own bundler (`noodl-mcp/dist/cloud-bundle.cjs`, the one
 *      `deploy_cloud_functions` runs), their code nodes printed (HST-013); a text that cannot be printed stops here
 *   2. the site: `nodegx deploy` of a copy (the interpreter, every node runs as in the preview), the production viewer
 *      swapped in when `--viewer` names one; the backend address is not baked: the Worker answers
 *      `nodegx-config.json` with its own origin, so the same site works at any address
 *   3. the Worker: `worker.ts` and the whole backend bundled with the backend's own esbuild settings
 *   4. a search of every file that would be uploaded for the admin credential and the project's `.env` values (AC3)
 *   5. `wrangler deploy` (or `wrangler dev` with `--local`); on a first deploy the admin credential goes up as the
 *      Worker secret NODEGX_ADMIN_TOKEN with it (`--secrets-file`), and the R2 bucket is made
 *   6. the project's collections, rules and roles applied to the running backend (`applyProject`), then its cloud
 *      functions uploaded through the admin API, as `deploy_cloud_functions` does
 *
 * The deployment's folder (`~/.nodegx/cloudflare/<name>/`, or `--out`) keeps `deployment.json` (mode 600: the
 * address, the bucket and the admin credential), and what was uploaded. The credential never leaves that file except
 * as the Worker secret.
 */
import { spawn, spawnSync } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { collectCode, printCodeModule, refusalSentence } from '../../noodl-runtime/src/printcode';
import { cloudBundleNameFrom, deployCloudBundle, type CloudBundleParts, type CloudDeployTransport } from '../../noodl-editor/src/editor/src/utils/exporter/cloudDeployCore';
import { readViewerBuild } from '../../noodl-preview/src/viewerBuild';
import { applyProject, type AdminCall } from './applyProject';
import { workerNameFrom, workerNameProblem, wranglerConfig } from './wranglerConfig';

/** Where this file is: `packages/nodegx-backend/cloudflare` (the launcher sets it; the bundle's own dir is `.build`). */
const HERE = process.env.NODEGX_CLOUDFLARE_SRC || __dirname;
const PACKAGES = path.resolve(HERE, '..', '..');

export interface DeployOptions {
  project: string;
  name?: string;
  bucket?: string | null;
  viewer?: string;
  allowDevelopmentEngine?: boolean;
  out?: string;
  local?: boolean;
  port?: number;
  makeRoles?: boolean;
  newAdminCredential?: boolean;
  dryRun?: boolean;
}

interface DeploymentRecord {
  name: string;
  bucket: string | null;
  url: string | null;
  adminToken: string;
  project: string;
  deploys: Array<{ at: string; url: string | null; local: boolean }>;
}

class DeployError extends Error {}

const say = (line = '') => process.stdout.write(line + '\n');

// ---------------------------------------------------------------------------------------------------------------------
// Arguments

const USAGE = `usage: deploy.mjs <project> [--name <worker>] [--bucket <r2 bucket> | --no-bucket] [--viewer <folder>]
                 [--allow-development-engine] [--out <folder>] [--local [--port <n>]] [--make-roles]
                 [--new-admin-credential] [--dry-run]`;

export function parseArgs(argv: string[]): DeployOptions {
  const o: DeployOptions = { project: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new DeployError(`${a} needs a value.\n${USAGE}`);
      return v;
    };
    if (a === '--name') o.name = next();
    else if (a === '--bucket') o.bucket = next();
    else if (a === '--no-bucket') o.bucket = null;
    else if (a === '--viewer') o.viewer = path.resolve(next());
    else if (a === '--allow-development-engine') o.allowDevelopmentEngine = true;
    else if (a === '--out') o.out = path.resolve(next());
    else if (a === '--local') o.local = true;
    else if (a === '--port') o.port = Number(next());
    else if (a === '--make-roles') o.makeRoles = true;
    else if (a === '--new-admin-credential') o.newAdminCredential = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a.startsWith('--')) throw new DeployError(`${a} is not an option.\n${USAGE}`);
    else if (!o.project) o.project = path.resolve(a);
    else throw new DeployError(`One project at a time.\n${USAGE}`);
  }
  if (!o.project) throw new DeployError(USAGE);
  return o;
}

// ---------------------------------------------------------------------------------------------------------------------
// The project

interface Project {
  dir: string;
  name: string;
  file: Record<string, any>;
  policyText: string | null;
  automationsText: string | null;
  collections: Array<{ name: string; columns?: any[]; indexes?: unknown[]; checks?: unknown[] }>;
  /** Values in the project's `.env`, which must not be in anything uploaded. */
  envValues: string[];
}

function readProject(dir: string): Project {
  const file = path.join(dir, 'nodegx.project.json');
  if (!fs.existsSync(file)) throw new DeployError(`${dir} is not a NodeGX project: it has no nodegx.project.json.`);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const policyFile = path.join(dir, 'nodegx.security.json');
  const policyText = fs.existsSync(policyFile) ? fs.readFileSync(policyFile, 'utf8') : null;
  if (policyText) JSON.parse(policyText); // a broken policy stops here, by name, not on the backend
  const automationsFile = path.join(dir, 'nodegx.automations.json');
  const automationsText = fs.existsSync(automationsFile) ? fs.readFileSync(automationsFile, 'utf8') : null;
  if (automationsText) JSON.parse(automationsText);
  const envFile = path.join(dir, '.env');
  const envValues = fs.existsSync(envFile)
    ? fs
        .readFileSync(envFile, 'utf8')
        .split('\n')
        .map((l) => l.replace(/^\s*(export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '').replace(/^['"]|['"]\s*$/g, '').trim())
        .filter((v) => v.length >= 8)
    : [];
  return {
    dir,
    name: json.name || path.basename(dir),
    file: json,
    policyText,
    automationsText,
    collections: json?.metadata?.dbCollections ?? [],
    envValues
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The deployment's folder and record

function deploymentsRoot(): string {
  return process.env.NODEGX_CLOUDFLARE_HOME || path.join(os.homedir(), '.nodegx', 'cloudflare');
}

function readRecord(dir: string): DeploymentRecord | null {
  const file = path.join(dir, 'deployment.json');
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as DeploymentRecord) : null;
}

function writeRecord(dir: string, record: DeploymentRecord): void {
  const file = path.join(dir, 'deployment.json');
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. Cloud functions

function cloudFunctions(projectDir: string): { bundleName: string; projectId?: string; parts: CloudBundleParts } {
  const entry = process.env.NODEGX_CLOUD_BUNDLE || path.join(PACKAGES, 'noodl-mcp', 'dist', 'cloud-bundle.cjs');
  if (!fs.existsSync(entry)) {
    throw new DeployError(`The cloud-function bundler is not here (${entry}): run \`npm run build\` in packages/noodl-mcp.`);
  }
  const run = spawnSync(process.execPath, [entry, projectDir], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120_000 });
  if (run.status !== 0) throw new DeployError(`Could not build this project's cloud functions:\n${(run.stderr || '').trim() || 'no output'}`);
  return JSON.parse(run.stdout);
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. The site

const NOT_FOR_THE_HOST = ['DEPLOY.md', 'serve.js', 'package.json', '.nodegx-deploy.json', 'nodegx-config.json'];

function buildSite(project: Project, name: string, siteDir: string, o: DeployOptions): string[] {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-cf-site-'));
  try {
    const copy = path.join(work, 'project');
    fs.cpSync(project.dir, copy, { recursive: true, filter: (src) => !/[/\\](\.git|node_modules|\.previews)$/.test(src) });
    // The address is answered by the Worker at `nodegx-config.json`; nothing machine-local is baked.
    const json = JSON.parse(fs.readFileSync(path.join(copy, 'nodegx.project.json'), 'utf8'));
    json.metadata = { ...(json.metadata || {}), cloudservices: { endpoint: '', appId: name, instanceId: name, type: 'nodegx' } };
    fs.writeFileSync(path.join(copy, 'nodegx.project.json'), JSON.stringify(json, null, 2));

    const out = path.join(work, 'site');
    const cli = process.env.NODEGX_CLI || path.join(PACKAGES, 'nodegx-export', 'dist', 'cli.mjs');
    const args = [cli, 'deploy', copy, out];
    if (o.viewer || o.allowDevelopmentEngine) args.push('--allow-development-engine');
    const run = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (run.status !== 0) {
      throw new DeployError(
        `\`nodegx deploy\` refused (${run.status}):\n${(run.stdout + run.stderr).trim()}` +
          (run.status === 11 ? '\nName a production viewer with --viewer <folder holding noodl.deploy.js>.' : '')
      );
    }
    const notes = run.stdout.split('\n').filter((l) => / deployed to |left out|excluded|engine/i.test(l)).map((l) => l.trim());
    if (o.viewer) {
      for (const f of ['noodl.deploy.js', 'noodl.deploy.js.LICENSE.txt']) {
        const from = path.join(o.viewer, f);
        if (fs.existsSync(from)) fs.copyFileSync(from, path.join(out, f));
        else if (f === 'noodl.deploy.js') throw new DeployError(`--viewer ${o.viewer} holds no noodl.deploy.js.`);
      }
      // The deploy's own test (EXP-017): a development build is refused, never published by a swap.
      const engine = readViewerBuild(path.join(out, 'noodl.deploy.js'));
      if (engine.kind !== 'production') {
        throw new DeployError(`--viewer ${o.viewer} is a DEVELOPMENT build of the viewer: ${engine.reasons.join('; ')}.`);
      }
      notes.push(`viewer: production, from ${o.viewer} (${(engine.bytes / 1e6).toFixed(2)} MB)`);
    }
    for (const f of NOT_FOR_THE_HOST) fs.rmSync(path.join(out, f), { force: true });
    // A hidden file is never part of an app, and is where a person keeps what is theirs (`.accounts.json`, `.env`,
    // `.mcp.json`): `nodegx deploy` reads `.noodlignore` but not `.gitignore`, so a gitignored one was published.
    const hidden = filesUnder(out).filter((f) => path.relative(out, f).split(path.sep).some((part) => part.startsWith('.')));
    for (const f of hidden) fs.rmSync(f, { force: true });
    if (hidden.length) notes.push(`left out (hidden files are never published): ${hidden.map((f) => path.relative(out, f)).join(', ')}`);
    fs.rmSync(siteDir, { recursive: true, force: true });
    fs.cpSync(out, siteDir, { recursive: true });
    return notes;
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. The Worker

async function buildWorker(
  distDir: string,
  app: { appId: string; appName: string; policy: string | null; automations: string | null },
  printed: string
): Promise<void> {
  const esbuild = require('esbuild');
  const { shared } = require(path.join(HERE, '..', 'scripts', 'build.js'));
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'printed-code.mjs'), printed);
  fs.writeFileSync(path.join(distDir, 'app.mjs'), `export default ${JSON.stringify(app)};\n`);
  const nodeSqlite = path.join(HERE, 'nodeSqlite.ts');
  await esbuild.build({
    ...shared,
    entryPoints: [path.join(HERE, 'worker.ts')],
    outfile: path.join(distDir, 'worker.mjs'),
    format: 'esm',
    target: 'es2022',
    sourcemap: false,
    logLevel: 'warning',
    logOverride: { 'direct-eval': 'silent' },
    conditions: ['workerd', 'worker'],
    external: ['cloudflare:*', 'sharp', 'pg-native', 'better-sqlite3'],
    // The backend's own banner (`_noodl_cloud_runtime_version`: the runtime's server-side branches), then what CommonJS
    // inside an ES module needs on workerd: `require` (node:module) and `__dirname` (the history reads schema.sql).
    banner: {
      js:
        shared.banner.js +
        "\nimport { createRequire as __nodegxCreateRequire } from 'node:module'; const require = __nodegxCreateRequire('/bundle/worker.mjs'); const __filename = '/bundle/worker.mjs'; const __dirname = '/bundle';"
    },
    plugins: [
      {
        name: 'own-modules',
        setup(b: any) {
          b.onResolve({ filter: /^\.\/(printed-code|app)\.mjs$/ }, (a: any) => ({ path: a.path, external: true }));
          b.onResolve({ filter: /^node:sqlite$/ }, () => ({ path: nodeSqlite }));
        }
      }
    ]
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. What would be uploaded, searched

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else out.push(full);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out;
}

export function leaks(files: string[], secrets: Array<{ what: string; value: string }>): string[] {
  const found: string[] = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'latin1');
    for (const s of secrets) if (s.value && text.includes(s.value)) found.push(`${s.what} is in ${f}`);
  }
  return found;
}

// ---------------------------------------------------------------------------------------------------------------------
// 5. wrangler

function wranglerCommand(): string[] {
  if (process.env.NODEGX_WRANGLER) return [process.execPath, process.env.NODEGX_WRANGLER];
  for (const from of [process.cwd(), HERE]) {
    try {
      return [process.execPath, require.resolve('wrangler/bin/wrangler.js', { paths: [from] })];
    } catch {
      /* next */
    }
  }
  return ['npx', '--yes', 'wrangler@4'];
}

function wrangler(args: string[], cwd: string, opts: { quiet?: boolean } = {}): { status: number; out: string } {
  const [cmd, ...pre] = wranglerCommand();
  const run = spawnSync(cmd, [...pre, ...args], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  const out = `${run.stdout || ''}${run.stderr || ''}`;
  if (!opts.quiet) process.stdout.write(out.split('\n').map((l) => (l ? `  │ ${l}` : l)).join('\n') + '\n');
  return { status: run.status ?? 1, out };
}

async function waitFor(url: string, seconds: number): Promise<void> {
  const until = Date.now() + seconds * 1000;
  let last = '';
  while (Date.now() < until) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
      last = `${r.status} ${(await r.text()).slice(0, 200)}`;
    } catch (e) {
      last = String((e as Error).message);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new DeployError(`${url} did not answer within ${seconds} s (last: ${last}).`);
}

// ---------------------------------------------------------------------------------------------------------------------
// 6. The project onto the running backend

function adminCaller(base: string, token: string): AdminCall {
  return async (method, p, body) => {
    const res = await fetch(base + p, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    return { status: res.status, json, text };
  };
}

function cloudTransport(call: AdminCall): CloudDeployTransport {
  return {
    putBundle: async (name, bundle) => {
      const r = await call('PUT', `/admin/workflows/${encodeURIComponent(name)}`, bundle);
      const body = r.json as { success?: boolean; error?: string; replaced?: string[] } | null;
      if (r.status >= 300 || body?.success === false) throw new Error(body?.error || `${r.status} ${r.text.slice(0, 300)}`);
      return { replaced: body?.replaced };
    },
    readServingHash: async (name) => {
      const r = await call('GET', '/admin/workflows');
      const body = r.json as { bundles?: Array<{ name: string; deployFingerprint: string | null }> } | null;
      return body?.bundles?.find((b) => b.name === name)?.deployFingerprint ?? null;
    }
  };
}

async function applyEverything(base: string, token: string, project: Project, functions: ReturnType<typeof cloudFunctions>, makeRoles: boolean): Promise<void> {
  const call = adminCaller(base, token);
  const who = await call('GET', '/admin/permissions');
  if (who.status === 401 || who.status === 403) {
    throw new DeployError(
      `The backend at ${base} refused this machine's admin credential (${who.status}). It was deployed with another one. ` +
        'Deploy again with --new-admin-credential to replace it (the old one stops working).'
    );
  }
  const report = await applyProject(call, { policy: project.policyText ? JSON.parse(project.policyText) : null, collections: project.collections }, { firstDeploy: makeRoles });
  for (const l of report.lines) say(`  ${l}`);
  if (project.automationsText) {
    const a = JSON.parse(project.automationsText) as { workflows?: unknown[]; triggers?: unknown[] };
    const wf = (await call('GET', '/admin/workflow-defs')).json as { workflows?: unknown[] } | unknown[] | null;
    const tr = (await call('GET', '/admin/triggers')).json as { triggers?: unknown[] } | unknown[] | null;
    const count = (x: typeof wf | typeof tr, k: 'workflows' | 'triggers') => (Array.isArray(x) ? x.length : ((x as Record<string, unknown[]> | null)?.[k]?.length ?? 0));
    say(
      `  Workflows and triggers: the backend has ${count(wf, 'workflows')} and ${count(tr, 'triggers')}; nodegx.automations.json has ` +
        `${a.workflows?.length ?? 0} and ${a.triggers?.length ?? 0}. They are taken from the project at the backend's first start only: ` +
        `a change to them since is NOT carried by a redeploy yet (HST-014 left).`
    );
  }

  const transport = cloudTransport(call);
  const served = (await transport.readServingHash!(functions.bundleName).catch(() => null)) !== null;
  const result = await deployCloudBundle(functions.parts, functions.bundleName, transport, { deleteWhenEmpty: served, projectId: functions.projectId });
  if (result.error) throw new DeployError(`The cloud functions were not pushed: ${result.error}`);
  const deployed = result.functions.filter((f) => f.status === 'deployed').map((f) => f.name);
  const failed = result.functions.filter((f) => f.status === 'failed');
  if (deployed.length) say(`  Cloud functions deployed: ${deployed.join(', ')}.`);
  else if (!result.functions.length) say('  Cloud functions: none in this project.');
  else say(`  Cloud functions: unchanged (${result.functions.map((f) => f.name).join(', ')}).`);
  if (failed.length) throw new DeployError(`Cloud functions that did not deploy:\n${failed.map((f) => `  ${f.name}: ${f.reason}`).join('\n')}`);
}

// ---------------------------------------------------------------------------------------------------------------------

export async function deploy(o: DeployOptions): Promise<number> {
  const project = readProject(o.project);
  const root = deploymentsRoot();
  const name = o.name || (o.out ? readRecord(o.out)?.name : undefined) || workerNameFrom(project.name);
  const problem = workerNameProblem(name);
  if (problem) throw new DeployError(problem);
  const dir = o.out || path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const before = readRecord(dir);
  if (before && path.resolve(before.project) !== path.resolve(project.dir)) {
    throw new DeployError(`${name} was deployed from ${before.project}, not ${project.dir}. Choose another --name.`);
  }
  const firstDeploy = !before || !before.deploys.some((d) => d.local === !!o.local);
  const mint = !before || !!o.newAdminCredential;
  const record: DeploymentRecord = {
    name,
    bucket: o.bucket !== undefined ? o.bucket : before ? before.bucket : `${name}-files`,
    url: before?.url ?? null,
    adminToken: mint ? crypto.randomBytes(32).toString('base64url') : before!.adminToken,
    project: project.dir,
    deploys: before?.deploys ?? []
  };
  say(`NodeGX → Cloudflare: "${project.name}" as the Worker ${name}${o.local ? ' (locally, on workerd)' : ''}${firstDeploy ? ', first deploy' : ''}.`);

  say('1. Cloud functions');
  const functions = cloudFunctions(project.dir);
  if (functions.parts.failures.length) {
    throw new DeployError(`Cloud functions that cannot be bundled:\n${functions.parts.failures.map((f) => `  ${f.name}: ${f.reason}`).join('\n')}`);
  }
  const components = ((functions.parts.bundle as { components?: unknown[] } | null)?.components ?? []) as Parameters<typeof collectCode>[0];
  const { print, refusals } = collectCode(components);
  if (refusals.length) throw new DeployError(refusals.map(refusalSentence).join('\n'));
  say(`  ${functions.parts.shipped.length} function(s), ${print.length} code text(s) printed.`);

  say('2. The site');
  const siteDir = path.join(dir, 'site');
  for (const n of buildSite(project, name, siteDir, o)) say(`  ${n}`);

  say('3. The Worker');
  const distDir = path.join(dir, 'dist');
  fs.rmSync(distDir, { recursive: true, force: true });
  await buildWorker(distDir, { appId: name, appName: project.name, policy: project.policyText, automations: project.automationsText }, printCodeModule(print));
  fs.writeFileSync(path.join(dir, 'wrangler.toml'), wranglerConfig({ name, bucket: record.bucket }));
  const uploaded = [...filesUnder(siteDir), ...filesUnder(distDir)];
  const mb = uploaded.reduce((n, f) => n + fs.statSync(f).size, 0) / 1e6;
  say(`  ${uploaded.length} files to upload, ${mb.toFixed(2)} MB; files in ${record.bucket ? `the bucket ${record.bucket}` : 'NO bucket (uploads are lost on a restart)'}.`);

  say('4. Nothing private in what is uploaded');
  const found = leaks(uploaded, [{ what: 'the admin credential', value: record.adminToken }, ...project.envValues.map((v, i) => ({ what: `.env value ${i + 1}`, value: v }))]);
  if (found.length) throw new DeployError(`Refused: ${found.join('; ')}.`);
  say(`  0 of ${uploaded.length} files hold the admin credential or a .env value.`);

  if (o.dryRun) {
    writeRecord(dir, { ...record, adminToken: before?.adminToken ?? record.adminToken });
    say(`Dry run: built in ${dir}, nothing uploaded.`);
    return 0;
  }

  say(`5. ${o.local ? 'wrangler dev' : 'wrangler deploy'}`);
  if (o.local) {
    const port = o.port || 8787;
    fs.writeFileSync(path.join(dir, '.dev.vars'), `NODEGX_ADMIN_TOKEN=${record.adminToken}\n`, { mode: 0o600 });
    const [cmd, ...pre] = wranglerCommand();
    const child = spawn(cmd, [...pre, 'dev', '--config', 'wrangler.toml', '--port', String(port), '--ip', '127.0.0.1', '--persist-to', path.join(dir, '.state')], {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }
    });
    const log = fs.createWriteStream(path.join(dir, 'wrangler-dev.log'));
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    const base = `http://127.0.0.1:${port}`;
    await waitFor(`${base}/health`, 90);
    say(`6. The project onto the backend at ${base}`);
    await applyEverything(base, record.adminToken, project, functions, firstDeploy || !!o.makeRoles);
    record.deploys.push({ at: new Date().toISOString(), url: base, local: true });
    writeRecord(dir, record);
    say(`\nRunning on workerd at ${base} (log: ${path.join(dir, 'wrangler-dev.log')}). Ctrl-C stops it; its data stays in ${path.join(dir, '.state')}.`);
    await new Promise<void>((resolve) => child.on('exit', () => resolve()));
    return 0;
  }

  if (record.bucket && firstDeploy) {
    const made = wrangler(['r2', 'bucket', 'create', record.bucket], dir, { quiet: true });
    if (made.status !== 0 && !/already exists|already own/i.test(made.out)) {
      throw new DeployError(`The bucket ${record.bucket} could not be made:\n${made.out.trim()}\n(R2 must be enabled on the account; --no-bucket deploys without one.)`);
    }
    say(`  bucket ${record.bucket}: ${made.status === 0 ? 'made' : 'already there'}`);
  }
  const deployArgs = ['deploy', '--config', 'wrangler.toml'];
  let secretsFile: string | null = null;
  if (mint) {
    secretsFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-cf-')), 'secrets.json');
    fs.writeFileSync(secretsFile, JSON.stringify({ NODEGX_ADMIN_TOKEN: record.adminToken }), { mode: 0o600 });
    deployArgs.push('--secrets-file', secretsFile);
  }
  let done: { status: number; out: string };
  try {
    done = wrangler(deployArgs, dir);
  } finally {
    if (secretsFile) fs.rmSync(path.dirname(secretsFile), { recursive: true, force: true });
  }
  if (done.status !== 0) throw new DeployError('wrangler deploy failed (above). Nothing on the backend was changed.');
  const url = /https:\/\/[a-z0-9.-]+\.workers\.dev/.exec(done.out)?.[0] ?? record.url;
  if (!url) throw new DeployError('wrangler deployed, but did not say the address: deploy again to finish.');
  record.url = url;
  record.deploys.push({ at: new Date().toISOString(), url, local: false });
  writeRecord(dir, record);
  await waitFor(`${url}/health`, 60);
  say(`6. The project onto the backend at ${url}`);
  await applyEverything(url, record.adminToken, project, functions, firstDeploy || !!o.makeRoles);
  say(`\nOnline: ${url}`);
  say(`The backend's dashboard: ${url}/_admin — its admin credential is in ${path.join(dir, 'deployment.json')} (never uploaded).`);
  return 0;
}

export async function main(argv: string[]): Promise<number> {
  try {
    return await deploy(parseArgs(argv));
  } catch (e) {
    if (e instanceof DeployError || (e as Error)?.name === 'ApplyError') {
      process.stderr.write(`\n${(e as Error).message}\n`);
      return 1;
    }
    throw e;
  }
}
