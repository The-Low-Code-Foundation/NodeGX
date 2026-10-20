/**
 * P111 SEE-001 — the honesty number on the MCP's surfaces, measured on the REAL training template (a copy of
 * `templates/digital-bricks-training`, its 82 components), never a toy: a budget measured on a fixture is a budget on
 * the fixture.
 *
 * AC1  get_project_info and get_component say the number SEE-000's census computed by hand (census.json), for the project
 *      and for a component.
 * AC2  a Function planted through update_component lowers the component's number and the project's, and the write
 *      result, get_project_info, get_component and render_report's section all say the same new numbers.
 * AC5  what the number costs: the resident tool surface is untouched (every field is a result field —
 *      toolDisclosure.test.ts is the gate), and each result field is held under a ceiling measured here, printed on a
 *      passing run so the margin is visible before it is crossed.
 *
 * The copy leaves out `noodl_modules`: binding a project with kits runs the kit reader (and builds it when stale, into
 * dist/), which this spec does not need — the honesty rule reads kits from the SHIPPED catalog, so a kit node is script
 * with or without the overlay.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { HONESTY_SENTENCE } from '@nodegx/node-spec';

import type { ComponentHonestyPayload, ProjectHonestyPayload } from '../src/honesty';
import type { CreateComponentResponse, GetComponentResponse, ProjectInfoResponse, UpdateComponentResponse } from '../src/tools/responses';

import { call, connect, type TestSession } from './helpers';

const ROOT = path.join(__dirname, '..', '..', '..');
const TEMPLATE = path.join(ROOT, 'templates', 'digital-bricks-training');
const CENSUS = path.join(ROOT, 'dev-docs', 'tasks', 'phase-111-you-can-see-what-it-built', 'census.json');

/** Ceilings on each result field's JSON, in characters, on the training template (measured 2026-10-19; raise with a reason). */
const CEILING = { projectInfo: 1600, component: 1800, write: 600, renderSection: 1200 };

/** The census rows this spec reads (census.json, written by scripts/see/census.js). */
interface CensusCounts {
  name: string;
  known: number;
  script: number;
  unspecced: number;
  percent: number | null;
}
interface CensusProject extends CensusCounts {
  percentByLines: number | null;
  scriptLines: number;
  byComponent: CensusCounts[];
}
const censusProjects = (JSON.parse(fs.readFileSync(CENSUS, 'utf8')) as { projects: CensusProject[] }).projects;
const census = censusProjects.find((p) => p.name === 'digital-bricks-training')!;

const STUB_REPORT = { project: '(stub)', projectName: 'Training', durationMs: 1, viewports: {}, pages: [], findings: [], summary: 'Rendered clean.' };

function copyTemplate(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'see001-'));
  fs.cpSync(TEMPLATE, dir, { recursive: true, filter: (src) => path.basename(src) !== 'noodl_modules' });
  return dir;
}

describe('SEE-001 — the honesty number over MCP, on the training template', () => {
  let session: TestSession;
  let dir: string;
  const originalCli = process.env.NODEGX_RENDER_CLI;

  beforeAll(async () => {
    dir = copyTemplate();
    session = await connect(dir, true);
  });
  afterAll(async () => {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
    if (originalCli === undefined) delete process.env.NODEGX_RENDER_CLI;
    else process.env.NODEGX_RENDER_CLI = originalCli;
  });

  const projectInfo = async (): Promise<ProjectHonestyPayload> => (await call<ProjectInfoResponse>(session, 'get_project_info')).data.honesty!;
  const component = async (p: string): Promise<ComponentHonestyPayload> => (await call<GetComponentResponse>(session, 'get_component', { path: p })).data.honesty!;
  async function renderSection(): Promise<string> {
    const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'see001-cli-'));
    const cli = path.join(stubDir, 'stub-cli.js');
    fs.writeFileSync(cli, `console.log(JSON.stringify(${JSON.stringify(STUB_REPORT)}));`);
    process.env.NODEGX_RENDER_CLI = cli;
    const res = (await session.client.callTool({ name: 'render_report', arguments: { screenshot: 'none' } })) as { content: Array<{ type: string; text?: string; data?: string }> };
    const block = res.content.find((c) => c.type === 'text' && (c.text ?? '').startsWith('HONESTY — '));
    if (!block) throw new Error('render_report has no HONESTY section: ' + JSON.stringify(res.content.map((c) => (c.text ?? '').slice(0, 40))));
    return block.text!;
  }

  it('AC1: get_project_info says the census\'s number over the components the project registers', async () => {
    // The training template's registry once listed 49 of its 82 components: its 33 `__cloud__/…` functions were on disk
    // but unregistered, so this server read 66% where the census read 67% (P111-SEE001-DBTCLOUDUNREGISTERED, fixed
    // 2026-10-19). Every component the census counts is registered now, so the two surfaces must agree exactly.
    const registered = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(dir, 'components', '_registry.json'), 'utf8')).components).map((k) => (k.startsWith('__cloud__/') ? '/#' + k : '/' + k)));
    const rows = census.byComponent;
    const sum = (rs: CensusCounts[], k: 'known' | 'script' | 'unspecced') => rs.reduce((t, r) => t + r[k], 0);
    const inRegistry = rows.filter((r) => registered.has(r.name));
    const missing = rows.filter((r) => !registered.has(r.name));
    expect({ registered: inRegistry.length, missing: missing.map((r) => r.name) }).toEqual({ registered: 82, missing: [] });
    const known = sum(inRegistry, 'known');
    const script = sum(inRegistry, 'script');
    const h = await projectInfo();
    expect({ percent: h.percent, known: h.known, script: h.script, unspecced: h.unspecced }).toEqual({
      percent: Math.round((1000 * known) / (known + script)) / 10,
      known,
      script,
      unspecced: sum(inRegistry, 'unspecced')
    });
    expect(h.line).toBe(`${h.percent}% known (${known} known, ${script} script, ${h.unspecced} unspecced)`);
    expect(h.about).toMatch(/not a quality score/);
  });

  it('AC1: get_component says the census\'s number for a component, and names its script node by id', async () => {
    const row = census.byComponent.find((r) => r.name === '/Logic/Standing')!;
    const h = await component('Logic/Standing');
    expect({ percent: h.percent, known: h.known, script: h.script }).toEqual({ percent: row.percent, known: row.known, script: row.script });
    expect(h.scriptNodes).toEqual([{ id: 'st_fn', type: 'JavaScriptFunction', label: 'Count, pace, trajectory', lines: 611 }]);
  });

  it('AC5: each result field stays under its ceiling on the training template (resident surface: 0 — result fields)', async () => {
    const sizes = {
      projectInfo: JSON.stringify(await projectInfo()).length,
      // the component with the most script nodes in the template: the longest list a get_component carries
      component: JSON.stringify(await component('Pages/Settings')).length,
      renderSection: (await renderSection()).length
    };
    // eslint-disable-next-line no-console
    console.log(`[honesty] result chars on the training template: ${JSON.stringify(sizes)} — ceilings ${JSON.stringify(CEILING)}`);
    expect(sizes.projectInfo).toBeLessThanOrEqual(CEILING.projectInfo);
    expect(sizes.component).toBeLessThanOrEqual(CEILING.component);
    expect(sizes.renderSection).toBeLessThanOrEqual(CEILING.renderSection);
  });

  it('AC2: a Function planted through update_component lowers the component and the project, and every surface says the same', async () => {
    const before = await projectInfo();
    const write = await call<UpdateComponentResponse>(session, 'update_component', {
      path: 'Logic/Standing',
      operations: [{ op: 'add_node', node: { id: 'see001_planted', type: 'JavaScriptFunction', label: 'Planted by SEE-001', parameters: { functionScript: 'Script.Outputs.x = 1;' } } }]
    });
    expect(write.isError).toBe(false);
    const wantComponent = Math.round((1000 * 2) / (2 + 2)) / 10; // 2 known, 1 + 1 script
    const wantProject = Math.round((1000 * before.known) / (before.known + before.script + 1)) / 10;
    expect(wantProject).toBeLessThan(before.percent!);
    expect(write.data.honesty!.component).toBe(`this component: ${wantComponent}% known (2 known, 2 script); script: \`Count, pace, trajectory\`, \`Planted by SEE-001\``);
    expect(write.data.honesty!.project).toBe(`the project: ${wantProject}% known (${before.known} known, ${before.script + 1} script, ${before.unspecced} unspecced)`);
    // eslint-disable-next-line no-console
    console.log(`[honesty] a write's result field: ${JSON.stringify(write.data.honesty!).length} chars — ceiling ${CEILING.write}`);
    expect(JSON.stringify(write.data.honesty!).length).toBeLessThanOrEqual(CEILING.write);

    const after = await projectInfo();
    expect({ percent: after.percent, script: after.script }).toEqual({ percent: wantProject, script: before.script + 1 });
    const comp = await component('Logic/Standing');
    expect({ percent: comp.percent, script: comp.script, ids: comp.scriptNodes.map((n) => n.id) }).toEqual({ percent: wantComponent, script: 2, ids: ['st_fn', 'see001_planted'] });
    const section = await renderSection();
    expect(section.split('\n')[0]).toBe(`HONESTY — ${wantProject}% known (${before.known} known, ${before.script + 1} script, ${before.unspecced} unspecced); ${after.percentByLines}% weighed by script lines (${after.scriptLines} lines).`);
  });

  it('create_component reports the new component\'s number and the project\'s', async () => {
    const before = await projectInfo();
    const res = await call<CreateComponentResponse>(session, 'create_component', {
      path: 'Logic/SEE-001 probe',
      type: 'logic',
      nodes: [
        { id: 'see001_in', type: 'Component Inputs' },
        { id: 'see001_expr', type: 'Expression', label: 'Double it', parameters: { expression: 'a * 2' } }
      ]
    });
    expect(res.isError).toBe(false);
    expect(res.data.honesty!.component).toBe('this component: 50% known (1 known, 1 script); script: `Double it`');
    expect(res.data.honesty!.project).toBe(
      `the project: ${Math.round((1000 * (before.known + 1)) / (before.known + 1 + before.script + 1)) / 10}% known (${before.known + 1} known, ${before.script + 1} script, ${before.unspecced} unspecced)`
    );
  });
});

describe('SEE-001 — AC1 over MCP on the todo template, whose registry lists every component', () => {
  it('get_project_info says exactly the census\'s number and counts', async () => {
    const todo = censusProjects.find((p) => p.name === 'todo-list')!;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'see001-todo-'));
    fs.cpSync(path.join(ROOT, 'templates', 'todo-list'), dir, { recursive: true });
    const session = await connect(dir, false);
    try {
      const h = (await call<ProjectInfoResponse>(session, 'get_project_info')).data.honesty!;
      expect({ percent: h.percent, known: h.known, script: h.script, unspecced: h.unspecced, byLines: h.percentByLines, lines: h.scriptLines }).toEqual({
        percent: todo.percent,
        known: todo.known,
        script: todo.script,
        unspecced: todo.unspecced,
        byLines: todo.percentByLines,
        lines: todo.scriptLines
      });
    } finally {
      await session.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('SEE-001 §4 item 5 — the sentence', () => {
  it('the README quotes HONESTY_SENTENCE word for word (get_project_info\'s `about` is the constant itself)', () => {
    const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8').replace(/\s+/g, ' ');
    expect(readme).toContain(HONESTY_SENTENCE);
  });
});
