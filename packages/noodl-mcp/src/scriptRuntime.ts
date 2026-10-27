/**
 * P128-S3-HELPERNODE — the program a child script runs on.
 *
 * The server starts scripts of its own: Studio's `serve.mjs`, the render harness, the local backend, the deploy and
 * cloud-function CLIs, the kit extractor. They all ran on `process.execPath`, which is right for plain Node and for
 * the editor's Electron binary run as Node. It is wrong in Claude Desktop: a `.mcpb` server of type `node` runs on
 * Desktop's built-in Node, an Electron utility process whose `execPath` is "Claude Helper (Plugin)", and Claude ships
 * that binary with RunAsNode off. Asked to run a script it prints "This is a helper executable and cannot be launched
 * directly" and exits 64, with or without `ELECTRON_RUN_AS_NODE`. Every child died, so in Desktop the agent could write
 * an app but never show, render, back or ship it (Richard's CCN-006 AC8 run, 2026-10-27).
 *
 * So the `.mcpb` carries an official Node binary and names it in `NODEGX_NODE` (nodegx-studio `scripts/mcpb.mjs`).
 * The server itself stays on Desktop's Node, as Desktop intends; only its children move. Outside the bundle nothing
 * changes: `process.execPath` is used, after one probe when it is an Electron binary, so a binary that will not run a
 * script is said plainly instead of surfacing as a child that never reported a port.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';

export interface RuntimeFacts {
  env: NodeJS.ProcessEnv;
  execPath: string;
  electron: string | undefined;
}

const facts = (): RuntimeFacts => ({ env: process.env, execPath: process.execPath, electron: process.versions.electron });

/** One probe per binary per process: can it run `-e` as Node? */
const probes = new Map<string, boolean>();

function runsScripts(bin: string, env: NodeJS.ProcessEnv): boolean {
  let ok = probes.get(bin);
  if (ok === undefined) {
    const r = spawnSync(bin, ['-e', 'process.exit(0)'], {
      env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: 'ignore',
      timeout: 10_000
    });
    ok = r.status === 0;
    probes.set(bin, ok);
  }
  return ok;
}

/** A bundled binary may lose its executable bit on the way out of a zip; put it back rather than fail on EACCES. */
function executable(bin: string): string | null {
  if (!fs.existsSync(bin)) return null;
  try {
    fs.accessSync(bin, fs.constants.X_OK);
  } catch {
    try {
      fs.chmodSync(bin, 0o755);
    } catch {
      return null;
    }
  }
  return bin;
}

export const HELPER_NODE_MESSAGE =
  "This NodeGX server is running on its host's built-in Node, which cannot start the programs NodeGX needs " +
  '(Studio, the preview, the local backend). Install the latest NodeGX extension from https://nodegx.io/start: ' +
  'it carries its own Node.';

/**
 * The binary to run a child script with: `NODEGX_NODE` when it names one, else this process's own. Throws
 * `HELPER_NODE_MESSAGE` when neither can run a script.
 */
export function scriptRuntime(f: RuntimeFacts = facts()): string {
  const bundled = f.env.NODEGX_NODE ? executable(f.env.NODEGX_NODE) : null;
  if (bundled) return bundled;
  if (!f.electron || runsScripts(f.execPath, f.env)) return f.execPath;
  throw new Error(HELPER_NODE_MESSAGE);
}

/**
 * The binary to write into a config that starts this server again (a project's `.mcp.json`, the `claude mcp add`
 * line): the bundled Node when there is one, so a project made inside Claude Desktop is not handed Claude's helper
 * binary; else this process's own, as before. Never probes and never throws: a registration is written, not run.
 */
export function registrationRuntime(f: RuntimeFacts = facts()): { command: string; electron: boolean } {
  const bundled = f.env.NODEGX_NODE ? executable(f.env.NODEGX_NODE) : null;
  return bundled ? { command: bundled, electron: false } : { command: f.execPath, electron: Boolean(f.electron) };
}

/** For tests: forget what the probes found. */
export function resetScriptRuntimeProbes(): void {
  probes.clear();
}
