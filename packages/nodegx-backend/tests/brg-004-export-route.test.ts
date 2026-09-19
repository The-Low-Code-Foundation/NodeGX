/**
 * The schema export, through the door a person actually reaches it by —
 * BRG-004 (phase 97), `GET /admin/schema-export`.
 *
 * What the emitted SQL says is graded beside the generator, in
 * `noodl-runtime/test/adapters/SchemaManager.export.test.js`, and what a real
 * PostgreSQL does with it in that file's `.postgres.` sibling. What is graded
 * HERE is the wiring those two cannot see:
 *
 *  - the Supabase export reads the **live** CLP configuration, not a default —
 *    a rule changed through `/admin/permissions` changes the policies;
 *  - a refusal arrives as a 409 **naming the construct**, rather than as SQL
 *    that looks fine;
 *  - and the route still answers `format=json` and `format=postgres` exactly as
 *    it did, because a live admin surface is not a place to find out.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { adminHeaders, request } from './helpers/http';

jest.setTimeout(60000);

interface ExportAnswer {
  format?: string;
  content?: string;
  error?: string;
  construct?: string;
  table?: string;
}

describe('BRG-004 — GET /admin/schema-export', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;

  const req = <T = unknown>(method: string, pathName: string, body?: unknown) =>
    request<T>(base, method, pathName, { body, headers: adminHeaders(dataDir) });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg004-route-'));
    service = new BackendService({ dataDir, port: 0, backendId: 'backend_brg004', backendName: 'BRG-004' });
    const started = await service.start();
    base = started.listen.url;

    await req('POST', '/admin/schema', {
      action: 'createTable',
      table: 'Item',
      columns: [
        { name: 'guid', type: 'String' },
        { name: 'tags', type: 'Relation', targetClass: 'Tag' }
      ]
    });
    await req('POST', '/admin/schema', { action: 'setIndexes', table: 'Item', indexes: [{ fields: ['guid'], unique: true }] });
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('format=postgres carries the declared unique index and the relation', async () => {
    const res = await req<ExportAnswer>('GET', '/admin/schema-export?format=postgres');
    expect(res.status).toBe(200);
    const sql = String(res.json.content);
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "idx_Item_guid"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "_Join_tags_Item"');
  });

  it('format=supabase refuses without an identity mapping, and names it', async () => {
    const res = await req<ExportAnswer>('GET', '/admin/schema-export?format=supabase');
    expect(res.status).toBe(409);
    expect(res.json.construct).toBe('the identity mapping');
    // The refusal is the answer — no SQL comes back with it.
    expect(res.json.content).toBeUndefined();
  });

  it('format=supabase emits policies from the ACL, and never USING (true)', async () => {
    const res = await req<ExportAnswer>('GET', '/admin/schema-export?format=supabase&userIdClaim=nodegx_user_id');
    expect(res.status).toBe(200);
    const sql = String(res.json.content);
    expect(sql).not.toContain('USING (true)');
    expect(sql).toContain('ALTER TABLE "Item" ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain("_acl.key IN ('*', (current_setting('request.jwt.claims', true)::jsonb ->> 'nodegx_user_id'))");
  });

  it('🔴 reads the LIVE permissions, not a default copy of them', async () => {
    // The whole reason the route hands the config over: a generator holding its
    // own idea of the rules is a generator emitting policies for a backend that
    // no longer exists.
    const before = await req<ExportAnswer>('GET', '/admin/schema-export?format=supabase&userIdClaim=nodegx_user_id');
    expect(String(before.json.content)).toContain('FOR DELETE TO authenticated');

    const put = await req('PUT', '/admin/permissions/collections/Item', {
      permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' }
    });
    expect(put.status).toBe(200);

    const after = await req<ExportAnswer>('GET', '/admin/schema-export?format=supabase&userIdClaim=nodegx_user_id');
    const sql = String(after.json.content);
    expect(sql).not.toContain('FOR DELETE');
    expect(sql).not.toContain('GRANT DELETE');
    expect(sql).toContain('-- No DELETE policy: security.json allows DELETE to nobody');
  });

  it('refuses a role-based permission by name, rather than emitting a policy that ignores it', async () => {
    await req('PUT', '/admin/permissions/collections/Item', {
      permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'role:editor', delete: 'nobody' }
    });

    const res = await req<ExportAnswer>('GET', '/admin/schema-export?format=supabase&userIdClaim=nodegx_user_id');
    expect(res.status).toBe(409);
    expect(res.json.construct).toBe('role-based collection permissions');
    expect(res.json.table).toBe('Item');
  });

  it('format=json is unchanged', async () => {
    const res = await req<ExportAnswer>('GET', '/admin/schema-export?format=json');
    expect(res.status).toBe(200);
    const tables = JSON.parse(String(res.json.content)) as Array<{ name: string }>;
    expect(tables.map((t) => t.name)).toContain('Item');
  });
});
