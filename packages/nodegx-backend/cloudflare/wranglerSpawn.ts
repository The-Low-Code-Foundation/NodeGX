/**
 * Which wrangler the Cloudflare deploy runs, and what to say when it could not be started (COMMUNITY-CFWINNPX).
 *
 * Kept apart from `deployCloudflare.ts` so a test can grade it without that file's imports (the editor, the viewer).
 *
 * The trap: `@nodegx/backend` does not depend on wrangler, so the last resort is `npx wrangler@4`. On Windows npm's
 * launcher is `npx.cmd`, and `spawnSync('npx', …)` without a shell returns `error: ENOENT` with no output at all
 * (spawning `npx.cmd` by name throws EINVAL since Node 18.20.2/20.12.2). So on Windows npx is run through node itself,
 * from npm's own `npx-cli.js`, which every Node install for Windows ships beside `node.exe`.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WranglerHost {
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  execPath: string;
  /** Folders to look for an installed `wrangler` from, nearest first. */
  from: string[];
  resolve: (request: string, from: string) => string;
  exists: (file: string) => boolean;
}

export const NPX_WRANGLER = ['--yes', 'wrangler@4'];

/** npm's `npx-cli.js` for this node on Windows: beside `node.exe`, else beside the npm running us (`npm_execpath`). */
export function windowsNpxCli(host: Pick<WranglerHost, 'env' | 'execPath' | 'exists'>): string | null {
  const p = path.win32;
  const candidates = [p.join(p.dirname(host.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js')];
  const npm = host.env.npm_execpath;
  if (npm && /npm-cli\.js$/i.test(npm)) candidates.push(p.join(p.dirname(npm), 'npx-cli.js'));
  return candidates.find((f) => host.exists(f)) ?? null;
}

/** The command line, as `[cmd, ...args]`: `NODEGX_WRANGLER`, one installed nearby, else npx (through node on Windows). */
export function wranglerCommandFor(host: WranglerHost): string[] {
  if (host.env.NODEGX_WRANGLER) return [host.execPath, host.env.NODEGX_WRANGLER];
  for (const from of host.from) {
    try {
      return [host.execPath, host.resolve('wrangler/bin/wrangler.js', from)];
    } catch {
      /* next */
    }
  }
  if (host.platform === 'win32') {
    const cli = windowsNpxCli(host);
    if (cli) return [host.execPath, cli, ...NPX_WRANGLER];
  }
  return ['npx', ...NPX_WRANGLER];
}

export function realHost(from: string[]): WranglerHost {
  return {
    env: process.env,
    platform: process.platform,
    execPath: process.execPath,
    from,
    resolve: (request, dir) => require.resolve(request, { paths: [dir] }),
    exists: (f) => fs.existsSync(f)
  };
}

/** A sentence when the process never started (spawn's `error`), so a refusal never prints an empty reason. */
export function spawnFailure(command: string[], error: Error | undefined): string | null {
  if (!error) return null;
  const code = (error as NodeJS.ErrnoException).code;
  return (
    `wrangler could not be started (${command.join(' ')}: ${code || error.message}). ` +
    'Install it with `npm install -g wrangler@4` and point the deploy at it with NODEGX_WRANGLER set to its bin/wrangler.js.'
  );
}
