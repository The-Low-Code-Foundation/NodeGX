/**
 * P109 ISL-045 · P78-TPL011-VARIDS — re-measured before the ruling is asked (AC1).
 *
 * Nightbook (P78 TPL-011 s4) kept the picked feelings, `[{ w, s }, …]`, in a Variable, and read back each object had an
 * `id` of its own, which went into her saved page. Not re-measured since 2026-09-26. Nightbook's shape, smallest:
 *
 *   a Function makes the array → `Set Variable` (Set With: array) keeps it → the Variable's value feeds a For Each that
 *   draws a row per object, and a Function wired to the same value reads it back as JSON
 *
 * plus the page's own `Noodl.Variables`, read after the rows have drawn. A row draws `w`, so the For Each arm is known
 * to have run.
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
  const id = `isl045v-${pathName.replace(/\W/g, '-').toLowerCase()}`;
  const write = (file: string, body: unknown) => fs.writeFileSync(path.join(at, file), JSON.stringify(body, null, 2));
  write('component.json', { id, name: pathName.split('/').pop(), path: `/${pathName}`, type });
  write('nodes.json', { componentId: id, version: 1, nodes });
  write('connections.json', { componentId: id, version: 1, connections });
}
const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string): Wire => ({ fromId, fromProperty, toId, toProperty });

const port = (name: string, plug: 'input' | 'output', type: string) => ({
  name,
  displayName: name.slice(name.indexOf('-') + 1),
  plug,
  type,
  group: plug === 'input' ? 'Inputs' : 'Outputs'
});

const FEELINGS = [
  { w: 'b0', s: 5 },
  { w: 'b1', s: 2 }
];

function buildProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl045-varids-'));
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify({ name: 'isl045 varids', version: '5', settings: { navigationPathType: 'path' }, structure: { componentsDir: 'components', assetsDir: 'assets' } }, null, 2)
  );
  component(dir, 'App', 'visual', [
    { id: 'a_root', type: 'Group', label: 'App', parameters: { flexDirection: 'column' }, children: ['a_router'] },
    { id: 'a_router', type: 'Router', label: 'Router', parent: 'a_root', parameters: { name: 'Main', pages: { startPage: '/Pages/Home', routes: ['/Pages/Home'] } } }
  ]);
  component(
    dir,
    'UI/Row',
    'visual',
    [
      { id: 'r_text', type: 'Text', label: 'Word', parameters: { text: '?' } },
      { id: 'r_in', type: 'Component Inputs', label: 'Inputs', ports: [{ name: 'w', plug: 'output', type: 'string' }] }
    ],
    [wire('r_in', 'w', 'r_text', 'text')]
  );
  component(
    dir,
    'Pages/Home',
    'page',
    [
      { id: 'h_page', type: 'Page', label: 'Home', parameters: { title: 'Var ids', urlPath: '' }, children: ['h_root'] },
      { id: 'h_root', type: 'Group', label: 'Root', parent: 'h_page', parameters: { flexDirection: 'column' }, children: ['h_rows', 'h_json'] },
      { id: 'h_rows', type: 'For Each', label: 'Rows', parent: 'h_root', parameters: { templateType: 'explicit', template: '/UI/Row' } },
      { id: 'h_json', type: 'Text', label: 'Read back', parent: 'h_root', parameters: { text: '' } },
      {
        id: 'h_make',
        type: 'JavaScriptFunction',
        label: 'The feelings',
        parameters: { functionScript: `Outputs.items = ${JSON.stringify(FEELINGS)};\nOutputs.go();` },
        // as the door writes them: a signal output is declared, or `Outputs.go` is no function at play
        ports: [port('out-items', 'output', '*'), port('out-go', 'output', 'signal')]
      },
      { id: 'h_set', type: 'Set Variable', label: 'Keep them', parameters: { name: 'feelings', setWith: 'array' } },
      { id: 'h_var', type: 'Variable2', label: 'The feelings', parameters: { name: 'feelings' } },
      {
        id: 'h_read',
        type: 'JavaScriptFunction',
        label: 'Read back',
        parameters: { functionScript: "Outputs.text = 'READ ' + JSON.stringify(Inputs.items);" },
        ports: [port('in-items', 'input', '*'), port('out-text', 'output', '*')]
      }
    ],
    [
      wire('h_make', 'out-items', 'h_set', 'value'),
      wire('h_make', 'out-go', 'h_set', 'do'),
      wire('h_var', 'value', 'h_rows', 'items'),
      wire('h_var', 'value', 'h_read', 'in-items'),
      wire('h_read', 'out-text', 'h_json', 'text')
    ]
  );
  fs.writeFileSync(path.join(dir, 'components', '_registry.json'), JSON.stringify({ version: 1, components: registry }, null, 2));
  return dir;
}

describe('P78-TPL011-VARIDS — an array of plain objects kept in a Variable, read back', () => {
  const R: Record<string, unknown> = {};

  beforeAll(async () => {
    await withRenderedPage({ projectDir: buildProject() }, async (page) => {
      try {
        R.shown = await until('rows and read-back drawn', () => text(page), (s) => s.includes('b1') && s.includes('READ '), 20_000);
        await wait(1000);
        R.shownLater = await text(page);
        R.variables = await page.evaluate(
          `(function () { try { return JSON.stringify(window.Noodl && Noodl.Variables && Noodl.Variables.feelings); } catch (e) { return 'threw ' + e.message; } })()`
        );
      } catch (error) {
        R.driveError = error instanceof Error ? error.message : String(error);
        R.shown = `${await text(page).catch(() => '')}\n--- log ---\n${page.serverLog().slice(-3000)}`;
      }
      R.consoleErrors = [...page.consoleErrors];
    });
    console.log(`VARIDS reading: ${JSON.stringify(R, null, 1)}`);
  });

  it('the drive reached the reading (the rows drew, the read-back ran)', () => {
    expect(R.driveError).toBeUndefined();
  });

  it('the read-back is recorded (the measurement, not yet a verdict — the row needs a ruling)', () => {
    expect(String(R.shownLater)).toContain('READ ');
  });
});
