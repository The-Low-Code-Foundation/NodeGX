/**
 * P132 BWF-013 AC3 (the MCP half): `list_backend_workflows` says which workflows are reusable pieces, who runs each,
 * what each reads from what it is sent, and what starts it — so an agent asked to reuse steps finds the piece by its
 * id instead of grepping the project, and writes a `run-workflow` step sending what the piece reads.
 *
 *   Pure — `pieceSummary` on named workflows and triggers (each item named, never a loop over the list it checks).
 *   Live — the same answer through the tool, against the built backend (`dist/cli.js`), with a trigger on one runner.
 */
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { pieceSummary } from '../src/tools/backendTools';

import { connect, TestSession, call, reveal } from './helpers';

const piece = {
  id: 'check_thirst',
  name: 'Check thirst',
  steps: [
    { id: 'find', kind: 'find-records', params: { collection: 'Plant', where: { room: { $path: 'body.room' } } } },
    { id: 'answer', kind: 'return', params: { value: { $path: 'upstream.find.items' }, note: { $literal: { $path: 'body.ignored' } } } }
  ]
};
const morning = {
  id: 'morning',
  name: 'The morning check',
  steps: [{ id: 'run', kind: 'run-workflow', params: { workflow: 'check_thirst', send: { room: 'Kitchen' } } }]
};
const watered = {
  id: 'watered',
  name: 'When a plant is watered',
  steps: [
    { id: 'run1', kind: 'run-workflow', params: { workflow: 'check_thirst', send: { room: { $path: 'body.room' } } } },
    { id: 'run2', kind: 'run-workflow', params: { workflow: 'check_thirst', send: { room: 'Hall' } } }
  ]
};
const morningTrigger = { id: 'trg_morning', target: { kind: 'workflow', name: 'morning' } };
const wateredTrigger = { id: 'trg_watered', target: { kind: 'workflow', name: 'watered' } };

describe('P132 BWF-013 — pieceSummary', () => {
  it('lists the piece with both runners (each once), the name it reads, and nothing starting it', () => {
    const out = pieceSummary([piece, morning, watered] as never, [morningTrigger, wateredTrigger]);
    expect(out).toEqual([{ id: 'check_thirst', name: 'Check thirst', runBy: ['morning', 'watered'], reads: ['room'], startedBy: [] }]);
  });

  it('a workflow no trigger starts is a piece even when nothing runs it yet', () => {
    const out = pieceSummary([piece, morning] as never, []);
    expect(out.map((p) => p.id)).toEqual(['check_thirst', 'morning']);
    expect(out.find((p) => p.id === 'morning')).toEqual({ id: 'morning', name: 'The morning check', runBy: [], reads: [], startedBy: [] });
  });

  it('a workflow a trigger starts AND another runs is listed, with its trigger', () => {
    const runsMorning = { id: 'outer', steps: [{ id: 'r', kind: 'run-workflow', params: { workflow: 'morning' } }] };
    const out = pieceSummary([piece, morning, runsMorning] as never, [morningTrigger, { id: 'trg_outer', target: { kind: 'workflow', name: 'outer' } }]);
    expect(out.find((p) => p.id === 'morning')).toEqual({ id: 'morning', name: 'The morning check', runBy: ['outer'], reads: [], startedBy: ['trg_morning'] });
    expect(out.some((p) => p.id === 'outer')).toBe(false);
  });

  it('a trigger starting a FUNCTION of the same name starts no workflow', () => {
    const out = pieceSummary([morning] as never, [{ id: 't', target: { kind: 'function', name: 'morning' } }]);
    expect(out.map((p) => p.id)).toEqual(['morning']);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Live: through the tool, against the built backend
// ---------------------------------------------------------------------------------------------------------------

const BACKEND_CLI = path.join(__dirname, '..', '..', 'nodegx-backend', 'dist', 'cli.js');
const FIXTURE = path.join(__dirname, 'fixtures', 'demo-app');
const haveBundle = fs.existsSync(BACKEND_CLI);
const BACKEND_ID = 'mcp_bwf013_backend';

jest.setTimeout(40000);

(haveBundle ? describe : describe.skip)('P132 BWF-013 — list_backend_workflows says who runs a piece (live backend)', () => {
  let proc: ChildProcess;
  let backendsDir: string;
  let dataDir: string;
  let projectDir: string;
  let session: TestSession;
  const prevBackendsDir = process.env.NODEGX_BACKENDS_DIR;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-bwf013-data-'));
    proc = spawn(process.execPath, [BACKEND_CLI, 'serve', '--data-dir', dataDir, '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
    const port = await new Promise<number>((resolve, reject) => {
      let buf = '';
      const timer = setTimeout(() => reject(new Error(`backend did not become ready:\n${buf}`)), 20000);
      proc.stdout!.on('data', (chunk) => {
        buf += chunk.toString();
        const m = buf.match(/NODEGX_BACKEND_READY (\{.*\})/);
        if (m) {
          clearTimeout(timer);
          resolve(JSON.parse(m[1]).port);
        }
      });
      proc.on('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`backend exited early (${code}):\n${buf}`));
      });
    });
    backendsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-bwf013-backends-'));
    fs.mkdirSync(path.join(backendsDir, BACKEND_ID));
    fs.writeFileSync(path.join(backendsDir, BACKEND_ID, 'config.json'), JSON.stringify({ id: BACKEND_ID, name: 'BWF-013 backend', port }));
    fs.copyFileSync(path.join(dataDir, 'secrets.json'), path.join(backendsDir, BACKEND_ID, 'secrets.json'));
    process.env.NODEGX_BACKENDS_DIR = backendsDir;
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-bwf013-proj-'));
    fs.cpSync(FIXTURE, projectDir, { recursive: true });
    session = await connect(projectDir, true);
    await reveal(session, 'backend');
  });

  afterAll(async () => {
    if (session) await session.close();
    if (proc) proc.kill('SIGTERM');
    for (const d of [backendsDir, dataDir, projectDir]) if (d) fs.rmSync(d, { recursive: true, force: true });
    if (prevBackendsDir === undefined) delete process.env.NODEGX_BACKENDS_DIR;
    else process.env.NODEGX_BACKENDS_DIR = prevBackendsDir;
  });

  it('names the piece, both workflows that run it, and what it reads', async () => {
    const simplePiece = {
      id: 'greet',
      name: 'Say hello',
      entry: 'answer',
      steps: [{ id: 'answer', kind: 'return', params: { value: { $path: 'body.who' } } }]
    };
    const runner = (id: string, who: string) => ({
      id,
      name: id,
      entry: 'run',
      steps: [{ id: 'run', kind: 'run-workflow', params: { workflow: 'greet', send: { who } } }]
    });
    for (const def of [simplePiece, runner('first', 'Ann'), runner('second', 'Bo')]) {
      const res = await call<{ error?: unknown }>(session, 'create_backend_workflow', { backendId: BACKEND_ID, ...def });
      expect(res.data.error).toBeUndefined();
    }
    const trig = await call<{ error?: unknown }>(session, 'create_backend_trigger', {
      backendId: BACKEND_ID,
      type: 'webhook',
      name: 'Start first',
      webhook: { slug: 'start-first' },
      target: { kind: 'workflow', name: 'first' }
    });
    expect(trig.data.error).toBeUndefined();

    const { data } = await call<{ workflows: Array<{ id: string }>; pieces: Array<{ id: string; runBy: string[]; reads: string[]; startedBy: string[] }> }>(
      session,
      'list_backend_workflows',
      { backendId: BACKEND_ID }
    );
    expect(data.workflows.map((w) => w.id).sort()).toEqual(['first', 'greet', 'second']);
    expect(data.pieces.find((p) => p.id === 'greet')).toEqual({ id: 'greet', name: 'Say hello', runBy: ['first', 'second'], reads: ['who'], startedBy: [] });
    // `first` has a trigger and nothing runs it: not a piece. `second` has none: a piece nothing runs yet.
    expect(data.pieces.some((p) => p.id === 'first')).toBe(false);
    expect(data.pieces.find((p) => p.id === 'second')?.runBy).toEqual([]);
  });
});
