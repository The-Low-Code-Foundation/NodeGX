/**
 * P109 ISL-045 · P78-TPL011-INSTANCEROOT — a component whose only visual node is another component's instance draws.
 *
 * Nightbook (P78 TPL-011 s3) saw two such components draw nothing — the language button left the bar and the 32 feeling
 * chips were empty — and wrapping the instance in a Group made both draw. The cause was never isolated. This builds the
 * smallest project with the shape, renders it from disk on the working-tree runtime, and deploys it with the deploy
 * engine and drives the deployed site:
 *
 *   - `UI/Chip`     a Group with a Text, its words from a `label` input
 *   - `UI/Bare`     its only node is a Chip instance, the label handed through its own `label` input
 *   - `UI/Fixed`    its only node is a Chip instance with the label set on the instance
 *   - `UI/Wrapped`  the control: a Group around a Chip instance, handed through as Bare does
 *
 *   - `UI/Unrooted` its only node is a Chip instance and its `nodes.json` has NO `visualRoots` key — what the door
 *                   writes when the instanced component is not on disk yet (AWP-001: absent, each reader derives)
 *
 * all placed on one page, with a For Each whose rows are `UI/Bare` (Nightbook's feeling chips).
 *
 * 🔴 Isolated s44: every shape draws when rendered from disk. Deployed, `UI/Unrooted` drew nothing. `nodegx deploy`
 * exports a project it never registers in the node library, so the instance's type is unresolved there, and an
 * unresolved root counted only if the file recorded it. Fixed in `NodeGraphModel.isVisualRoot`; graded on the export
 * itself by `noodl-preview/tests/gam-014-…` (the `/Kit/Instance face` arm).
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { withRenderedPage } from './helpers/site-drive';
import type { RenderedPage } from './helpers/site-drive';
import { text, until } from './helpers/todo-drive';

jest.setTimeout(300_000);

const REPO = path.join(__dirname, '..', '..', '..');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withDeployedSite, freePort } = require('../../../scripts/devtools/drive-deployed.js') as {
  withDeployedSite<T>(options: { dir: string; port: number }, fn: (page: RenderedPage) => Promise<T>): Promise<T>;
  freePort(): Promise<number>;
};

type Node = Record<string, unknown>;
type Wire = { fromId: string; fromProperty: string; toId: string; toProperty: string };

const registry: Record<string, { path: string; type: string }> = {};

function component(dir: string, pathName: string, type: 'visual' | 'page', nodes: Node[], connections: Wire[] = [], writeRoots = true): void {
  registry[pathName] = { path: pathName, type };
  const at = path.join(dir, 'components', ...pathName.split('/'));
  fs.mkdirSync(at, { recursive: true });
  const id = `isl045-${pathName.replace(/\W/g, '-').toLowerCase()}`;
  const write = (file: string, body: unknown) => fs.writeFileSync(path.join(at, file), JSON.stringify(body, null, 2));
  write('component.json', { id, name: pathName.split('/').pop(), path: `/${pathName}`, type });
  const visualRoots = nodes.filter((n) => !n.parent && n.type !== 'Component Inputs').map((n) => n.id);
  write('nodes.json', writeRoots ? { componentId: id, version: 1, nodes, visualRoots } : { componentId: id, version: 1, nodes });
  write('connections.json', { componentId: id, version: 1, connections });
}

const labelIn = (id: string): Node => ({ id, type: 'Component Inputs', label: 'Inputs', ports: [{ name: 'label', plug: 'output', type: 'string' }] });
const handOn = (from: string, to: string): Wire => ({ fromId: from, fromProperty: 'label', toId: to, toProperty: 'label' });

function buildProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl045-instanceroot-'));
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify({ name: 'isl045 instance root', version: '5', settings: { navigationPathType: 'path' }, structure: { componentsDir: 'components', assetsDir: 'assets' } }, null, 2)
  );
  component(dir, 'App', 'visual', [
    { id: 'a_root', type: 'Group', label: 'App', parameters: { flexDirection: 'column' }, children: ['a_router'] },
    { id: 'a_router', type: 'Router', label: 'Router', parent: 'a_root', parameters: { name: 'Main', pages: { startPage: '/Pages/Home', routes: ['/Pages/Home'] } } }
  ]);
  component(
    dir,
    'UI/Chip',
    'visual',
    [
      { id: 'c_root', type: 'Group', label: 'Chip', parameters: { flexDirection: 'row', sizeMode: 'contentSize' }, children: ['c_text'] },
      { id: 'c_text', type: 'Text', label: 'Words', parent: 'c_root', parameters: { text: '?' } },
      labelIn('c_in')
    ],
    [{ fromId: 'c_in', fromProperty: 'label', toId: 'c_text', toProperty: 'text' }]
  );
  component(dir, 'UI/Bare', 'visual', [{ id: 'b_chip', type: '/UI/Chip', label: 'Chip' }, labelIn('b_in')], [handOn('b_in', 'b_chip')]);
  // What the door writes when the instance's component is not on disk yet: no `visualRoots` key, left to each reader
  component(dir, 'UI/Unrooted', 'visual', [labelIn('u_in'), { id: 'u_chip', type: '/UI/Chip', label: 'Chip' }], [handOn('u_in', 'u_chip')], false);
  component(dir, 'UI/Fixed', 'visual', [{ id: 'f_chip', type: '/UI/Chip', label: 'Chip', parameters: { label: 'chip set on the instance' } }]);
  component(
    dir,
    'UI/Wrapped',
    'visual',
    [{ id: 'w_root', type: 'Group', label: 'Wrap', parameters: { flexDirection: 'column', sizeMode: 'contentSize' }, children: ['w_chip'] }, { id: 'w_chip', type: '/UI/Chip', label: 'Chip', parent: 'w_root' }, labelIn('w_in')],
    [handOn('w_in', 'w_chip')]
  );
  component(dir, 'Pages/Home', 'page', [
    { id: 'h_page', type: 'Page', label: 'Home', parameters: { title: 'Instance root', urlPath: '' }, children: ['h_root'] },
    { id: 'h_root', type: 'Group', label: 'Root', parent: 'h_page', parameters: { flexDirection: 'column' }, children: ['h_bare', 'h_unrooted', 'h_fixed', 'h_wrapped', 'h_rows'] },
    { id: 'h_bare', type: '/UI/Bare', label: 'Bare', parent: 'h_root', parameters: { label: 'chip handed through' } },
    { id: 'h_unrooted', type: '/UI/Unrooted', label: 'Unrooted', parent: 'h_root', parameters: { label: 'chip with no roots written' } },
    { id: 'h_fixed', type: '/UI/Fixed', label: 'Fixed', parent: 'h_root' },
    { id: 'h_wrapped', type: '/UI/Wrapped', label: 'Wrapped', parent: 'h_root', parameters: { label: 'chip in a group' } },
    // Nightbook's feeling chips: rows of a For Each whose template is the instance-rooted component
    { id: 'h_rows', type: 'For Each', label: 'Rows', parent: 'h_root', parameters: { templateType: 'explicit', template: '/UI/Bare' } },
    { id: 'h_data', type: 'Static Data', label: 'Row data', parameters: { type: 'json', json: JSON.stringify([{ id: 'r1', label: 'row chip one' }, { id: 'r2', label: 'row chip two' }]) } }
  ], [{ fromId: 'h_data', fromProperty: 'items', toId: 'h_rows', toProperty: 'items' }]);
  fs.writeFileSync(path.join(dir, 'components', '_registry.json'), JSON.stringify({ version: 1, components: registry }, null, 2));
  return dir;
}

/** What a page shows once the control has drawn, the server's log beside it when it never does. */
async function read(page: RenderedPage, log: () => string): Promise<{ shown: string; driveError: string; consoleErrors: string[] }> {
  let driveError = '';
  let shown = '';
  try {
    shown = await until('the control drew', () => text(page), (s) => s.includes('chip in a group') && s.includes('row chip two'), 20_000);
  } catch (error) {
    driveError = error instanceof Error ? error.message : String(error);
    shown = `${await text(page).catch(() => '')}\n--- log ---\n${log().slice(-3000)}`;
  }
  return { shown, driveError, consoleErrors: [...page.consoleErrors] };
}

const ARMS: Array<[string, (dir: string) => Promise<{ shown: string; driveError: string; consoleErrors: string[] }>]> = [
  ['rendered from disk on the working-tree runtime', (projectDir) => withRenderedPage({ projectDir }, (page) => read(page, () => page.serverLog()))],
  [
    'deployed with the deploy engine (packages/noodl-preview/dist/nodegx-deploy.cjs)',
    async (projectDir) => {
      const site = fs.mkdtempSync(path.join(os.tmpdir(), 'isl045-instanceroot-site-'));
      fs.rmSync(site, { recursive: true, force: true });
      execFileSync('node', [path.join(REPO, 'packages', 'noodl-preview', 'dist', 'nodegx-deploy.cjs'), projectDir, site, '--allow-development-engine'], { stdio: 'pipe' });
      return withDeployedSite({ dir: site, port: await freePort() }, (page) => read(page, () => ''));
    }
  ]
];

describe.each(ARMS)('P78-TPL011-INSTANCEROOT — %s', (_arm, open) => {
  let r = { shown: '', driveError: '', consoleErrors: [] as string[] };

  beforeAll(async () => {
    r = await open(buildProject());
    if (r.driveError) console.log(r.shown);
  });

  it('the control draws: a Group around the instance, and the rows', () => {
    expect(r.driveError).toBe('');
  });

  it('the instance as the only node draws, its label handed through the component’s own input', () => {
    expect(r.shown).toContain('chip handed through');
  });

  it('the instance as the only node draws when its nodes.json has no visualRoots (each reader derives them)', () => {
    expect(r.shown).toContain('chip with no roots written');
  });

  it('the instance as the only node draws, its label set on the instance', () => {
    expect(r.shown).toContain('chip set on the instance');
  });

  it('…and as the template of a For Each, each row draws', () => {
    expect([r.shown.includes('row chip one'), r.shown.includes('row chip two')]).toEqual([true, true]);
  });

  it('no console errors', () => {
    expect(r.consoleErrors).toEqual([]);
  });
});
