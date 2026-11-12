/**
 * P132 BWF-005 — steps that act on the data, over a real BackendService.
 *
 *   AC1 — `create-record` makes a row (a date typed as text is written as a date, a link given as an id as a link);
 *         `update-record` changes the row a link names; `delete-record` deletes it; `find-records` finds one, many and
 *         none, and routes `empty` / `nonempty`.
 *   R5  — with the workflow's *Ignore privacy rules* on (the default) a step changes a Plant that only a signed-in
 *         person may change; with it off the same step is refused, and says the switch is off.
 *   AC2 — a db-change trigger on Plant fires once for a Plant a step made; a workflow started by a change to Plant that
 *         changes a Plant does not start itself again.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { ExecutionWithSteps } from '../src/execution/ExecutionStore';
import type { WorkflowRunResponse } from '../src/server/admin-workflows';
import { BackendService } from '../src/service';

import { adminHeaders, httpClient } from './helpers/http';

jest.setTimeout(30000);

type Rec = Record<string, unknown> & { objectId: string };

describe('P132 BWF-005: record steps', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const http = httpClient(
    () => base,
    () => adminHeaders(dataDir)
  );
  const req = <T = unknown>(method: string, p: string, body?: unknown) => http.request<T>(method, p, { body });
  const define = async (def: Record<string, unknown>) => {
    const made = await req<{ error?: string }>('POST', '/admin/workflow-defs', def);
    if (made.status !== 201) throw new Error(`workflow ${String(def.id)} refused: ${JSON.stringify(made.json)}`);
  };
  const run = async (id: string, payload: unknown = {}) =>
    (await req<WorkflowRunResponse>('POST', `/admin/workflow-defs/${id}/run`, { payload })).json.run;
  const plants = async () => (await req<{ results: Rec[] }>('GET', '/classes/Plant?limit=100')).json.results;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bwf005-'));
    // A fresh local backend is dev-open, which lets every visitor past every rule; R5's switch is about the rules a
    // deployed backend enforces, so this one enforces them, open by default and closed on Plant below.
    const open = { find: 'public', get: 'public', create: 'public', update: 'public', delete: 'public' };
    fs.writeFileSync(
      path.join(dataDir, 'security.json'),
      JSON.stringify({
        version: 1,
        devOpen: false,
        defaults: { permissions: open, creatorOwns: false },
        collections: {},
        functions: {},
        files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
        signup: 'public'
      })
    );
    service = new BackendService({ dataDir, port: 0, backendId: 'bwf005', backendName: 'BWF-005' });
    base = (await service.start()).listen.url;
    for (const [table, columns] of [
      ['Plant', [{ name: 'name', type: 'String' }, { name: 'lastWatered', type: 'Date' }, { name: 'room', type: 'String' }]],
      ['Watering', [{ name: 'plant', type: 'Pointer', targetClass: 'Plant' }, { name: 'at', type: 'Date' }]],
      ['Note', [{ name: 'text', type: 'String' }]]
    ] as const) {
      expect((await req('POST', '/admin/schema', { action: 'createTable', table, columns })).status).toBeLessThan(300);
    }
    // Greenhouse's Plant: anyone may read it, only someone signed in may change it.
    const rules = await req('PUT', '/admin/permissions/collections/Plant', {
      permissions: { find: 'public', get: 'public', create: 'authenticated', update: 'authenticated', delete: 'authenticated' }
    });
    if (rules.status !== 200) throw new Error(JSON.stringify(rules.json));
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  describe('AC1: each kind', () => {
    it('create-record makes the row, a typed date as a date, and hands it on', async () => {
      await define({
        id: 'make-plant',
        entry: 'make',
        steps: [
          {
            id: 'make',
            kind: 'create-record',
            params: { table: 'Plant', fields: { name: { $path: 'body.name' }, lastWatered: '2026-11-01T09:00:00.000Z', room: 'kitchen' } }
          }
        ]
      });
      const r = await run('make-plant', { name: 'Monstera' });
      expect(r.status).toBe('success');
      const out = r.output as { id: string; record: Rec };
      expect(out.record.objectId).toBe(out.id);
      expect(out.record.name).toBe('Monstera');
      expect(out.record.lastWatered).toEqual({ __type: 'Date', iso: '2026-11-01T09:00:00.000Z' });
      const row = (await plants()).find((p) => p.objectId === out.id);
      expect(row && row.lastWatered).toEqual({ __type: 'Date', iso: '2026-11-01T09:00:00.000Z' });
    });

    it('update-record changes the Plant a Watering links to: its lastWatered becomes the watering’s date', async () => {
      const plant = (await req<Rec>('POST', '/classes/Plant', { name: 'Fern', room: 'hall' })).json;
      const watering = (
        await req<Rec>('POST', '/classes/Watering', {
          plant: { __type: 'Pointer', className: 'Plant', objectId: plant.objectId },
          at: { __type: 'Date', iso: '2026-11-03T08:30:00.000Z' }
        })
      ).json;
      const row = (await req<Rec>('GET', `/classes/Watering/${watering.objectId}`)).json;
      await define({
        id: 'mark-watered',
        entry: 'mark',
        steps: [
          {
            id: 'mark',
            kind: 'update-record',
            params: { table: 'Plant', record: { $path: 'body.plant' }, fields: { lastWatered: { $path: 'body.at' } } }
          }
        ]
      });
      const r = await run('mark-watered', row);
      expect(r.status).toBe('success');
      expect((r.output as { record: Rec }).record).toMatchObject({ objectId: plant.objectId, name: 'Fern', lastWatered: { iso: '2026-11-03T08:30:00.000Z' } });
      const after = (await req<Rec>('GET', `/classes/Plant/${plant.objectId}`)).json;
      expect(after.lastWatered).toEqual({ __type: 'Date', iso: '2026-11-03T08:30:00.000Z' });
      expect(after.room).toBe('hall');
    });

    it('update-record on a record that is not there fails the step and names it', async () => {
      const r = await run('mark-watered', { plant: 'nope123', at: '2026-11-03' });
      expect(r.status).toBe('error');
      expect(r.failedStep?.id).toBe('mark');
      expect(r.failedStep?.message).toMatch(/could not change Plant record nope123/);
    });

    it('delete-record deletes the row it is given', async () => {
      const doomed = (await req<Rec>('POST', '/classes/Plant', { name: 'Doomed' })).json;
      await define({ id: 'drop-plant', entry: 'drop', steps: [{ id: 'drop', kind: 'delete-record', params: { table: 'Plant', record: { $path: 'body.id' } } }] });
      const r = await run('drop-plant', { id: doomed.objectId });
      expect(r.status).toBe('success');
      expect(r.output).toEqual({ deleted: true, id: doomed.objectId });
      expect((await req('GET', `/classes/Plant/${doomed.objectId}`)).status).toBe(404);
    });

    it('find-records finds many, one and none, and routes empty / nonempty', async () => {
      for (const name of ['Ivy', 'Aloe', 'Basil']) await req('POST', '/classes/Plant', { name, room: 'study' });
      await define({
        id: 'find-room',
        entry: 'find',
        steps: [
          {
            id: 'find',
            kind: 'find-records',
            params: {
              table: 'Plant',
              where: [{ field: 'room', op: 'eq', value: { $path: 'body.room' } }],
              sortBy: 'name',
              limit: { $path: 'body.limit' }
            },
            routes: { empty: ['none'], nonempty: ['some'] }
          },
          { id: 'none', kind: 'return', params: { value: 'none' } },
          { id: 'some', kind: 'return', params: { value: { $path: 'upstream.find' } } }
        ]
      });
      const many = await run('find-room', { room: 'study', limit: 10 });
      const got = many.output as { items: Rec[]; count: number; first: Rec };
      expect(got.items.map((p) => p.name)).toEqual(['Aloe', 'Basil', 'Ivy']);
      expect(got.count).toBe(3);
      expect(got.first.name).toBe('Aloe');

      const one = (await run('find-room', { room: 'study', limit: 1 })).output as { items: Rec[]; first: Rec };
      expect(one.items).toHaveLength(1);
      expect(one.first.name).toBe('Aloe');

      expect((await run('find-room', { room: 'attic', limit: 10 })).output).toBe('none');
    });

    it('find-records reads a list of conditions: any of them, a text that starts with, a date before another', async () => {
      await define({
        id: 'find-any',
        entry: 'find',
        steps: [
          {
            id: 'find',
            kind: 'find-records',
            params: {
              table: 'Plant',
              match: 'any',
              where: [
                { field: 'name', op: 'startsWith', value: 'Ba' },
                { field: 'lastWatered', op: 'lt', value: '2026-11-02' }
              ],
              sortBy: 'name'
            }
          }
        ]
      });
      const r = await run('find-any');
      expect(r.status).toBe('success');
      expect((r.output as { items: Rec[] }).items.map((p) => p.name)).toEqual(['Basil', 'Monstera']);
    });

    it('refuses at write time a find condition with an operator a search cannot run, and a change with no record', async () => {
      const bad = await req<{ error: string; details?: string[] }>('POST', '/admin/workflow-defs', {
        id: 'bad',
        entry: 'a',
        steps: [
          { id: 'a', kind: 'find-records', params: { table: 'Plant', where: [{ field: 'name', op: 'truthy' }] }, next: ['b'] },
          { id: 'b', kind: 'update-record', params: { table: 'Plant', fields: { name: 'x' } } }
        ]
      });
      expect(bad.status).toBe(400);
      const said = JSON.stringify(bad.json);
      expect(said).toMatch(/op \\"truthy\\" is not one a search can use/);
      expect(said).toMatch(/update-record needs a \\"record\\"/);
    });
  });

  describe('R5: Ignore privacy rules', () => {
    it('on (the default), a step changes a Plant only a signed-in person may change; off, it is refused and says so', async () => {
      const plant = (await req<Rec>('POST', '/classes/Plant', { name: 'Cactus' })).json;
      // The control: a visitor's own request is refused by the table's rules.
      const visitor = await fetch(`${base}/classes/Plant/${plant.objectId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ room: 'porch' })
      });
      expect([401, 403]).toContain(visitor.status);

      const step = { id: 'move', kind: 'update-record', params: { table: 'Plant', record: plant.objectId, fields: { room: 'porch' } } };
      await define({ id: 'as-app', entry: 'move', steps: [step] });
      await define({ id: 'as-visitor', entry: 'move', ignorePrivacyRules: false, steps: [step] });

      const refused = await run('as-visitor');
      expect(refused.status).toBe('error');
      expect(refused.failedStep?.message).toMatch(/Ignore privacy rules" is off/);
      expect((await req<Rec>('GET', `/classes/Plant/${plant.objectId}`)).json.room ?? null).toBeNull();

      const allowed = await run('as-app');
      expect(allowed.status).toBe('success');
      expect((await req<Rec>('GET', `/classes/Plant/${plant.objectId}`)).json.room).toBe('porch');
    });

    it('keeps the switch on the stored workflow, and refuses a value that is not true or false', async () => {
      const got = await req<{ workflow: { ignorePrivacyRules?: boolean } }>('GET', '/admin/workflow-defs/as-visitor');
      expect(got.json.workflow.ignorePrivacyRules).toBe(false);
      const bad = await req('POST', '/admin/workflow-defs', { id: 'bad-switch', entry: 'a', ignorePrivacyRules: 'no', steps: [{ id: 'a', kind: 'stop', params: {} }] });
      expect(bad.status).toBe(400);
    });
  });

  describe('AC2: the change feed', () => {
    const waitFor = async <T>(read: () => Promise<T>, done: (v: T) => boolean, what: string): Promise<T> => {
      const until = Date.now() + 8000;
      for (;;) {
        const v = await read();
        if (done(v)) return v;
        if (Date.now() > until) throw new Error(`never: ${what} (${JSON.stringify(v)})`);
        await new Promise((r) => setTimeout(r, 100));
      }
    };
    const executionsOf = async (workflowId: string) =>
      (await req<ExecutionWithSteps[]>('GET', `/executions?workflowId=${workflowId}&limit=50`)).json;

    it('a db-change trigger on Plant fires once for a Plant a step made', async () => {
      await define({ id: 'on-plant', entry: 'log', steps: [{ id: 'log', kind: 'create-record', params: { table: 'Note', fields: { text: { $path: 'body.name' } } } }] });
      const trig = await req('POST', '/admin/triggers', {
        id: 'plant-made',
        type: 'db-change',
        target: { kind: 'workflow', name: 'on-plant' },
        dbChange: { collection: 'Plant', actions: ['create'] }
      });
      expect(trig.status).toBe(201);

      const made = await run('make-plant', { name: 'Peperomia' });
      expect(made.status).toBe('success');
      const notes = await waitFor(
        async () => (await req<{ results: Rec[] }>('GET', '/classes/Note?limit=100')).json.results.filter((n) => n.text === 'Peperomia'),
        (n) => n.length >= 1,
        'a Note for the Plant the step made'
      );
      await new Promise((r) => setTimeout(r, 500));
      expect((await req<{ results: Rec[] }>('GET', '/classes/Note?limit=100')).json.results.filter((n) => n.text === 'Peperomia')).toHaveLength(notes.length);
      expect(notes).toHaveLength(1);
      expect((await req('DELETE', '/admin/triggers/plant-made')).status).toBeLessThan(300);
    });

    it('a workflow started by a change to Plant that changes that Plant does not start itself again', async () => {
      await define({
        id: 'touch-plant',
        entry: 'touch',
        steps: [{ id: 'touch', kind: 'update-record', params: { table: 'Plant', record: { $path: 'trigger.recordId' }, fields: { room: 'touched' } } }]
      });
      expect(
        (
          await req('POST', '/admin/triggers', {
            id: 'plant-changed',
            type: 'db-change',
            target: { kind: 'workflow', name: 'touch-plant' },
            dbChange: { collection: 'Plant', actions: ['update'] }
          })
        ).status
      ).toBe(201);

      const plant = (await req<Rec>('POST', '/classes/Plant', { name: 'Loop' })).json;
      expect((await req('PUT', `/classes/Plant/${plant.objectId}`, { room: 'start' })).status).toBe(200);
      await waitFor(async () => (await req<Rec>('GET', `/classes/Plant/${plant.objectId}`)).json.room, (room) => room === 'touched', 'the workflow touched the Plant');
      await new Promise((r) => setTimeout(r, 800));
      const runs = await executionsOf('touch-plant');
      expect(runs).toHaveLength(1);
      expect((await req('DELETE', '/admin/triggers/plant-changed')).status).toBeLessThan(300);
    });
  });
});
