/**
 * P18-S116-QUERYFETCH drive (session 117, after s116's): the real NodeGX backend from `src` on :8597, ten `Contact` records seeded
 * in this order, `joined` as the wire's Date envelope. Writes `seeded.txt` when ready. Stopped by SIGTERM.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../../../../packages/nodegx-backend/src/service';

const BASE = 'http://localhost:8597';
export const CONTACTS: Array<[string, string, number, boolean, string]> = [
  ['Ada', 'Berlin', 36, true, '2021-03-01'],
  ['Ben', 'Bern', 52, true, '2019-05-01'],
  ['Cleo', 'Paris', 45, true, '2022-01-10'],
  ['Dan', 'Berlin', 29, false, '2023-02-02'],
  ['Eve', 'Bergen', 41, true, '2020-06-15'],
  ['Finn', 'Oslo', 33, true, '2024-01-01'],
  ['Gus', 'Berlin', 41, true, '2021-07-07'],
  ['Hana', 'Rome', 60, true, '2020-02-02'],
  ['Ivo', 'Berlin', 22, true, '2025-01-01'],
  ['Jo', 'Madrid', 48, false, '2022-02-02']
];

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fetchdesk-'));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  const service = new BackendService({ dataDir, port: 8597, backendId: 'fetchdesk', backendName: 'Fetch Desk', authToken: 'admin-token' });
  const started = await service.start();
  console.log('[backend] listening', started.listen.url, 'data', dataDir);
  for (const [name, city, age, vip, joined] of CONTACTS) {
    const made = await fetch(`${BASE}/classes/Contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-parse-application-id': 'backend_fetchdesk' },
      body: JSON.stringify({ name, city, age, vip, joined: { __type: 'Date', iso: `${joined}T12:00:00.000Z` } })
    });
    if (made.status >= 300) throw new Error(`seed ${name}: ${made.status} ${await made.text()}`);
  }
  console.log('[backend] seeded', CONTACTS.length);
  fs.writeFileSync(path.join(__dirname, 'seeded.txt'), String(CONTACTS.length));
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
