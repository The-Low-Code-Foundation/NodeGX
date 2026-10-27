/**
 * P128-S3-NOSTUDIOFORTHEEDITOR (Beta sweep s19): the NodeGX editor's Connect Claude Code registers this server with no
 * `NODEGX_STUDIO` and no checkout, so `open_studio` told a person who had downloaded the editor that Studio was "not
 * installed (set NODEGX_STUDIO to its folder)", with the desktop app in /Applications. `findStudio` now also looks in
 * the installed app, which carries Studio's `editor/` unpacked, and the sentence names the download page.
 *
 * The home folder is a fresh temporary one in every case (`os.homedir` mocked: jest's `process.env` is a copy, so
 * setting HOME never reaches it), so the developers' sibling checkout is never found here.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { STUDIO_DOWNLOAD_URL } from '../src/studio/studioApp';
import { ensureStudio, findStudio, STUDIO_NOT_INSTALLED, studioInApp } from '../src/studio/studioProcess';

let mockHome: string | undefined;
jest.mock('os', () => {
  const actual = jest.requireActual('os');
  return { ...actual, homedir: () => mockHome ?? actual.homedir() };
});

const saved = { NODEGX_STUDIO: process.env.NODEGX_STUDIO, NODEGX_STUDIO_APP: process.env.NODEGX_STUDIO_APP };
let home: string;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'nostudio-'));
  mockHome = home;
  delete process.env.NODEGX_STUDIO;
});

afterEach(() => {
  mockHome = undefined;
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  fs.rmSync(home, { recursive: true, force: true });
});

/** A desktop app laid out as electron-builder lays it out, with Studio's server inside. */
function fakeApp(): string {
  const app = process.platform === 'darwin' ? path.join(home, 'NodeGX Studio.app') : path.join(home, 'NodeGX Studio', 'NodeGX Studio.exe');
  const editor = path.join(studioInApp(app), 'editor');
  fs.mkdirSync(editor, { recursive: true });
  fs.writeFileSync(path.join(editor, 'serve.mjs'), '');
  if (process.platform !== 'darwin') fs.writeFileSync(app, '');
  return app;
}

it('with no NODEGX_STUDIO and no checkout, the installed desktop app is where Studio is', () => {
  const app = fakeApp();
  process.env.NODEGX_STUDIO_APP = app;
  expect(findStudio()).toEqual({ dir: studioInApp(app) });
});

it('control: the same machine without the app is told where to get Studio, and not about an environment variable', () => {
  process.env.NODEGX_STUDIO_APP = 'none';
  const found = findStudio();
  expect(found).toEqual({ dir: null, reason: STUDIO_NOT_INSTALLED });
  expect(STUDIO_NOT_INSTALLED).toContain(STUDIO_DOWNLOAD_URL);
  expect(STUDIO_NOT_INSTALLED).not.toMatch(/NODEGX_STUDIO|set .* to its folder/);
});

it('NODEGX_STUDIO still wins over the app', () => {
  const app = fakeApp();
  process.env.NODEGX_STUDIO_APP = app;
  const own = path.join(home, 'own-studio');
  fs.mkdirSync(path.join(own, 'editor'), { recursive: true });
  fs.writeFileSync(path.join(own, 'editor', 'serve.mjs'), '');
  process.env.NODEGX_STUDIO = own;
  expect(findStudio()).toEqual({ dir: own });
});

// The packaged Mac build `npm run dist` leaves in the sibling checkout (Beta sweep s18), started as a stranger's
// machine would start it: from the app, on this process's own Node.
const BUILT = path.join(os.homedir(), 'vscode_projects', 'nodegx-studio', 'dist', 'mac-arm64', 'NodeGX Studio.app');
const driveIt = process.platform === 'darwin' && fs.existsSync(path.join(studioInApp(BUILT), 'editor', 'serve.mjs')) ? it : it.skip;

driveIt('drive: the packaged app\'s Studio starts on a project and serves its page', async () => {
  process.env.NODEGX_STUDIO_APP = BUILT;
  expect(findStudio()).toEqual({ dir: studioInApp(BUILT) });
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'nostudio-project-'));
  fs.cpSync(path.join(__dirname, '..', '..', '..', 'templates', 'todo-list'), project, { recursive: true });
  const studio = await ensureStudio(project);
  try {
    const page = await fetch(studio.origin + '/');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<title>NodeGX Studio</title>');
  } finally {
    process.kill(studio.pid);
    fs.rmSync(project, { recursive: true, force: true });
  }
}, 60_000);
