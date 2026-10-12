/**
 * P109 ISL-016 — the door writes the project's name, its settings and its home.
 *
 * Ruled 2026-10-04 (README §8 round 3): "Replace, say what changed", and "home" is the editor's
 * "Make home" — the component the project starts from (normally App, holding the Router), resolved
 * as `makeComponentHome` resolves it: the first top-level node whose type may be an export root.
 */
import * as fs from 'fs';
import * as path from 'path';

import { call, connect, copyFixture, readJson, type TestSession } from './helpers';
import { PROJECT_SETTING_KINDS, type SetProjectSettingsResponse } from '../src/tools/projectSettingsTools';
import type { FindToolsResponse, ProjectInfoResponse, ToolErrorPayload } from '../src/tools/responses';

type ProjectFile = { name?: string; settings?: Record<string, unknown>; rootNodeId?: string; modified?: string };

const projectFile = (s: TestSession) => path.join(s.projectDir, 'nodegx.project.json');
const readProject = (s: TestSession) => readJson<ProjectFile>(s.projectDir, 'nodegx.project.json');

async function createComponent(s: TestSession, p: string, nodes: unknown[]): Promise<void> {
  const res = await call(s, 'create_component', { path: p, nodes });
  if (res.isError) throw new Error(`create_component ${p}: ${JSON.stringify(res.data)}`);
}

describe('P109 ISL-016 — set_project_settings', () => {
  let session: TestSession;

  beforeEach(async () => {
    session = await connect(copyFixture());
    await call<FindToolsResponse>(session, 'find_tools', { group: 'project' });
  });

  afterEach(async () => {
    await session.close();
  });

  it('AC1 — find_tools reaches it from the words a model types for it', async () => {
    // Deferred, in `project`, found by keyword: the only way a model meets it. Each query on a fresh
    // server, so one reveal cannot answer for the next.
    for (const query of ['settings', 'home', 'title', 'make home']) {
      const s = await connect(copyFixture());
      try {
        const found = await call<FindToolsResponse>(s, 'find_tools', { query });
        expect({ query, revealed: found.data.revealed.includes('set_project_settings') }).toEqual({
          query,
          revealed: true
        });
      } finally {
        await s.close();
      }
    }
  });

  it('AC2 — overwrites and answers was → now for each field', async () => {
    // The fixture already has a title and a path style: the plan door would skip both.
    const res = await call<SetProjectSettingsResponse>(session, 'set_project_settings', {
      name: "Olive's Island",
      settings: { htmlTitle: "Olive's Island", navigationPathType: 'hash', bodyScroll: true }
    });
    expect(res.isError).toBeFalsy();
    expect(res.data.changed).toEqual([
      { field: 'name', was: 'Demo App', now: "Olive's Island" },
      { field: 'settings.htmlTitle', was: 'Demo App', now: "Olive's Island" },
      { field: 'settings.navigationPathType', was: 'path', now: 'hash' },
      { field: 'settings.bodyScroll', now: true }
    ]);
    const project = readProject(session);
    expect({ name: project.name, settings: project.settings }).toEqual({
      name: "Olive's Island",
      settings: { htmlTitle: "Olive's Island", navigationPathType: 'hash', bodyScroll: true }
    });
  });

  it('AC2 — an unknown setting, or one of the wrong kind, is refused by name and nothing is written', async () => {
    const before = fs.readFileSync(projectFile(session), 'utf8');
    for (const [settings, named] of [
      [{ htmlTitle: 'X', homePage: 'Profiles' }, '"homePage" is not a project setting'],
      [{ navigationPathType: 'hashbang' }, 'Setting "navigationPathType" must be one of "hash", "path"'],
      [{ bodyScroll: 'yes' }, 'Setting "bodyScroll" must be a boolean']
    ] as const) {
      const res = await call<ToolErrorPayload>(session, 'set_project_settings', { name: 'Changed', settings });
      expect({ isError: res.isError, named: res.data.error.message.includes(named) }).toEqual({ isError: true, named: true });
    }
    expect(fs.readFileSync(projectFile(session), 'utf8')).toBe(before);
  });

  it('a request that changes nothing writes nothing (ISL-019)', async () => {
    const before = fs.readFileSync(projectFile(session), 'utf8');
    const res = await call<SetProjectSettingsResponse>(session, 'set_project_settings', {
      settings: { htmlTitle: 'Demo App', navigationPathType: 'path' }
    });
    expect(res.data).toEqual({ changed: [], unchanged: true });
    expect(fs.readFileSync(projectFile(session), 'utf8')).toBe(before);
  });

  it('AC3 — home names a component; the project points at its first top-level visual node, and get_project_info says so', async () => {
    // The fixture has no `rootNodeId`: the D9 shape. Its App's registry row is `root`, and before this
    // that row was the whole answer ("App") — for a project the editor opens with no home.
    const before = await call<ProjectInfoResponse>(session, 'get_project_info');
    expect(before.data.rootComponent).toMatchObject({ missing: true });
    expect(before.data.rootComponent?.path).toBeUndefined();

    const res = await call<SetProjectSettingsResponse>(session, 'set_project_settings', { home: 'App' });
    expect(res.data).toEqual({
      changed: [{ field: 'rootNodeId', now: 'app_group' }],
      home: { component: 'App', nodeId: 'app_group', nodeType: 'Group', candidates: 1 }
    });
    // Appended last, after `modified`, where `pinRootNode` put it — key order is bytes (ISL-016 §7).
    expect(Object.keys(readProject(session)).slice(-2)).toEqual(['modified', 'rootNodeId']);

    const after = await call<ProjectInfoResponse>(session, 'get_project_info');
    expect(after.data.rootComponent).toEqual({ path: 'App', nodeId: 'app_group' });
  });

  it('AC4 — the home is the first VISUAL top-level node, not the first node (pinRootNode took any)', async () => {
    await createComponent(session, 'Shell', [
      { id: 'shell_logic', type: 'Expression', parameters: { expression: '1 + 1' } },
      { id: 'shell_page_like', type: 'Page' },
      { id: 'shell_box', type: 'Group' }
    ]);
    const res = await call<SetProjectSettingsResponse>(session, 'set_project_settings', { home: 'Shell' });
    expect(res.isError).toBeFalsy();
    // Not the Expression (logic) and not the Page (visual, but `allowAsExportRoot: false`).
    const nodeId = readProject(session).rootNodeId;
    const box = readJson<{ nodes: Array<{ id: string; type: string; parent?: string }> }>(
      session.projectDir,
      'components/Shell/nodes.json'
    ).nodes.find((n) => n.type === 'Group' && !n.parent);
    expect({ nodeId, home: res.data.home?.nodeType }).toEqual({ nodeId: box?.id, home: 'Group' });
  });

  it('AC3 — a component with no visual top-level node is refused by name, and an unknown one too', async () => {
    await createComponent(session, 'Logic/Sum', [{ id: 'sum', type: 'Expression', parameters: { expression: '2' } }]);
    const before = fs.readFileSync(projectFile(session), 'utf8');

    const logic = await call<ToolErrorPayload>(session, 'set_project_settings', { home: 'Logic/Sum' });
    expect({ isError: logic.isError, named: logic.data.error.message.includes('"Logic/Sum" has no visual node') }).toEqual({
      isError: true,
      named: true
    });
    const unknown = await call<ToolErrorPayload>(session, 'set_project_settings', { home: 'Nope', name: 'X' });
    expect({ isError: unknown.isError, code: unknown.data.error.code }).toEqual({ isError: true, code: 'not-found' });

    expect(fs.readFileSync(projectFile(session), 'utf8')).toBe(before);
  });

  it("get_project_info reads the home the way the editor does — the garden's shape (rootNodeId, no `root` row)", async () => {
    // `templates/bot-garden` carries `rootNodeId: "app_root"` and types App `visual`; at HEAD before
    // ISL-016 get_project_info answered `rootComponent: undefined` for it. The same shape, made here.
    const registryPath = path.join(session.projectDir, 'components', '_registry.json');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    registry.components.App.type = 'visual';
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    const project = readProject(session);
    fs.writeFileSync(projectFile(session), JSON.stringify({ ...project, rootNodeId: 'app_group' }, null, 2));

    const info = await call<ProjectInfoResponse>(session, 'get_project_info');
    expect(info.data.rootComponent).toEqual({ path: 'App', nodeId: 'app_group' });

    // And a `rootNodeId` no component holds is reported, not hidden.
    fs.writeFileSync(projectFile(session), JSON.stringify({ ...project, rootNodeId: 'gone' }, null, 2));
    const missing = await call<ProjectInfoResponse>(session, 'get_project_info');
    expect(missing.data.rootComponent).toMatchObject({ nodeId: 'gone', missing: true });
  });
});

describe('P109 ISL-016 — the settings table is the runtime’s', () => {
  it('names every project setting the editor draws, with its kind', () => {
    // `noodl-viewer-react/src/project-settings.ts` is the declaration the Project Settings panel reads.
    // Read as text: importing it would pull the viewer's module graph into this suite.
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'noodl-viewer-react', 'src', 'project-settings.ts'),
      'utf8'
    );
    const declared: Record<string, string> = {};
    const re = /\{\s*name: '([A-Za-z]+)',\s*displayName:[\s\S]*?type: (?:'(\w+)'|\{\s*name: '(\w+)'[\s\S]*?\})/g;
    for (let m = re.exec(src); m; m = re.exec(src)) declared[m[1]] = m[2] ?? m[3];
    const ours = Object.fromEntries(
      Object.entries(PROJECT_SETTING_KINDS).map(([k, v]) => [k, Array.isArray(v) ? 'enum' : (v as string)])
    );
    expect(ours).toEqual(declared);
  });
});
