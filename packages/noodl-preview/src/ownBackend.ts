/**
 * P112-OWN019-BACKENDSESSION — the preview starts the app's own local backend.
 *
 * Ruled by Richard 2026-10-14 (R38, "Preview starts it"). An app built from the npm kit with a local backend
 * (`provision_backend`) names it in `metadata.cloudservices`: `{ instanceId, endpoint: "http://127.0.0.1:<port>",
 * type: "nodegx" }`, its data under `~/.noodl/backends/<instanceId>`. The backend was a child of the agent's MCP
 * server, so it stopped when the agent's session did, and a person who opened the app the next day got a page whose
 * every Record failed (E1/SE1, OWN-019 s4: "start it again tomorrow" was false). Now `npx @nodegx/preview <app>`
 * starts that same backend — only the one the project names, only when it exists on this machine and nothing is
 * answering on its port — and stops it when the preview stops.
 *
 * It is a third spawner beside the editor and `noodl-mcp`, so it plays by their rules (`noodl-mcp`'s
 * `backend/runtimeRecord.ts`, `reaper.ts`):
 * - `--parent-pid` on the child: the backend dies with the preview however the preview dies (the service's own
 *   guard, `nodegx-backend/src/cli.ts`).
 * - A runtime record (`runtime.json`, owner kind `preview`, a heartbeat every 10 s): an agent that provisions the same
 *   backend while the preview runs ADOPTS it instead of starting a second writer on the same SQLite file, and a
 *   preview that vanished leaves a record whose stale heartbeat the reaper acts on.
 * - Nothing is ever started on a name alone or for a remote endpoint; a backend someone else started is used, not
 *   restarted.
 * Every ten seconds it looks again, so an app whose backend belonged to an agent session that has since ended gets
 * its backend back without a restart.
 *
 * @module noodl-preview/ownBackend
 */

import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

const LOOPBACK = /^https?:\/\/(127\.0\.0\.1|localhost):(\d+)\/?$/;
const READY_PREFIX = 'NODEGX_BACKEND_READY ';
const READY_TIMEOUT_MS = 30_000;
const HEARTBEAT_MS = 10_000;

export interface NamedBackend {
  id: string;
  endpoint: string;
  port: number;
}

/** The backend the project names, when it is one on this machine. */
export function namedBackend(projectDir: string): NamedBackend | null {
  let project: { metadata?: { cloudservices?: { instanceId?: unknown; endpoint?: unknown; type?: unknown } } };
  try {
    project = JSON.parse(fs.readFileSync(path.join(projectDir, 'nodegx.project.json'), 'utf8'));
  } catch {
    return null;
  }
  const cs = project.metadata?.cloudservices;
  if (!cs || cs.type !== 'nodegx' || typeof cs.instanceId !== 'string' || typeof cs.endpoint !== 'string') return null;
  const m = LOOPBACK.exec(cs.endpoint);
  if (!m || !/^[A-Za-z0-9_-]+$/.test(cs.instanceId)) return null;
  return { id: cs.instanceId, endpoint: cs.endpoint.replace(/\/$/, ''), port: Number(m[2]) };
}

/** Where backends live — the same place, and the same override, as `noodl-mcp`'s `backendsRoot()`. */
export function backendsRoot(): string {
  return process.env.NODEGX_BACKENDS_DIR || path.join(os.homedir(), '.noodl', 'backends');
}

/** The service bundle: shipped in this package's `dist/backend/` (prepack), else beside a checkout. */
export function resolveServiceEntry(): string | null {
  const candidates = [
    process.env.NODEGX_BACKEND_ENTRY,
    // Bundled, `__dirname` is this package's `dist/`.
    path.join(__dirname, 'backend', 'cli.js'),
    // A source checkout: packages/noodl-preview/{dist,src}/ → packages/nodegx-backend/dist/cli.js.
    path.resolve(__dirname, '..', '..', 'nodegx-backend', 'dist', 'cli.js')
  ];
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  return null;
}

function answering(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(1000, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

export type BackendState =
  | { state: 'none' }
  | { state: 'missing'; id: string; root: string }
  | { state: 'no-service'; id: string }
  | { state: 'running'; id: string; port: number; owner: string }
  | { state: 'started'; id: string; port: number; pid: number }
  | { state: 'failed'; id: string; why: string };

export interface OwnBackend {
  /** What happened on the first look. */
  first: BackendState;
  /** Stops the backend this preview started (if any) and its record; the next look never happens. */
  stop(): void;
}

/**
 * Start the project's own backend when it is not running, look again every ten seconds, and stop what was started
 * when told to. Never throws: a backend that cannot start is reported, and the preview serves the page anyway.
 */
export async function keepOwnBackend(projectDir: string, log: (line: string) => void): Promise<OwnBackend> {
  const named = namedBackend(projectDir);
  if (!named) return { first: { state: 'none' }, stop: () => undefined };
  const root = backendsRoot();
  const startedAt = new Date().toISOString();
  let child: ChildProcess | null = null;
  let stopped = false;
  const recordFile = path.join(root, named.id, 'runtime.json');

  const writeRecord = (pid: number, entry: string, name: string) => {
    const record = {
      version: 1,
      backendId: named.id,
      backendName: name,
      pid,
      port: named.port,
      endpoint: named.endpoint,
      entry,
      startedAt: new Date().toISOString(),
      owner: { kind: 'preview', pid: process.pid, startedAt, projectDir },
      heartbeatAt: new Date().toISOString()
    };
    const tmp = `${recordFile}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(tmp, recordFile);
  };
  const ownRecord = () => {
    try {
      const r = JSON.parse(fs.readFileSync(recordFile, 'utf8'));
      return r?.owner?.kind === 'preview' && r.owner.pid === process.pid ? r : null;
    } catch {
      return null;
    }
  };

  const look = async (): Promise<BackendState> => {
    const configFile = path.join(root, named.id, 'config.json');
    if (!fs.existsSync(configFile)) return { state: 'missing', id: named.id, root };
    if (child && child.exitCode === null) return { state: 'running', id: named.id, port: named.port, owner: 'this preview' };
    if (await answering(named.port)) {
      let owner = 'another process';
      try {
        owner = JSON.parse(fs.readFileSync(recordFile, 'utf8'))?.owner?.kind ?? owner;
      } catch {}
      return { state: 'running', id: named.id, port: named.port, owner };
    }
    const entry = resolveServiceEntry();
    if (!entry) return { state: 'no-service', id: named.id };
    let name = named.id;
    try {
      name = JSON.parse(fs.readFileSync(configFile, 'utf8')).name || name;
    } catch {}
    const args = [
      entry,
      'serve',
      '--data-dir',
      path.join(root, named.id),
      '--port',
      String(named.port),
      '--backend-id',
      named.id,
      '--backend-name',
      name,
      '--parent-pid',
      String(process.pid),
      '--project-dir',
      projectDir,
      // P112 OWN-026 FIX-01: as `provision_backend` starts it. Inert once the data dir has a security.json.
      '--enforce-rules'
    ];
    const proc = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: false });
    let tail = '';
    proc.stderr?.on('data', (c: Buffer) => (tail = (tail + c.toString()).slice(-2000)));
    const ready = await new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(`not ready within ${READY_TIMEOUT_MS / 1000} s`), READY_TIMEOUT_MS);
      proc.stdout?.on('data', (c: Buffer) => {
        if (c.toString().split('\n').some((l) => l.startsWith(READY_PREFIX))) {
          clearTimeout(timer);
          resolve(null);
        }
      });
      proc.once('exit', (code) => {
        clearTimeout(timer);
        resolve(`exited (code ${code}) ${tail.trim().split('\n').slice(-3).join(' | ')}`);
      });
    });
    if (ready !== null) {
      try {
        proc.kill('SIGKILL');
      } catch {}
      return { state: 'failed', id: named.id, why: ready };
    }
    child = proc;
    writeRecord(proc.pid as number, entry, name);
    proc.once('exit', () => {
      if (ownRecord()) fs.rmSync(recordFile, { force: true });
      if (!stopped) log(`  ! the app's backend stopped; looking again in ${HEARTBEAT_MS / 1000} s`);
    });
    return { state: 'started', id: named.id, port: named.port, pid: proc.pid as number };
  };

  const say = (s: BackendState, quiet: boolean) => {
    if (s.state === 'started') log(`  ✓ started the app's backend (${s.id}) on ${named.endpoint}`);
    else if (s.state === 'failed') log(`  ✗ the app's backend (${s.id}) did not start: ${s.why}`);
    else if (quiet) return;
    else if (s.state === 'running') log(`  ✓ the app's backend (${s.id}) is already running on ${named.endpoint} (${s.owner})`);
    else if (s.state === 'missing')
      log(`  ! the app names a backend (${s.id}) that is not on this machine (${s.root}) — its saves and records will fail`);
    else if (s.state === 'no-service') log(`  ! the app names a backend (${s.id}) but this preview has no backend service to start it with`);
  };

  let looking = false;
  const first = await look();
  say(first, false);
  const timer = setInterval(() => {
    if (stopped) return;
    if (child && child.exitCode === null) {
      // The heartbeat: this preview is alive and still owns the backend.
      const r = ownRecord();
      if (r) {
        try {
          const tmp = `${recordFile}.tmp-${process.pid}`;
          fs.writeFileSync(tmp, JSON.stringify({ ...r, heartbeatAt: new Date().toISOString() }, null, 2) + '\n', { mode: 0o600 });
          fs.renameSync(tmp, recordFile);
        } catch {}
      }
      return;
    }
    if (looking) return;
    looking = true;
    void look()
      .then((s) => !stopped && say(s, true))
      .finally(() => (looking = false));
  }, HEARTBEAT_MS);
  timer.unref();

  return {
    first,
    stop: () => {
      stopped = true;
      clearInterval(timer);
      if (child && child.exitCode === null) {
        try {
          child.kill('SIGTERM');
        } catch {}
      }
      if (ownRecord()) fs.rmSync(recordFile, { force: true });
    }
  };
}
