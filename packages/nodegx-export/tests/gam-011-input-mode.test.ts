/**
 * GAM-011 (a) AC6 — a Text Input's Input Mode and Enter Key Hint survive the export.
 *
 * The runtime puts both on the `<input>` (and `<textarea>`) as `inputmode` / `enterkeyhint`, and
 * leaves them off when unset. Before this, the export dropped both with a note ("has no style/content
 * mapping"), so an exported quiz lost its number keypad.
 *
 * An authored keyword prints as the attribute. React types both attributes as a union of keywords, so
 * a **wired** value cannot be printed as a `string`: it is refused by name, never emitted as code the
 * app would not compile. The emitted app is typechecked to prove the printed form compiles.
 *
 * The project is written to a temp directory, not `tests/fixtures`, because several suites walk every
 * fixture there.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';

const TEXT_INPUT = 'net.noodl.controls.textinput';

function writeProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gam-011-keypad-'));
  const write = (rel: string, value: unknown) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), JSON.stringify(value, null, 2));
  };
  write('nodegx.project.json', {
    $schema: 'https://opennoodl.dev/schemas/project-v2.json',
    name: 'Keypad',
    id: 'gam-011-keypad',
    version: '4',
    nodegxVersion: '1.1.0',
    settings: { htmlTitle: 'Keypad', navigationPathType: 'path' },
    structure: { componentsDir: 'components', assetsDir: 'assets' }
  });
  write('components/_registry.json', {
    $schema: 'https://opennoodl.dev/schemas/registry-v2.json',
    version: 1,
    lastUpdated: '2026-09-17T00:00:00.000Z',
    components: {
      App: { path: 'App', type: 'root', nodeCount: 2, connectionCount: 0 },
      'Components/Field': { path: 'Components/Field', type: 'visual', nodeCount: 2, connectionCount: 1 },
      'Pages/Home': { path: 'Pages/Home', type: 'page', nodeCount: 7, connectionCount: 1 }
    },
    stats: { totalComponents: 3, totalNodes: 11, totalConnections: 2 }
  });
  write('components/App/component.json', { $schema: 'https://opennoodl.dev/schemas/component-v2.json', id: 'c_app', name: '/App', path: 'App', type: 'root' });
  write('components/App/nodes.json', {
    $schema: 'https://opennoodl.dev/schemas/nodes-v2.json',
    componentId: 'c_app',
    version: 1,
    nodes: [
      { id: 'app_group', type: 'Group', label: 'App Root', children: ['app_router'] },
      {
        id: 'app_router',
        type: 'Router',
        label: 'Main Router',
        parent: 'app_group',
        parameters: { name: 'Main', pages: { startPage: '/Pages/Home', routes: ['/Pages/Home'] } }
      }
    ],
    visualRoots: ['app_group']
  });
  write('components/App/connections.json', { $schema: 'https://opennoodl.dev/schemas/connections-v2.json', componentId: 'c_app', version: 1, connections: [] });
  // A component whose Input Mode arrives on a typed `string` input: a source the emitter CAN bind,
  // so it reaches the attribute table, where a keyword union cannot take a `string`.
  write('components/Components/Field/component.json', {
    $schema: 'https://opennoodl.dev/schemas/component-v2.json',
    id: 'c_field',
    name: '/Components/Field',
    path: 'Components/Field',
    type: 'visual'
  });
  write('components/Components/Field/nodes.json', {
    $schema: 'https://opennoodl.dev/schemas/nodes-v2.json',
    componentId: 'c_field',
    version: 1,
    nodes: [
      { id: 'field', type: TEXT_INPUT, label: 'Field', parameters: { placeholder: 'Field' } },
      { id: 'fieldInputs', type: 'Component Inputs', label: 'Field properties', ports: [{ name: 'mode', plug: 'output', type: 'string', index: 0 }] }
    ],
    visualRoots: ['field']
  });
  write('components/Components/Field/connections.json', {
    $schema: 'https://opennoodl.dev/schemas/connections-v2.json',
    componentId: 'c_field',
    version: 1,
    connections: [{ fromId: 'fieldInputs', fromProperty: 'mode', toId: 'field', toProperty: 'inputMode' }]
  });
  write('components/Pages/Home/component.json', {
    $schema: 'https://opennoodl.dev/schemas/component-v2.json',
    id: 'c_home',
    name: '/Pages/Home',
    path: 'Pages/Home',
    type: 'page'
  });
  write('components/Pages/Home/nodes.json', {
    $schema: 'https://opennoodl.dev/schemas/nodes-v2.json',
    componentId: 'c_home',
    version: 1,
    nodes: [
      { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Keypad' }, children: ['layout'] },
      { id: 'layout', type: 'Group', label: 'Layout', parent: 'page', children: ['answer', 'note', 'plain', 'wired', 'placed'] },
      { id: 'answer', type: TEXT_INPUT, label: 'Answer', parent: 'layout', parameters: { placeholder: 'Answer', inputMode: 'decimal', enterKeyHint: 'next' } },
      { id: 'note', type: TEXT_INPUT, label: 'Note', parent: 'layout', parameters: { type: 'textArea', inputMode: 'none', enterKeyHint: 'send' } },
      { id: 'plain', type: TEXT_INPUT, label: 'Plain', parent: 'layout', parameters: { placeholder: 'Plain' } },
      { id: 'wired', type: TEXT_INPUT, label: 'Wired', parent: 'layout', parameters: { placeholder: 'Wired' } },
      { id: 'placed', type: '/Components/Field', label: 'Placed field', parent: 'layout', parameters: { mode: 'numeric' } },
      { id: 'mode', type: 'String', label: 'Mode', parameters: { value: 'numeric' } }
    ],
    visualRoots: ['page']
  });
  write('components/Pages/Home/connections.json', {
    $schema: 'https://opennoodl.dev/schemas/connections-v2.json',
    componentId: 'c_home',
    version: 1,
    connections: [{ fromId: 'mode', fromProperty: 'value', toId: 'wired', toProperty: 'inputMode' }]
  });
  return dir;
}

const catalog = loadCatalog();
const dir = writeProject();
const app = emitApp(parseProject(dir, catalog), catalog);
const home = app.files['src/pages/Home.tsx'] ?? '';
const inputLine = (placeholder: string) => home.split('\n').find((line) => line.includes(`placeholder="${placeholder}"`)) ?? '';

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('GAM-011 (a) AC6 — Input Mode and Enter Key Hint at the export', () => {
  test('the page was emitted (known-firing: the rows below read a real file)', () => {
    expect(home).toContain('placeholder="Answer"');
  });

  test('authored keywords print as the attributes', () => {
    expect(inputLine('Answer')).toContain('inputMode="decimal"');
    expect(inputLine('Answer')).toContain('enterKeyHint="next"');
    expect(home).toContain('inputMode="none" enterKeyHint="send"');
  });

  test('unset prints neither, so every existing field exports as before', () => {
    expect(inputLine('Plain')).not.toMatch(/inputMode|enterKeyHint/);
  });

  test('the old "no style/content mapping" drop is gone for both', () => {
    const notes = app.notes.join('\n');
    expect(notes).not.toContain('parameter inputMode on answer has no style/content mapping');
    expect(notes).not.toContain('parameter enterKeyHint on answer has no style/content mapping');
  });

  test('a wired Input Mode is refused by name, and nothing is printed for it', () => {
    expect(inputLine('Wired')).not.toContain('inputMode');
    expect(app.notes.join('\n')).toMatch(/wire mode:value->wired:inputMode .*deferred/);
  });

  test('an Input Mode on a typed string component input is refused by name, not printed as a string', () => {
    const field = app.files['src/components/Field.tsx'] ?? '';
    expect(field).toContain('placeholder="Field"'); // known-firing: the component was emitted
    expect(field).not.toMatch(/inputMode=/);
    expect(app.notes.join('\n')).toContain('wire into field.inputMode is not an authored keyword');
  });

  test('the emitted app compiles', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});
