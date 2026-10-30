// Makes everything the kit needs that is not committed: three.js vendored, the twelve people fetched and baked.
// Run it outside a sandbox that stops headless Chrome. About a minute after the first fetch (~90 MB down).
//   node _make/make.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const step of ['vendor.mjs', 'fetch-people.mjs', 'bake-people.mjs']) {
  console.log(`— ${step}`);
  const r = spawnSync(process.execPath, [path.join(here, step)], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
