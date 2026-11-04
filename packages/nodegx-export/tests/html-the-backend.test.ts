/**
 * P134 HTX-004 — the backend through the one client, in plain files.
 *
 * The React export writes the app's backend client (`src/api/*.ts`, `src/lib/noodl.ts`, `src/lib/errors.ts`). The HTML
 * export carries the same files as ES modules, their types taken out (`emit/html/client.ts`, Swift S3's route): one
 * client, three hosts. Its printer calls into it as the React printer does: a record verb or a user verb awaited in a
 * `try`, its Error row and the error channel in the `catch`; a query's rows kept, asked for at mount or by its Fetch; who
 * is signed in followed (`lib/session.js`); a Function that awaits, or reads `Noodl`, run in its async wrapper.
 *
 * §A the Record Desk (`helpers/record-desk.ts`, the backend nodes todo-list is made of): the HTML export
 * (`export-html-arm.ts`, jsdom) against the readings EXP-022 S3 predicted before any arm ran, and its wire beside the React
 * export's (`export-react-arm.js`), one fresh fake Parse backend each (`fake-parse-backend.js`). §B the Noodl Desk
 * (`helpers/noodl-desk.ts`): a Function's `Noodl`, awaited runs and the click's later wire, signed in and signed out,
 * against `s134-noodlapi/EXPECTED.md`'s readings and the React export's wire. §C what is printed. §D the client over the
 * corpus: every template, with a backend declared, carries its client into the folder and loads from its own files. §E
 * the Call Desk (`fixtures/call-desk`): a Cloud Function's two outcomes beside the React export. The runtime arm does not
 * mount a `CloudFunction2` (its model is the project's cloud component), so §E is graded against the prediction and React.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp, type EmittedApp } from '../src/emit/emitApp';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { clientFilesEsm, closeStripped } from '../src/emit/html/client';
import { stripTypes } from '../src/emit/swift/client';
import { htmlBackendArm } from './helpers/export-html-arm';
import { bundleApp } from './helpers/html-in-jsdom';
import { ANN_SESSION, NOODL_DESK_APP_ID, NOODL_DESK_BACKEND, NOODL_DESK_ENDPOINT, writeNoodlDesk } from './helpers/noodl-desk';
import { RECORD_DESK_APP_ID, RECORD_DESK_BACKEND, RECORD_DESK_ENDPOINT, writeRecordDesk } from './helpers/record-desk';

const catalog = loadCatalog();
type Request = { method: string; path: string; body: unknown; appId: string | null; signedIn: boolean };
type ArmOut = { readings: string[][]; requests: Request[] };

const writeApp = (app: EmittedApp): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'htx004-react-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
/** The React export's arm (P18 session 134), one scenario: its readings and its wire. */
const reactArm = (input: Record<string, unknown>): ArmOut => {
  const out = JSON.parse(
    execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'export-react-arm.js')], {
      input: JSON.stringify([{ settled: true, ticks: 8, ...input }]),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 180000,
      maxBuffer: 64 * 1024 * 1024
    })
  );
  return { readings: out[0].readings[0], requests: out[0].requests[0] };
};
const htmlOne = async (files: Record<string, string>, steps: string[], options: Parameters<typeof htmlBackendArm>[2]): Promise<ArmOut> => {
  const [out] = await htmlBackendArm(files, [steps], options);
  return out as ArmOut;
};

describe('§A the Record Desk: a query, the record verbs and the session, in plain files', () => {
  const desk = writeRecordDesk();
  const ir = parseProject(desk.dir, catalog);
  const html = emitHtmlApp(ir, catalog);
  const STEPS = ['Load', 'Sign in', 'Load', 'Add', 'Rename', 'Remove', 'Bad', 'Wrong password', 'Sign out'];
  const backend = { spec: RECORD_DESK_BACKEND, appId: RECORD_DESK_APP_ID, endpoint: RECORD_DESK_ENDPOINT };
  const allowErrors = ['Missing Record Id [record/storage-op-failed]', 'Invalid username/password. [user/log-in-failed]'];
  /** EXP-022 S3's prediction: signed, name, login error, bad error, then the rows' titles (the fake answers in stored order). */
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
  let out: ArmOut = { readings: [], requests: [] };
  let react: ArmOut = { readings: [], requests: [] };
  beforeAll(async () => {
    out = await htmlOne(html.files, STEPS, { backend, allowErrors });
    react = reactArm({ dir: writeApp(emitApp(ir, catalog)), scenarios: [STEPS], backend, allowErrors });
  }, 300_000);

  it('A0 the desk is printed whole: the plan leaves nothing out, and the HTML printer prints everything it reads', () => {
    expect(html.preflight.planRefusals).toEqual([]);
    expect(html.preflight.htmlLosses).toEqual([]);
  });

  it('A1 the HTML export reads what was predicted, at every step: the running app\'s "true" and "false" included', () => {
    expect(out.readings).toEqual(PREDICTED);
  });

  it('A2 the React export reads the same, but the Authenticated Text it draws empty (P18-EXP022-S3-BOOLTEXT, pinned by name)', () => {
    const withoutBoolean = (rows: string[][]) => rows.map((r) => r.map((c, i) => (i === 0 ? '' : c)));
    expect(react.readings).toEqual(withoutBoolean(PREDICTED));
  });

  it('A3 the wire: every request the HTML export sends, the React export sends, in order, with the same body (11)', () => {
    expect(out.requests).toEqual(react.requests);
    expect(out.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
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

  it('A4 signed in by Log In, the session rides every request after it, and Log Out takes it off the device', () => {
    expect(out.requests.map((r) => r.signedIn)).toEqual([false, false, true, true, true, true, true, true, true, true, true]);
    expect(out.requests.every((r) => r.appId === RECORD_DESK_APP_ID)).toBe(true);
  });
});

describe('§B the Noodl Desk: a Function reads Noodl and awaits, in plain files, signed in and signed out', () => {
  const desk = writeNoodlDesk();
  const ir = parseProject(desk.dir, catalog);
  const html = emitHtmlApp(ir, catalog);
  const STEPS = ['Count open', 'Add one', 'Count open', 'Who am I', 'Refused', 'Bad filter', 'Sign', 'Remember', 'Reseed', 'Remember'];
  const NAMES = ['hello', 'n', 'first', 'phase', 'phase2', 'seen', 'doneN', 'again', 'added', 'who', 'locked', 'bad', 'link', 'note'] as const;
  type Cells = Partial<Record<(typeof NAMES)[number], string>>;
  const row = (cells: Cells, from: string[]): string[] => NAMES.map((n, i) => cells[n] ?? from[i]);
  /** `s134-noodlapi/EXPECTED.md`, as `the-noodl-api-travels.test.ts` holds it ("" where a wired Text has had no value). */
  const expected = (signedIn: boolean): string[][] => {
    const L0 = row({ hello: signedIn ? 'hello Ann' : 'hello nobody' }, ['', '', '', 'phase nothing', 'phase2 nothing', 'seen nothing', 'doneN nothing', '', '', '', '', '', '', 'note nothing']);
    const c1 = row({ n: '2', first: 't1|First|u1|2026-10-21T00:00:00.000Z|undefined', phase: 'started', phase2: 'counted', seen: 'clicked', doneN: '2', again: signedIn ? 'again Ann' : 'again nobody' }, L0);
    const a1 = row({ added: 'added Fourth' }, c1);
    const c2 = row({ n: '3', doneN: '3' }, a1);
    const w1 = row({ who: signedIn ? 'Ann admin / ann@x.test ann u1 object' : 'nobody / signed out' }, c2);
    const l1 = row({ locked: 'refused: Not for you. (141) body' }, w1);
    const b1 = row({ bad: 'string: A filter must have exactly one key / Error: Permission denied for Locked.' }, l1);
    const s1 = row({ link: 'signed http://files.test/photo.png?exp=1&sig=abc 2026-10-22T00:00:00.000Z 3600 / refused 403 This file is private.' }, b1);
    const r1 = row({ note: 'kept S1' }, s1);
    return [L0, c1, a1, c2, w1, l1, b1, s1, r1, r1, row({ note: 'kept S2' }, r1)];
  };
  const backendOf = (signedIn: boolean) => ({ spec: NOODL_DESK_BACKEND, appId: NOODL_DESK_APP_ID, endpoint: NOODL_DESK_ENDPOINT, ...(signedIn ? { session: ANN_SESSION } : {}) });
  const arms: Record<'in' | 'out', { html: ArmOut; react: ArmOut }> = {} as never;
  beforeAll(async () => {
    const reactDir = writeApp(emitApp(ir, catalog));
    for (const [k, signed] of [['in', true], ['out', false]] as const) {
      arms[k] = { html: await htmlOne(html.files, STEPS, { backend: backendOf(signed) }), react: reactArm({ dir: reactDir, scenarios: [STEPS], backend: backendOf(signed) }) };
    }
  }, 300_000);

  it('B0 the desk is printed whole', () => {
    expect(html.preflight.htmlLosses).toEqual([]);
  });

  for (const [k, name, signed] of [['in', 'signed in', true], ['out', 'signed out', false]] as const) {
    it(`B1 ${name}: the HTML export reads exactly what EXPECTED.md says, at every step`, () => {
      expect(arms[k].html.readings).toEqual(expected(signed));
    });

    it(`B2 ${name}: the wire — every request the HTML export sends, the React export sends, in order, with the same body (11)`, () => {
      expect(arms[k].html.requests).toEqual(arms[k].react.requests);
      expect(arms[k].html.requests).toHaveLength(11);
      expect(arms[k].html.requests.every((r) => r.signedIn === signed)).toBe(true);
    });
  }

  it('B3 the click\'s later wire runs before the awaited body finishes, so its Done reads the new value (seen: clicked)', () => {
    expect(arms.in.html.readings[1][5]).toBe('clicked');
  });

  it('B4 a Function that awaits is an async wrapper over the client\'s Noodl; one that names Variables reads the app\'s own', () => {
    const count = html.files['functions/pages/Home/Count_the_open_tasks.js'];
    expect(count).toContain("import { noodl } from '../../../lib/noodl.js';");
    expect(count).toContain('export async function Count_the_open_tasks(Inputs, Outputs = { started() {}, counted() {} }, self = {}, Component) {\n  const Noodl = noodl;');
    expect(count).toContain('    await (async function () {');
    const remember = html.files['functions/pages/Home/Remember_the_seed.js'];
    expect(remember).not.toContain('lib/noodl.js');
    expect(remember).toContain("import * as variables from '../../../variables.js';");
    expect(remember).toContain('      get seed() {\n        return variables.seed.get();\n      },');
  });

  it('B5 a press that runs an awaiting body starts it at once in its own async body, and the press\'s later wire after it (detached)', () => {
    expect(html.files['pages/Home.js']).toMatch(/addEventListener\('click', function \(\) \{\n {4}void \(async function \(\) \{\n {6}const countTheOpenTasksRun = runFunction\(Count_the_open_tasks, \{\}, countTheOpenTasksNode\);[\s\S]*?\n {6}await countTheOpenTasksRun\.settled;\n[\s\S]*?\n {4}\}\)\(\);\n {4}variables\.clicked\.set\('clicked'\);\n {2}\}\);/);
  });
});

describe('§C what is printed', () => {
  const ir = parseProject(writeRecordDesk().dir, catalog);
  const html = emitHtmlApp(ir, catalog);
  const react = emitApp(ir, catalog).files;

  it('C1 the client is the React export\'s own files, their types taken out, one ES module each, beside env.js and lib/session.js', () => {
    expect(Object.keys(html.files).filter((f) => /^(api\/|env\.js|lib\/(session|errors|noodl)\.js)/.test(f)).sort()).toEqual(['api/client.js', 'api/session.js', 'api/tasks.js', 'env.js', 'lib/errors.js', 'lib/session.js']);
    expect(html.files['api/tasks.js']).toContain("import { create, query, remove, update } from './client.js';");
    expect(html.files['api/tasks.js']).toContain("export async function fetchTasks(params) {\n  return query('Task', params);\n}");
    // Every comment the React file has is in the plain one, word for word.
    const comments = (text: string) => text.split('\n').filter((l) => /^\s*(\/\/|\/\*\*?|\*)/.test(l) && !l.includes('@nodegx:generated'));
    const kept = comments(html.files['api/client.js']);
    for (const line of comments(react['src/api/client.ts']).filter((l) => !/^\s*\/\*\* The wire's session record/.test(l))) expect(kept).toContain(line);
  });

  it('C2 no TypeScript, no React and no Vite are left in it: the hooks are named where they were cut, and `import.meta.env` is `env`', () => {
    for (const [file, text] of Object.entries(html.files)) {
      if (!file.endsWith('.js')) continue;
      expect([file, /from 'react'|import\.meta|: string\b|\binterface \w+ \{/.test(text)]).toEqual([file, false]);
    }
    expect(html.files['api/session.js']).toContain('// `useSession` is a React hook, and only the React export carries it: a plain page reads the same stored session through lib/session.js.');
    expect(html.files['api/client.js']).toContain("import { env } from '../env.js';\n\nexport const ENDPOINT = env.VITE_NODEGX_ENDPOINT ?? 'http://backend.test';");
  });

  it('C3 a person points the app at another backend in env.js, without touching generated code', async () => {
    const files = { ...html.files, 'env.js': "export const env = { VITE_NODEGX_ENDPOINT: 'https://elsewhere.test', VITE_NODEGX_APP_ID: 'other' };\n" };
    const seen: string[] = [];
    const { openHtmlExport } = await import('./helpers/html-in-jsdom');
    const page = await openHtmlExport(files, '', {}, {
      prepare: (w) => {
        w.fetch = (url: string, init: { headers: Record<string, string> }) => {
          seen.push(`${url} ${init.headers['X-Parse-Application-Id']}`);
          return Promise.resolve({ status: 200, ok: true, text: async () => '{"results":[]}' });
        };
      }
    });
    page.document.querySelector('button').dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
    await page.settle();
    page.close();
    expect(seen).toEqual(['https://elsewhere.test/classes/Task other']);
  });

  it('C4 closing the stripper\'s blanks moves nothing it did not blank: strings and comments come through whole', () => {
    const ts = "const a: string = 'x:  y'; // keep:  this\nexport interface T {\n  n: number;\n}\nfunction f<T>(x: T, y?: number): T {\n  return (x as T);\n}\n";
    expect(closeStripped(ts, stripTypes(ts))).toBe("const a = 'x:  y'; // keep:  this\nfunction f(x, y) {\n  return (x);\n}\n");
  });

  it('C5 with no backend declared: the Noodl library travels without a client, failing as the running app fails, and nobody is signed in', async () => {
    const plain = emitHtmlApp(parseProject(writeNoodlDesk(undefined, { backend: false }).dir, catalog), catalog);
    expect(plain.preflight.htmlLosses).toEqual([]);
    expect(Object.keys(plain.files).filter((f) => /^(api\/|env\.js|lib\/(session|errors|noodl)\.js)/.test(f)).sort()).toEqual(['lib/noodl.js', 'lib/session.js']);
    expect(plain.files['lib/session.js']).toContain('return keep({ authenticated: false, user: null });');
    await bundleApp(plain.files);
  });
});

describe('§E the Call Desk: a Cloud Function\'s Done, Failure, Error and results, in plain files beside the React export', () => {
  const DIR = path.join(__dirname, 'fixtures', 'call-desk');
  const ir = parseProject(DIR, catalog);
  const html = emitHtmlApp(ir, catalog);
  const appId = JSON.parse(fs.readFileSync(path.join(DIR, 'nodegx.project.json'), 'utf-8')).metadata.cloudservices.appId;
  const backend = { spec: { classes: {}, sessions: {} }, appId };
  const STEPS = ['Publish', 'type:a page id:p-2', 'Publish'];
  /**
   * Predicted before either arm ran: heading, Published?, the id it answered, why it failed, last published, last failure,
   * the field. A Publish with no id is refused (`fake-parse-backend.js`'s `publishPage`): its Error and the Failure chain's
   * Set; one with an id answers both results, and Done's Set; the Error is never cleared (the runtime's own).
   */
  const PREDICTED = [
    ['Call Desk', '', '', '', '', '', '[a page id]=', 'focus=none'],
    ['Call Desk', '', '', 'No page id.', '', 'No page id.', '[a page id]=', 'focus=none'],
    ['Call Desk', '', '', 'No page id.', '', 'No page id.', '[a page id]=p-2', 'focus=none'],
    ['Call Desk', 'true', 'p-2', 'No page id.', 'p-2', 'No page id.', '[a page id]=p-2', 'focus=none']
  ];
  let out: ArmOut = { readings: [], requests: [] };
  let react: ArmOut = { readings: [], requests: [] };
  beforeAll(async () => {
    out = await htmlOne(html.files, STEPS, { backend, allowErrors: ['No page id.'], fields: true });
    react = reactArm({ dir: writeApp(emitApp(ir, catalog)), scenarios: [STEPS], backend, allowErrors: ['No page id.'], fields: true });
  }, 300_000);

  it('E0 the desk is printed whole', () => {
    expect(html.preflight.htmlLosses).toEqual([]);
  });

  it('E1 the HTML export reads what was predicted at every step, and exactly what the React export reads', () => {
    expect(out.readings).toEqual(PREDICTED);
    expect(react.readings).toEqual(PREDICTED);
  });

  it('E2 the wire: the same two calls, the same bodies (the authored parameter folded in, the wired one read at the press)', () => {
    expect(out.requests).toEqual(react.requests);
    expect(out.requests.map((r) => `${r.method} ${r.path} ${JSON.stringify(r.body)}`)).toEqual(['POST /functions/publishPage {"pageId":"","publish":true}', 'POST /functions/publishPage {"pageId":"p-2","publish":true}']);
  });
});

describe('§D the client over the corpus: every template, with a backend declared, carries its client into the folder', () => {
  const templates = path.join(__dirname, '..', '..', '..', 'templates');
  const names = fs.readdirSync(templates).filter((n) => fs.existsSync(path.join(templates, n, 'nodegx.project.json'))).sort();
  /** The template with a backend declared, in a copy, as a person's project with one is (EXP-022 S3's bound copy). */
  const bound = (name: string): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `htx004-${name}-`));
    fs.cpSync(path.join(templates, name), dir, { recursive: true });
    const file = path.join(dir, 'nodegx.project.json');
    const project = JSON.parse(fs.readFileSync(file, 'utf-8'));
    project.metadata = { ...(project.metadata ?? {}), cloudservices: { endpoint: 'http://127.0.0.1:1', appId: `htx004-${name}`, instanceId: 'x', type: 'nodegx' } };
    fs.writeFileSync(file, JSON.stringify(project));
    return dir;
  };

  it('D1 for each, every client module the React export writes travels, and the app loads from its own files only', async () => {
    const report: string[] = [];
    let carried = 0;
    for (const name of names) {
      const dir = bound(name);
      try {
        const ir = parseProject(dir, catalog);
        const client = clientFilesEsm(emitApp(ir, catalog).files);
        carried += Object.keys(client).length;
        await bundleApp(emitHtmlApp(ir, catalog).files);
      } catch (e) {
        report.push(`${name}: ${String(e).split('\n')[0]}`);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    expect(report).toEqual([]);
    expect(carried).toBeGreaterThan(names.length);
  }, 600_000);
});
