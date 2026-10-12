/**
 * P109 ISL-045 · P78-TPL011-MOUNTED — re-measured before the ruling is asked (AC1).
 *
 * Nightbook (P78 TPL-011 s3) saw a page drawn for a moment behind a locked book: a visual node whose Mounted is wired
 * from a gate stays mounted until the gate's first value arrives. Not re-measured since 2026-09-26. Here: a Group whose
 * Mounted is wired from a Variable nobody sets, beside a Group gated by a Function that sends false (it must hide),
 * one that sends true and one with no wire (both must draw).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { withRenderedPage } from './helpers/site-drive';
import { text, until, wait } from './helpers/todo-drive';

jest.setTimeout(180_000);

type Node = Record<string, unknown>;
type Wire = { fromId: string; fromProperty: string; toId: string; toProperty: string };
const registry: Record<string, { path: string; type: string }> = {};

function component(dir: string, pathName: string, type: 'visual' | 'page', nodes: Node[], connections: Wire[] = []): void {
  registry[pathName] = { path: pathName, type };
  const at = path.join(dir, 'components', ...pathName.split('/'));
  fs.mkdirSync(at, { recursive: true });
  const id = `isl045m-${pathName.replace(/\W/g, '-').toLowerCase()}`;
  const write = (file: string, body: unknown) => fs.writeFileSync(path.join(at, file), JSON.stringify(body, null, 2));
  write('component.json', { id, name: pathName.split('/').pop(), path: `/${pathName}`, type });
  write('nodes.json', { componentId: id, version: 1, nodes });
  write('connections.json', { componentId: id, version: 1, connections });
}
const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string): Wire => ({ fromId, fromProperty, toId, toProperty });

function buildProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl045-mounted-'));
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify({ name: 'isl045 mounted', version: '5', settings: { navigationPathType: 'path' }, structure: { componentsDir: 'components', assetsDir: 'assets' } }, null, 2)
  );
  component(dir, 'App', 'visual', [
    { id: 'a_root', type: 'Group', label: 'App', parameters: { flexDirection: 'column' }, children: ['a_router'] },
    { id: 'a_router', type: 'Router', label: 'Router', parent: 'a_root', parameters: { name: 'Main', pages: { startPage: '/Pages/Home', routes: ['/Pages/Home'] } } }
  ]);
  const gated = (id: string, words: string): Node[] => [
    { id, type: 'Group', label: words, parent: 'h_root', parameters: { flexDirection: 'column' }, children: [`${id}_t`] },
    { id: `${id}_t`, type: 'Text', label: words, parent: id, parameters: { text: words } }
  ];
  component(
    dir,
    'Pages/Home',
    'page',
    [
      { id: 'h_page', type: 'Page', label: 'Home', parameters: { title: 'Mounted', urlPath: '' }, children: ['h_root'] },
      { id: 'h_root', type: 'Group', label: 'Root', parent: 'h_page', parameters: { flexDirection: 'column' }, children: ['h_none', 'h_false', 'h_true', 'h_always'] },
      ...gated('h_none', 'GATED BY A VARIABLE WITH NO VALUE'),
      ...gated('h_false', 'GATED BY FALSE'),
      ...gated('h_true', 'GATED BY TRUE'),
      ...gated('h_always', 'NOT GATED'),
      { id: 'h_gate', type: 'Variable2', label: 'A gate nobody sets', parameters: { name: 'isl045NeverSet' } },
      { id: 'h_no', type: 'JavaScriptFunction', label: 'False', parameters: { functionScript: 'Outputs.v = false;' } },
      { id: 'h_yes', type: 'JavaScriptFunction', label: 'True', parameters: { functionScript: 'Outputs.v = true;' } }
    ],
    [wire('h_gate', 'value', 'h_none', 'mounted'), wire('h_no', 'out-v', 'h_false', 'mounted'), wire('h_yes', 'out-v', 'h_true', 'mounted')]
  );
  fs.writeFileSync(path.join(dir, 'components', '_registry.json'), JSON.stringify({ version: 1, components: registry }, null, 2));
  return dir;
}

describe('P78-TPL011-MOUNTED — a wired Mounted with no value yet', () => {
  const R: Record<string, unknown> = {};

  beforeAll(async () => {
    await withRenderedPage({ projectDir: buildProject() }, async (page) => {
      try {
        await until('the page drew', () => text(page), (s) => s.includes('NOT GATED') && s.includes('GATED BY TRUE'), 20_000);
        await wait(1000);
        R.shown = await text(page);
      } catch (error) {
        R.driveError = error instanceof Error ? error.message : String(error);
        R.shown = `${await text(page).catch(() => '')}\n--- log ---\n${page.serverLog().slice(-3000)}`;
      }
      R.consoleErrors = [...page.consoleErrors];
    });
    console.log(`MOUNTED reading: ${JSON.stringify(R, null, 1)}`);
  });

  it('the controls: false hides, true and no wire draw', () => {
    expect(R.driveError).toBeUndefined();
    const s = String(R.shown);
    expect([s.includes('GATED BY FALSE'), s.includes('GATED BY TRUE'), s.includes('NOT GATED')]).toEqual([false, true, true]);
  });

  it('the reading: is a group gated by a Variable nobody has set drawn? (recorded, not graded — the row needs a ruling)', () => {
    R.noValueDrawn = String(R.shown).includes('GATED BY A VARIABLE WITH NO VALUE');
    console.log(`MOUNTED: a Mounted wired from a Variable with no value draws its group: ${R.noValueDrawn}`);
    expect(typeof R.noValueDrawn).toBe('boolean');
  });
});
