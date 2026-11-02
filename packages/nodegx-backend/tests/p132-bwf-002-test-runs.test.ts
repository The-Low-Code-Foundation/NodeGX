/**
 * P132 BWF-002 — a workflow tested on a sample, over a real BackendService.
 *
 *   - `stopAfter` runs that step and the steps that lead to it, then stops: the step after it is recorded skipped,
 *     the record says `stoppedAfter`, and the run is not a failure;
 *   - a sibling branch that is not on the way to `stopAfter` does not run, even though it comes first;
 *   - `as: { type: 'db-change', … }` starts the run the way a row change does (the row is `body`, the change is on
 *     `trigger`, the record's trigger type is `db_change`), and the record is marked a test;
 *   - a step `stopAfter` names that the workflow does not have is refused in words.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { ExecutionWithSteps } from '../src/execution/ExecutionStore';
import type { WorkflowResponse, WorkflowRunResponse } from '../src/server/admin-workflows';
import { BackendService } from '../src/service';

import { adminHeaders, ErrorBody, httpClient } from './helpers/http';

jest.setTimeout(30000);

describe('P132 BWF-002: test a workflow on a sample', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const http = httpClient(
    () => base,
    () => adminHeaders(dataDir)
  );
  const req = <T = unknown>(method: string, p: string, body?: unknown) => http.request<T>(method, p, { body });
  const stepsOf = async (executionId: string) => {
    const rec = await req<ExecutionWithSteps>('GET', `/executions/${executionId}`);
    return { rec: rec.json, by: new Map(rec.json.steps.map((s) => [s.nodeId, s])) };
  };

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bwf002-'));
    service = new BackendService({ dataDir, port: 0, backendId: 'bwf002', backendName: 'BWF-002' });
    base = (await service.start()).listen.url;
    // When a plant is watered: what the row says, then a line built from step 1's output.
    const made = await req<WorkflowResponse>('POST', '/admin/workflow-defs', {
      id: 'watered',
      name: 'When a plant is watered',
      entry: 'read',
      steps: [
        { id: 'read', kind: 'transform', params: { output: { plant: { $path: 'body.plant' }, action: { $path: 'trigger.action' } } }, next: ['say'] },
        { id: 'say', kind: 'transform', params: { output: { line: { $path: 'upstream.read.plant' } } } }
      ]
    });
    expect(made.status).toBe(201);
    const forked = await req<WorkflowResponse>('POST', '/admin/workflow-defs', {
      id: 'forked',
      entry: 'start',
      steps: [
        { id: 'start', kind: 'transform', params: { output: { n: 1 } }, next: ['side', 'main'] },
        { id: 'side', kind: 'transform', params: { output: { side: true } } },
        { id: 'main', kind: 'transform', params: { output: { main: true } }, next: ['after'] },
        { id: 'after', kind: 'transform', params: { output: { after: true } } }
      ]
    });
    expect(forked.status).toBe(201);
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('runs as a row change on a picked row: both steps run, each with its in and out, marked a test', async () => {
    const res = await req<WorkflowRunResponse>('POST', '/admin/workflow-defs/watered/run', {
      payload: { id: 'w1', plant: 'Monstera' },
      as: { type: 'db-change', collection: 'Watering', action: 'create', recordId: 'w1' }
    });
    expect(res.status).toBe(200);
    expect(res.json.run.status).toBe('success');
    expect(res.json.run.test).toBe(true);
    expect(res.json.run.stoppedAfter).toBeUndefined();
    expect(res.json.run.output).toEqual({ line: 'Monstera' });

    const { rec, by } = await stepsOf(res.json.run.executionId);
    expect(rec.triggerType).toBe('db_change');
    expect(rec.metadata).toMatchObject({ test: true });
    expect(by.get('read')?.status).toBe('success');
    expect(by.get('read')?.outputData).toEqual({ plant: 'Monstera', action: 'create' });
    expect((by.get('read')?.inputData as { body?: unknown }).body).toEqual({ id: 'w1', plant: 'Monstera' });
    expect(by.get('say')?.outputData).toEqual({ line: 'Monstera' });
  });

  it('stops after the named step: the next one is not reached and the run is not a failure', async () => {
    const res = await req<WorkflowRunResponse>('POST', '/admin/workflow-defs/watered/run', {
      payload: { plant: 'Fern' },
      stopAfter: 'read'
    });
    expect(res.status).toBe(200);
    expect(res.json.run.status).toBe('success');
    expect(res.json.run.stoppedAfter).toBe('read');
    expect(res.json.run.test).toBe(true);
    expect(res.json.run.stepsRun).toBe(1);

    const { rec, by } = await stepsOf(res.json.run.executionId);
    expect(rec.metadata).toMatchObject({ test: true, stopAfter: 'read', stoppedAfter: 'read' });
    expect(by.get('read')?.status).toBe('success');
    expect(by.get('say')?.status).toBe('skipped');
  });

  it('runs only the way to the step: a sibling branch that comes first in order is skipped', async () => {
    const res = await req<WorkflowRunResponse>('POST', '/admin/workflow-defs/forked/run', { payload: {}, stopAfter: 'main' });
    expect(res.json.run.stoppedAfter).toBe('main');
    const { by } = await stepsOf(res.json.run.executionId);
    expect(by.get('start')?.status).toBe('success');
    expect(by.get('main')?.status).toBe('success');
    expect(by.get('side')?.status).toBe('skipped');
    expect(by.get('after')?.status).toBe('skipped');
  });

  it('a plain run is neither a test nor stopped, and keeps the manual trigger type', async () => {
    const res = await req<WorkflowRunResponse>('POST', '/admin/workflow-defs/watered/run', { payload: { plant: 'Ivy' } });
    expect(res.json.run.test).toBeUndefined();
    expect(res.json.run.stoppedAfter).toBeUndefined();
    const { rec } = await stepsOf(res.json.run.executionId);
    expect(rec.triggerType).toBe('manual');
    expect(rec.metadata?.test).toBeUndefined();
  });

  it('refuses a step to stop after that the workflow does not have, and a sample of no known kind', async () => {
    const none = await req<ErrorBody>('POST', '/admin/workflow-defs/watered/run', { payload: {}, stopAfter: 'nope' });
    expect(none.status).toBe(400);
    expect(none.json.error).toMatch(/no step "nope"/);
    const odd = await req<ErrorBody>('POST', '/admin/workflow-defs/watered/run', { payload: {}, as: { type: 'email' } });
    expect(odd.status).toBe(400);
    expect(odd.json.error).toMatch(/db-change/);
  });
});
