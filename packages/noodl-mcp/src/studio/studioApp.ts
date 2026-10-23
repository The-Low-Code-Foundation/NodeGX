/**
 * P125 CCN-006 — the NodeGX Studio desktop app, if this machine has it.
 *
 * Studio in a conversation, or in a browser window the agent opened, is served by this server: when the agent's
 * host quits, the window goes with it. The desktop app is the same Studio with its own server, so it is where a
 * person keeps working without the agent (DIRECTION's walk, step 3). The browser window offers it (companion.ts),
 * and "Window ↗" in the conversation opens it instead of the browser when it is installed.
 *
 * Found by where its installers put it, never by searching the disk. `NODEGX_STUDIO_APP` names one (a test, or an
 * install somewhere else); `NODEGX_STUDIO_APP=none` says there is none.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/** Where a person without the app gets it. */
export const STUDIO_DOWNLOAD_URL = 'https://nodegx.io/studio/';

/** The URL scheme the desktop app registers, so a page with no server left can still hand it a folder. */
export const STUDIO_URL_SCHEME = 'nodegx-studio';

export interface StudioAppInstall {
  path: string;
  /** The installed app declares `nodegx-studio://` (read from its Info.plist), so a link can open a folder in it. */
  opensLinks: boolean;
}

function candidates(): string[] {
  const name = 'NodeGX Studio';
  if (process.platform === 'darwin') {
    return [path.join('/Applications', `${name}.app`), path.join(os.homedir(), 'Applications', `${name}.app`)];
  }
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
    const progs = process.env.ProgramFiles ?? 'C:\\Program Files';
    return [path.join(local, 'Programs', name, `${name}.exe`), path.join(progs, name, `${name}.exe`)];
  }
  // Linux ships an AppImage, which lives wherever the person saved it.
  return [];
}

function declaresScheme(appPath: string): boolean {
  if (process.platform !== 'darwin') return false;
  try {
    const plist = fs.readFileSync(path.join(appPath, 'Contents', 'Info.plist'), 'utf8');
    return plist.includes(`<string>${STUDIO_URL_SCHEME}</string>`);
  } catch {
    return false;
  }
}

export function findStudioApp(): StudioAppInstall | null {
  const named = process.env.NODEGX_STUDIO_APP;
  if (named === 'none') return null;
  for (const p of named ? [named] : candidates()) {
    if (fs.existsSync(p)) return { path: p, opensLinks: declaresScheme(p) };
  }
  return null;
}

/**
 * Opens `projectDir` in the desktop app. `-n` on macOS: a running Studio ignores `--args` when it is only brought
 * to the front, so a second instance is what gets the folder (until the app takes a folder from `open-url`).
 * `NODEGX_STUDIO_NO_OPEN` keeps a test from launching anything; it answers false, as a failed launch does.
 */
export function launchStudioApp(app: StudioAppInstall, projectDir: string): Promise<boolean> {
  if (process.env.NODEGX_STUDIO_NO_OPEN) return Promise.resolve(false);
  const [cmd, args] =
    process.platform === 'darwin' ? ['open', ['-n', '-a', app.path, '--args', projectDir]] : [app.path, [projectDir]];
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args as string[], { detached: true, stdio: 'ignore' });
      child.once('error', () => resolve(false));
      child.once('spawn', () => {
        child.unref();
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}
