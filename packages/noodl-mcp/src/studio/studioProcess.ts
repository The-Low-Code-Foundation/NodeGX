/**
 * P125 CCN-001 — NodeGX Studio as a process this server starts.
 *
 * `open_studio` puts the app on the person's screen beside the conversation while the agent builds it. The screen
 * is NodeGX Studio (the-low-code-foundation/nodegx-studio): a browser-served editor over the project's files,
 * which redraws on every file the agent writes and asks the person on a clash with its own edit. This module
 * finds it, starts it on a loopback port of the kernel's choosing, reads the port off its ready line, keeps one
 * per project directory, and stops it when this server stops.
 *
 * Where Studio is: `NODEGX_STUDIO` names its folder; otherwise the sibling checkout the developers of both keep;
 * otherwise the installed desktop app, which carries the same `editor/` unpacked in its resources (P128-S3-
 * NOSTUDIOFORTHEEDITOR: the editor's Connect Claude Code registers this server with neither of the first two, so a
 * person who downloaded the editor was told "not installed" with Studio sitting in /Applications). Studio is not on
 * npm yet (its README says so); when it is, the fourth candidate is `require.resolve`.
 *
 * ⚠️ The child is `node editor/serve.mjs <project> --port 0` on this process's own `execPath`, stdout piped: the
 * port is the ONLY thing read off it, and only until the ready line arrives. Nothing in Studio's output reaches
 * the MCP transport (stdout here is the JSON-RPC channel), which is why `stdio` is never `inherit`.
 */

import { type ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { findStudioApp, STUDIO_DOWNLOAD_URL } from './studioApp';

export interface StudioInstance {
  projectDir: string;
  origin: string;
  port: number;
  pid: number;
}

const running = new Map<string, StudioInstance & { child: ChildProcess }>();
let exitHookInstalled = false;

/** What a person without Studio is told: where to get it, never an environment variable they cannot act on. */
export const STUDIO_NOT_INSTALLED = `NodeGX Studio is not installed on this machine. Get it from ${STUDIO_DOWNLOAD_URL} and ask again.`;

/**
 * Where the desktop app keeps Studio's own files: electron-builder packs them unpacked (`asar: false`) as
 * `Contents/Resources/app` in the macOS bundle, and as `resources/app` beside the executable elsewhere.
 */
export function studioInApp(appPath: string): string {
  return process.platform === 'darwin'
    ? path.join(appPath, 'Contents', 'Resources', 'app')
    : path.join(path.dirname(appPath), 'resources', 'app');
}

/** Studio's folder, or `null` with the reason. */
export function findStudio(): { dir: string } | { dir: null; reason: string } {
  const app = findStudioApp();
  const candidates = [
    process.env.NODEGX_STUDIO,
    path.join(os.homedir(), 'vscode_projects', 'nodegx-studio'),
    app ? studioInApp(app.path) : undefined
  ].filter((c): c is string => typeof c === 'string' && c.length > 0);
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'editor', 'serve.mjs'))) return { dir };
  }
  return { dir: null, reason: STUDIO_NOT_INSTALLED };
}

/** The Studio for a project: the one already running, or a new one. */
export async function ensureStudio(projectDir: string): Promise<StudioInstance> {
  const key = path.resolve(projectDir);
  const have = running.get(key);
  if (have && have.child.exitCode === null && !have.child.killed) return strip(have);
  running.delete(key);

  const found = findStudio();
  if (found.dir === null) throw new Error(found.reason);
  const entry = path.join(found.dir, 'editor', 'serve.mjs');

  const child = spawn(process.execPath, [entry, key, '--port', '0'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: found.dir,
    env: { ...process.env }
  });

  const instance = await new Promise<StudioInstance & { child: ChildProcess }>((resolve, reject) => {
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Studio did not report a port within 20 s.${err ? ` It said: ${err.trim().slice(0, 400)}` : ''}`));
    }, 20_000);
    child.stdout?.on('data', (chunk: Buffer) => {
      out += chunk.toString('utf8');
      const m = /nodegx-studio: (http:\/\/127\.0\.0\.1:(\d+))\//.exec(out);
      if (m) {
        clearTimeout(timer);
        child.stdout?.removeAllListeners('data');
        child.stdout?.resume();
        resolve({ projectDir: key, origin: m[1], port: Number(m[2]), pid: child.pid ?? -1, child });
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      err += chunk.toString('utf8');
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Studio exited with ${code} before it was ready.${err ? ` It said: ${err.trim().slice(0, 400)}` : ''}`));
    });
  });

  child.on('exit', () => {
    if (running.get(key)?.child === child) running.delete(key);
  });
  running.set(key, instance);
  installExitHook();
  return strip(instance);
}

/** The running Studio for a project, if any, without starting one. */
export function studioFor(projectDir: string): StudioInstance | null {
  const have = running.get(path.resolve(projectDir));
  return have && have.child.exitCode === null ? strip(have) : null;
}

function strip(i: StudioInstance & { child: ChildProcess }): StudioInstance {
  return { projectDir: i.projectDir, origin: i.origin, port: i.port, pid: i.pid };
}

function installExitHook(): void {
  if (exitHookInstalled) return;
  exitHookInstalled = true;
  const stopAll = () => {
    for (const i of running.values()) {
      try {
        i.child.kill();
      } catch {
        /* already gone */
      }
    }
    running.clear();
  };
  process.once('exit', stopAll);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.once(sig, () => {
      stopAll();
      process.exit(0);
    });
  }
}
