/**
 * P128-S3-NOSTUDIOFORTHEEDITOR, the npm half (CCN-006 AC7): `findStudio`'s fourth candidate is the `@nodegx/studio`
 * package installed beside this server, found with `require.resolve` the way Node finds a dependency.
 *
 * A stub package is built in a temporary folder here (`node_modules/@nodegx/studio` with `editor/serve.mjs` at its
 * root, as the `.mcpb` stages Studio), so the spec needs nothing outside the repo. The home folder is a fresh one
 * (`os.homedir` mocked) and `NODEGX_STUDIO_APP=none`, so neither the developers' sibling checkout nor an installed
 * desktop app is found unless a case puts one there.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { findStudio, STUDIO_NOT_INSTALLED, STUDIO_PACKAGE, studioFromPackage, studioInApp } from '../src/studio/studioProcess';

let mockHome: string | undefined;
jest.mock('os', () => {
  const actual = jest.requireActual('os');
  return { ...actual, homedir: () => mockHome ?? actual.homedir() };
});

const saved = { NODEGX_STUDIO: process.env.NODEGX_STUDIO, NODEGX_STUDIO_APP: process.env.NODEGX_STUDIO_APP };
let root: string;

beforeEach(() => {
  // realpath: Node resolves through /var → /private/var on macOS, and the answer is compared by string.
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-npm-')));
  mockHome = path.join(root, 'home');
  fs.mkdirSync(mockHome);
  delete process.env.NODEGX_STUDIO;
  process.env.NODEGX_STUDIO_APP = 'none';
});

afterEach(() => {
  mockHome = undefined;
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  fs.rmSync(root, { recursive: true, force: true });
});

/** `<root>/install/node_modules/@nodegx/studio`, as `npm install @nodegx/studio` lays it out; returns the install. */
function installStub(manifest: Record<string, unknown> = {}, withServer = true): { install: string; pkg: string } {
  const install = path.join(root, 'install');
  const pkg = path.join(install, 'node_modules', ...STUDIO_PACKAGE.split('/'));
  fs.mkdirSync(path.join(pkg, 'editor'), { recursive: true });
  fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ name: STUDIO_PACKAGE, version: '0.0.0-stub', ...manifest }));
  if (withServer) fs.writeFileSync(path.join(pkg, 'editor', 'serve.mjs'), '');
  return { install, pkg };
}

it('with no NODEGX_STUDIO, no checkout and no app, the installed npm package is where Studio is', () => {
  const { install, pkg } = installStub();
  expect(studioFromPackage([install])).toBe(pkg);
  expect(findStudio({ packageSearchPaths: [install] })).toEqual({ dir: pkg });
});

it('a package whose exports leave out ./package.json is still found, from its entry', () => {
  const { install, pkg } = installStub({ main: 'index.js', exports: { '.': './index.js' } });
  fs.writeFileSync(path.join(pkg, 'index.js'), 'module.exports = {};');
  expect(findStudio({ packageSearchPaths: [install] })).toEqual({ dir: pkg });
});

it('control: the same folder with no package is told where to get Studio', () => {
  expect(studioFromPackage([root])).toBeUndefined();
  expect(findStudio({ packageSearchPaths: [root] })).toEqual({ dir: null, reason: STUDIO_NOT_INSTALLED });
});

it('control: a package without editor/serve.mjs is not a Studio', () => {
  const { install } = installStub({}, false);
  expect(findStudio({ packageSearchPaths: [install] })).toEqual({ dir: null, reason: STUDIO_NOT_INSTALLED });
});

it('it is the fourth candidate: NODEGX_STUDIO, the checkout and the app each win over it', () => {
  const { install } = installStub();
  const own = path.join(root, 'own');
  fs.mkdirSync(path.join(own, 'editor'), { recursive: true });
  fs.writeFileSync(path.join(own, 'editor', 'serve.mjs'), '');
  process.env.NODEGX_STUDIO = own;
  expect(findStudio({ packageSearchPaths: [install] })).toEqual({ dir: own });

  delete process.env.NODEGX_STUDIO;
  const checkout = path.join(mockHome!, 'vscode_projects', 'nodegx-studio');
  fs.mkdirSync(path.join(checkout, 'editor'), { recursive: true });
  fs.writeFileSync(path.join(checkout, 'editor', 'serve.mjs'), '');
  expect(findStudio({ packageSearchPaths: [install] })).toEqual({ dir: checkout });

  fs.rmSync(checkout, { recursive: true, force: true });
  const app = process.platform === 'darwin' ? path.join(root, 'NodeGX Studio.app') : path.join(root, 'NodeGX Studio', 'NodeGX Studio.exe');
  fs.mkdirSync(path.join(studioInApp(app), 'editor'), { recursive: true });
  fs.writeFileSync(path.join(studioInApp(app), 'editor', 'serve.mjs'), '');
  if (process.platform !== 'darwin') fs.writeFileSync(app, '');
  process.env.NODEGX_STUDIO_APP = app;
  expect(findStudio({ packageSearchPaths: [install] })).toEqual({ dir: studioInApp(app) });
});
