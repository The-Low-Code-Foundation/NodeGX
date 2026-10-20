/**
 * P18-S113-IDBINDREAD drive (copied from s113): the real NodeGX backend from `src` on :8594, one `Page` record seeded with title "Home".
 * Writes the seeded id to `seeded-id.txt`. Stopped by SIGTERM (the drive stops it itself for D4).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../../../../packages/nodegx-backend/src/service';

const BASE = 'http://localhost:8594';

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recordlive-'));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  const service = new BackendService({ dataDir, port: 8594, backendId: 'recorddesk', backendName: 'Record Desk', authToken: 'admin-token' });
  const started = await service.start();
  console.log('[backend] listening', started.listen.url, 'data', dataDir);
  const made = await fetch(`${BASE}/classes/Page`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-parse-application-id': 'backend_recorddesk' },
    body: JSON.stringify({ title: 'Home' })
  });
  const body = (await made.json()) as { objectId?: string };
  console.log('[backend] seeded', made.status, JSON.stringify(body));
  if (!body.objectId) throw new Error('seed failed');
  fs.writeFileSync(path.join(__dirname, 'seeded-id.txt'), body.objectId);
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
