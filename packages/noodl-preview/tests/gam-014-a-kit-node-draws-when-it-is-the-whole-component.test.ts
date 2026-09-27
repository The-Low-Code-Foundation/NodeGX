/**
 * P88 GAM-014 — a component whose root is a kit's React node keeps that root through `nodegx deploy`.
 *
 * ## What AC1 measured (session 15, 2026-09-16)
 *
 * The door writes `Kit/Face`'s `nodes.json` with `visualRoots: ["face"]`, a root `game-kit.Avatar`.
 * Deployed with `nodegx-deploy.cjs`, the bundle carries `"/Kit/Face" … "roots":[]`, and in Chromium
 * the Avatar draws nothing, with 0 console errors, while the same Avatar inside a Group draws 96×96.
 *
 * 🔴 **The cause is neither the door nor the viewer.** The headless deploy's node library holds the
 * built-in register only (`headless.ts`, `bootstrapNodeLibrary`); a project's `noodl_modules` are never
 * loaded into it. So `game-kit.Avatar` resolves to an `UnknownNodeType`, and `exportComponent` keeps a
 * root only `if (n.type.allowAsChild)`. That drops the root the file recorded, on the one process that
 * cannot know better. `NodeGraphModel.fromJSON` also threw the recorded list away, so there was
 * nothing to fall back on.
 *
 * ## Why no kit module is installed here
 *
 * The defect's precondition is "the type did not resolve in the exporting process", and a kit that
 * `nodegx deploy` never loads is exactly that. Installing `game-kit` would add nothing but bytes: the
 * deploy copies `noodl_modules` verbatim and does not read them. The fixture names kit types directly.
 *
 * ## The arms, each beside a known-firing half
 *
 *   - `/Kit/Face`: an unresolved type at the root, recorded as a visual root. **The person sentence.**
 *   - `/Kit/Wrapped face`: the same node inside a Group root. Resolved type, so it always had a root.
 *     If this one reads rootless, the deploy is broken wholesale and the Face arm grades nothing.
 *   - `/Kit/Storage`: an unresolved **logic** type at the root, with no `visualRoots` key, which is what
 *     the door writes for one (AWP-001's absence rule). It must stay rootless (AC4). Its rootlessness
 *     is the reading that proves the fix trusts the file and does not make every unknown type visual.
 *
 * ⚠️ **This grades `dist/nodegx-deploy.cjs`, which is a build artefact.** The editor model cannot be
 * imported outside a bundle (`NodeGraphModel` reads `platform.getUserDataPath()` at module scope), so
 * the spec refuses to run against a bundle older than the two source files the fix lives in.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { readDeployedRoots } from '../src/deployReading';

const PKG_ROOT = path.resolve(__dirname, '..');
const ENGINE_BUNDLE = path.join(PKG_ROOT, 'dist/nodegx-deploy.cjs');
const VIEWER_ENGINE = path.resolve(PKG_ROOT, '../noodl-editor/src/external/deploy/noodl.deploy.js');
const FIXTURE_PROJECT = path.join(PKG_ROOT, 'tests/fixtures/hello-world');
const EDITOR_SRC = path.resolve(PKG_ROOT, '../noodl-editor/src/editor/src');
const FIX_SOURCES = [
  path.join(EDITOR_SRC, 'utils/exporter/util.ts'),
  path.join(EDITOR_SRC, 'models/nodegraphmodel/NodeGraphModel.ts')
];

let work: string;
let outDir: string;
let deployReport: { ok?: boolean; stage?: string; message?: string };

function writeComponent(
  projectDir: string,
  folder: string,
  id: string,
  nodes: unknown[],
  visualRoots: string[] | undefined
): void {
  const dir = path.join(projectDir, 'components', folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'component.json'),
    JSON.stringify({ id, name: path.basename(folder), path: `/${folder}`, type: 'visual' })
  );
  fs.writeFileSync(
    path.join(dir, 'nodes.json'),
    JSON.stringify({ componentId: id, version: 1, nodes, ...(visualRoots ? { visualRoots } : {}) })
  );
  fs.writeFileSync(path.join(dir, 'connections.json'), JSON.stringify({ componentId: id, version: 1, connections: [] }));
}

beforeAll(() => {
  if (!fs.existsSync(ENGINE_BUNDLE)) {
    throw new Error(`Missing ${ENGINE_BUNDLE}. Build it: npm --prefix packages/noodl-preview run build`);
  }
  const bundleTime = fs.statSync(ENGINE_BUNDLE).mtimeMs;
  const newer = FIX_SOURCES.filter((f) => fs.statSync(f).mtimeMs > bundleTime);
  if (newer.length > 0) {
    throw new Error(
      `${ENGINE_BUNDLE} is older than ${newer.join(', ')}, so it would grade a stale export. ` +
        'Rebuild it: npm --prefix packages/noodl-preview run build'
    );
  }
  if (!fs.existsSync(VIEWER_ENGINE)) {
    throw new Error(`Missing the viewer runtime ${VIEWER_ENGINE}. Build it: npm run build:editor:_viewer`);
  }

  work = fs.mkdtempSync(path.join(os.tmpdir(), 'gam014-deploy-'));
  const projectDir = path.join(work, 'project');
  fs.cpSync(FIXTURE_PROJECT, projectDir, { recursive: true });

  writeComponent(
    projectDir,
    'Kit/Face',
    'c_kit_face',
    [{ id: 'face', type: 'game-kit.Avatar', parameters: { seed: 'Ada', size: 96 } }],
    ['face']
  );
  writeComponent(
    projectDir,
    'Kit/Wrapped face',
    'c_kit_wrapped',
    [
      { id: 'wrap', type: 'Group', parameters: {}, children: ['wface'] },
      { id: 'wface', type: 'game-kit.Avatar', parent: 'wrap', parameters: { seed: 'Bea', size: 96 } }
    ],
    ['wrap']
  );
  writeComponent(
    projectDir,
    'Kit/Storage',
    'c_kit_storage',
    [{ id: 'store', type: 'game-kit.KeepStorage', parameters: {} }],
    undefined
  );

  // Placed on the page, so the export reaches them the way a real one does.
  const homeNodes = path.join(projectDir, 'components/__page__/Home/nodes.json');
  const home = JSON.parse(fs.readFileSync(homeNodes, 'utf8'));
  const page = home.nodes.find((n: { id: string }) => n.id === 'page');
  for (const [id, type] of [
    ['placedFace', '/Kit/Face'],
    ['placedWrapped', '/Kit/Wrapped face']
  ]) {
    page.children.push(id);
    home.nodes.push({ id, type, parent: 'page', parameters: {} });
  }
  fs.writeFileSync(homeNodes, JSON.stringify(home));

  const registryPath = path.join(projectDir, 'components/_registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  for (const folder of ['Kit/Face', 'Kit/Wrapped face', 'Kit/Storage']) {
    registry.components[folder] = { path: folder, type: 'visual', nodeCount: 1, connectionCount: 0 };
  }
  fs.writeFileSync(registryPath, JSON.stringify(registry));

  outDir = path.join(work, 'deploy');
  // `--allow-development-engine`: the viewer runtime on disk in a working checkout is the dev build,
  // and this spec reads `roots`, not the engine. The folder is a temp dir and is never uploaded.
  const run = spawnSync(process.execPath, [ENGINE_BUNDLE, projectDir, outDir, '--allow-development-engine'], {
    encoding: 'utf8'
  });
  const lastLine = run.stdout.trim().split('\n').pop() ?? '';
  deployReport = JSON.parse(lastLine);
});

afterAll(() => {
  if (work) fs.rmSync(work, { recursive: true, force: true });
});

describe('GAM-014 — a kit node at the root of a component survives nodegx deploy', () => {
  it('the deploy ran, and the Group-rooted control carries its root (known-firing)', () => {
    expect(deployReport).toMatchObject({ ok: true });
    const reading = readDeployedRoots(outDir);
    expect(reading.withoutRoots).not.toContain('/Kit/Wrapped face');
    expect(reading.withoutRoots).not.toContain('/#__page__/Home');
  });

  it('🔴 the kit-rooted component keeps the root its nodes.json recorded (the person sentence)', () => {
    const reading = readDeployedRoots(outDir);
    // The recorded defect, in one line: this contained '/Kit/Face'.
    expect(reading.withoutRoots).not.toContain('/Kit/Face');
  });

  it('a logic kit node the file did not record as a root stays rootless (AC4)', () => {
    const reading = readDeployedRoots(outDir);
    expect(reading.withoutRoots).toContain('/Kit/Storage');
  });
});
