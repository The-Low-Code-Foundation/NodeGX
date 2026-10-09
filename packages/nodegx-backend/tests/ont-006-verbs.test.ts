/**
 * P116 ONT-006 — workflows are sentences, run.
 *
 * `projectVerb()` (`@nodegx/project-contract/world`) turns a verb — the enrolment note and the
 * archive note as `docs/world/verbs.json` — into a workflow definition. This file grades it where
 * it runs:
 *
 *   - **AC1, the engine** — the definition is one the admin route would take (`validateWorkflowDefinition`
 *     finds nothing), and the REAL engine runs it with the real `transform` and `stop` executors and the
 *     functions scripted: the member exists in the learning platform → three requests and done; the member
 *     does not → two requests, the arm "they have no account there yet" recorded in the run with the
 *     person's words and the failure's, the enrolment skipped, the run a success; the arm's mutant (the
 *     error edge taken out) halts the run instead;
 *   - **AC1, the world** — the nodes the steps bind to, played in NSP-014's world (`@nodegx/node-spec`'s
 *     interpreter): an `ask` is one request and the scripted 404 is the Failure the arm hangs on; a `make`
 *     is one `create` handed to the backend;
 *   - **AC2, the rows** — the archive verb's steps are the rows of the note's table, and each row's claim
 *     runs on SQLite and PostgreSQL through `runClaim`: a membership ends by its `until` and stays; a
 *     person ends by their `endedAt` and stays; "their record stays" is measured NOT kept by the store
 *     (who may delete is the collection's permissions), as ONT-003's not-held claims are;
 *   - **AC3** is the validator's, graded in the contract package (`tests/verbs.test.ts`).
 *
 * PostgreSQL is skipped when no server answers, as BRG-005's suites are.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { makeContext, runClaim, saysTheRule } from '@noodl/backend-contract/conformance';

import { ExecutionHistory } from '../src/execution/ExecutionStore';
import { createAdapter, type PersistenceHandle } from '../src/persistence/createAdapter';
import { deletesThroughTheFacade } from './helpers/facade-deletes';
import type { StepExecContext, StepExecutor } from '../src/workflow/StepExecutor';
import { CompositeStepExecutor } from '../src/workflow/steps/CompositeStepExecutor';
import { WorkflowEngine, validateWorkflowDefinition } from '../src/workflow/WorkflowEngine';
import type { WorkflowDefinition } from '../src/workflow/types';
// Relative on purpose, as ONT-003's spec: this package declares no dependency on the project contract.
import { projectVerb, projectWorld, verbClaims, type Verb, type VerbWorkflow, type WorldFiles } from '../../nodegx-project-contract/world';

jest.setTimeout(300000);

const FIXTURE = path.join(__dirname, '../../nodegx-project-contract/tests/fixtures/world-verbs/docs/world');
const read = (name: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE, `${name}.json`), 'utf8'));
const WORLD: WorldFiles = { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary'), verbs: read('verbs') };
const ENROL: Verb = WORLD.verbs!.verbs[0];
const ARCHIVE: Verb = WORLD.verbs!.verbs[1];

function projected(verb: Verb): VerbWorkflow {
  const p = projectVerb(verb, WORLD);
  if (!p.ok) throw new Error(p.problems.join('\n'));
  return p.workflow;
}
/** The definition as the registry would persist it: the timestamps are its. */
const asDefinition = (w: VerbWorkflow): WorkflowDefinition => ({ ...(w as unknown as WorkflowDefinition), createdAt: '2026-10-09T00:00:00.000Z', updatedAt: '2026-10-09T00:00:00.000Z' });

// ---------------------------------------------------------------------- the engine --

/** The functions a verb calls, scripted by name: what each answers, or the failure it meets. A record of every call. */
class ScriptedFunctions implements StepExecutor {
  calls: string[] = [];
  constructor(private readonly script: Record<string, (input: Record<string, unknown>) => Record<string, unknown>>) {}
  async execute(ctx: StepExecContext): Promise<Record<string, unknown>> {
    const ref = ctx.step.ref!;
    this.calls.push(ref);
    const fn = this.script[ref];
    if (!fn) throw new Error(`no function ${ref}`);
    return fn(ctx.input);
  }
}

const failure = (message: string, statusCode: number): never => {
  throw Object.assign(new Error(message), { statusCode });
};

function engineWith(functions: ScriptedFunctions): { engine: WorkflowEngine; history: ExecutionHistory; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont006-'));
  const history = new ExecutionHistory();
  history.open(dir);
  const executor = new CompositeStepExecutor({ getRunner: () => null, overrides: { 'call-function': functions } });
  const engine = new WorkflowEngine({ executions: history, executor, backendId: 'b1', backendName: 'B1' });
  return { engine, history, dir };
}

type Recorded = { nodeId: string; status: string; outputData?: Record<string, unknown>; errorMessage?: string };
/** The run's steps by id. The engine records them in its own (topological) order — a skipped arm may be recorded before the steps that ran — so the verdict per step is what is asserted, never the order. */
function stepsOf(history: ExecutionHistory, executionId: string): Record<string, Recorded> {
  const rec = history.get(executionId) as { steps: Array<Recorded & { stepIndex: number }> };
  return Object.fromEntries(rec.steps.map(({ nodeId, status, outputData, errorMessage }) => [nodeId, { nodeId, status, outputData, errorMessage }]));
}
const verdicts = (steps: Record<string, Recorded>): Record<string, string> => Object.fromEntries(Object.values(steps).map((s) => [s.nodeId, s.status]));

/** The enrolment verb's functions: the person made here; the mailing system and the learning platform asked. `found` scripts the lookup. */
function enrolment(found: boolean): ScriptedFunctions {
  return new ScriptedFunctions({
    'enrol-person-here': (input) => ({ objectId: 'p1', name: input.name }),
    'enrol-mailing': () => ({ status: 200, contact: 'c1' }),
    'enrol-learning-account': () => (found ? { status: 200, learner: 'l1' } : failure('no such learner', 404)),
    'enrol-enrol': () => ({ status: 201, enrolment: 'e1' })
  });
}
/** The requests the enrolment makes: every `ask` step's function called, in the world's sense (R9: the person made here is a backend operation, not a request). */
const ASKS = new Set(['enrol-mailing', 'enrol-learning-account', 'enrol-enrol']);

describe('ONT-006 AC1 — the enrolment verb runs in the engine', () => {
  const dirs: string[] = [];
  afterAll(() => {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  });
  const workflow = projected(ENROL);

  it('projects to a definition the admin workflow route takes', () => {
    expect(validateWorkflowDefinition(asDefinition(workflow))).toEqual([]);
    expect(validateWorkflowDefinition(asDefinition(projected(ARCHIVE)))).toEqual([]);
  });

  it('the member exists in the learning platform: three requests, every step done, the arm not taken', async () => {
    const functions = enrolment(true);
    const { engine, history, dir } = engineWith(functions);
    dirs.push(dir);
    const res = await engine.run(asDefinition(workflow), { trigger: { type: 'manual' }, payload: { name: 'Ada' } });
    expect(res.status).toBe('success');
    expect(functions.calls).toEqual(['enrol-person-here', 'enrol-mailing', 'enrol-learning-account', 'enrol-enrol']);
    expect(functions.calls.filter((c) => ASKS.has(c))).toHaveLength(3);
    expect(verdicts(stepsOf(history, res.executionId))).toEqual({ 'person-here': 'success', mailing: 'success', 'learning-account': 'success', enrol: 'success', 'no-account-there': 'skipped' });
  });

  it('the member does not: two requests, the arm recorded in the person’s words with the failure, the enrolment skipped, the run a success', async () => {
    const functions = enrolment(false);
    const { engine, history, dir } = engineWith(functions);
    dirs.push(dir);
    const res = await engine.run(asDefinition(workflow), { trigger: { type: 'manual' }, payload: { name: 'Ada' } });
    expect(res.status).toBe('success');
    expect(res.unroutedError).toBe(false);
    expect(functions.calls).toEqual(['enrol-person-here', 'enrol-mailing', 'enrol-learning-account']);
    expect(functions.calls.filter((c) => ASKS.has(c))).toHaveLength(2);
    const steps = stepsOf(history, res.executionId);
    expect(verdicts(steps)).toEqual({ 'person-here': 'success', mailing: 'success', 'learning-account': 'error', 'no-account-there': 'success', enrol: 'skipped' });
    expect(steps['no-account-there'].outputData).toEqual({
      arm: 'no-account-there',
      step: 'learning-account',
      when: 'they have no account there yet',
      sees: 'Enrolled everywhere but the learning platform: they have no account there yet. Recorded; the next run tries again.',
      error: 'no such learner'
    });
    expect(steps['learning-account'].errorMessage).toContain('no such learner');
  });

  it('the mutant: without the arm’s error edge the same failure halts the run, and the person is told which step', async () => {
    const functions = enrolment(false);
    const { engine, history, dir } = engineWith(functions);
    dirs.push(dir);
    const def = asDefinition(workflow);
    const unrouted: WorkflowDefinition = { ...def, steps: def.steps.map((s) => (s.id === 'learning-account' ? { ...s, onError: undefined } : s)) };
    const res = await engine.run(unrouted, { trigger: { type: 'manual' }, payload: { name: 'Ada' } });
    expect(res.status).toBe('error');
    expect(res.unroutedError).toBe(true);
    expect(verdicts(stepsOf(history, res.executionId))).toEqual({ 'person-here': 'success', mailing: 'success', 'learning-account': 'error', 'no-account-there': 'skipped', enrol: 'skipped' });
  });

  it('an arm that stops: the run fails with the arm’s words, not the failure’s', async () => {
    const stops: Verb = JSON.parse(JSON.stringify(ENROL));
    stops.steps[1].fails = [{ id: 'refused-there', when: 'the mailing system refuses them', then: 'stop', sees: 'Not enrolled: the mailing system refused them. Nothing else was done.' }];
    const functions = new ScriptedFunctions({ 'enrol-person-here': () => ({ objectId: 'p1' }), 'enrol-mailing': () => failure('Forbidden', 403) });
    const { engine, history, dir } = engineWith(functions);
    dirs.push(dir);
    const res = await engine.run(asDefinition(projected(stops)), { trigger: { type: 'manual' } });
    expect(res.status).toBe('error');
    const steps = stepsOf(history, res.executionId);
    expect(verdicts(steps)).toEqual({ 'person-here': 'success', mailing: 'error', 'refused-there': 'error', 'learning-account': 'skipped', 'no-account-there': 'skipped', enrol: 'skipped' });
    expect(steps['refused-there'].errorMessage).toContain('the mailing system refuses them: Not enrolled: the mailing system refused them.');
  });

  it('the archive verb: the keep is a note the run keeps, the arm goes on to the person’s own end', async () => {
    const functions = new ScriptedFunctions({
      'archive-memberships-end': () => ({ ended: 2 }),
      'archive-access-ends': () => failure('no such learner', 404),
      'archive-person-ends': () => ({ endedAt: '2026-10-09' })
    });
    const { engine, history, dir } = engineWith(functions);
    dirs.push(dir);
    const res = await engine.run(asDefinition(projected(ARCHIVE)), { trigger: { type: 'manual' }, payload: { person: 'p1' } });
    expect(res.status).toBe('success');
    const steps = stepsOf(history, res.executionId);
    expect(verdicts(steps)).toEqual({ 'record-stays': 'success', 'memberships-end': 'success', 'access-ends': 'error', 'no-access-there': 'success', 'person-ends': 'success' });
    expect(steps['record-stays'].outputData).toEqual({ kept: 'person', says: 'their record and its history stay' });
    expect(steps['no-access-there'].outputData).toMatchObject({ arm: 'no-access-there', error: 'no such learner' });
  });
});

// ----------------------------------------------------------------------- the world --

/** `@nodegx/node-spec`'s interpreter, when this package's jest can load it: the world the nodes are specced against. */
function nodeSpec(): { play: Function; interpreterAdapter: Function; World: new (script: unknown) => unknown } | string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { play } = require('../../nodegx-node-spec/src/adapter');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { interpreterAdapter } = require('../../nodegx-node-spec/src/adapters/interpreter');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { World } = require('../../nodegx-node-spec/src/world');
    return { play, interpreterAdapter, World };
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
const spec = nodeSpec();
const inTheWorld = typeof spec === 'string' ? describe.skip : describe;

inTheWorld('ONT-006 AC1 — the nodes the steps bind to, played in NSP-014’s world', () => {
  const s = spec as Exclude<typeof spec, string>;
  type Event = { t: string; port?: string; value?: unknown; op?: string };
  const play = (type: string, params: Record<string, unknown>, steps: unknown[], world: unknown): Promise<Event[]> =>
    s.play(s.interpreterAdapter(), type, params, steps, world) as Promise<Event[]>;
  const outcomes = (trace: Event[]) => trace.filter((e) => e.t === 'outcome').map((e) => e.value);

  it('an ask is one request; the platform’s 404 is the Failure the arm hangs on, a 200 is Done', async () => {
    const url = 'https://learning.example/learners/ada';
    const missing = await play('net.noodl.HTTP', { url }, [{ signal: 'fetch' }, 'settle'], new s.World({ network: [{ answer: { status: 404, body: { error: 'no such learner' } } }] }));
    expect(missing.filter((e) => e.t === 'request')).toHaveLength(1);
    expect(outcomes(missing)).toEqual(['failure']);
    const found = await play('net.noodl.HTTP', { url }, [{ signal: 'fetch' }, 'settle'], new s.World({ network: [{ answer: { status: 200, body: { learner: 'l1' } } }] }));
    expect(found.filter((e) => e.t === 'request')).toHaveLength(1);
    expect(outcomes(found)).toEqual(['done']);
  });

  it('a make is one create handed to the backend (R9: the operation, not the wire); a refusal is its Failure', async () => {
    const steps = [{ set: 'prop-name', value: 'Ada' }, { signal: 'store' }, 'settle'];
    const made = await play('NewDbModelProperties', { collectionName: 'Person' }, steps, new s.World({ backend: { answers: [{ answer: { ok: { objectId: 'p1' } } }] } }));
    expect(made.filter((e) => e.t === 'backend').map((e) => e.op)).toEqual(['create']);
    expect(outcomes(made)).toEqual(['done']);
    const refused = await play('NewDbModelProperties', { collectionName: 'Person' }, steps, new s.World({ backend: { answers: [{ answer: { error: 'Forbidden' } }] } }));
    expect(refused.filter((e) => e.t === 'backend').map((e) => e.op)).toEqual(['create']);
    expect(outcomes(refused)).toEqual(['failure']);
  });
});

if (typeof spec === 'string') {
  it('names why the world could not be played here', () => {
    console.warn(`ONT-006: node-spec not played in this package's jest — ${spec}`);
    expect(spec).toBeTruthy();
  });
}

// ------------------------------------------------------------------------ the rows --

type Engine = { name: string; available: boolean; make: () => Promise<PersistenceHandle>; teardown: () => Promise<void> };

function sqlite(): Engine {
  const dirs: string[] = [];
  const handles: PersistenceHandle[] = [];
  return {
    name: 'local-sql (node:sqlite)',
    available: true,
    async make() {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont006-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir });
      handles.push(h);
      return h;
    },
    async teardown() {
      for (const h of handles) await h.adapter.disconnect();
      for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
    }
  };
}

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}
function pgReachable(): boolean {
  try {
    psql(ADMIN_URL, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
}
function postgres(): Engine {
  const dirs: string[] = [];
  const handles: PersistenceHandle[] = [];
  const dbs: string[] = [];
  return {
    name: 'postgres',
    available: pgReachable(),
    async make() {
      const db = `nodegx_ont006_${process.pid}_${Date.now().toString(36)}_${dbs.length}`;
      psql(ADMIN_URL, `CREATE DATABASE "${db}"`);
      dbs.push(db);
      const u = new URL(ADMIN_URL);
      u.pathname = `/${db}`;
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont006-pg-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir, storageUrl: u.toString() });
      handles.push(h);
      return h;
    },
    async teardown() {
      for (const h of handles) {
        try {
          await h.adapter.disconnect();
        } catch {
          /* best-effort teardown */
        }
      }
      for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
      for (const db of dbs) {
        try {
          psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${db}"`);
        } catch {
          /* a client still attached; the name is not reused */
        }
      }
    }
  };
}

for (const engine of [sqlite(), postgres()]) {
  const suite = engine.available ? describe : describe.skip;
  suite(`ONT-006 AC2 — a claim per row of the archive verb, on ${engine.name}`, () => {
    afterAll(() => engine.teardown());
    const schema = (() => {
      const p = projectWorld(WORLD);
      if (!p.ok) throw new Error(p.problems.join('\n'));
      return p.schema;
    })();
    const claims = (() => {
      const c = verbClaims(ARCHIVE, WORLD);
      if (!c.ok) throw new Error(c.problems.join('\n'));
      return c.claims;
    })();

    it('the rows are the note’s table: what stays, what ends', () => {
      expect(claims.map((c) => [c.id, c.held])).toEqual([
        ['archive/record-stays', false],
        ['archive/memberships-end', true],
        ['archive/person-ends', true]
      ]);
    });

    it('every held row passes on records, and the row the store does not keep fails at the step that says it', async () => {
      const h = await engine.make();
      const ctx = makeContext(deletesThroughTheFacade(h.adapter), 'ont006');
      const wrong: string[] = [];
      for (const claim of claims) {
        const run = await runClaim(ctx, schema, claim);
        if (claim.held && run.at >= 0) wrong.push(`${claim.id} is not kept: step ${run.at} — ${run.message}`);
        if (!claim.held && (run.at < 0 || !saysTheRule(claim.steps[run.at]))) wrong.push(`${claim.id} was expected to fail at its rule, and ${run.at < 0 ? 'passed' : `failed at step ${run.at}: ${run.message}`}`);
      }
      expect(wrong).toEqual([]);
    });

    it('the grade grades something: an end whose date is never written fails at the read-back', async () => {
      const h = await engine.make();
      const ctx = makeContext(deletesThroughTheFacade(h.adapter), 'ont006m');
      const ends = claims.find((c) => c.id === 'archive/memberships-end')!;
      const mutant = { ...ends, steps: ends.steps.filter((s) => !('change' in s)) };
      const run = await runClaim(ctx, schema, mutant);
      expect(run.at).toBe(mutant.steps.findIndex((s) => 'holds' in s));
      expect(run.message).toMatch(/until holds/);
    });

    it('the enrolment verb’s one row — the person made here — passes too', async () => {
      const h = await engine.make();
      const ctx = makeContext(deletesThroughTheFacade(h.adapter), 'ont006e');
      const c = verbClaims(ENROL, WORLD);
      if (!c.ok) throw new Error(c.problems.join('\n'));
      expect(c.claims.map((x) => x.id)).toEqual(['enrol/person-here']);
      expect(await runClaim(ctx, schema, c.claims[0])).toEqual({ at: -1 });
    });
  });
}
