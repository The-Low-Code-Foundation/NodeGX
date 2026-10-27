/**
 * P127-BKO006-EXPORTHASHES — an export over HTTP leaves out the backend's own storage.
 *
 * BKO-006's repair shop: the agent exported `_User` (`export_backend_collection`, which reads `GET /admin/export`) to
 * find the staff account's id, and every person's `_hashed_password` came back into its conversation. A field whose
 * name begins with `_` is "never shown at all … hidden by pattern, everywhere" (`users/accountColumns.ts`); this route
 * was the one place it was not. The CLI's export, a lossless copy for a backup or a move, still carries it.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { exportCollection } from '../src/backup/dataio';
import { BackendService } from '../src/service';

jest.setTimeout(30000);

const ADMIN = 'admin-token-p127-export';

describe('P127-BKO006-EXPORTHASHES — GET /admin/export hides the backend’s own fields', () => {
  let dataDir: string;
  let service: BackendService;
  let base = '';
  const call = async (method: string, p: string, body?: unknown, admin = false) => {
    const headers: Record<string, string> = { 'content-type': 'application/json', 'x-parse-application-id': 'p127' };
    if (admin) headers.authorization = `Bearer ${ADMIN}`;
    const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, json: (await res.json()) as any };
  };

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p127-export-'));
    service = new BackendService({ dataDir, port: 0, backendId: 'backend_p127export', backendName: 'P127', authToken: ADMIN });
    base = (await service.start()).listen.url;
    expect((await call('POST', '/users', { username: 'staff@shop.test', email: 'staff@shop.test', password: 'workshop-1234' })).status).toBe(201);
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('as CSV: the people and their ids, no hash column and no hash', async () => {
    const out = await call('GET', '/admin/export/_User?format=csv', undefined, true);
    expect(out.status).toBe(200);
    const header = String(out.json.content).split('\r\n')[0].split(',');
    expect(header).toEqual(expect.arrayContaining(['objectId', 'username', 'email']));
    expect(header.filter((h) => h.startsWith('_'))).toEqual([]);
    expect(out.json.content).not.toMatch(/scrypt\$/);
  });

  it('as JSON: no record and no schema column names a hidden field', async () => {
    const out = await call('GET', '/admin/export/_User?format=json', undefined, true);
    const file = JSON.parse(out.json.content);
    expect(file.records.map((r: any) => r.username)).toEqual(['staff@shop.test']);
    expect(file.records.flatMap((r: any) => Object.keys(r)).filter((k: string) => k.startsWith('_'))).toEqual([]);
    expect(file.schema.columns.map((c: any) => c.name).filter((n: string) => n.startsWith('_'))).toEqual([]);
    expect(out.json.content).not.toMatch(/scrypt\$/);
  });

  it('the lossless export a backup or a move uses still carries it', async () => {
    const full = await exportCollection((service as any).facade, '_User', 'json'); // the service's storage, as the CLI's export reads it
    expect(full.content).toMatch(/_hashed_password/);
  });
});
