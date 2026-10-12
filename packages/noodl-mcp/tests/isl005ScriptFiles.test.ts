/**
 * P109 ISL-005 AC8 (+ ISL-020's edit shape) — the door to a project's script files.
 *
 * Through `createServer()` in-process: an agent writes a shared file and a Function that uses it, and
 * the write passes; a Function naming a file that does not exist is refused with the name. Then the
 * rest of the door: reading part of a big file, changing one line by find-and-replace with the count
 * it expects, and deleting a file nothing uses any more.
 */
import * as fs from 'fs';
import * as path from 'path';

import { call, connect, copyFixture, type TestSession } from './helpers';
import type { FindToolsResponse } from '../src/tools/responses';

interface Diagnostic {
  code: string;
  severity: string;
  message: string;
  suggestion?: string;
  location: { component: string; nodeId?: string; port?: string };
}

const TILES = [
  "var BLOCKING = { W: 1, R: 1 };",
  '',
  'exports.canStep = function (tile) {',
  '  return !BLOCKING[tile];',
  '};',
  ''
].join('\n');

const STEPPER = ["var tiles = use('engine/tiles');", '', 'exports.step = function (tile) {', "  return tiles.canStep(tile) ? 'moved' : 'stayed';", '};', ''].join(
  '\n'
);

const fn = (id: string, uses: unknown, script = 'Outputs.answer = Scripts.tiles.canStep("G");') => ({
  id,
  type: 'JavaScriptFunction',
  label: id,
  parameters: { functionScript: script, uses }
});

const SCRIPT_TOOLS = ['list_script_files', 'get_script_file', 'write_script_file', 'edit_script_file', 'delete_script_file'];

describe('ISL-005 — the door to script files', () => {
  let s: TestSession;
  const file = (rel: string) => path.join(s.projectDir, 'scripts', ...rel.split('/'));

  beforeEach(async () => {
    s = await connect(copyFixture());
    await call<FindToolsResponse>(s, 'find_tools', { group: 'project' });
  });

  afterEach(async () => {
    await s.close();
    fs.rmSync(s.projectDir, { recursive: true, force: true });
  });

  it('find_tools reaches every script tool from the words a model types for it', async () => {
    for (const query of ['script', 'shared code', 'engine']) {
      const fresh = await connect(copyFixture());
      try {
        const found = await call<FindToolsResponse>(fresh, 'find_tools', { query });
        expect({ query, revealed: SCRIPT_TOOLS.filter((t) => found.data.revealed.includes(t)) }).toEqual({ query, revealed: SCRIPT_TOOLS });
      } finally {
        await fresh.close();
        fs.rmSync(fresh.projectDir, { recursive: true, force: true });
      }
    }
  });

  it('AC8 — a shared file and a Function that uses it: both writes pass, and the file is on disk once', async () => {
    const written = await call<{ ok: boolean; path: string; created: boolean }>(s, 'write_script_file', {
      path: 'engine/tiles',
      content: TILES
    });
    expect(written.isError).toBeFalsy();
    expect(written.data).toEqual(expect.objectContaining({ ok: true, path: 'engine/tiles.js', created: true }));
    expect(fs.readFileSync(file('engine/tiles.js'), 'utf8')).toBe(TILES);

    const created = await call(s, 'create_component', { path: '/Logic/Step', nodes: [fn('step', 'engine/tiles.js')] });
    expect(created.isError).toBeFalsy();

    const report = (await call<{ diagnostics: Diagnostic[] }>(s, 'validate_component', { path: '/Logic/Step' })).data;
    expect(report.diagnostics.filter((d) => d.code.startsWith('function-uses'))).toEqual([]);
  });

  // Since slice 7 put `uses` in the enriched catalog, the door's stringlist rule reads it: an array is refused with the
  // comma string to write instead, as for every stringlist (the editor's generic list paths call .split(",") on it).
  it('uses written as an array is refused with the comma string to write instead; the comma string passes', async () => {
    await call(s, 'write_script_file', { path: 'engine/tiles.js', content: TILES });
    const array = await call(s, 'create_component', { path: '/Logic/Step', nodes: [fn('step', ['engine/tiles.js'])] });
    expect(array.isError).toBe(true);
    expect(JSON.stringify(array.data)).toContain('a stringlist is one comma-separated string, not an array');
    expect(JSON.stringify(array.data)).toContain('engine/tiles.js');
    const created = await call(s, 'create_component', { path: '/Logic/Step', nodes: [fn('step', 'engine/tiles.js')] });
    expect(created.isError ? JSON.stringify(created.data) : 'accepted').toBe('accepted');
  });

  it('AC8 — a Function naming a file that does not exist is refused, with the name and the files there are', async () => {
    await call(s, 'write_script_file', { path: 'engine/tiles.js', content: TILES });
    const refused = await call<{ newErrors?: Diagnostic[]; diagnostics?: Diagnostic[] }>(s, 'create_component', {
      path: '/Logic/Step',
      nodes: [fn('step', 'engine/gone.js')]
    });
    expect(refused.isError).toBe(true);
    const text = JSON.stringify(refused.data);
    expect(text).toContain('function-uses-missing-script');
    expect(text).toContain('scripts/engine/gone.js');
    expect(text).toContain('engine/tiles.js');
  });

  it('two files with one name are refused at the write, not at the run', async () => {
    await call(s, 'write_script_file', { path: 'engine/world.js', content: 'exports.a = 1;' });
    await call(s, 'write_script_file', { path: 'maps/world.js', content: 'exports.a = 2;' });
    const refused = await call(s, 'create_component', {
      path: '/Logic/Step',
      nodes: [fn('step', 'engine/world.js,maps/world.js', 'Outputs.answer = Scripts.world.a;')]
    });
    expect(refused.isError).toBe(true);
    expect(JSON.stringify(refused.data)).toContain('function-uses-script-name-clash');
  });

  it('a file that does not compile is refused with its line, and nothing is written', async () => {
    const refused = await call<{ message?: string }>(s, 'write_script_file', {
      path: 'engine/tiles.js',
      content: 'var a = 1;\nvar b = 2;\nexports.f = function( {\n  return 1;\n};\n'
    });
    expect(refused.isError).toBe(true);
    expect(JSON.stringify(refused.data)).toMatch(/does not compile \(line \d+\)/);
    expect(fs.existsSync(file('engine/tiles.js'))).toBe(false);
  });

  it('a text that would close the wrapper early is refused, as the runtime refuses it', async () => {
    const refused = await call(s, 'write_script_file', { path: 'x.js', content: '}); globalThis.pwned = 1; (function () {' });
    expect(refused.isError).toBe(true);
    expect(fs.existsSync(file('x.js'))).toBe(false);
  });

  it('a path outside scripts/ is refused', async () => {
    for (const p of ['../nodegx.project.json', 'engine/../../x.js', '']) {
      const refused = await call(s, 'write_script_file', { path: p, content: 'exports.a = 1;' });
      expect({ p, isError: refused.isError }).toEqual({ p, isError: true });
    }
  });

  it('ISL-020 — one line changed by find-and-replace; a wrong count changes nothing and says what it found', async () => {
    await call(s, 'write_script_file', { path: 'engine/tiles.js', content: TILES });

    const wrong = await call<{ found?: number }>(s, 'edit_script_file', {
      path: 'engine/tiles.js',
      edits: [{ find: ': 1', replace: ': 0' }]
    });
    expect(wrong.isError).toBe(true);
    expect(JSON.stringify(wrong.data)).toContain('found 2');
    expect(fs.readFileSync(file('engine/tiles.js'), 'utf8')).toBe(TILES);

    const right = await call(s, 'edit_script_file', {
      path: 'engine/tiles.js',
      edits: [{ find: 'R: 1 }', replace: 'R: 1, G: 1 }' }]
    });
    expect(right.isError).toBeFalsy();
    expect(fs.readFileSync(file('engine/tiles.js'), 'utf8')).toBe(TILES.replace('R: 1 }', 'R: 1, G: 1 }'));

    const breaking = await call(s, 'edit_script_file', {
      path: 'engine/tiles.js',
      edits: [{ find: '};', replace: '' }]
    });
    expect(breaking.isError).toBe(true);
    expect(fs.readFileSync(file('engine/tiles.js'), 'utf8')).toBe(TILES.replace('R: 1 }', 'R: 1, G: 1 }'));
  });

  it('get_script_file reads a whole file or a range of lines', async () => {
    await call(s, 'write_script_file', { path: 'engine/tiles.js', content: TILES });
    const whole = await call<{ content: string; lines: number }>(s, 'get_script_file', { path: 'engine/tiles' });
    expect(whole.data.content).toBe(TILES);
    const part = await call<{ content: string; lines: number; from_line: number; to_line: number }>(s, 'get_script_file', {
      path: 'engine/tiles.js',
      from_line: 3,
      to_line: 4
    });
    expect(part.data).toEqual(expect.objectContaining({ lines: 6, from_line: 3, to_line: 4, content: 'exports.canStep = function (tile) {\n  return !BLOCKING[tile];' }));
  });

  it('list_script_files says what each file gives, uses, and which Functions use it', async () => {
    await call(s, 'write_script_file', { path: 'engine/tiles.js', content: TILES });
    await call(s, 'write_script_file', { path: 'engine/stepper.js', content: STEPPER });
    await call(s, 'create_component', {
      path: '/Logic/Step',
      nodes: [fn('step', 'engine/stepper.js', 'Outputs.answer = Scripts.stepper.step("G");')]
    });
    const listed = await call<{ files: Array<{ path: string; name: string; gives: string[]; uses: string[]; usedBy: string[] }> }>(
      s,
      'list_script_files'
    );
    expect(listed.data.files.map(({ path: p, name, gives, uses, usedBy }) => ({ p, name, gives, uses, usedBy }))).toEqual([
      { p: 'engine/stepper.js', name: 'Scripts.stepper', gives: ['step'], uses: ['engine/tiles.js'], usedBy: ['/Logic/Step / step'] },
      { p: 'engine/tiles.js', name: 'Scripts.tiles', gives: ['canStep'], uses: [], usedBy: [] }
    ]);
  });

  it('a file a Function uses cannot be deleted; once nothing uses it, it can', async () => {
    await call(s, 'write_script_file', { path: 'engine/tiles.js', content: TILES });
    await call(s, 'create_component', { path: '/Logic/Step', nodes: [fn('step', 'engine/tiles.js')] });
    const refused = await call(s, 'delete_script_file', { path: 'engine/tiles.js' });
    expect(refused.isError).toBe(true);
    expect(JSON.stringify(refused.data)).toContain('/Logic/Step / step');
    expect(fs.existsSync(file('engine/tiles.js'))).toBe(true);

    await call(s, 'delete_component', { path: '/Logic/Step' });
    const deleted = await call(s, 'delete_script_file', { path: 'engine/tiles.js' });
    expect(deleted.isError).toBeFalsy();
    expect(fs.existsSync(file('engine/tiles.js'))).toBe(false);
  });
});
