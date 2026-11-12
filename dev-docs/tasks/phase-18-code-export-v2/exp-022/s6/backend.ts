/**
 * EXP-022 S6 (S4's harness, copied) drive (a copy of s137-todo-drive/backend.ts): the real NodeGX backend from `src` on :8644, running todo-list's own policy, one account seeded
 * through the REST API with its own session (EXPECTED.md's table). Writes `seeded.json`. Stopped by SIGTERM.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../../../../../packages/nodegx-backend/src/service';

const PORT = Number(process.env.S4_PORT || 8644);
const BASE = `http://127.0.0.1:${PORT}`;
const APP = 'backend_todo_s4';
const POLICY = path.join(__dirname, '../../../../../templates/todo-list.security.json');
export const PERSON = { email: 'ann@example.invalid', password: 'a long enough password' };

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function call(method: string, url: string, body: unknown, token?: string) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'content-type': 'application/json', 'x-parse-application-id': APP, ...(token ? { 'x-parse-session-token': token } : {}) },
    body: JSON.stringify(body)
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`${method} ${url} ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-s4-'));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  fs.writeFileSync(path.join(dataDir, 'security.json'), fs.readFileSync(POLICY));
  fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
  const service = new BackendService({ dataDir, port: PORT, backendId: 'todo_s4', backendName: 'Todo S4' });
  const started = await service.start();
  console.log('[backend] listening', started.listen.url, 'enforced', started.security.enforced, 'data', dataDir);
  if (!started.security.enforced) throw new Error('the policy is not enforced');

  const user = await call('POST', '/users', { username: PERSON.email, email: PERSON.email, password: PERSON.password });
  const token = String(user.sessionToken);
  const make = async (cls: string, row: Record<string, unknown>) => String((await call('POST', `/classes/${cls}`, row, token)).objectId);
  const mot = await make('Task', { title: 'Book the van in for its MOT', position: 1, status: 'open' });
  const vat = await make('Task', { title: 'Chase the accountant about VAT', position: 2, status: 'open', deadline: day(0) });
  const notes = await make('Task', { title: 'Write the release notes', position: 3, status: 'open' });
  const domain = await make('Task', {
    title: 'Renew the domain', position: 4, status: 'done', closingNote: 'Paid for three years.', closedAt: new Date(Date.now() - 86400000).toISOString()
  });
  await make('Action', { taskId: mot, title: 'Ring the garage', position: 1, done: false });
  await make('Action', { taskId: mot, title: 'Find the logbook', position: 2, done: true });
  await make('Event', { taskId: mot, kind: 'added', summary: 'Added the task', at: new Date(Date.now() - 3600000).toISOString() });
  const routine = await make('Routine', { title: 'Take the tablets', cadence: 'daily', slots: '08:00', startDate: day(-1), status: 'active' });
  const seeded = { ...PERSON, base: BASE, ids: { mot, vat, notes, domain, routine } };
  fs.writeFileSync(path.join(__dirname, 'seeded.json'), JSON.stringify(seeded, null, 1));
  console.log('[backend] seeded', JSON.stringify(seeded.ids));
  const stop = async () => {
    await service.stop();
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
