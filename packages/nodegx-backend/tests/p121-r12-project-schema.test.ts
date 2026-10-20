/**
 * P121 R12 (P121-TWO007-SCHEMANOWAY) — the editor adds a project's `backend/schema.json` to the
 * backend it starts for it, against a real backend.
 *
 * The step itself is the editor's main process (`noodl-editor/src/main/src/local-backend/
 * project-schema.js`), called from `BackendManager.startBackend` once the service is up. It goes
 * over HTTP with the supervisor's own `request` (the admin credential), so this spec hands it the
 * real `ServiceSupervisor.prototype.request` bound to an in-process backend: the same bytes the
 * editor sends.
 *
 * Richard, 2026-10-15: every collection the file declares that the backend lacks is created;
 * one that exists is never changed or deleted. What this grades:
 *
 *   - all four templates that ship a schema land whole on an empty backend, in both of the file's
 *     shapes (a list of `createTable` pushes; the Training template's `{ tables }` snapshot);
 *   - the consequence, not the call: after it, a second payment with the same reference is
 *     refused (R11), and so is a second Training cohort with the same id;
 *   - a second start adds nothing and changes nothing, even where a person changed a collection
 *     by hand (an index dropped, a column added), and a collection that was there first keeps its
 *     own columns;
 *   - one refused collection does not stop the others, and the report names it;
 *   - no file, a broken file and a shape it doesn't know are said, never thrown.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(60000);

type Report =
  | { status: 'none' }
  | { status: 'failed'; error: string }
  | { status: 'applied'; created: string[]; existing: string[]; failed: Array<{ table: string; error: string }> };
type Requester = (method: string, p: string, body?: unknown) => Promise<unknown>;

const LOCAL_BACKEND = path.join(__dirname, '../../noodl-editor/src/main/src/local-backend');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { applyProjectSchema } = require(path.join(LOCAL_BACKEND, 'project-schema.js')) as {
  applyProjectSchema: (request: Requester, projectDir: string | undefined) => Promise<Report>;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ServiceSupervisor } = require(path.join(LOCAL_BACKEND, 'ServiceSupervisor.js')) as {
  ServiceSupervisor: { prototype: { request: (this: unknown, method: string, p: string, body?: unknown) => Promise<unknown> } };
};

const TEMPLATES = path.join(__dirname, '../../../templates');
const TOKEN = 't0k';

/** The table names a template's file declares, in order, from either shape. */
function declared(template: string): string[] {
  const parsed = JSON.parse(fs.readFileSync(path.join(TEMPLATES, template, 'backend/schema.json'), 'utf8'));
  return Array.isArray(parsed) ? parsed.map((e: { table: string }) => e.table) : parsed.tables.map((t: { name: string }) => t.name);
}

interface Running {
  base: string;
  editor: Requester;
  req: <T = unknown>(method: string, p: string, body?: unknown) => Promise<{ status: number; json: T }>;
  names: () => Promise<string[]>;
  stop: () => Promise<void>;
}

async function backend(): Promise<Running> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-p121-r12-'));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  const service = new BackendService({ dataDir, port: 0, backendId: 'r12', backendName: 'R12', authToken: TOKEN });
  const base = (await service.start()).listen.url;
  // The editor's own client: the supervisor's `request`, its credential read from where the
  // supervisor reads it, here handed in.
  const supervisorLike = { endpoint: base, adminToken: () => TOKEN };
  const editor: Requester = (method, p, body) => ServiceSupervisor.prototype.request.call(supervisorLike, method, p, body);
  const req = <T = unknown>(method: string, p: string, body?: unknown) =>
    request<T>(base, method, p, { body, headers: { authorization: `Bearer ${TOKEN}` } });
  const names = async () => ((await req<{ tables: Array<{ name: string }> }>('GET', '/admin/schema')).json.tables || []).map((t) => t.name);
  return {
    base,
    editor,
    req,
    names,
    stop: async () => {
      await service.stop();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  };
}

const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
const at = { __type: 'Date', iso: '2026-10-15T09:00:00.000Z' };

describe('P121 R12 — every template that ships a schema lands whole on an empty backend', () => {
  for (const template of ['marketplace', 'gram', 'learn-with-simple-rick', 'digital-bricks-training']) {
    it(template, async () => {
      const b = await backend();
      try {
        const want = declared(template);
        expect(want.length).toBeGreaterThan(5);
        const before = await b.names();
        for (const t of want) expect(before).not.toContain(t);

        const report = await applyProjectSchema(b.editor, path.join(TEMPLATES, template));
        expect(report).toEqual({ status: 'applied', created: want, existing: [], failed: [] });
        const after = await b.names();
        for (const t of want) expect(after).toContain(t);
      } finally {
        await b.stop();
      }
    });
  }
});

describe('P121 R12 — what the schema keeps is kept', () => {
  it('the marketplace: a payment reference is one payment (R11), refused the second time', async () => {
    const b = await backend();
    try {
      await applyProjectSchema(b.editor, path.join(TEMPLATES, 'marketplace'));
      const country = await b.req<{ objectId: string }>('POST', '/classes/Country', { name: 'Ghana', currency: 'GHS' });
      expect(country.status).toBe(201);
      const order = await b.req<{ objectId: string }>('POST', '/classes/Order', { country: ptr('Country', country.json.objectId) });
      expect(order.status).toBe(201);
      const payment = { order: ptr('Order', order.json.objectId), at, provider: 'paystack', reference: 'MK-1-GH', outcome: 'paid' };
      expect((await b.req('POST', '/classes/Payment', payment)).status).toBe(201);
      const again = await b.req('POST', '/classes/Payment', payment);
      expect(again.status).toBeGreaterThanOrEqual(400);
      const rows = await b.req<{ results: unknown[] }>('GET', '/classes/Payment');
      expect(rows.json.results).toHaveLength(1);
      // The control: another reference is a payment like any other.
      expect((await b.req('POST', '/classes/Payment', { ...payment, reference: 'MK-2-GH' })).status).toBe(201);
    } finally {
      await b.stop();
    }
  });

  it('the control: with no schema added, the backend makes the collections on the first write, and keeps both payments', async () => {
    // What the builder got before R12 (s17 left it unmeasured): nothing refuses the write, nothing keeps the rule.
    const b = await backend();
    try {
      const country = await b.req<{ objectId: string }>('POST', '/classes/Country', { name: 'Ghana', currency: 'GHS' });
      expect(country.status).toBe(201);
      const order = await b.req<{ objectId: string }>('POST', '/classes/Order', { country: ptr('Country', country.json.objectId) });
      expect(order.status).toBe(201);
      const payment = { order: ptr('Order', order.json.objectId), at, provider: 'paystack', reference: 'MK-1-GH', outcome: 'paid' };
      expect((await b.req('POST', '/classes/Payment', payment)).status).toBe(201);
      expect((await b.req('POST', '/classes/Payment', payment)).status).toBe(201);
      expect((await b.req<{ results: unknown[] }>('GET', '/classes/Payment')).json.results).toHaveLength(2);
      // And a check the world keeps (one of two providers) is not kept either.
      expect((await b.req('POST', '/classes/Payment', { ...payment, reference: 'MK-3-GH', provider: 'anybody' })).status).toBe(201);
    } finally {
      await b.stop();
    }
  });

  it('the Training template (the { tables } shape): a cohort id is one cohort', async () => {
    const b = await backend();
    try {
      await applyProjectSchema(b.editor, path.join(TEMPLATES, 'digital-bricks-training'));
      expect((await b.req('POST', '/classes/Cohort', { cohortId: 'c1', name: 'One' })).status).toBe(201);
      expect((await b.req('POST', '/classes/Cohort', { cohortId: 'c1', name: 'Again' })).status).toBeGreaterThanOrEqual(400);
      expect((await b.req('POST', '/classes/Cohort', { cohortId: 'c2', name: 'Two' })).status).toBe(201);
    } finally {
      await b.stop();
    }
  });
});

describe('P121 R12 — a collection that exists is never changed', () => {
  it('a second start adds nothing, and leaves what a person changed by hand', async () => {
    const b = await backend();
    try {
      const dir = path.join(TEMPLATES, 'marketplace');
      await applyProjectSchema(b.editor, dir);
      // A person drops the payment's unique index and adds a column to the countries.
      expect((await b.req('POST', '/admin/schema', { action: 'setIndexes', table: 'Payment', indexes: [] })).status).toBe(200);
      expect((await b.req('POST', '/admin/schema', { action: 'addColumn', table: 'Country', column: { name: 'flag', type: 'String' } })).status).toBe(200);

      const again = await applyProjectSchema(b.editor, dir);
      expect(again).toEqual({ status: 'applied', created: [], existing: declared('marketplace'), failed: [] });

      const tables = (await b.req<{ tables: Array<{ name: string; columns: Array<{ name: string }>; indexes?: Array<{ fields: string[]; unique?: boolean }> }> }>('GET', '/admin/schema')).json.tables;
      const payment = tables.find((t) => t.name === 'Payment')!;
      expect((payment.indexes || []).filter((i) => i.unique && i.fields.join() === 'reference')).toEqual([]);
      expect(tables.find((t) => t.name === 'Country')!.columns.map((c) => c.name)).toContain('flag');
    } finally {
      await b.stop();
    }
  });

  it('a collection made before the template keeps its own columns; the rest are added round it', async () => {
    const b = await backend();
    try {
      expect((await b.req('POST', '/admin/schema', { action: 'createTable', table: 'Rate', columns: [{ name: 'mine', type: 'String' }] })).status).toBe(200);
      const report = await applyProjectSchema(b.editor, path.join(TEMPLATES, 'marketplace'));
      expect(report.status).toBe('applied');
      if (report.status !== 'applied') return;
      expect(report.existing).toEqual(['Rate']);
      expect(report.created).toEqual(declared('marketplace').filter((t) => t !== 'Rate'));
      const rate = (await b.req<{ tables: Array<{ name: string; columns: Array<{ name: string }> }> }>('GET', '/admin/schema')).json.tables.find(
        (t) => t.name === 'Rate'
      )!;
      const columns = rate.columns.map((c) => c.name);
      expect(columns).toContain('mine');
      expect(columns).not.toContain('currency');
    } finally {
      await b.stop();
    }
  });
});

describe('P121 R12 — what it says instead of throwing', () => {
  const project = (schema: string | null) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-p121-r12-project-'));
    if (schema !== null) {
      fs.mkdirSync(path.join(dir, 'backend'));
      fs.writeFileSync(path.join(dir, 'backend/schema.json'), schema);
    }
    return dir;
  };
  const nobody: Requester = async () => {
    throw new Error('no request should be made');
  };

  it('a project with no schema: none, and no request', async () => {
    expect(await applyProjectSchema(nobody, project(null))).toEqual({ status: 'none' });
    expect(await applyProjectSchema(nobody, undefined)).toEqual({ status: 'none' });
  });

  it('a file that is not JSON, or not a shape it knows: failed, in words, and no request', async () => {
    const broken = await applyProjectSchema(nobody, project('{ not json'));
    expect(broken).toMatchObject({ status: 'failed' });
    expect(broken.status === 'failed' && broken.error).toMatch(/backend\/schema\.json is not JSON/);
    const odd = await applyProjectSchema(nobody, project(JSON.stringify({ collections: [] })));
    expect(odd.status === 'failed' && odd.error).toMatch(/neither a list of createTable entries nor \{ tables/);
    const nameless = await applyProjectSchema(nobody, project(JSON.stringify([{ action: 'addColumn', table: 'X' }])));
    expect(nameless.status === 'failed' && nameless.error).toMatch(/entry 1 is not a createTable/);
  });

  it('one collection the backend refuses: named, and the others still made', async () => {
    const b = await backend();
    try {
      const schema = [
        { action: 'createTable', table: 'First', columns: [{ name: 'a', type: 'String' }] },
        // A series on a number column is refused by the backend (P116 ONT-015).
        { action: 'createTable', table: 'Refused', columns: [{ name: 'n', type: 'Number', series: { prefix: 'X-' } }] },
        { action: 'createTable', table: 'Last', columns: [{ name: 'b', type: 'String' }] }
      ];
      const report = await applyProjectSchema(b.editor, project(JSON.stringify(schema)));
      expect(report.status).toBe('applied');
      if (report.status !== 'applied') return;
      expect(report.created).toEqual(['First', 'Last']);
      expect(report.failed.map((f) => f.table)).toEqual(['Refused']);
      expect(report.failed[0].error.length).toBeGreaterThan(10);
      const names = await b.names();
      expect(names).toEqual(expect.arrayContaining(['First', 'Last']));
      expect(names).not.toContain('Refused');
    } finally {
      await b.stop();
    }
  });
});
