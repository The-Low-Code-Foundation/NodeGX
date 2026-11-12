import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { Desk } from './helpers/root-desk';
import { writeRelayDesk } from './helpers/relay-desk';
import { STORE_KEY, writeStoreDesk } from './helpers/store-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * A persisted store travels, and so does the write idiom over it (P18 session 139, BOARD lane 6, EXP-021 AC4).
 *
 * Before: a Global Store whose declarer authors Persist was refused whole ("a declarer authors persist — browser-storage
 * rehydration is not translatable"). rocket-school, star-class and bot-garden keep their whole app in one (`/Logic/App
 * store`), so every page's `app` was drawn from nothing: 51 report lines, and 106 more wires "not lifted by /Logic/App
 * store" (`dev-docs/tasks/phase-18-code-export-v2/s139-persisted-store/`).
 *
 * Now the store module loads `noodl_store_<Storage Key>` over its initial state and saves every change on the next turn
 * (`src/lib/persistStore.ts`, globalstore.ts transcribed). Opening it made the idiom around it reachable, and four things
 * in it are built here:
 *
 * - a Subscribe's untyped key is handed on through a logic component's output (§10's binding rule: the sink decides);
 * - several placed components' values into one input are one row they all write — last-writer-wins, by when each changed
 *   (before, the last one placed bound the input and the others were set and never read: App store wrote Delete's value
 *   when Save sent the pulse);
 * - a placed component's value straight into a component's own output is passed on (the Editor's `items`);
 * - a pulse whose value the export does not deliver is refused by name (the Header's `write` with its refused `app`) —
 *   before, it ran on what the input last held, and over a persisted store that is the player's data.
 *
 * §A the Store Desk (`helpers/store-desk.ts`) on both arms, with the browser's storage seeded and read, predicted first in
 * `s139-persisted-store/EXPECTED.md`. §B what is emitted. §C the plan. §D typecheck. §E rocket-school.
 */

const catalog: Catalog = loadCatalog();
type Readings = string[][];

/** One arm in a child process; an arm that throws reads as one reading per scenario holding the error, so rows fail by name. */
const childArm = (helper: string, input: Array<Record<string, unknown> & { scenarios: string[][] }>, env: Record<string, string> = {}): Readings[][] => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', helper)], {
        input: JSON.stringify(input),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, ...env }
      })
    );
  } catch (e) {
    const said = String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0];
    return input.map((project) => project.scenarios.map(() => [[`the ${helper} arm threw: ${said}`]]));
  }
};
const writeApp = (app: EmittedApp): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'store-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;
/** A file the export did not write reads '' — at describe time a throw would fail the suite and grade no row by name (s120). */
const fileOf = (app: EmittedApp, pattern: RegExp): string => Object.entries(app.files).find(([f]) => pattern.test(f))?.[1] ?? '';
const reportOf = (app: EmittedApp): string => app.files['EXPORT-REPORT.md'] ?? '';

const stored = (items: string[] | null) => `storage=${items === null ? 'null' : JSON.stringify({ app: { items } })}`;
/** As `s139-persisted-store/EXPECTED.md` predicted it, before either arm ran: the line, then what is stored. */
const FRESH: Readings = [
  ['none', stored(null)],
  ['w0', stored(['w0'])],
  ['w0', stored(['w0'])],
  ['w0,w1', stored(['w0', 'w1'])],
  ['w1', stored(['w1'])],
  ['w1,w1', stored(['w1', 'w1'])]
];
const KEPT: Readings = [
  ['kept', stored(['kept'])],
  ['kept,w0', stored(['kept', 'w0'])]
];
const SCENARIOS = [['Save', 'Next', 'Save', 'Drop', 'Save'], ['Save']];
const STORAGE = { keys: [STORE_KEY], seeds: [{}, { [STORE_KEY]: JSON.stringify({ app: { items: ['kept'] } }) }] };
const RUNTIME_ENV = { RUNTIME_ARM_URL: 'http://localhost/' };

const desk = writeStoreDesk();
const app = emitDir(desk.dir);
const runtime = childArm('runtime-mounted-arm.js', [{ dir: desk.dir, scenarios: SCENARIOS, storage: STORAGE }], RUNTIME_ENV);
const exported = childArm('export-react-arm.js', [{ dir: writeApp(app), scenarios: SCENARIOS, settled: true, ticks: 2, storage: STORAGE }]);

const bad = writeStoreDesk({ bad: true });
const badApp = emitDir(bad.dir);
const BAD_STEPS = [['Save', 'Bad write', 'Save'], ['Bad write']];
const BAD_STORAGE = STORAGE;
const badRuntime = childArm('runtime-mounted-arm.js', [{ dir: bad.dir, scenarios: BAD_STEPS, storage: BAD_STORAGE }], RUNTIME_ENV);
const badExported = childArm('export-react-arm.js', [{ dir: writeApp(badApp), scenarios: BAD_STEPS, settled: true, ticks: 2, storage: BAD_STORAGE }]);

describe('§A the emitted app keeps what the runtime keeps, step by step', () => {
  it('A1 the desk: the runtime reads what EXPECTED.md says, with nothing stored and with a stored copy (the arm grades the runtime first)', () => {
    expect(runtime[0]).toEqual([FRESH, KEPT]);
  });

  it('A2 the desk: the export reads exactly what the runtime reads, the line and the stored JSON, at every step', () => {
    expect(exported[0]).toEqual(runtime[0]);
  });

  it('A3 nothing stored and no initial state: nothing is written at load, in either arm', () => {
    expect(exported[0][0][0]).toEqual(['none', stored(null)]);
  });

  it('A4 a stored copy is what the first render reads, and is written back as it was', () => {
    expect(exported[0][1][0]).toEqual(['kept', stored(['kept'])]);
  });

  it("A5 two placed components' values into one input: the one that changed last is written (Drop after Add, Add after Drop)", () => {
    expect(exported[0][0].slice(3).map((r) => r[0])).toEqual(['w0,w1', 'w1', 'w1,w1']);
  });

  it('A6 a value passed straight through a component\'s output arrives with the pulse sent after it (the Editor\'s word, on Save)', () => {
    expect(exported[0][0][3][0]).toBe('w0,w1');
  });

  it('A7 Bad: the runtime writes the app its Function sent last (read: badA; EXPECTED.md predicted bad — the order the export refuses to guess)', () => {
    expect(badRuntime[0][0].map((r) => r[0])).toEqual(['none', 'w0', 'badA', 'badA,w0']);
  });

  it('A8 Bad: the export does not write Bad\'s pulse on the value the input last held — the store keeps w0, as predicted', () => {
    expect(badExported[0][0]).toEqual([
      ['none', stored(null)],
      ['w0', stored(['w0'])],
      ['w0', stored(['w0'])],
      ['w0,w0', stored(['w0', 'w0'])]
    ]);
  });

  it('A9 Bad, over a stored copy, first thing: the runtime writes Bad\'s app; the export keeps the copy (unrefused, it wrote the row\'s undefined)', () => {
    expect(badRuntime[0][1]).toEqual([
      ['kept', stored(['kept'])],
      ['badA', stored(['badA'])]
    ]);
    expect(badExported[0][1]).toEqual([
      ['kept', stored(['kept'])],
      ['kept', stored(['kept'])]
    ]);
  });
});

describe('§B what is emitted', () => {
  const home = fileOf(app, /pages\/Home\.tsx$/);
  const storeModule = fileOf(app, /stores\/desk\.ts$/);
  const lib = fileOf(app, /lib\/persistStore\.ts$/);
  const editor = fileOf(app, /components\/Editor\.tsx$/);

  it('B1 the store module loads and saves under the runtime\'s key: `persistStore(desk, \'store-desk\')`, the prefix `noodl_store_`', () => {
    expect(storeModule).toContain("import { persistStore } from '../lib/persistStore';");
    expect(storeModule).toContain("persistStore(desk, 'store-desk');");
    expect(lib).toContain("const STORAGE_KEY_PREFIX = 'noodl_store_';");
    expect(lib).toContain('target.subscribe(schedulePersist);');
    expect(lib).toContain('timer = setTimeout(persistNow, 0)');
  });

  it('B2 a store with Persist off imports no persistence, and the app gets no lib for it', () => {
    const plain = emitDir(
      writeStoreDesk({
        edit: (d: Desk) => {
          const store = d.components['Logic/Store'].nodes.find((n) => n.id === 'stStore')!;
          store.parameters = { storeName: 'desk' };
        }
      }).dir
    );
    expect(fileOf(plain, /stores\/desk\.ts$/)).not.toContain('persistStore');
    expect(Object.keys(plain.files).some((f) => f.endsWith('lib/persistStore.ts'))).toBe(false);
  });

  it('B3 the two feeds of Store\'s `app` write one row, by its own setter; Store reads that row', () => {
    expect(home).toMatch(/useStoreLogic\(\{\n {4}write: \{ sent: theStoreWriteDelivered, taken: theStoreWriteTaken \},\n {4}app: app2,/);
    expect(home.match(/onAppChanged: setApp2,/g)).toHaveLength(2);
  });

  // P18-S141-PASSLATE (session 141): the pass-through forwards the Editor's own callback; s139's row and push effect
  // reached the page one commit after a pulse the same run sends (the Header Desk's Solo wrote `undefined` over the store).
  it('B4 the Editor passes its Word\'s word on: a prop, handed straight to the Word (no row, no push effect of its own)', () => {
    expect(editor).toContain('onWordChanged?: (value: string | undefined) => void;');
    expect(editor).toContain('useWord({ n: countNextOut?.n, onWordChanged });');
    expect(editor).not.toContain('onWordChanged?.(');
    expect(home).toContain('<Editor onWordChanged={setWord} onSave={() => setAddRunPulses((v) => v + 1)} />');
  });

  it('B5 a logic component called Store is `useStoreLogic`: `useStore` is the import it would shadow (P18-S139-HOOKNAME)', () => {
    const text = fileOf(app, /components\/Store\.tsx$/);
    expect(text).toContain("import { useStore } from '@nodegx/core/react';");
    expect(text).toContain('export function useStoreLogic(');
    expect(text).toContain('const deskApp = useStore(desk, (s) => s.app);');
  });
});

describe('§C the plan', () => {
  it('C1 a Subscribe\'s untyped key lifts through the logic component\'s output', () => {
    expect(planOf(desk.dir, '/Logic/Store').liftedOutputProps.map((l) => l.port)).toEqual(['app']);
  });

  it('C2 Bad\'s write is refused by name, and its value with it', () => {
    const report = reportOf(badApp);
    expect(report).toContain(
      'wire bad:write->store:write dropped: the placed component that sends it also hands this one its "app", which the export does not deliver (instance output "app" is not lifted by /Form/Bad — its feed defers there) — the pulse would run on what that input last held'
    );
  });

  it('C3 a wired Persist, a wired Storage Key, and two declarers that disagree are refused by name', () => {
    const wired = (port: string) =>
      emitDir(
        writeStoreDesk({
          edit: (d: Desk) => {
            const g = d.components['Logic/Store'];
            g.nodes.find((n) => n.id === 'stIn')!.ports!.push({ name: 'keep', plug: 'output', type: port === 'persist' ? 'boolean' : 'string' });
            g.connections.push({ fromId: 'stIn', fromProperty: 'keep', toId: 'stStore', toProperty: port });
          }
        }).dir
      );
    expect(reportOf(wired('persist'))).toContain("a declarer's Persist is wired — whether the store is kept is decided at run time");
    expect(reportOf(wired('storageKey'))).toContain("a declarer's Storage Key is wired — where the store is kept is decided at run time");
    const twice = emitDir(
      writeStoreDesk({
        edit: (d: Desk) => {
          d.components['Logic/Show'].nodes.push({ id: 'shStore', type: 'net.noodl.GlobalStore', label: 'Elsewhere', parameters: { storeName: 'desk', persist: true, storageKey: 'other' } });
        }
      }).dir
    );
    expect(reportOf(twice)).toContain('its declarers disagree about Persist or Storage Key — which one holds depends on which component mounts first');
  });

  it("C5 the pass-through is decided before the page reads it, whatever the project's order: the Editor at Zz/Editor, after Pages/Home", () => {
    const later = emitDir(
      writeStoreDesk({
        edit: (d: Desk) => {
          d.components['Zz/Editor'] = d.components['Form/Editor'];
          delete d.components['Form/Editor'];
          d.components['Pages/Home'].nodes.find((n) => n.id === 'editor')!.type = '/Zz/Editor';
        }
      }).dir
    );
    expect(fileOf(later, /pages\/Home\.tsx$/)).toContain('<Editor onWordChanged={setWord} onSave={() => setAddRunPulses((v) => v + 1)} />');
    expect(reportOf(later)).not.toContain('wire editor:save->add:run dropped');
  });

  it("C6 a sender's output nothing feeds is undefined in the runtime too: its pulse is not refused (the Relay Desk's control, P18-S130-UNDEFTEXT's)", () => {
    const control = emitDir(
      writeRelayDesk((d: Desk) => {
        const list = d.components['Components/List'];
        list.connections = list.connections.filter((c) => !c.fromProperty.startsWith('itemOutput-'));
      }).dir
    );
    expect(reportOf(control)).not.toContain('the pulse would run on what that input last held');
  });

  it('C4 a Storage Key left empty keeps the store under its own name, as the runtime does', () => {
    const named = emitDir(
      writeStoreDesk({
        edit: (d: Desk) => {
          d.components['Logic/Store'].nodes.find((n) => n.id === 'stStore')!.parameters = { storeName: 'desk', persist: true };
        }
      }).dir
    );
    expect(fileOf(named, /stores\/desk\.ts$/)).toContain("persistStore(desk, 'desk');");
  });
});

describe('§D the emitted apps typecheck', () => {
  it('D1 the desk and its Bad variant typecheck as their own `tsc -b` would', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
    expect(typecheckEmittedApp(badApp)).toEqual([]);
  });
});

describe('§E rocket-school', () => {
  const rocket = emitDir(path.join(__dirname, '..', '..', '..', 'templates', 'rocket-school'));
  const lists = fileOf(rocket, /pages\/Lists\.tsx$/);
  const report = reportOf(rocket);

  it('E1 its App store is kept where the runtime keeps it, and every page is handed `app`', () => {
    expect(fileOf(rocket, /stores\/rocket\.ts$/)).toContain("persistStore(rocket, 'rocket-school');");
    expect(report).not.toContain('browser-storage rehydration');
    expect(report).not.toContain('is not lifted by /Logic/App store');
  });

  it('E2 the Lists page: Save\'s and Delete\'s `app` are one row, the one App store writes', () => {
    expect(lists).toMatch(/useAppStore\(\{\n {4}write: \{ sent: theStoreWriteDelivered, taken: theStoreWriteTaken \},\n {4}app: app2,/);
    expect(lists.match(/onAppChanged: setApp2,/g)).toHaveLength(2);
  });

  it('E3 the Lists page: the Editor\'s `items` reaches Save question set, and Save runs', () => {
    expect(lists).toMatch(/useSaveQuestionSet\(\{\n {4}run: \{ sent: saveTheListRunDelivered, taken: saveTheListRunTaken \},\n {4}app,\n {4}setId,\n {4}name: name2,\n {4}items,/);
    expect(report).not.toContain('wire lsEditor:save->lsSave:run dropped');
  });

  // Session 141: the Header's three feeds are forwarded (`a-header-writes-the-store.test.ts`); s139 refused its write here.
  it('E4 the Header\'s write is no longer refused on the 8 pages that place it: its `app` is handed on, so the pulse has its value', () => {
    expect(report.match(/wire \w+Header:write->\w+Store:write dropped/g)).toBeNull();
    expect(report).not.toContain('two wires feed value output "app"');
  });

  it('E5 the emitted app typechecks', () => {
    expect(typecheckEmittedApp(rocket)).toEqual([]);
  });

  it("E7 todo-list's project lists: each list's `projectId` writes the three rows five lists feed through one stable callback, and the app typechecks", () => {
    const todo = emitDir(path.join(__dirname, '..', '..', '..', 'templates', 'todo-list'));
    expect(fileOf(todo, /components\/View\.tsx$/)).toContain(
      // Session 141: View's own `projectId` output (five feeds) is forwarded too, so the callback writes it first.
      'const onProjectIdChangedPvList = useCallback((value: string | undefined) => { onProjectIdChanged?.(value); setProjectId(value); setProjectId2(value); setProjectId3(value); }, [onProjectIdChanged]);'
    );
    expect(typecheckEmittedApp(todo)).toEqual([]);
  });

  it("E6 bot-garden typechecks: its `renderer` state machine beside its persisted store's `renderer` key (TS2451 once the store was emitted)", () => {
    expect(typecheckEmittedApp(emitDir(path.join(__dirname, '..', '..', '..', 'templates', 'bot-garden')))).toEqual([]);
  });
});
