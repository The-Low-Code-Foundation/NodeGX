/**
 * P26 DEP-002 s4 — `deploy_to_vm`: the app, its backend and its data on a Linux machine the person owns, from the
 * agent, in one call.
 *
 * ## What it is made of, and why it is not a second implementation
 *
 * Two things already did this by hand (DEP-002 s3, graded against a throwaway VM): `nodegx-deploy --full-stack`
 * writes ONE folder (the app, the backend that serves it, the project's cloud functions and access rules,
 * `start.js`), and `provision-app.sh`, run as root on the box, installs that folder as a systemd service with its
 * data in `/var/lib/<app>/data` and, given a domain, a Caddy site in front of it. own-016's `ship-to-vm.sh` is the
 * Mac-side glue between the two. This tool is that glue, and only that:
 *
 *   - the folder comes from the same engine (`NODEGX_DEPLOY_CLI`, a checkout's build, else
 *     `npx @nodegx/preview nodegx-deploy`, which carries the backend and the launcher);
 *   - the box runs the same script, the one file `nodegx-backend/deploy/vm/provision-app.sh` (this package ships it
 *     in `dist/backend/vm/`; ship-to-vm.sh reads it from the checkout). Its refusals (a port taken, rules switched
 *     off, no Node 22.13) are returned verbatim, because they are the product's own account of what it found;
 *   - the function secrets travel as the script sends them: read from the project's local backend
 *     (`set_function_secret` stored them), written to the box over ssh's stdin, never to a file, an argument list or
 *     the folder.
 *
 * ## 🔴 What an agent's ssh cannot do that a person's can
 *
 * Type. There is no terminal behind an MCP server, so a password prompt or a "trust this host?" question would hang
 * the call until it timed out. `BatchMode=yes` turns both into an immediate failure, and `accept-new` trusts a host
 * the first time only (a CHANGED host key is refused, and said). The sentence for a refused login names the one
 * thing the person does once: `ssh-copy-id`.
 *
 * ## It changes a running server
 *
 * Write-gated like `provision_backend`, and held by the person's HOLD like every other tool. A reship replaces the
 * app in `/opt/<app>` wholesale and restarts it; the data folder is never written by a ship. Nothing on the box is
 * touched before `provision-app.sh`'s own pre-flight (which asks the staged `start.js --check`) has passed.
 *
 * @module tools/deployToVm
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Readable } from 'stream';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { backendsRoot } from '../backend/client';
import { ToolError } from '../errors';
import type { ProjectBinding } from '../project/ProjectBinding';
import type { ProjectStore } from '../project/ProjectStore';
import { isUntouchedSkeletonPage } from './createProject';
import { guarded, jsonResult } from './util';

// ─── the pieces it runs ────────────────────────────────────────────────────────────────────────────────────────────

/** The same variable `nodegx deploy` reads (`nodegx-export/src/cli/deployEngine.ts`), so one setting moves both. */
export const ENGINE_ENV = 'NODEGX_DEPLOY_CLI';
/** What npx runs `nodegx-deploy` from when there is no engine on disk; may be a .tgz (ship-to-vm.sh's variable). */
export const PREVIEW_PKG_ENV = 'NODEGX_PREVIEW_PKG';

export interface EngineCommand {
  command: string;
  args: string[];
  /** Where it came from, said in the result so a surprising engine is visible. */
  via: 'env' | 'checkout' | 'npx';
}

/**
 * The deploy engine. A `NODEGX_DEPLOY_CLI` that points at nothing is refused, never fallen through: setting it is a
 * deliberate act (the rule `resolveEngine` keeps for `nodegx deploy`).
 */
export function resolveDeployEngine(env: NodeJS.ProcessEnv = process.env, fromDir: string = __dirname): EngineCommand {
  const override = env[ENGINE_ENV];
  if (override) {
    if (!fs.existsSync(override)) {
      throw new ToolError('invalid-argument', `${ENGINE_ENV} is set to ${override}, and there is nothing there. Unset it, or point it at a built nodegx-deploy.cjs.`);
    }
    return { command: process.execPath, args: [override], via: 'env' };
  }
  // A checkout: `packages/noodl-mcp/dist/` (the bundle) and `packages/noodl-mcp/src/tools/` (ts-jest) both reach
  // `packages/noodl-preview/dist/`. In an npm install neither exists, and npx is the honest answer.
  for (const up of [['..', '..'], ['..', '..', '..']]) {
    const candidate = path.resolve(fromDir, ...up, 'noodl-preview', 'dist', 'nodegx-deploy.cjs');
    if (fs.existsSync(candidate)) return { command: process.execPath, args: [candidate], via: 'checkout' };
  }
  const pkg = env[PREVIEW_PKG_ENV] || '@nodegx/preview@latest';
  return {
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['-y', '--package', pkg, 'nodegx-deploy'],
    via: 'npx'
  };
}

/** `provision-app.sh`: beside this bundle in an install (`dist/backend/vm/`), in nodegx-backend in a checkout. */
export function resolveProvisionScript(fromDir: string = __dirname): string {
  const candidates = [
    path.resolve(fromDir, 'backend', 'vm', 'provision-app.sh'),
    path.resolve(fromDir, '..', '..', 'nodegx-backend', 'deploy', 'vm', 'provision-app.sh'),
    path.resolve(fromDir, '..', '..', '..', 'nodegx-backend', 'deploy', 'vm', 'provision-app.sh')
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) {
    throw new ToolError('not-found', `This install has no provision-app.sh (looked in ${candidates.join(', ')}). Install a current @nodegx/mcp.`);
  }
  return found;
}

// ─── running a process ─────────────────────────────────────────────────────────────────────────────────────────────

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface RunOptions {
  input?: string | Readable;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
}

export type Runner = (command: string, args: string[], options: RunOptions) => Promise<RunResult>;

export const runProcess: Runner = (command, args, options) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32' && command.endsWith('.cmd')
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, options.timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.stdin.on('error', () => undefined);
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: stderr + error.message, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    if (typeof options.input === 'string') child.stdin.end(options.input);
    else if (options.input) options.input.pipe(child.stdin);
    else child.stdin.end();
  });

/** The folder as a gzip tar on a stream, with no macOS metadata in it (`._*` files would land on the box). */
export function tarStream(folder: string): { stream: Readable; done: Promise<{ code: number | null; stderr: string }> } {
  const child = spawn('tar', ['--no-xattrs', '-czf', '-', '-C', folder, '.'], {
    env: { ...process.env, COPYFILE_DISABLE: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', (d) => (stderr += d));
  const done = new Promise<{ code: number | null; stderr: string }>((resolve) => {
    child.on('error', (error) => resolve({ code: null, stderr: stderr + error.message }));
    child.on('close', (code) => resolve({ code, stderr }));
  });
  return { stream: child.stdout, done };
}

// ─── the arguments ─────────────────────────────────────────────────────────────────────────────────────────────────

export interface DeployToVmRequest {
  projectDir: string;
  host: string;
  app: string;
  port: number;
  domain?: string;
  sshKey?: string;
  sshPort?: number;
  /** The local backend whose function secrets travel; `undefined` = none. */
  secretsFile?: string;
  /** The project's pages when every one is still create_project's placeholder (P26-SKELSHIP); empty otherwise. */
  skeletonPages?: string[];
}

/**
 * P26-SKELSHIP — a deploy put create_project's placeholder in front of every visitor: lingo.nodegx.io read "Lingo —
 * nothing built yet. Review the plan in docs/ and start when you are ready.", a sentence to the agent, and the person
 * could not tell whether the deploy had worked. The pages (components with a `Page` node) when every one is that
 * untouched placeholder; empty when any page has been built, or there are none (the engine refuses that itself).
 * Ruled 2026-10-26: the project still ships ("in case someone wants to deploy just to health check or test"), and the
 * result's `warnings` says so.
 */
export function untouchedSkeletonPages(store: Pick<ProjectStore, 'listComponents' | 'peekComponent'>): string[] {
  const pages: string[] = [];
  for (const row of store.listComponents()) {
    let nodes;
    try {
      nodes = store.peekComponent(row.path).files.nodes.nodes;
    } catch {
      continue;
    }
    if (!nodes.some((n) => n.type === 'Page')) continue;
    if (!isUntouchedSkeletonPage(nodes)) return [];
    pages.push(row.path);
  }
  return pages;
}

/** What the result says when an engine too old to say it shipped a project with nothing built (P26-SKELSHIP). */
export function skeletonShippedSentence(pages: readonly string[]): string {
  const named = pages.length === 1 ? `${pages[0]} is` : `${pages.join(', ')} are`;
  return (
    `Nothing is built in this app yet: ${named} still the placeholder page a new project starts with, and it is all a ` +
    'visitor will see. It was deployed anyway; build the app, then deploy again.'
  );
}

const APP_RE = /^[a-z][a-z0-9-]{1,30}$/;
// user@host, or an ssh config alias. Never an option (a leading `-`), never anything a remote shell reads.
const HOST_RE = /^(?:[A-Za-z0-9._-]+@)?[A-Za-z0-9][A-Za-z0-9.-]*$/;
const DOMAIN_RE = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Every value that reaches the box's shell is checked here, so none of them needs quoting there. */
export function checkRequest(request: DeployToVmRequest): void {
  if (!HOST_RE.test(request.host)) {
    throw new ToolError('invalid-argument', `host "${request.host}" is not user@host or an ssh alias (e.g. root@203.0.113.7, or a Host name from ~/.ssh/config).`);
  }
  if (!APP_RE.test(request.app)) {
    throw new ToolError('invalid-argument', `app "${request.app}" must be a short lowercase name (a letter, then letters, digits or -; 2 to 31 characters): it names the service, /opt/<app> and the data folder.`);
  }
  if (!Number.isInteger(request.port) || request.port < 1024 || request.port > 65535) {
    throw new ToolError('invalid-argument', `port ${request.port} must be a whole number from 1024 to 65535: the backend listens on the box's 127.0.0.1 there.`);
  }
  if (request.domain !== undefined && !DOMAIN_RE.test(request.domain)) {
    throw new ToolError('invalid-argument', `domain "${request.domain}" is not a lowercase host name (e.g. app.example.com, with no https:// and no path).`);
  }
  if (request.sshPort !== undefined && (!Number.isInteger(request.sshPort) || request.sshPort < 1 || request.sshPort > 65535)) {
    throw new ToolError('invalid-argument', `ssh_port ${request.sshPort} is not a port number.`);
  }
  if (request.sshKey !== undefined && !fs.existsSync(request.sshKey)) {
    throw new ToolError('invalid-argument', `ssh_key ${request.sshKey}: there is no such file.`);
  }
}

/** `NODEGX_SECRET_<NAME>=value` lines, the backend's environment fallback (SecretsStore), as ship-to-vm.sh writes them. */
export function secretsEnv(secretsFile: string | undefined): { names: string[]; text: string } {
  if (!secretsFile || !fs.existsSync(secretsFile)) return { names: [], text: '' };
  let functions: Record<string, unknown> = {};
  try {
    functions = (JSON.parse(fs.readFileSync(secretsFile, 'utf8')).functions ?? {}) as Record<string, unknown>;
  } catch (error) {
    throw new ToolError('invalid-argument', `${secretsFile} is not JSON (${(error as Error).message}); nothing was shipped.`);
  }
  const names: string[] = [];
  let text = '';
  for (const [name, value] of Object.entries(functions)) {
    const line = String(value);
    if (/[\r\n]/.test(line)) {
      throw new ToolError('invalid-argument', `The function secret ${name} holds a line break, which an environment file cannot carry. Set it again without one (set_function_secret); nothing was shipped.`);
    }
    names.push(name);
    text += `NODEGX_SECRET_${name.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}=${line}\n`;
  }
  return { names, text };
}

// ─── the ship ──────────────────────────────────────────────────────────────────────────────────────────────────────

export type DeployStage = 'connect' | 'box' | 'build' | 'stage' | 'provision' | 'secrets' | 'up';

export interface DeployToVmResult {
  ok: true;
  app: string;
  host: string;
  /** `https://<domain>`, or null when no domain was given and the app answers on the box only. */
  url: string | null;
  /** With no domain: the one command that shows the app on this machine. */
  see?: string;
  build: { projectName: string; buildId: string; files: number; functions: string[]; rules: 'project' | 'server'; engine: EngineCommand['via'] };
  /** provision-app.sh's own lines: what it installed and which access rules are in force. */
  provision: string[];
  /** The names of the function secrets sent (never the values). */
  secrets: string[];
  health: number;
  appStatus: number;
  /**
   * What the deploy warned about, each a sentence for the person: the engine's `warnings` (a page nobody has built, a
   * wire that went nowhere), and P26-SKELSHIP's own when the engine predates it. Empty when nothing did.
   */
  warnings: string[];
  next: string;
}

interface EngineReport {
  ok: boolean;
  stage?: string;
  message?: string;
  projectName?: string;
  written?: unknown[];
  warnings?: string[];
  skeletonPages?: string[];
  fullStack?: {
    buildId: string;
    functionFailures: { name: string; reason: string }[];
    uses: { functions: string[] };
    rules: unknown;
  };
}

const lines = (text: string): string[] => text.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0);
const tail = (text: string, n = 30): string[] => lines(text).slice(-n);

function fail(stage: DeployStage, message: string, data: Record<string, unknown> = {}): ToolError {
  return new ToolError('deploy-failed', message, { stage, ...data });
}

/** ssh refused before any command ran (exit 255): say which of the three it was, in the person's terms. */
export function describeSshFailure(host: string, stderr: string, sshPort?: number): string {
  const portFlag = sshPort ? `-p ${sshPort} ` : '';
  if (/IDENTIFICATION HAS CHANGED|Host key verification failed/i.test(stderr)) {
    return `${host} presented a different host key from the one this computer saw before, so nothing was sent. If the server was rebuilt, the person removes the old key (ssh-keygen -R <host>) and ships again; if not, someone may be in the way.`;
  }
  if (/Permission denied|Too many authentication failures/i.test(stderr)) {
    return `${host} refused the login. This tool cannot type a password, so the server must accept this computer's ssh key: the person runs  ssh-copy-id ${portFlag}${host}  once (or names a key with ssh_key), then ships again.`;
  }
  return `Could not reach ${host} over ssh (${tail(stderr, 3).join(' ') || 'no answer'}). Check the address, that the server is running, and that its ssh port is open${sshPort ? ` (${sshPort})` : ''}.`;
}

export interface DeployDeps {
  run: Runner;
  tar: typeof tarStream;
  engine: EngineCommand;
  provisionScript: string;
  progress?: (step: number, message: string) => void;
  tmpRoot?: string;
}

export async function deployToVm(request: DeployToVmRequest, deps: DeployDeps): Promise<DeployToVmResult> {
  checkRequest(request);
  const { app, port, host, domain } = request;
  const secrets = secretsEnv(request.secretsFile);
  const sshArgs = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-o', 'StrictHostKeyChecking=accept-new'];
  if (request.sshKey) sshArgs.push('-i', request.sshKey);
  if (request.sshPort) sshArgs.push('-p', String(request.sshPort));
  const ssh = (remote: string, options: Omit<RunOptions, 'env'>) => deps.run('ssh', [...sshArgs, host, remote], options);
  const progress = deps.progress ?? (() => undefined);

  // 1. The box, before the slow build: can we log in, as whom, and does it have what provision-app.sh needs?
  progress(1, `checking ${host}`);
  const probe = await ssh(
    'printf "uid=%s\\n" "$(id -u)"; ' +
      'if command -v node >/dev/null 2>&1; then printf "node=%s\\n" "$(node --version)"; else echo node=; fi; ' +
      'for c in systemctl rsync curl caddy; do if command -v $c >/dev/null 2>&1; then echo $c=yes; else echo $c=no; fi; done; ' +
      'if sudo -n true >/dev/null 2>&1; then echo sudo=yes; else echo sudo=no; fi',
    { timeoutMs: 30_000 }
  );
  if (probe.code === 255 || probe.code === null || probe.timedOut) {
    throw fail('connect', describeSshFailure(host, probe.stderr + (probe.timedOut ? ' timed out' : ''), request.sshPort));
  }
  const facts = Object.fromEntries(lines(probe.stdout).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1)]));
  const missing: string[] = [];
  const nodeVersion = facts.node || '';
  const [major, minor] = nodeVersion.replace(/^v/, '').split('.').map(Number);
  if (!nodeVersion) missing.push('Node 22.13 or later (it has none)');
  else if (!(major > 22 || (major === 22 && minor >= 13))) missing.push(`Node 22.13 or later (it has ${nodeVersion})`);
  if (facts.systemctl !== 'yes') missing.push('systemd');
  if (facts.rsync !== 'yes') missing.push('rsync');
  if (facts.curl !== 'yes') missing.push('curl');
  if (domain && facts.caddy !== 'yes') missing.push(`Caddy (it serves ${domain}; ship with no domain to go without it)`);
  const root = facts.uid === '0';
  if (!root && facts.sudo !== 'yes') missing.push('root: log in as root, or as a user with passwordless sudo');
  if (missing.length > 0) {
    throw fail('box', `${host} is missing what the app needs, and nothing was sent: ${missing.join('; ')}.`, { box: facts });
  }
  const asRoot = root ? '' : 'sudo -n ';

  const work = fs.mkdtempSync(path.join(deps.tmpRoot ?? os.tmpdir(), `nodegx-ship-${app}-`));
  try {
    // 2. The folder, from the same engine `nodegx-deploy --full-stack` is.
    progress(2, 'building the folder (nodegx-deploy --full-stack)');
    const folder = path.join(work, app);
    const built = await deps.run(deps.engine.command, [...deps.engine.args, request.projectDir, folder, '--full-stack'], {
      timeoutMs: 10 * 60_000
    });
    const reportLine = lines(built.stdout).reverse().find((l) => l.startsWith('{'));
    let report: EngineReport | undefined;
    try {
      report = reportLine ? (JSON.parse(reportLine) as EngineReport) : undefined;
    } catch {
      report = undefined;
    }
    if (!report) {
      throw fail('build', `The deploy engine (${deps.engine.via}) gave no report${built.timedOut ? ' (it timed out)' : ''}.`, { said: tail(built.stderr) });
    }
    if (!report.ok) throw fail('build', `The deploy refused (${report.stage}): ${report.message}`);
    const full = report.fullStack;
    if (!full) {
      throw fail('build', `This nodegx-deploy (${deps.engine.via}) writes no full-stack folder: it predates DEP-002. Use a current @nodegx/preview.`);
    }
    if (full.functionFailures.length > 0) {
      throw fail(
        'build',
        'Cloud functions that would not build, so nothing was shipped (the app would answer an error where it calls them): ' +
          full.functionFailures.map((f) => `${f.name}: ${f.reason}`).join('; '),
        { functionFailures: full.functionFailures }
      );
    }

    // 3. Staged on the box, where provision-app.sh looks for it.
    progress(3, `sending the folder to ${host}`);
    const stage = `/tmp/${app}-provision`;
    const tar = deps.tar(folder);
    const sent = await ssh(`${asRoot}rm -rf ${stage} && mkdir -p ${stage} && tar -xzf - -C ${stage}`, {
      input: tar.stream,
      timeoutMs: 5 * 60_000
    });
    const packed = await tar.done;
    if (packed.code !== 0) throw fail('stage', `Could not pack the folder: ${tail(packed.stderr, 5).join(' ')}`);
    if (sent.code !== 0) throw fail('stage', `Could not stage the folder on ${host}: ${tail(sent.stderr, 5).join(' ')}`);

    // 4. provision-app.sh, as root, over stdin. Its refusals are its own sentences, returned as they are.
    progress(4, 'installing it as a service (provision-app.sh)');
    const env = `APP=${app} PORT=${port} DOMAIN=${domain ?? ''} CADDY=${domain ? 'on' : 'off'}`;
    const provisioned = await ssh(`${asRoot}env ${env} bash -s`, {
      input: fs.readFileSync(deps.provisionScript, 'utf8'),
      timeoutMs: 5 * 60_000
    });
    if (provisioned.code !== 0) {
      throw fail('provision', `provision-app.sh refused on ${host}${provisioned.timedOut ? ' (timed out)' : ''}. Its own words are in "said".`, {
        said: tail(provisioned.stdout + '\n' + provisioned.stderr, 40)
      });
    }

    // 5. The function secrets: always written (an empty file clears ones the project no longer has), then a restart.
    progress(5, secrets.names.length ? `sending ${secrets.names.length} function secret(s)` : 'restarting');
    const secretsPath = `/etc/${app}/secrets.env`;
    const wrote = await ssh(
      `${asRoot}sh -c 'cat > ${secretsPath} && chown root:${app} ${secretsPath} && chmod 640 ${secretsPath} && systemctl restart ${app}-backend'`,
      { input: secrets.text, timeoutMs: 60_000 }
    );
    if (wrote.code !== 0) throw fail('secrets', `Could not write the function secrets on ${host}: ${tail(wrote.stderr, 5).join(' ')}`);

    // 6. Up: the backend's health, and the app it serves at /.
    progress(6, 'checking it answers');
    const up = await ssh(
      `for i in $(seq 1 20); do curl -fsS http://127.0.0.1:${port}/health >/dev/null 2>&1 && break; sleep 1; done; ` +
        `curl -sS -o /dev/null -w "health=%{http_code}\\n" http://127.0.0.1:${port}/health; ` +
        `curl -sS -o /dev/null -w "app=%{http_code}\\n" http://127.0.0.1:${port}/`,
      { timeoutMs: 60_000 }
    );
    const health = Number(/health=(\d+)/.exec(up.stdout)?.[1] ?? 0);
    const appStatus = Number(/app=(\d+)/.exec(up.stdout)?.[1] ?? 0);
    if (health !== 200 || appStatus !== 200) {
      throw fail('up', `Installed, but it does not answer on ${host}: health ${health || 'none'}, the app ${appStatus || 'none'}. The service's log: journalctl -u ${app}-backend -n 40`, {
        said: tail(up.stdout + '\n' + up.stderr, 10)
      });
    }

    const provisionLines = lines(provisioned.stdout).filter((l) => l.startsWith('    ') || l.startsWith('==>')).map((l) => l.trim());
    // P26-SKELSHIP (ruled 2026-10-26): never refused, said loudly. The engine says it from 0.2.7 on; an older one does
    // not, so the pages read here before the build say it instead.
    const warnings = [...(report.warnings ?? [])];
    if (request.skeletonPages?.length && !report.skeletonPages) warnings.unshift(skeletonShippedSentence(request.skeletonPages));
    const result: DeployToVmResult = {
      ok: true,
      app,
      host,
      url: domain ? `https://${domain}` : null,
      build: {
        projectName: report.projectName ?? app,
        buildId: full.buildId,
        files: Array.isArray(report.written) ? report.written.length : 0,
        functions: full.uses.functions,
        rules: full.rules ? 'project' : 'server',
        engine: deps.engine.via
      },
      provision: provisionLines,
      secrets: secrets.names,
      health,
      appStatus,
      warnings,
      next: (warnings.length ? 'Before anything else, tell the person what each line of `warnings` says. ' : '') + (domain
        ? `Open https://${domain} (its DNS must point at ${host.replace(/^.*@/, '')}; Caddy fetches the certificate on the first visit). Ship again with the same app and port to update it: the data stays.`
        : 'It answers on the box only (no domain). Give the person the "see" command to look at it; ship again with a domain once its DNS points at the box.')
    };
    if (!domain) {
      result.see = `ssh ${request.sshPort ? `-p ${request.sshPort} ` : ''}-L ${port}:127.0.0.1:${port} ${host}   then open http://localhost:${port}`;
    }
    return result;
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

// ─── the tool ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** The backend `provision_backend` bound this project to, whose `secrets.json` holds the function secrets. */
function boundBackendSecrets(binding: ProjectBinding, backendId: string | undefined): string | undefined {
  const id = backendId ?? binding.require().readCloudServices().instanceId;
  if (!id) return undefined;
  const dir = path.join(backendsRoot(), id);
  if (!fs.existsSync(dir)) {
    if (backendId) throw new ToolError('not-found', `No local backend ${backendId} (looked in ${dir}).`);
    return undefined;
  }
  return path.join(dir, 'secrets.json');
}

const deployToVmSchema = {
  host: z.string().describe('The server, as user@host or a Host name from ~/.ssh/config. It must already accept this computer\'s ssh key: no password can be typed here.'),
  app: z.string().describe('A short lowercase name for the app on the server: its service, /opt/<app> and its data folder. Ship again with the same name to update it.'),
  port: z.number().int().describe('A free port on the server; the backend listens on its 127.0.0.1 only. Use the same one every ship.'),
  domain: z.string().optional().describe('The public address, e.g. app.example.com, whose DNS points at the server: Caddy serves it over https. Omit it to install without one (it then answers on the server only).'),
  ssh_key: z.string().optional().describe('An ssh identity file, if not ssh\'s default.'),
  ssh_port: z.number().int().optional().describe('The server\'s ssh port, if not 22.'),
  backend_id: z.string().optional().describe('The local backend whose function secrets travel (default: the one this project is bound to).'),
};

interface DeployToVmArgs {
  host: string;
  app: string;
  port: number;
  domain?: string;
  ssh_key?: string;
  ssh_port?: number;
  backend_id?: string;
}

export function registerDeployToVmTools(server: McpServer, binding: ProjectBinding): void {
  server.registerTool(
    'deploy_to_vm',
    {
      title: 'Put the app on a server the person owns',
      description:
        'Ship this project to a Linux server over ssh: the app, its backend, its cloud functions, access rules and ' +
        'function secrets, installed as a service that restarts with the machine, the data kept across ships. ' +
        'With a domain, Caddy serves it over https. The server needs Node 22.13+, systemd, rsync, curl (and Caddy ' +
        'for a domain) and root or passwordless sudo. Returns the URL, or the command to see it when there is no domain.',
      inputSchema: deployToVmSchema
    },
    async (args: DeployToVmArgs, extra?: { _meta?: { progressToken?: string | number }; sendNotification?: (n: unknown) => Promise<void> }) =>
      guarded(async (a: DeployToVmArgs) => {
        const store = binding.require();
        const token = extra?._meta?.progressToken;
        const progress =
          token !== undefined && extra?.sendNotification
            ? (step: number, message: string) => {
                void extra.sendNotification!({ method: 'notifications/progress', params: { progressToken: token, progress: step, total: 6, message } }).catch(() => undefined);
              }
            : undefined;
        const result = await deployToVm(
          {
            projectDir: store.projectDir,
            host: a.host,
            app: a.app,
            port: a.port,
            domain: a.domain,
            sshKey: a.ssh_key,
            sshPort: a.ssh_port,
            secretsFile: boundBackendSecrets(binding, a.backend_id),
            skeletonPages: untouchedSkeletonPages(store)
          },
          { run: runProcess, tar: tarStream, engine: resolveDeployEngine(), provisionScript: resolveProvisionScript(), progress }
        );
        return jsonResult(result);
      })(args)
  );
}
