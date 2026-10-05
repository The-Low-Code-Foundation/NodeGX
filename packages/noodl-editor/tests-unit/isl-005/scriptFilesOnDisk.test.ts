/**
 * P109 ISL-005, slice 2 — a project's script files on disk: `scripts/**.js` read into the project on
 * open, written back file by file on save, and never written over when someone else changed them.
 *
 * Driven through the real `ProjectStructureService` over the in-memory filesystem the service's own
 * specs use, so the load and save are the editor's, not a re-statement of them.
 */
import { ProjectStructureService } from '../../src/editor/src/services/ProjectStructure';
import { ProjectImporter } from '../../src/editor/src/io/ProjectImporter';
import { MemFs } from '../../tests/services/ProjectStructure/memfs';
import { makeProject, seedV2Project } from '../../tests/services/ProjectStructure/fixtures';

const DIR = '/proj';
const WORLD = '/proj/scripts/engine/world.js';
const SAVE = '/proj/scripts/save.js';

function setup(files: Record<string, string> = { [WORLD]: 'exports.w = 1;\n', [SAVE]: 'exports.s = 1;\n' }) {
  const fs = new MemFs();
  seedV2Project(fs, DIR, makeProject());
  for (const [path, text] of Object.entries(files)) fs.files.set(path, text);
  return { fs, service: new ProjectStructureService(fs) };
}

/** Every write the service makes from here on, by the path it lands on. */
function recordWrites(fs: MemFs): string[] {
  const writes: string[] = [];
  const rename = fs.renameFile.bind(fs);
  fs.renameFile = async (from: string, to: string) => {
    writes.push(to);
    return rename(from, to);
  };
  return writes;
}

describe('ISL-005 — script files are read with the project', () => {
  test('every scripts/**.js arrives on the project as { path: source }', async () => {
    const { service } = setup();
    const { project } = await service.loadProject(DIR);
    expect(project.scripts).toEqual({ 'engine/world.js': 'exports.w = 1;\n', 'save.js': 'exports.s = 1;\n' });
  });

  test('a project with no scripts folder has no scripts key (it serialises as before)', async () => {
    const { service } = setup({});
    const { project } = await service.loadProject(DIR);
    expect('scripts' in project).toBe(false);
  });

  test('a file that is not .js is not a script', async () => {
    const { service } = setup({ [WORLD]: 'exports.w = 1;', '/proj/scripts/notes.md': '# notes' });
    const { project } = await service.loadProject(DIR);
    expect(Object.keys(project.scripts!)).toEqual(['engine/world.js']);
  });

  test('the importer carries scripts it is given, and nothing when it is given none', () => {
    const base = { project: { name: 'p', version: '4' }, registry: { components: {} }, components: {} } as never;
    expect(new ProjectImporter().import({ ...(base as object), scripts: { 'a.js': 'x' } } as never).project.scripts).toEqual({
      'a.js': 'x'
    });
    expect('scripts' in new ProjectImporter().import(base).project).toBe(false);
  });
});

describe('ISL-005 — script files are saved file by file', () => {
  test('known-firing control: an unchanged project writes no script', async () => {
    const { fs, service } = setup();
    const { project } = await service.loadProject(DIR);
    const writes = recordWrites(fs);
    const result = await service.saveProject(DIR, project);
    expect(result.result).toBe('success');
    expect(writes.filter((w) => w.includes('/scripts/'))).toEqual([]);
    expect(result.scriptsWritten).toBeUndefined();
  });

  test('an edit to one script writes that file only', async () => {
    const { fs, service } = setup();
    const { project } = await service.loadProject(DIR);
    const writes = recordWrites(fs);
    project.scripts = { ...project.scripts!, 'engine/world.js': 'exports.w = 2;\n' };
    const result = await service.saveProject(DIR, project);
    expect(result.scriptsWritten).toEqual(['engine/world.js']);
    expect(writes.filter((w) => w.includes('/scripts/'))).toEqual([WORLD]);
    expect(fs.files.get(WORLD)).toBe('exports.w = 2;\n');
    expect(fs.files.get(SAVE)).toBe('exports.s = 1;\n');
  });

  test('a new script creates its folder; a removed one is deleted', async () => {
    const { fs, service } = setup();
    const { project } = await service.loadProject(DIR);
    const scripts = { ...project.scripts! };
    delete scripts['save.js'];
    scripts['maps/island/tiles.js'] = 'exports.t = 1;';
    project.scripts = scripts;
    await service.saveProject(DIR, project);
    expect(fs.files.get('/proj/scripts/maps/island/tiles.js')).toBe('exports.t = 1;');
    expect(fs.files.has(SAVE)).toBe(false);
    expect(fs.files.get(WORLD)).toBe('exports.w = 1;\n');
  });

  test('a script someone else changed on disk is NOT written over, and the save says which', async () => {
    const { fs, service } = setup();
    const { project } = await service.loadProject(DIR);
    fs.files.set(WORLD, 'exports.w = "the agent wrote this";\n');
    project.scripts = { ...project.scripts!, 'engine/world.js': 'exports.w = "the editor wrote this";\n' };
    const result = await service.saveProject(DIR, project);
    expect(result.refusedScripts).toEqual(['engine/world.js']);
    expect(fs.files.get(WORLD)).toBe('exports.w = "the agent wrote this";\n');
  });

  test('reverted arm: with the guard\'s baseline forgotten, the same save writes over it', async () => {
    const { fs, service } = setup();
    const { project } = await service.loadProject(DIR);
    fs.files.set(WORLD, 'exports.w = "the agent wrote this";\n');
    // A save to another folder forgets this one's baselines — the "no baseline, nothing to clobber" escape.
    await service.saveProject('/elsewhere', project);
    project.scripts = { ...project.scripts!, 'engine/world.js': 'exports.w = "the editor wrote this";\n' };
    const result = await service.saveProject(DIR, project);
    expect(result.refusedScripts).toBeUndefined();
    expect(fs.files.get(WORLD)).toBe('exports.w = "the editor wrote this";\n');
  });

  test('a script someone else changed is not deleted either', async () => {
    const { fs, service } = setup();
    const { project } = await service.loadProject(DIR);
    fs.files.set(SAVE, 'exports.s = "changed";\n');
    const scripts = { ...project.scripts! };
    delete scripts['save.js'];
    project.scripts = scripts;
    const result = await service.saveProject(DIR, project);
    expect(result.refusedScripts).toEqual(['save.js']);
    expect(fs.files.get(SAVE)).toBe('exports.s = "changed";\n');
  });
});

describe('ISL-005 — an outside write to a script reaches the open editor (REL-009b for scripts)', () => {
  // Imported here, not at the top, so the two halves of this file read as two tasks.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ProjectFileWatcher, scriptPathFromRelativePath } = require('../../src/editor/src/services/ProjectFileWatcher');

  test.each([
    ['scripts/engine/world.js', 'engine/world.js'],
    ['scripts\\engine\\world.js', 'engine/world.js'],
    ['scripts/save.js', 'save.js'],
    ['scripts/engine/world.js.tmp-1-abc', null],
    ['scripts/notes.md', null],
    ['scripts/.cache/x.js', null],
    ['components/Home/nodes.json', null],
    ['save.js', null]
  ])('%s → %p', (relative, expected) => {
    expect(scriptPathFromRelativePath(relative)).toBe(expected);
  });

  test('the watcher batches script events into their own callback, apart from components', () => {
    let emit: (relative: string) => void = () => undefined;
    const timers: Array<() => void> = [];
    const watcher = new ProjectFileWatcher({
      watchFactory: (_dir: string, onEvent: (r: string) => void) => ((emit = onEvent), { close: () => undefined }),
      setTimeoutFn: (fn: () => void) => (timers.push(fn), timers.length),
      clearTimeoutFn: () => undefined
    });
    const seen: { components: string[][]; scripts: string[][] } = { components: [], scripts: [] };
    watcher.start(
      '/proj',
      (c: string[]) => seen.components.push(c),
      undefined,
      (s: string[]) => seen.scripts.push(s)
    );
    emit('scripts/engine/world.js');
    emit('scripts/engine/world.js');
    emit('components/Home/nodes.json');
    emit('scripts/save.js.tmp-9');
    timers[timers.length - 1]();
    expect(seen).toEqual({ components: [['Home']], scripts: [['engine/world.js']] });
  });

  async function opened() {
    const { fs, service } = setup();
    const { project } = await service.loadProject(DIR);
    return { fs, service, memory: { ...project.scripts! } };
  }

  test("an agent's write is adopted", async () => {
    const { fs, service, memory } = await opened();
    fs.files.set(WORLD, 'exports.w = "agent";\n');
    expect(await service.decideScriptReloads(DIR, ['engine/world.js'], memory)).toEqual({
      'engine/world.js': { action: 'reload', text: 'exports.w = "agent";\n' }
    });
  });

  test('known-firing control: our own save coming back is skipped', async () => {
    const { fs, service, memory } = await opened();
    memory['engine/world.js'] = 'exports.w = 2;\n';
    await service.saveProject(DIR, { ...(await service.loadProject(DIR)).project, scripts: memory });
    expect(fs.files.get(WORLD)).toBe('exports.w = 2;\n');
    expect(await service.decideScriptReloads(DIR, ['engine/world.js'], memory)).toEqual({
      'engine/world.js': { action: 'skip-unchanged' }
    });
  });

  test("the person's unsaved change is never thrown away for the agent's", async () => {
    const { fs, service, memory } = await opened();
    memory['engine/world.js'] = 'exports.w = "person, unsaved";\n';
    fs.files.set(WORLD, 'exports.w = "agent";\n');
    expect(await service.decideScriptReloads(DIR, ['engine/world.js'], memory)).toEqual({
      'engine/world.js': { action: 'refuse-dirty' }
    });
  });

  test('a new file from outside is adopted; a deleted one goes', async () => {
    const { fs, service, memory } = await opened();
    fs.files.set('/proj/scripts/new.js', 'exports.n = 1;');
    fs.files.delete(SAVE);
    expect(await service.decideScriptReloads(DIR, ['new.js', 'save.js'], memory)).toEqual({
      'new.js': { action: 'reload', text: 'exports.n = 1;' },
      'save.js': { action: 'reload', text: null }
    });
  });

  test('once adopted, the next save neither rewrites it nor refuses', async () => {
    const { fs, service } = await opened();
    const { project } = await service.loadProject(DIR);
    fs.files.set(WORLD, 'exports.w = "agent";\n');
    const decision = (await service.decideScriptReloads(DIR, ['engine/world.js'], project.scripts!))['engine/world.js'];
    expect(decision.action).toBe('reload');
    service.markScriptBaseline('engine/world.js', 'exports.w = "agent";\n');
    project.scripts = { ...project.scripts!, 'engine/world.js': 'exports.w = "agent";\n' };
    const writes = recordWrites(fs);
    const result = await service.saveProject(DIR, project);
    expect([result.refusedScripts, writes.filter((w) => w.includes('/scripts/'))]).toEqual([undefined, []]);
  });
});
