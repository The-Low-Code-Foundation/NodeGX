/**
 * P112-OWN026-DELETELEAVESBYTES — a record deleted for good is not left readable in the backend's files.
 *
 * Measured (OWN-026 C10.2): after the app's delete the row was gone from every query and from a logical dump of
 * `local.db`, but `data/local.db-wal` still held the child's name 25 times. The backend opens SQLite in WAL mode with
 * no `secure_delete` and no checkpoint after a delete, so a deleted row's bytes stay in the log until a checkpoint and
 * in the database's free pages until SQLite reuses them. Anyone with the folder, a backup of it, or a copy shipped
 * with a deploy can read them.
 *
 * The grade is the row's: write a record holding a distinctive value, delete it, and no file in the data folder holds
 * the value's bytes — while the backend runs, and after it stops. The control beside it: the value IS in the files
 * while the record exists, so "not found" is about the delete and not about where this looks.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(60000);

/** Every file under `dir` whose bytes contain `needle`, with how many times. */
function filesHolding(dir: string, needle: string): Record<string, number> {
  const found: Record<string, number> = {};
  const bytes = Buffer.from(needle, 'utf8');
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) {
        const data = fs.readFileSync(p);
        let n = 0;
        for (let at = data.indexOf(bytes); at !== -1; at = data.indexOf(bytes, at + 1)) n++;
        if (n) found[path.relative(dir, p)] = n;
      }
    }
  };
  walk(dir);
  return found;
}

describe('P112-OWN026-DELETELEAVESBYTES — deleted means gone from the files', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const admin = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown) => request<T>(base, method, p, { body, headers: admin });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-deletebytes-'));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'deletebytes', backendName: 'Delete bytes', authToken: 't0k' });
    base = (await service.start()).listen.url;
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  async function writeThenDelete(collection: string, name: string): Promise<{ before: Record<string, number>; after: Record<string, number> }> {
    const made = await req<{ objectId: string }>('POST', `/classes/${collection}`, { name, note: `${name} likes otters` });
    expect([200, 201]).toContain(made.status);
    // A second write to the row, so an old version of it is in the log too.
    expect((await req('PUT', `/classes/${collection}/${made.json.objectId}`, { note: `${name} likes badgers` })).status).toBe(200);
    const before = filesHolding(dataDir, name);
    expect((await req('DELETE', `/classes/${collection}/${made.json.objectId}`)).status).toBe(200);
    expect((await req('GET', `/classes/${collection}/${made.json.objectId}`)).status).toBe(404);
    return { before, after: filesHolding(dataDir, name) };
  }

  it('a deleted record’s value is in no file of the data folder, while the backend runs', async () => {
    const { before, after } = await writeThenDelete('Child', 'Zephyrine-Quillfeather');
    // The control: while it existed, the value was in the files.
    expect(Object.keys(before).length).toBeGreaterThan(0);
    expect(after).toEqual({});
  });

  it('a searchable collection too: the search index lets the value go', async () => {
    // Search validates its fields against the table, so the table is made by a first row (one that stays).
    expect([200, 201]).toContain((await req('POST', '/classes/Pupil', { name: 'Anyone', note: 'stays' })).status);
    const enabled = await req('PUT', '/admin/search/collections/Pupil', { fields: ['name', 'note'] });
    expect(enabled.status).toBe(200);
    const { before, after } = await writeThenDelete('Pupil', 'Marigold-Ashbourne-Vex');
    expect(Object.keys(before).length).toBeGreaterThan(0);
    expect(after).toEqual({});
  });

  it('and after the backend stops', async () => {
    const { after } = await writeThenDelete('Child', 'Oswin-Thistledown-Rook');
    expect(after).toEqual({});
    await service.stop();
    expect(filesHolding(dataDir, 'Oswin-Thistledown-Rook')).toEqual({});
    expect(filesHolding(dataDir, 'Zephyrine-Quillfeather')).toEqual({});
    expect(filesHolding(dataDir, 'Marigold-Ashbourne-Vex')).toEqual({});
  });
});
