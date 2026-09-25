/**
 * BMG-008 over a real BackendService — the preview route (AC2, AC7) and what the
 * list route now decorates.
 *
 *  - `POST /admin/triggers/preview` answers the next fires of an unsaved cron,
 *    and they are `nextFireTimes` — the scheduler's own `next()`, chained — for
 *    the `from` it reports, so the page's *Next runs* is what will happen.
 *  - An invalid or unreachable expression is a 200 with the parser's sentence,
 *    because the page asks on every keystroke.
 *  - It stores nothing, arms nothing, and is exempt from the audit trail on
 *    purpose (`audit-actions.ts` NOT_AUDITED); a read-only admin may call it.
 *  - `GET /admin/triggers` decorates a schedule with `scheduleWords` and answers
 *    `overlapDefault`, and a `PUT` that carries both back is accepted.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { TriggerListResponse, TriggerPreviewResponse, TriggerResponse } from '../src/server/admin-triggers';
import { auditExemptionFor } from '../src/ops/audit-actions';
import { readonlyAdminMayCall } from '../src/admin/readonly';
import { BackendService } from '../src/service';
import { cronWords } from '../src/triggers/cronWords';
import { nextFireTimes } from '../src/triggers/scheduler';

import { adminHeaders, httpClient } from './helpers/http';

jest.setTimeout(30000);

describe('BMG-008 the preview route and the decorated list', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const http = httpClient(
    () => base,
    () => adminHeaders(dataDir)
  );

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmg008-'));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg8', backendName: 'BMG-008' });
    const started = await service.start();
    base = started.listen.url;
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('AC2: the next five fires are the scheduler’s own, for the instant the route reports', async () => {
    const cron = '0 9 * * 1,3,5';
    const res = await http.post<TriggerPreviewResponse>('/admin/triggers/preview', { cron });
    expect(res.status).toBe(200);
    expect(res.json.valid).toBe(true);
    expect(res.json.error).toBeNull();
    expect(res.json.words).toBe('Every Monday, Wednesday and Friday at 09:00');
    expect(res.json.words).toBe(cronWords(cron));
    expect(res.json.next).toHaveLength(5);
    const expected = nextFireTimes(cron, new Date(res.json.from), 5).map((d) => d.toISOString());
    expect(res.json.next).toEqual(expected);
    // Strictly after `from`, strictly increasing, and each one a Monday, Wednesday or Friday at 09:00 local.
    let previous = new Date(res.json.from).getTime();
    for (const iso of res.json.next) {
      const d = new Date(iso);
      expect(d.getTime()).toBeGreaterThan(previous);
      previous = d.getTime();
      expect([1, 3, 5]).toContain(d.getDay());
      expect(d.getHours()).toBe(9);
      expect(d.getMinutes()).toBe(0);
    }
    expect(typeof res.json.timezone).toBe('string');
    expect(res.json.timezone.length).toBeGreaterThan(0);
  });

  it('answers as many as asked, up to twenty', async () => {
    const twenty = await http.post<TriggerPreviewResponse>('/admin/triggers/preview', { cron: '*/5 * * * *', count: 20 });
    expect(twenty.json.next).toHaveLength(20);
    const clamped = await http.post<TriggerPreviewResponse>('/admin/triggers/preview', { cron: '*/5 * * * *', count: 500 });
    expect(clamped.json.next).toHaveLength(20);
    const one = await http.post<TriggerPreviewResponse>('/admin/triggers/preview', { cron: '*/5 * * * *', count: 0 });
    expect(one.json.next).toHaveLength(1);
  });

  it('an expression the parser refuses is a 200 with its sentence and no times', async () => {
    const res = await http.post<TriggerPreviewResponse>('/admin/triggers/preview', { cron: '61 * * * *' });
    expect(res.status).toBe(200);
    expect(res.json.valid).toBe(false);
    expect(res.json.error).toMatch(/out of range/);
    expect(res.json.next).toEqual([]);
    expect(res.json.words).toBeNull();
    const short = await http.post<TriggerPreviewResponse>('/admin/triggers/preview', { cron: '* * *' });
    expect(short.json.valid).toBe(false);
    expect(short.json.error).toMatch(/expected 5 fields/);
  });

  it('five valid fields that never fire (30 February) are refused the way the scheduler would refuse to arm them', async () => {
    const res = await http.post<TriggerPreviewResponse>('/admin/triggers/preview', { cron: '0 0 30 2 *' });
    expect(res.status).toBe(200);
    expect(res.json.valid).toBe(false);
    expect(res.json.error).toMatch(/no next fire/);
  });

  it('a body without a cron string is a 400, and no credential is a 401', async () => {
    const bad = await http.post<{ error: string }>('/admin/triggers/preview', {});
    expect(bad.status).toBe(400);
    expect(bad.json.error).toMatch(/cron/);
    const anon = await http.request('POST', '/admin/triggers/preview', { body: { cron: '* * * * *' }, headers: { authorization: '' } });
    expect(anon.status).toBe(401);
  });

  it('AC7: stores nothing, arms nothing, is exempt from the trail, and a read-only admin may ask', async () => {
    const before = (await http.get<TriggerListResponse>('/admin/triggers')).json.triggers.length;
    await http.post('/admin/triggers/preview', { cron: '* * * * *' });
    expect((await http.get<TriggerListResponse>('/admin/triggers')).json.triggers.length).toBe(before);
    expect(fs.existsSync(path.join(dataDir, 'triggers.json'))).toBe(false);
    expect(auditExemptionFor('POST', 'admin/triggers/preview')).toMatch(/dry run/);
    expect(readonlyAdminMayCall('POST', 'admin/triggers/preview')).toBe(true);
  });

  it('the list decorates a schedule with its words and says the overlap default; a round trip carries both back', async () => {
    const made = await http.post<TriggerResponse>('/admin/triggers', {
      type: 'schedule',
      name: 'Digest',
      enabled: false,
      target: { kind: 'function', name: 'digest' },
      schedule: { cron: '*/15 * * * *', missedFirePolicy: 'skip' }
    });
    expect(made.status).toBe(201);
    const list = await http.get<TriggerListResponse>('/admin/triggers');
    expect(list.json.overlapDefault).toBe('skip');
    const row = list.json.triggers.find((t) => t.id === made.json.trigger.id)!;
    expect(row.scheduleWords).toBe('Every 15 minutes');
    expect(row.effectiveOverlapPolicy).toBe('skip');
    // GET → edit → PUT, exactly as the page and an agent do it.
    const back = await http.put<TriggerResponse>('/admin/triggers/' + row.id, { ...row, schedule: { ...row.schedule, cron: '0 9 * * 1-5' } });
    expect(back.status).toBe(200);
    expect(back.json.trigger.scheduleWords).toBe('Every weekday at 09:00');
    // And nothing of the decoration reached the disk.
    const stored = JSON.parse(fs.readFileSync(path.join(dataDir, 'triggers.json'), 'utf-8')).triggers[0];
    expect(stored.scheduleWords).toBeUndefined();
    expect(stored.effectiveOverlapPolicy).toBeUndefined();
    // A webhook carries no words.
    const hook = await http.post<TriggerResponse>('/admin/triggers', {
      type: 'webhook',
      target: { kind: 'function', name: 'digest' },
      webhook: { slug: 'hook' }
    });
    expect(hook.json.trigger.scheduleWords).toBeUndefined();
  });
});
