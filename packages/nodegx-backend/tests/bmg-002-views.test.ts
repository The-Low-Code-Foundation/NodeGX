/**
 * BMG-002 AC4, the server half — a saved view is kept by the backend, so it
 * survives a restart and a second browser, is audited, and refuses what is
 * not a view. (The page half — reload, second browser, *Delete view* asks —
 * is the drive.)
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import type { AuditEntry } from '../src/ops/audit';
import type { SavedView } from '../src/server/admin-views';

import { request } from './helpers/http';

jest.setTimeout(30000);

describe('BMG-002 /admin/views', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let admin: Record<string, string>;
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers = admin) => request<T>(base, method, p, { body, headers });
  const start = async () => {
    service = new BackendService({ dataDir, port: 0, backendId: 'backend_bmg002v', backendName: 'BMG-002 views' });
    base = (await service.start()).listen.url;
  };

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg002v-'));
    await start();
    admin = { authorization: 'Bearer ' + JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken };
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const filter = { kind: 'group', conj: 'and', items: [{ kind: 'cond', field: 'due', op: 'within', value: 'week' }] };

  it('saves, lists by name, survives a restart, and hands the filter rows back as written', async () => {
    const put = await req<SavedView>('PUT', '/admin/views/Task/' + encodeURIComponent('Due this week'), { filter, sort: ['-due', 'title'], columns: ['title', 'due'] });
    expect(put.status).toBe(200);
    await req('PUT', '/admin/views/Task/Alpha', { filter: null });
    await req('PUT', '/admin/views/Pet/Other', { filter: null });

    await service.stop();
    await start();

    const list = await req<{ views: SavedView[] }>('GET', '/admin/views/Task');
    expect(list.json.views.map((v) => v.name)).toEqual(['Alpha', 'Due this week']);
    expect(list.json.views[1]).toMatchObject({ filter, sort: ['-due', 'title'], columns: ['title', 'due'] });

    const trail = await req<{ entries: AuditEntry[] }>('GET', '/admin/audit?action=view.save');
    expect(trail.json.entries[trail.json.entries.length - 1]).toMatchObject({ action: 'view.save', outcome: 'success' });
  });

  it('deletes one, and says so when it is not there', async () => {
    expect((await req('DELETE', '/admin/views/Task/Alpha')).status).toBe(200);
    expect((await req<{ views: SavedView[] }>('GET', '/admin/views/Task')).json.views.map((v) => v.name)).toEqual(['Due this week']);
    const again = await req<{ error: string }>('DELETE', '/admin/views/Task/Alpha');
    expect(again.status).toBe(404);
    expect(again.json.error).toContain('Alpha');
  });

  it('refuses what is not a view, and a caller without the admin credential', async () => {
    expect((await req('PUT', '/admin/views/Task/x', { filter: 'status=open' })).status).toBe(400);
    expect((await req('PUT', '/admin/views/Task/x', { sort: ['title; drop table'] })).status).toBe(400);
    expect((await req('PUT', '/admin/views/Task/x', { columns: 'title' })).status).toBe(400);
    expect((await req('PUT', '/admin/views/Task/x', { filter: { big: 'x'.repeat(40000) } })).status).toBe(413);
    expect((await req('PUT', '/admin/views/Task/x', { filter: null }, {})).status).toBe(401);
  });
});
