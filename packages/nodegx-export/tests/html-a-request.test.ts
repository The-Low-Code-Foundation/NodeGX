/**
 * P134-S14-HTTPSTEP and P134-S14-URLWIRED — an HTTP Request whose URL arrives on a wire, in the running app, the React
 * export and the HTML export, pressed by one hand.
 *
 * HiveClip's window reaches its engine this way: a String Format makes `{url}/projects?token={token}` and each request
 * reads it. The plan refused every such request (the URL configures what the request is, EXP-011 §8.4), so no export had
 * one, and the HTML printer had never printed a request at all: no template's chain ran one. Session 14 lets the URL be a
 * value read when the request is sent (`buildUrl` over `_internal.url`) and copies React's `http-call` step into the HTML
 * printer.
 *
 * The Request Desk: a Variable `base` (the engine's address) feeds a String Format `{base}/projects`, which feeds the
 * request's URL. Load fetches; Done writes the answer's `count` (an Output Field, `$.count`) to `got`; Failure writes the
 * Error to `err`. Break points `base` at an address the engine does not have. The backend is `fake-parse-backend.js`,
 * fresh per arm, its `/engine/projects` route: `{ count: 2 }`; anything else 404 Not Found.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp } from '../src/emit/emitApp';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { htmlBackendArm } from './helpers/export-html-arm';
import { placeAll, writeDeskProject, type RawNode } from './helpers/root-desk';

const catalog = loadCatalog();

const nodes: RawNode[] = [
  { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Request Desk', urlPath: 'home' }, children: ['shell'] },
  { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: ['load', 'break', 'gotText', 'errText'], parameters: {} },
  { id: 'load', type: 'net.noodl.controls.button', label: 'Load', parent: 'shell', parameters: { label: 'Load' } },
  { id: 'break', type: 'net.noodl.controls.button', label: 'Break', parent: 'shell', parameters: { label: 'Break' } },
  { id: 'gotText', type: 'Text', label: 'Got', parent: 'shell', parameters: {} },
  { id: 'errText', type: 'Text', label: 'Err', parent: 'shell', parameters: {} },
  { id: 'baseVar', type: 'Variable2', label: 'base', parameters: { name: 'base', value: 'http://engine.test/engine' } },
  { id: 'gotVar', type: 'Variable2', label: 'got', parameters: { name: 'got', value: 'none' } },
  { id: 'errVar', type: 'Variable2', label: 'err', parameters: { name: 'err', value: 'none' } },
  { id: 'format', type: 'String Format', label: 'Engine URL', parameters: { format: '{base}/projects' } },
  {
    id: 'request',
    type: 'net.noodl.HTTP',
    label: 'Projects',
    parameters: { method: 'GET', responseMapping: 'count', 'mapping-path-count': '$.count' }
  },
  { id: 'setGot', type: 'Set Variable', label: 'Keep count', parameters: { name: 'got' } },
  { id: 'setErr', type: 'Set Variable', label: 'Keep error', parameters: { name: 'err' } },
  { id: 'setBase', type: 'Set Variable', label: 'Break base', parameters: { name: 'base', value: 'http://engine.test/nowhere' } }
];
const connections = [
  { fromId: 'baseVar', fromProperty: 'value', toId: 'format', toProperty: 'base' },
  { fromId: 'format', fromProperty: 'formatted', toId: 'request', toProperty: 'url' },
  { fromId: 'load', fromProperty: 'onClick', toId: 'request', toProperty: 'fetch' },
  { fromId: 'request', fromProperty: 'done', toId: 'setGot', toProperty: 'do' },
  { fromId: 'request', fromProperty: 'out-count', toId: 'setGot', toProperty: 'value' },
  { fromId: 'request', fromProperty: 'failure', toId: 'setErr', toProperty: 'do' },
  { fromId: 'request', fromProperty: 'error', toId: 'setErr', toProperty: 'value' },
  { fromId: 'break', fromProperty: 'onClick', toId: 'setBase', toProperty: 'do' },
  { fromId: 'gotVar', fromProperty: 'value', toId: 'gotText', toProperty: 'text' },
  { fromId: 'errVar', fromProperty: 'value', toId: 'errText', toProperty: 'text' }
];
const dir = writeDeskProject(
  { components: { 'Pages/Home': { nodes: placeAll(nodes), connections } } },
  { name: 'Request Desk', idBase: 'c0d1a000-0000-4000-8000-0000000018', prefix: 'request-desk-' }
);
const ir = parseProject(dir, catalog);
const html = emitHtmlApp(ir, catalog);
const backend = { spec: {}, appId: 'request-desk', endpoint: 'http://engine.test/parse' };

const STEPS = ['Load', 'Break', 'Load'];
/** The page's two Texts (got, err), read in order: predicted from `httpnode.ts` before any arm ran. */
const EXPECTED = [
  ['none', 'none'],
  ['2', 'none'], // Done: the count out of the answer
  ['2', 'none'], // the URL changes; nothing is asked until Load
  ['2', 'HTTP 404: Not Found'] // read when sent: the new address, which the engine does not have
];
/** What the engine was asked, by every arm: the wired URL as it stood at each Load. */
const ASKED = ['GET /engine/projects', 'GET /nowhere/projects'];

type Asked = Array<{ method: string; path: string }>;
const asked = (log: Asked): string[] => log.map((r) => `${r.method} ${r.path}`);
/** One arm in its own process; with a backend each answers `[{ readings, requests }]`, one scenario here. */
const run = (script: string, input: unknown): { readings: string[][]; asked: string[] } => {
  try {
    const [out] = JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', script)], {
        input: JSON.stringify(input),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 180000,
        maxBuffer: 16 * 1024 * 1024,
        // The running app's session store wants an origin (the backend desks' setting).
        env: { ...process.env, RUNTIME_ARM_URL: 'http://localhost/' }
      })
    );
    return { readings: out.readings[0], asked: asked(out.requests[0]) };
  } catch (e) {
    return { readings: [[`${script} threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0]}`]], asked: [] };
  }
};

describe('P134-S14 — a request whose URL arrives on a wire, in every export', () => {
  let fromRuntime: { readings: string[][]; asked: string[] };
  let fromReact: { readings: string[][]; asked: string[] };
  let fromHtml: string[][];
  let htmlAsked: string[];
  beforeAll(async () => {
    fromRuntime = run('runtime-mounted-arm.js', [{ dir, scenarios: [STEPS], backend, allowErrors: ['The server answered 404 Not Found [http/error-status]'] }]);
    const reactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'request-desk-react-'));
    for (const [file, text] of Object.entries(emitApp(ir, catalog).files)) {
      fs.mkdirSync(path.dirname(path.join(reactDir, file)), { recursive: true });
      fs.writeFileSync(path.join(reactDir, file), text);
    }
    fromReact = run('export-react-arm.js', [{ dir: reactDir, scenarios: [STEPS], settled: true, ticks: 8, backend, allowErrors: ['HTTP 404: Not Found [http/error-status]'] }]);
    const [arm] = await htmlBackendArm(html.files, [STEPS], { backend, allowErrors: ['HTTP 404: Not Found [http/error-status]'] });
    fromHtml = arm.readings;
    htmlAsked = asked(arm.requests as Asked);
  }, 300000);

  it('R0. the plan refuses nothing on the desk, and the HTML export leaves nothing out', () => {
    expect(html.preflight.planRefusals).toEqual([]);
    expect(html.preflight.htmlLosses).toEqual([]);
  });

  it('R1. the running app reads the prediction at every press (the reference, read first)', () => {
    expect(fromRuntime.readings).toEqual(EXPECTED);
  });

  it('R2. the React export reads what the running app reads at every press', () => {
    expect(fromReact.readings).toEqual(fromRuntime.readings);
  });

  it('R3. the HTML export reads what the running app reads at every press', () => {
    expect(fromHtml).toEqual(fromRuntime.readings);
  });

  it('R4. every arm asked the engine at the address the wire held at each press, and nothing else', () => {
    expect({ runtime: fromRuntime.asked, react: fromReact.asked, html: htmlAsked }).toEqual({ runtime: ASKED, react: ASKED, html: ASKED });
  });

  it('R5. a mutant that reads the URL once, at the first press, asks the old address again (killed, in the HTML export)', async () => {
    const http = html.files['api/http.js'];
    expect(http).toContain('const url = params.url || "";');
    const stuck = http.replace('const url = params.url || "";', 'const url = (globalThis.__firstUrl ??= params.url) || "";');
    const [arm] = await htmlBackendArm({ ...html.files, 'api/http.js': stuck }, [STEPS], { backend, allowErrors: ['HTTP 404: Not Found [http/error-status]'] });
    expect(asked(arm.requests as Asked)).toEqual([ASKED[0], ASKED[0]]);
    expect(arm.readings[3]).toEqual(['2', 'none']);
  }, 120000);
});
