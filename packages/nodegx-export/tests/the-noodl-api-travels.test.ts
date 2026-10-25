import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { jsHostTraitsOf, jsNoodlUseOf, jsPurityDefer } from '../src/analyze/jsfun';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { FUNCTION_RUN_LIB_PATH } from '../src/emit/functionRunLib';
import { NOODL_LIB_PATH } from '../src/emit/noodlLib';
import { parseProject } from '../src/parse/parseProject';
import {
  ANN_SESSION,
  BAD_SCRIPT,
  COUNT_SCRIPT,
  GREET_SCRIPT,
  NOODL_DESK_APP_ID,
  NOODL_DESK_BACKEND,
  NOODL_DESK_ENDPOINT,
  REMEMBER_SCRIPT,
  SIGN_SCRIPT,
  WHO_SCRIPT,
  writeNoodlDesk
} from './helpers/noodl-desk';
import { Desk } from './helpers/root-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The Noodl API travels (P18 session 134, BOARD lane 6: EXP-020 with EXP-019 slice 1b, Richard's ruling of 2026-10-21).
 *
 * Before: a Function whose body read `Noodl.*` was refused whole ("reads the Noodl API — the runtime-coupled tier"), and
 * one that awaited at its top level was refused for it ("a run the export awaits before Success and Done is EXP-019 slice
 * 1b"): 79 front-end template Functions stood at the first, 42 of them at both (`s134-noodlapi/census.ts`).
 *
 * Now the export carries the members the front-end bodies read — `Records.query` (rows plain), `CloudFunctions.run`,
 * `Users.Current`, `Files.sign`, `Variables.<name>` (`src/lib/noodl.ts`, `jsNoodlUseOf`) — and refuses any other by its
 * name; a body that awaits runs in an `async` wrapper, its run hands back `settled`, Success and Done wait for it, and the
 * click's later wires do not (§90's `detached`). What it writes and sends after its first `await` arrives `late` (s133).
 *
 * §A the Noodl Desk (`helpers/noodl-desk.ts`, predicted in `s134-noodlapi/EXPECTED.md`): the emitted app rendered by real
 * React (`export-react-arm.js`) against the runtime's own nodes and the running app's own `Noodl`
 * (`runtime-mounted-arm.js`), both answered by one fake Parse backend (`fake-parse-backend.js`), signed in and signed out,
 * readings and wire traffic. §B the members one call at a time (`noodl-member-arm.js`): the runtime's `records.js` and the
 * viewer's API against the emitted `noodl.ts`, ~70 calls, outcomes and request bodies. §C what is emitted. §D the
 * classifier and the plan. §E typecheck.
 */

const catalog: Catalog = loadCatalog();
type Readings = string[][];
type Request = { method: string; path: string; body: unknown; appId: string | null; signedIn: boolean };
type ArmOut = { readings: Readings[]; requests: Request[][] };

const helper = (name: string) => path.join(__dirname, 'helpers', name);
const runChild = <T,>(name: string, input: unknown, env: Record<string, string> = {}): T | { error: string } => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [helper(name)], {
        input: JSON.stringify(input),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 180000,
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, ...env }
      })
    );
  } catch (e) {
    return { error: `the ${name} arm threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n').slice(0, 3).join(' ')}` };
  }
};
const writeApp = (app: EmittedApp): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'noodl-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy = '/Pages/Home'): ComponentPlan => planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;
const backendOf = (session: boolean) => ({
  spec: NOODL_DESK_BACKEND,
  appId: NOODL_DESK_APP_ID,
  endpoint: NOODL_DESK_ENDPOINT,
  ...(session ? { session: ANN_SESSION } : {})
});

const STEPS = ['Count open', 'Add one', 'Count open', 'Who am I', 'Refused', 'Bad filter', 'Sign', 'Remember', 'Reseed', 'Remember'];
const NAMES = ['hello', 'n', 'first', 'phase', 'phase2', 'seen', 'doneN', 'again', 'added', 'who', 'locked', 'bad', 'link', 'note'] as const;
type Cells = Partial<Record<(typeof NAMES)[number], string>>;
const row = (cells: Cells, from: string[]): string[] => NAMES.map((n, i) => cells[n] ?? from[i]);

/** As `s134-noodlapi/EXPECTED.md` predicted it, before either arm ran ("" where a wired Text has had no value). */
const expected = (signedIn: boolean): Readings => {
  const L0 = row({ hello: signedIn ? 'hello Ann' : 'hello nobody' }, ['', '', '', 'phase nothing', 'phase2 nothing', 'seen nothing', 'doneN nothing', '', '', '', '', '', '', 'note nothing']);
  const c1 = row(
    { n: '2', first: 't1|First|u1|2026-10-21T00:00:00.000Z|undefined', phase: 'started', phase2: 'counted', seen: 'clicked', doneN: '2', again: signedIn ? 'again Ann' : 'again nobody' },
    L0
  );
  const a1 = row({ added: 'added Fourth' }, c1);
  const c2 = row({ n: '3', doneN: '3' }, a1);
  const w1 = row({ who: signedIn ? 'Ann admin / ann@x.test ann u1 object' : 'nobody / signed out' }, c2);
  const l1 = row({ locked: 'refused: Not for you. (141) body' }, w1);
  const b1 = row({ bad: 'string: A filter must have exactly one key / Error: Permission denied for Locked.' }, l1);
  const s1 = row({ link: 'signed http://files.test/photo.png?exp=1&sig=abc 2026-10-22T00:00:00.000Z 3600 / refused 403 This file is private.' }, b1);
  const r1 = row({ note: 'kept S1' }, s1);
  return [L0, c1, a1, c2, w1, l1, b1, s1, r1, r1, row({ note: 'kept S2' }, r1)];
};

/**
 * P18-S122-TEXTDEFAULT (filed, open): a wired Text with no text of its own shows the word "Text" in the running app until
 * its wire delivers, and nothing in the export. The desk's Texts that read a Function's output directly are such Texts.
 */
const withTextDefault = (rows: Readings): Readings =>
  rows.map((r) => r.map((c, i) => (c === '' && ['n', 'first', 'again', 'added', 'who', 'locked', 'bad', 'link'].includes(NAMES[i]) ? 'Text' : c)));

const desk = writeNoodlDesk();
const app = emitDir(desk.dir);
const appDir = writeApp(app);
const pageArms = (signedIn: boolean) => ({
  runtime: runChild<ArmOut[]>('runtime-mounted-arm.js', [{ dir: desk.dir, scenarios: [STEPS], backend: backendOf(signedIn) }], { RUNTIME_ARM_URL: 'http://localhost/' }),
  exported: runChild<ArmOut[]>('export-react-arm.js', [{ dir: appDir, scenarios: [STEPS], settled: true, ticks: 8, backend: backendOf(signedIn) }])
});
const signedIn = pageArms(true);
const signedOut = pageArms(false);
const out = (arm: ArmOut[] | { error: string }): ArmOut => {
  if ('error' in arm) throw new Error(arm.error);
  return arm[0];
};

/** The two requests the runtime sends and the export does not (EXPECTED.md, "The wire"). */
const isUsersMe = (r: Request) => r.method === 'GET' && r.path === '/users/me';
const isEmptyQuery = (r: Request) => r.path.startsWith('/classes/') && JSON.stringify(r.body) === JSON.stringify({ _method: 'GET', where: {} });
/** On the desk: the bad filter asked `Task` with two keys; the legitimate empty query (`Locked`) is both arms'. */
const isRefusedFilterQuery = (r: Request) => isEmptyQuery(r) && r.path === '/classes/Task';

describe('§A the emitted app runs the Noodl Desk as the runtime runs it, signed in and signed out', () => {
  for (const [name, arms, signed] of [
    ['signed in', signedIn, true],
    ['signed out', signedOut, false]
  ] as const) {
    it(`A1 ${name}: the runtime reads what EXPECTED.md says (the arm grades the runtime first)`, () => {
      expect(out(arms.runtime).readings[0]).toEqual(withTextDefault(expected(signed)));
    });

    it(`A2 ${name}: the export reads exactly what EXPECTED.md says`, () => {
      expect(out(arms.exported).readings[0]).toEqual(expected(signed));
    });

    it(`A3 ${name}: the wire — every request the export sends, the runtime sends, in order, with the same body`, () => {
      const runtime = out(arms.runtime).requests[0].filter((r) => !isUsersMe(r));
      expect(out(arms.exported).requests[0]).toEqual(runtime);
      expect(runtime.length).toBe(11);
    });
  }

  it('A4 P18-S122-TEXTDEFAULT, pinned by name: the runtime shows "Text" in a wired Text before its first value; the export shows nothing', () => {
    expect(out(signedIn.runtime).readings[0][0].slice(1, 3)).toEqual(['Text', 'Text']);
    expect(out(signedIn.exported).readings[0][0].slice(1, 3)).toEqual(['', '']);
  });

  it('A5 the click\'s later wire runs before the awaited run finishes, so its Done reads the new value (seen: clicked)', () => {
    expect(out(signedIn.exported).readings[0][1][5]).toBe('clicked');
    expect(out(signedIn.runtime).readings[0][1][5]).toBe('clicked');
  });

  it('A6 a signal sent before the first await and one sent after it both run their chains (phase started, phase2 counted)', () => {
    expect(out(signedIn.exported).readings[0][1].slice(3, 5)).toEqual(['started', 'counted']);
  });

  it('A6b the Done chain runs after the body finished: it reads the count written after the await; and the late signal\'s awaiting run ran', () => {
    expect(out(signedIn.exported).readings[0][1].slice(6, 8)).toEqual(['2', 'again Ann']);
    expect(out(signedIn.exported).readings[0][3][6]).toBe('3');
  });

  it('A7 the runtime\'s one request the export does not send, pinned: its session check; the refused filter sends nothing on either arm (P18-S134-REFUSEDFILTERSENDS, fixed)', () => {
    const runtime = out(signedIn.runtime).requests[0];
    expect(runtime.filter(isUsersMe)).toHaveLength(1);
    expect(runtime.filter(isRefusedFilterQuery)).toHaveLength(0);
    expect(out(signedOut.runtime).requests[0].filter(isUsersMe)).toHaveLength(0);
    expect(out(signedIn.exported).requests[0].filter((r) => isUsersMe(r) || isRefusedFilterQuery(r))).toHaveLength(0);
  });
});

/** One query call: the collection, the filter, the options. */
const q = (filter: unknown, options: unknown = { plain: true }, cls = 'Task') => ({ member: 'query', args: [cls, filter, options] });
/**
 * The calls §B makes on both arms: every operator of the filter language, the shapes the translator refuses, the options
 * the wire carries, the backend's refusal and an unreachable backend, then the other members' answers and failures.
 */
const CALLS: Array<{ member: string; args: unknown[] }> = [
  q({ done: { equalTo: false } }), q({ title: { notEqualTo: 'x' } }), q({ n: { lessThan: 3 } }), q({ n: { greaterThanOrEqualTo: 3 } }),
  q({ title: { containedIn: ['First', 'Third'] } }), q({ title: { containedIn: 'First' } }), q({ title: { notContainedIn: ['First'] } }),
  q({ owner: { exists: true } }), q({ owner: { exists: false } }), q({ title: { matchesRegex: '^F', options: 'i' } }),
  q({ title: { contains: 'a.b' } }), q({ title: { notContains: 'x' } }), q({ title: { containsIgnoreCase: 'C++' } }), q({ title: { startsWith: 'Fi' } }),
  q({ title: { notStartsWith: 'Fi' } }), q({ title: { startsWithIgnoreCase: 'fi' } }), q({ title: { endsWith: 'st' } }), q({ title: { notEndsWith: 'st' } }),
  q({ title: { endsWithIgnoreCase: 'ST' } }), q({ n: { between: [1, 4] } }), q({ n: { notBetween: [1, 4] } }), q({ n: { between: [1] } }),
  q({ title: { isEmpty: true } }), q({ title: { isNotEmpty: true } }),
  q({ and: [{ done: { equalTo: false } }, { or: [{ title: { equalTo: 'First' } }, {}] }] }), q({ or: [] }), q({ idEqualTo: 't1' }), q({ idContainedIn: ['t1', 't3'] }),
  q({ relatedTo: { id: 'p1', key: 'tasks', className: 'Project' } }), q({ relatedTo: { id: 'p1', key: 'tasks' } }), q({ relatedTo: { id: 'p1' } }),
  q({ owner: { pointsTo: 'u1' } }), q({ owner: { pointsTo: ['u1', 'u2'] } }), q({ title: { pointsTo: 'u1' } }),
  q({ due: { greaterThan: { $date: '2026-10-01T00:00:00.000Z' } } }), q({ due: { lessThan: '2026-11-01' } }), q({ title: { equalTo: '2026-11-01' } }),
  q({ title: { text: { search: 'first' } } }), q({ title: { textSearch: { term: 'first', language: 'en' } } }),
  q({ where: { nearSphere: { latitude: 1, longitude: 2, maxDistanceInKilometers: 5 } } }),
  q({ where: { withinBox: [{ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }] } }), q({ where: { withinPolygon: [{ latitude: 0, longitude: 0 }] } }),
  q({ done: { equalTo: false }, title: { equalTo: 'x' } }), q({ title: { bogus: 1 } }), q({ title: {} }), q({ title: 'First' }), q('nope'), q(null), q(undefined), q([]),
  q({ title: { equalTo: 'First', options: 'x' } }), q({ title: { equalTo: 'a', notEqualTo: 'b' } }),
  q({}, { plain: true, limit: 2, skip: 1, sort: ['-title', 'n'], include: ['owner'], select: ['title', 'done'], count: true }),
  q({}, { plain: true, sort: 'title', include: 'owner' }), q({}, { plain: true }, 'Locked'), q({}, { plain: true }, 'Down'), { member: 'query', args: [undefined, {}] },
  { member: 'run', args: ['whoAmI', {}] }, { member: 'run', args: ['whoAmI'] }, { member: 'run', args: ['locked', {}] }, { member: 'run', args: ['empty', {}] },
  { member: 'run', args: ['down', {}] }, { member: 'run', args: ['a b/c', { x: 1 }] },
  { member: 'sign', args: [{ name: 'photo.png', url: 'x' }] }, { member: 'sign', args: ['photo.png'] }, { member: 'sign', args: [{ $getName: 'photo.png' }] },
  { member: 'sign', args: [''] }, { member: 'sign', args: [{}] }, { member: 'sign', args: ['secret.png'] }, { member: 'sign', args: ['down.png'] },
  { member: 'current', args: [] }
];
const COLLECTIONS = [
  {
    name: 'Task',
    columns: [
      { name: 'title', type: 'String' },
      { name: 'done', type: 'Boolean' },
      { name: 'owner', type: 'Pointer', targetClass: '_User' },
      { name: 'due', type: 'Date' }
    ]
  }
];
type MemberOut = { outcomes: unknown[]; requests: Request[][] };
const memberArms = (session: boolean | null) => {
  const connected = session !== null;
  const dir = connected ? appDir : writeApp(emitDir(writeNoodlDesk(undefined, { backend: false }).dir));
  const backend = connected ? { ...backendOf(session), collections: COLLECTIONS } : null;
  // With no backend the requests never leave, so the filters' variety adds nothing: three queries and the other members.
  const calls = connected ? CALLS : [...CALLS.slice(0, 2), CALLS[42], ...CALLS.filter((c) => c.member !== 'query')];
  return {
    calls,
    runtime: runChild<MemberOut>('noodl-member-arm.js', { mode: 'runtime', backend, calls }),
    exported: runChild<MemberOut>('noodl-member-arm.js', { mode: 'export', dir, backend, calls })
  };
};
const members = { 'signed in': memberArms(true), 'signed out': memberArms(false), 'with no backend': memberArms(null) };
const mout = (arm: MemberOut | { error: string }): MemberOut => {
  if ('error' in arm) throw new Error(arm.error);
  return arm;
};

describe('§B the members, one call at a time: the running app\'s own against the emitted noodl.ts', () => {
  for (const [name, arms] of Object.entries(members)) {
    it(`B1 ${name}: every call answers the same — the value, or the same kind of rejection with the same words`, () => {
      expect(mout(arms.exported).outcomes).toEqual(mout(arms.runtime).outcomes);
    });

    it(`B2 ${name}: every call sends the same requests, a refused filter's included (P18-S134-REFUSEDFILTERSENDS, fixed)`, () => {
      const runtime = mout(arms.runtime).requests;
      const exported = mout(arms.exported).requests;
      arms.calls.forEach((_c, i) => {
        expect({ i, sent: exported[i] }).toEqual({ i, sent: runtime[i].filter((r) => !isUsersMe(r)) });
      });
    });
  }

  it('B3 the refused filters, counted: each is rejected with the translator\'s words, and neither arm sends a query for it', () => {
    const arms = members['signed in'];
    const refused = mout(arms.runtime).outcomes.map((o, i) => ({ o: o as { string?: string }, i })).filter(({ o, i }) => o.string !== undefined && arms.calls[i].member === 'query');
    expect(refused.length).toBe(12);
    for (const { i } of refused) {
      expect(mout(arms.runtime).requests[i].filter(isEmptyQuery)).toHaveLength(0);
      expect(mout(arms.exported).requests[i]).toHaveLength(0);
    }
  });

  it('B4 the wire, read directly: a lowered operator is an escaped $regex, a pointer filter goes with its class, a text date on a Date column as a date', () => {
    const sent = (i: number) => (mout(members['signed in'].exported).requests[i][0].body as { where?: unknown }).where;
    expect(sent(10)).toEqual({ title: { $regex: 'a\\.b' } });
    expect(sent(31)).toEqual({ owner: { $eq: { __type: 'Pointer', objectId: 'u1', className: '_User' } } });
    expect(sent(35)).toEqual({ due: { $lt: { __type: 'Date', iso: '2026-11-01T00:00:00.000Z' } } });
    expect(sent(36)).toEqual({ title: { $eq: '2026-11-01' } });
  });

  it('B5 the answers, read directly: plain rows; a Cloud Function refusal is its body; nobody is signed in where no backend is', () => {
    const outcomes = mout(members['signed in'].exported).outcomes as Array<{ ok?: unknown; thrown?: unknown; string?: unknown; Error?: unknown }>;
    expect((outcomes[0].ok as unknown[])[0]).toEqual({ objectId: 't1', title: 'First', done: false, owner: 'u1', due: '2026-10-21T00:00:00.000Z' });
    expect(outcomes[CALLS.findIndex((c) => c.args[0] === 'locked')].thrown).toEqual({ code: 141, error: 'Not for you.' });
    const none = mout(members['with no backend'].exported).outcomes as Array<{ ok?: unknown; string?: unknown; Error?: unknown }>;
    expect(none[0].Error).toBe('This project has no backend configured. Add one in the Backend panel.');
    expect(none[3].string).toBe('No cloud services defined in this project.');
    expect(none[none.length - 1].ok).toEqual({ $undefined: true });
  });
});

describe('§C what is emitted', () => {
  const fileOf = (name: string) => app.files[Object.keys(app.files).find((f) => new RegExp(`functions/.*${name}\\.ts$`).test(f))!];
  const home = app.files['src/pages/Home.tsx'];

  it('C1 the library: src/lib/noodl.ts beside the client, which carries noodlRequest; the project\'s Date and Pointer columns in its schema table', () => {
    expect(app.files[NOODL_LIB_PATH]).toContain("import { ENDPOINT, noodlRequest, readSession } from '../api/client';");
    expect(app.files[NOODL_LIB_PATH]).toContain('"Task": { "owner": { type: "Pointer", targetClass: "_User" }, "due": { type: "Date" } }');
    expect(app.files['src/api/client.ts']).toContain('export async function noodlRequest(');
  });

  it('C2 a body that awaits: an async wrapper, the body verbatim inside an awaited async arrow, the Noodl object bound', () => {
    const text = fileOf('Count_the_open_tasks');
    expect(text).toContain('export async function Count_the_open_tasks(');
    expect(text).toContain('): Promise<{ n?: any; first?: any; started: () => void; counted: () => void }> {');
    expect(text).toContain("import { noodl } from '../../../lib/noodl';");
    expect(text).toContain('  const Noodl = noodl;');
    expect(text).toContain(`    await (async () => {\n${COUNT_SCRIPT}\n    })();`);
  });

  it('C3 a Variables body: no library, a facade over the app\'s own variables', () => {
    const text = fileOf('Remember_the_seed');
    expect(text).toContain(REMEMBER_SCRIPT);
    expect(text).toContain("import { note, seed } from '../../../stores/variables';");
    expect(text).toContain('      get seed(): any { return seed.get(); },');
    expect(text).toContain('      set note(v: any) { note.set(v); }');
    expect(text).not.toContain('lib/noodl');
  });

  it('C4 the click: the run detached, the later wire after it, Success and Done after `settled`', () => {
    expect(home).toContain(
      [
        '          void (async () => {',
        '            const countTheOpenTasksRun = runFunction(Count_the_open_tasks, {}, countTheOpenTasksNode);',
        '            setCountTheOpenTasksOut({ ...countTheOpenTasksRun.outputs });'
      ].join('\n')
    );
    expect(home).toContain(
      ['            await countTheOpenTasksRun.settled;', '            seen.set(clicked.get());', '            doneN.set(countTheOpenTasksRun.outputs.n);', '          })();', "          clicked.set('clicked');"].join('\n')
    );
  });

  it('C5 the run library hands back the body\'s promise; a late write carries no promise', () => {
    const lib = app.files[FUNCTION_RUN_LIB_PATH];
    expect(lib).toContain('const finished = body(inputs, outputs as unknown as O, node.self, node.component);');
    expect(lib).toContain('return { outputs: node.outputs, pulses, settled: Promise.resolve(finished).then(() => undefined) };');
    expect(lib).toContain("late?: (run: Omit<FunctionRun<O>, 'settled'>) => void;");
  });

  it('C6 with no backend: the same library, failing as the running app fails without one, and no client', () => {
    const none = emitDir(writeNoodlDesk(undefined, { backend: false }).dir);
    expect(none.files[NOODL_LIB_PATH]).toContain('const NO_BACKEND = "This project has no backend configured. Add one in the Backend panel.";');
    expect(none.files[NOODL_LIB_PATH]).toContain("throw 'No cloud services defined in this project.';");
    expect(none.files[NOODL_LIB_PATH]).not.toContain('../api/client');
    expect(none.files['src/api/client.ts']).toBeUndefined();
  });

  it('C7 an app whose Functions read only Variables earns neither the library nor a client', () => {
    const only = emitDir(
      writeNoodlDesk((d: Desk) => {
        const home = d.components['Pages/Home'];
        const keep = new Set(['remember', 'rememberBtn', 'noteText', 'noteVar', 'seedVar', 'sdSeed', 'reseedBtn', 'page', 'shell']);
        home.nodes = home.nodes.filter((n) => keep.has(n.id));
        home.nodes.find((n) => n.id === 'shell')!.children = ['rememberBtn', 'reseedBtn', 'noteText'];
        home.connections = home.connections.filter((c) => keep.has(c.fromId) && keep.has(c.toId));
      }).dir
    );
    expect(only.files[NOODL_LIB_PATH]).toBeUndefined();
    expect(only.files['src/api/client.ts']).toBeUndefined();
  });
});

describe('§D the classifier and the plan', () => {
  it('D1 the desk\'s bodies pass, and carry the traits that make each one run once per trigger', () => {
    for (const body of [GREET_SCRIPT, COUNT_SCRIPT, WHO_SCRIPT, BAD_SCRIPT, SIGN_SCRIPT, REMEMBER_SCRIPT]) expect(jsPurityDefer('function', body)).toBeNull();
    expect(jsHostTraitsOf(COUNT_SCRIPT)).toEqual(['is asynchronous (it awaits)', 'reads the Noodl API']);
    expect(jsHostTraitsOf(REMEMBER_SCRIPT)).toEqual(['reads the Noodl API']);
  });

  it('D2 the members a body reads, and the Variables it reads and writes', () => {
    expect(jsNoodlUseOf(WHO_SCRIPT)).toEqual({ members: ['CloudFunctions.run', 'Users.Current'], variables: [], variableWrites: [], backend: true });
    expect(jsNoodlUseOf(REMEMBER_SCRIPT)).toEqual({ members: ['Variables'], variables: ['note', 'seed'], variableWrites: ['note'], backend: false });
  });

  it('D3 a member the export does not carry is refused by its name', () => {
    const carries = "the export's Noodl object carries Records.query, CloudFunctions.run, Users.Current, Files.sign and Variables (EXP-020)";
    expect(jsPurityDefer('function', "await Noodl.Records.create('Task', {});")).toBe(`reads \`Noodl.Records.create\` — ${carries}`);
    expect(jsPurityDefer('function', "Noodl.Events.emit('x');")).toBe(`reads \`Noodl.Events.emit\` — ${carries}`);
    expect(jsPurityDefer('function', 'var R = Noodl.Records;')).toBe(`reads \`Noodl.Records\` — ${carries}`);
    expect(jsPurityDefer('function', "Noodl.Variables['a'] = 1;")).toBe(`reads \`Noodl.Variables[…]\` — ${carries}`);
    expect(jsPurityDefer('function', 'await Noodl.Users.Current.logOut();')).toBe(`reads \`Noodl.Users.Current.logOut\` — ${carries}`);
    expect(jsPurityDefer('function', "await Noodl.Records.query('Task', {});")).toBe(
      "asks `Noodl.Records.query` for the runtime's Model records (no `plain: true`) — the export's Noodl object reads rows plain (EXP-020)"
    );
  });

  it('D4 an Expression still refuses the Noodl API as before', () => {
    expect(jsPurityDefer('expression', 'Noodl.Variables.x')).toBe('reads the Noodl API — the runtime-coupled tier (EXP-003 Tier B)');
  });

  it('D5 the plan: every desk Function exports; the awaiting ones are marked, and each names what it reads', () => {
    const plan = planOf(desk.dir);
    for (const id of ['greet', 'count', 'add', 'who', 'locked', 'bad', 'sign', 'remember']) expect({ id, kind: plan.dispositions[id]?.kind }).toEqual({ id, kind: 'collapsed' });
    expect(plan.jsFunctions['count'].awaits).toBe(true);
    expect(plan.jsFunctions['remember'].awaits).toBeUndefined();
    expect(plan.jsFunctions['count'].noodl).toEqual({ members: ['Records.query'], variables: [] });
    expect(plan.jsFunctions['remember'].noodl).toEqual({ members: ['Variables'], variables: ['note', 'seed'] });
  });

  it('D6 a desk Function that reads a member the export does not carry is refused, by name, where its node is', () => {
    const dir = writeNoodlDesk((d: Desk) => {
      const who = d.components['Pages/Home'].nodes.find((n) => n.id === 'who')!;
      who.parameters.functionScript = "Noodl.Events.emit('hi'); Outputs.who = 'said';";
    }).dir;
    expect(planOf(dir).dispositions['who']).toMatchObject({ kind: 'deferred', reason: expect.stringContaining('reads `Noodl.Events.emit`') });
  });
});

describe('§E the emitted apps typecheck', () => {
  it('E1 the desk with its backend', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('E2 the desk with no backend', () => {
    expect(typecheckEmittedApp(emitDir(writeNoodlDesk(undefined, { backend: false }).dir))).toEqual([]);
  });
});
