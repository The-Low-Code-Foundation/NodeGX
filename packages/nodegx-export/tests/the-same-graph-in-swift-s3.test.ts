/**
 * EXP-022 S3 — the backend, through the one client.
 *
 * The React export writes the app's backend client (`src/api/*`, `src/lib/noodl.ts`). The Swift export carries the same
 * files, their types taken out by Node (`emit/swift/client.ts`), into the app's JavaScriptCore context, with `fetch` over
 * URLSession and `localStorage` over UserDefaults (`Scripts.swift`). So a Function that awaits `Noodl.Records.query`, a
 * record verb, a query and a session read reach the backend through code that is already graded on the web.
 *
 * §A grades it the way `the-noodl-api-travels.test.ts` §A grades React: the Noodl Desk (`helpers/noodl-desk.ts`), driven in
 * the exported SwiftUI app (`helpers/export-swift-arm.ts` `swiftBackendArm`, `swift test` on macOS) against the runtime's own
 * nodes (`runtime-mounted-arm.js`) and the React export (`export-react-arm.js`), all three answered by one fake Parse
 * backend (`fake-parse-backend.js`), signed in and signed out: the readings and the wire. Behind `NODEGX_SWIFT_BUILD=1`, as
 * S1's and S2's builds are. §B is what is printed, §C the client over the corpus.
 *
 * §D the backend nodes todo-list is made of — a query and its Fetch, the record verbs, Log In and Log Out, the session —
 * on the Record Desk (`helpers/record-desk.ts`), the Swift app beside the React export, one fake backend: the readings
 * predicted below before either arm ran, and the wire, request for request.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp, type EmittedApp } from '../src/emit/emitApp';
import { emitSwiftApp } from '../src/emit/swift/emitSwift';
import { clientModulesJs } from '../src/emit/swift/client';
import { HOST_JS } from '../src/emit/swift/scripts';
import { ANN_SESSION, NOODL_DESK_APP_ID, NOODL_DESK_BACKEND, NOODL_DESK_ENDPOINT, writeNoodlDesk } from './helpers/noodl-desk';
import { swiftBackendArm } from './helpers/export-swift-arm';
import { RECORD_DESK_APP_ID, RECORD_DESK_BACKEND, RECORD_DESK_ENDPOINT, writeRecordDesk } from './helpers/record-desk';

const catalog = loadCatalog();
const desk = writeNoodlDesk();
const deskIr = parseProject(desk.dir, catalog);
const swiftDesk = emitSwiftApp(deskIr, catalog);
const kit = 'Sources/NoodlDeskKit';

const building = process.env.NODEGX_SWIFT_BUILD === '1' && process.platform === 'darwin';
const swiftIt = building ? it : it.skip;

type Request = { method: string; path: string; body: unknown; appId: string | null; signedIn: boolean };
type ArmOut = { readings: string[][]; requests: Request[] };

const STEPS = ['Count open', 'Add one', 'Count open', 'Who am I', 'Refused', 'Bad filter', 'Sign', 'Remember', 'Reseed', 'Remember'];
const backendOf = (signedIn: boolean) => ({ spec: NOODL_DESK_BACKEND, appId: NOODL_DESK_APP_ID, endpoint: NOODL_DESK_ENDPOINT, ...(signedIn ? { session: ANN_SESSION } : {}) });

const runChild = (name: string, input: unknown, env: Record<string, string> = {}): ArmOut => {
  try {
    const out = JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', name)], {
        input: JSON.stringify(input),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 180000,
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, ...env }
      })
    );
    return { readings: out[0].readings[0], requests: out[0].requests[0] };
  } catch (e) {
    return { readings: [[`the ${name} arm threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0]}`]], requests: [] };
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

/** The two requests the runtime sends and no export does (the-noodl-api-travels.test.ts A7): its session check, and the query after a refused filter. */
const isUsersMe = (r: Request) => r.method === 'GET' && r.path === '/users/me';
const isRefusedFilterQuery = (r: Request) => r.path === '/classes/Task' && JSON.stringify(r.body) === JSON.stringify({ _method: 'GET', where: {} });
/** P18-S122-TEXTDEFAULT (filed, open): a wired Text shows "Text" in the running app until its wire delivers; an export shows nothing. */
const withoutDefault = (rows: string[][]): string[][] => rows.map((r) => r.map((c) => (c === 'Text' ? '' : c)));

describe('§A the Swift app runs the Noodl Desk against the backend as the runtime and the React export do (swift test on macOS)', () => {
  const arms: Record<'in' | 'out', { swift: ArmOut; runtime: ArmOut; react: ArmOut }> = {} as never;
  beforeAll(async () => {
    if (!building) return;
    const reactDir = writeApp(emitApp(deskIr, catalog));
    for (const [key, signed] of [['in', true], ['out', false]] as const) {
      const [swift] = await swiftBackendArm('noodl-desk', swiftDesk, [STEPS], backendOf(signed));
      arms[key] = {
        swift: swift as ArmOut,
        runtime: runChild('runtime-mounted-arm.js', [{ dir: desk.dir, scenarios: [STEPS], backend: backendOf(signed) }], { RUNTIME_ARM_URL: 'http://localhost/' }),
        react: runChild('export-react-arm.js', [{ dir: reactDir, scenarios: [STEPS], settled: true, ticks: 8, backend: backendOf(signed) }])
      };
    }
    // The readings and the wire, kept as evidence where a session asks for them (exp-022/s3/).
    if (process.env.NODEGX_S3_EVIDENCE) fs.writeFileSync(process.env.NODEGX_S3_EVIDENCE, JSON.stringify(arms, null, 1) + '\n');
  }, 1_200_000);

  for (const [key, name] of [['in', 'signed in'], ['out', 'signed out']] as const) {
    swiftIt(`A1 ${name}: the Swift app reads exactly what the runtime reads, at every step, but the word "Text"`, () => {
      expect(arms[key].runtime.readings).toHaveLength(STEPS.length + 1);
      expect(arms[key].swift.readings).toEqual(withoutDefault(arms[key].runtime.readings));
    });

    swiftIt(`A2 ${name}: and exactly what the React export reads`, () => {
      expect(arms[key].react.readings).toHaveLength(STEPS.length + 1);
      expect(arms[key].swift.readings).toEqual(arms[key].react.readings);
    });

    swiftIt(`A3 ${name}: the wire — every request the Swift app sends, the React export sends, in order, with the same body; and the runtime's but its two`, () => {
      expect(arms[key].swift.requests).toEqual(arms[key].react.requests);
      expect(arms[key].swift.requests).toEqual(arms[key].runtime.requests.filter((r) => !isUsersMe(r) && !isRefusedFilterQuery(r)));
      expect(arms[key].swift.requests).toHaveLength(11);
    });
  }

  swiftIt('A4 signed in: the session the device keeps rides every request, and the backend knows who asked (hello Ann, who Ann admin)', () => {
    expect(arms.in.swift.requests.every((r) => r.signedIn)).toBe(true);
    expect(arms.out.swift.requests.some((r) => r.signedIn)).toBe(false);
    expect(arms.in.swift.readings[0][0]).toBe('hello Ann');
    expect(arms.in.swift.readings[4][9]).toBe('Ann admin / ann@x.test ann u1 object');
  });

  swiftIt('A5 an awaiting run: a signal before its first await and one after both run their chains; Done waits for the body and reads what it wrote', () => {
    expect(arms.in.swift.readings[1].slice(3, 8)).toEqual(['started', 'counted', 'clicked', '2', 'again Ann']);
    expect(arms.in.swift.readings[3][6]).toBe('3');
  });
});

describe('§B what is printed', () => {
  const page = swiftDesk.files[`${kit}/Views/HomePageView.swift`] ?? '';

  it('B1 the desk is printed whole: nothing read in the plan is left unprinted', () => {
    expect(swiftDesk.preflight.swiftLosses).toEqual([]);
  });

  it('B2 the client is the web export\'s own files, their types taken out, one module each', () => {
    const web = emitApp(deskIr, catalog).files;
    expect(Object.keys(swiftDesk.files).filter((f) => f.includes('/Scripts/client/')).sort()).toEqual([`${kit}/Scripts/client/api/client.js`, `${kit}/Scripts/client/lib/noodl.js`]);
    const client = swiftDesk.files[`${kit}/Scripts/client/api/client.js`];
    expect(client).toContain('__define("api/client", function (exports, __require) {');
    expect(client).toContain('const ENDPOINT         = __nodegxEnv.VITE_NODEGX_ENDPOINT ?? \'http://backend.test\';');
    // Every line of the web file is there, in order, at its column: only types became spaces, and the module lines changed.
    const body = client.split('\n').slice(0, -1).filter((l) => !/^(\/\/ @nodegx:generated \(EXP-022\)|__define\(|  Object\.defineProperty\(exports|\}\);$)/.test(l));
    const original = web['src/api/client.ts'].split('\n');
    expect(body).toHaveLength(original.length);
    expect(body.filter((l, i) => l.trim() !== '' && l.replace(/\s+/g, '') !== original[i].replace(/\s+/g, '')).length).toBeLessThan(original.length / 4);
    expect(swiftDesk.files[`${kit}/Scripts/client/lib/noodl.js`]).toContain('const { ENDPOINT, noodlRequest, readSession } = __require("api/client");');
  });

  it('B3 a Function that awaits runs in an async wrapper and reads the client\'s Noodl; one that names Variables reads the app\'s own', () => {
    const count = swiftDesk.files[`${kit}/Scripts/functions/Pages/Home/Count_the_open_tasks.js`];
    expect(count).toContain('__nodegx.define("Pages/Home/Count_the_open_tasks", async function (Inputs, Outputs, self, Component) {');
    expect(count).toContain('  var Noodl = __nodegx.noodl([], true);');
    expect(count).toContain('    await (async () => {');
    expect(swiftDesk.files[`${kit}/Scripts/functions/Pages/Home/Remember_the_seed.js`]).toContain('  var Noodl = __nodegx.noodl(["note","seed"], false);');
    expect(swiftDesk.files[`${kit}/Functions.swift`]).toContain('    case "note": Variables.shared.note = value');
  });

  it('B4 a press that runs an awaiting body starts it at once; only the wait, and what follows it, is a Task (detached: the click\'s later wire runs first)', () => {
    expect(page).toMatch(
      /func countBtnPressed\(\) \{\n {4}let countTheOpenTasksRun = countTheOpenTasksNode\.run\("Pages\/Home\/Count_the_open_tasks", \[:\]\)\n {4}countTheOpenTasksOut = countTheOpenTasksRun\.outputs\n {4}Task \{ @MainActor in\n/
    );
    expect(page).toContain('      await Scripts.shared.settled(countTheOpenTasksRun)\n      variables.seen = variables.clicked\n      variables.doneN = JS.field(countTheOpenTasksNode.outputs, "n")\n    }\n    variables.clicked = "clicked"\n  }');
    expect(page).toMatch(/func addBtnPressed\(\) \{\n {4}let addATaskRun = addATaskNode\.run\("Pages\/Home\/Add_a_task", \["title": "Fourth"\]\)\n/);
  });

  it('B5 a Variable\'s authored value is stored on every mount, as the runtime stores it at node creation', () => {
    expect(page).toContain('.onChange(of: Same(), initial: true) { _, _ in\n        variables.seed = "S1"\n      }');
  });
});

describe('§C the client over the corpus: every template, with a backend declared, carries its client into the host', () => {
  const templates = path.join(__dirname, '..', '..', '..', 'templates');
  const names = fs.readdirSync(templates).filter((n) => fs.existsSync(path.join(templates, n, 'nodegx.project.json'))).sort();

  /** The template with a backend declared, in a copy, as a person's project with one is (s137's bound copy). */
  const bound = (name: string): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `exp022-s3-${name}-`));
    fs.cpSync(path.join(templates, name), dir, { recursive: true });
    const file = path.join(dir, 'nodegx.project.json');
    const project = JSON.parse(fs.readFileSync(file, 'utf-8'));
    project.metadata = { ...(project.metadata ?? {}), cloudservices: { endpoint: 'http://127.0.0.1:1', appId: `exp022-${name}`, instanceId: 'x', type: 'nodegx' } };
    fs.writeFileSync(file, JSON.stringify(project));
    return dir;
  };

  it('C1 for each, every module the web export writes for its backend loads in a bare JavaScript context beside the host, and answers its exports', () => {
    const report: string[] = [];
    let modules = 0;
    for (const name of names) {
      const dir = bound(name);
      try {
        const client = clientModulesJs(emitApp(parseProject(dir, catalog), catalog).files);
        if (client.length === 0) continue;
        const context = vm.createContext({
          __log: () => undefined,
          __later: () => undefined,
          __storage: () => undefined,
          __fetch: () => undefined,
          __env: () => ({}),
          __variable: () => undefined,
          __setVariable: () => undefined
        });
        vm.runInContext(HOST_JS, context);
        for (const mod of client) vm.runInContext(mod.js, context, { filename: mod.name });
        for (const mod of client) {
          const exported = vm.runInContext(`Object.keys(__require(${JSON.stringify(mod.name)}))`, context) as string[];
          if (exported.length === 0) report.push(`${name} ${mod.name}: no exports`);
          modules += 1;
        }
      } catch (e) {
        report.push(`${name}: ${String(e).split('\n')[0]}`);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    expect(report).toEqual([]);
    expect(modules).toBeGreaterThan(names.length);
  }, 600_000);
});

describe('§D the Record Desk: a query, the record verbs and the session, in the Swift app and the React export (swift test on macOS)', () => {
  const record = writeRecordDesk();
  const recordIr = parseProject(record.dir, catalog);
  const swiftRecord = emitSwiftApp(recordIr, catalog);
  const STEPS_D = ['Load', 'Sign in', 'Load', 'Add', 'Rename', 'Remove', 'Bad', 'Wrong password', 'Sign out'];
  const backend = { spec: RECORD_DESK_BACKEND, appId: RECORD_DESK_APP_ID, endpoint: RECORD_DESK_ENDPOINT };
  /** Predicted: signed, name, login error, bad error, then the rows' titles (the fake backend answers in stored order). */
  const PREDICTED = [
    ['false', '', '', ''],
    ['false', '', '', '', 'First', 'Second', 'Third'],
    ['true', 'ann', '', '', 'First', 'Second', 'Third'],
    ['true', 'ann', '', '', 'First', 'Second', 'Third'],
    ['true', 'ann', '', '', 'First', 'Second', 'Third', 'Fourth'],
    ['true', 'ann', '', '', 'Renamed', 'Second', 'Third', 'Fourth'],
    ['true', 'ann', '', '', 'Renamed', 'Second', 'Fourth'],
    ['true', 'ann', '', 'Missing Record Id', 'Renamed', 'Second', 'Fourth'],
    ['true', 'ann', 'Invalid username/password.', 'Missing Record Id', 'Renamed', 'Second', 'Fourth'],
    ['false', '', 'Invalid username/password.', 'Missing Record Id', 'Renamed', 'Second', 'Fourth']
  ];
  let swift: ArmOut = { readings: [], requests: [] };
  let react: ArmOut = { readings: [], requests: [] };
  beforeAll(async () => {
    if (!building) return;
    [swift] = (await swiftBackendArm('record-desk', swiftRecord, [STEPS_D], backend)) as ArmOut[];
    react = runChild('export-react-arm.js', [
      { dir: writeApp(emitApp(recordIr, catalog)), scenarios: [STEPS_D], settled: true, ticks: 8, backend, allowErrors: ['Missing Record Id [record/storage-op-failed]', 'Invalid username/password. [user/log-in-failed]'] }
    ]);
    if (process.env.NODEGX_S3_EVIDENCE) fs.writeFileSync(process.env.NODEGX_S3_EVIDENCE.replace(/[^/]*$/, 'record-desk-two-arms.json'), JSON.stringify({ swift, react }, null, 1) + '\n');
  }, 1_200_000);

  it('D0 the desk is printed whole in Swift, and the plan leaves nothing out', () => {
    expect(swiftRecord.preflight.planRefusals).toEqual([]);
    expect(swiftRecord.preflight.swiftLosses).toEqual([]);
  });

  /** P18-EXP022-S3-BOOLTEXT (filed, open): the React export prints `{session.authenticated}`, which React draws as nothing. */
  const withoutBoolean = (rows: string[][]): string[][] => rows.map((r) => r.map((c, i) => (i === 0 ? '' : c)));

  swiftIt('D1 the Swift app reads what was predicted, at every step: the running app\'s "true" and "false" included', () => {
    expect(swift.readings).toEqual(PREDICTED);
  });

  swiftIt('D2 the React export reads what was predicted, but the Authenticated Text it draws empty (P18-EXP022-S3-BOOLTEXT, pinned by name)', () => {
    expect(react.readings).toEqual(withoutBoolean(PREDICTED));
    expect(react.readings.map((r) => r[0])).toEqual(PREDICTED.map(() => ''));
  });

  swiftIt('D2b so the Swift app reads exactly what the React export reads, but that one Text', () => {
    expect(withoutBoolean(swift.readings)).toEqual(react.readings);
  });

  swiftIt('D3 the wire: every request the Swift app sends, the React export sends, in order, with the same body (11)', () => {
    expect(swift.requests).toEqual(react.requests);
    expect(swift.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      'POST /classes/Task',
      'POST /login',
      'POST /classes/Task',
      'POST /classes/Task',
      'POST /classes/Task',
      'PUT /classes/Task/t1',
      'POST /classes/Task',
      'DELETE /classes/Task/t3',
      'POST /classes/Task',
      'POST /login',
      'POST /logout'
    ]);
  });

  swiftIt('D4 signed in by Log In, the session rides every request after it, and Log Out takes it off the device', () => {
    expect(swift.requests.map((r) => r.signedIn)).toEqual([false, false, true, true, true, true, true, true, true, true, true]);
  });
});
