// Changing who may see a table, end to end, on COPIES: a copy of the app's folder and a backend of
// its own, never the real ones.
//
// It goes through the editor's own server, the same POST the page's "Make it so" button sends, then
// restarts the backend, and starts a brand-new backend from the saved folder, to check the change holds.
//
//   node test/rule-change.test.mjs [app folder to copy]   (default ../training)

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createEditor, serve } from '../server.mjs';
import { REAL_APP, CLI, hashTree, freePort, stop, makeCopy, startBackend, adminClient, applySchema } from './copies.mjs';

const source = path.resolve(process.argv[2] ?? REAL_APP);
let failures = 0;
const ok = (cond, words) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${words}`);
  if (!cond) failures++;
};

const sourceBefore = hashTree(source);
const c = makeCopy(source, 'rules');
const { copy, work, token } = c;
const copyBefore = hashTree(copy);
console.log(`copy: ${copy}`);

const port = await freePort();
let be = await startBackend(c, port);
const base = `http://127.0.0.1:${port}`;
const admin = adminClient(base, token);
await applySchema(admin, copy);
const tables = (await admin('/admin/schema')).tables?.map((t) => t.name) ?? [];
ok(tables.includes('Progress'), `the copy backend has the app's tables (${tables.length})`);

const editor = createEditor({ project: copy, backend: base, token });
const server = await serve(editor, 0);
const ed = `http://127.0.0.1:${server.address().port}`;
const page = (p, body) =>
  fetch(ed + p, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}).then(async (r) => ({ status: r.status, json: await r.json() }));

// 1. Opening is reading.
const map0 = (await page('/api/map')).json;
ok(map0.tables?.length > 0 && map0.functions?.length > 0, `the map opens: ${map0.tables?.length} tables, ${map0.functions?.length} functions, ${map0.calls?.length} calls from screens`);
ok(JSON.stringify(hashTree(copy)) === JSON.stringify(copyBefore), 'opening the map wrote nothing into the app’s folder');

// 2. A refusal: the page saw an older version of the rules.
const stale = await page('/api/table-rule', { table: 'Progress', read: 'role:staff', change: 'nobody', creatorOwns: false, etag: '"not-what-the-page-saw"', fileStamp: map0.fileStamp });
ok(stale.status === 409 && /changed the backend’s rules/.test(stale.json.error), `a stale page is refused in words: “${stale.json.error}”`);
const staleFile = await page('/api/table-rule', { table: 'Progress', read: 'role:staff', change: 'nobody', creatorOwns: false, etag: map0.etag, fileStamp: 'an-older-stamp' });
ok(staleFile.status === 409 && /rules file was changed/.test(staleFile.json.error), `a file changed behind the page is refused in words: “${staleFile.json.error}”`);
ok(JSON.stringify(hashTree(copy)) === JSON.stringify(copyBefore) && !(await admin('/admin/permissions')).config.collections.Progress, 'the refusals changed nothing, in the folder or on the backend');

// 3. The change, as the page's "Make it so" sends it.
const res = await page('/api/table-rule', { table: 'Progress', read: 'role:staff', change: 'nobody', creatorOwns: false, etag: map0.etag, fileStamp: map0.fileStamp });
ok(res.status === 200, `the change is accepted (${res.status}${res.json.error ? ': ' + res.json.error : ''})`);
ok(res.json.inBackend === true && res.json.inFile === true, 'the editor reports it in the backend and in the file');
const want = { permissions: { find: 'role:staff', get: 'role:staff', create: 'nobody', update: 'nobody', delete: 'nobody' }, creatorOwns: false };
ok(JSON.stringify((await admin('/admin/permissions')).config.collections.Progress) === JSON.stringify(want), 'the backend obeys it now (read back from /admin/permissions)');
const fileNow = JSON.parse(fs.readFileSync(path.join(copy, 'nodegx.security.json'), 'utf8'));
ok(JSON.stringify(fileNow.collections.Progress) === JSON.stringify(want), 'nodegx.security.json carries the same entry');
const anonFind = (res.json.checks ?? []).find((x) => /not signed in/.test(x.who) && x.op === 'find');
ok(anonFind && anonFind.allowed === false, `the backend's own dry run: someone not signed in is turned away from reading (${anonFind?.reason ?? 'no answer'})`);

const after = hashTree(copy);
const changed = Object.keys(after).filter((k) => after[k] !== copyBefore[k]);
ok(changed.length === 1 && changed[0] === 'nodegx.security.json', `only nodegx.security.json changed (${changed.join(', ')})`);
const original = JSON.parse(fs.readFileSync(path.join(source, 'nodegx.security.json'), 'utf8'));
const withoutEntry = { ...fileNow, collections: { ...fileNow.collections } };
delete withoutEntry.collections.Progress;
ok(JSON.stringify(withoutEntry) === JSON.stringify(original), 'everything else in the file is exactly as it was, key order included');

// 4. It holds: restart the backend.
await stop(be);
be = await startBackend(c, port);
ok(JSON.stringify((await admin('/admin/permissions')).config.collections.Progress) === JSON.stringify(want), 'after a restart the backend still has the new rule');

// 4b. The folder is what carries it: a brand-new backend provisioned from the saved folder alone.
const port2 = await freePort();
const fresh = spawn(process.execPath, [CLI, 'serve', '--data-dir', path.join(work, 'fresh-backend-data'), '--port', String(port2), '--token', token, '--project-dir', copy], { stdio: 'ignore' });
let freshRule;
for (let i = 0; i < 100 && freshRule === undefined; i++) {
  const r = await fetch(`http://127.0.0.1:${port2}/admin/permissions`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  if (r?.ok) freshRule = (await r.json()).config.collections?.Progress ?? null;
  else await new Promise((r) => setTimeout(r, 200));
}
ok(JSON.stringify(freshRule) === JSON.stringify(want), 'a brand-new backend started from the saved folder has the new rule: the folder carries it');
await stop(fresh);

// 5. A change on the backend alone, outside the editor: the map must say it isn't saved.
await admin('/admin/permissions/collections/Lesson', { method: 'PUT', body: JSON.stringify(want) });
const map1 = (await page('/api/map')).json;
ok(JSON.stringify(map1.config.collections.Lesson) !== JSON.stringify(map1.fileCollections.Lesson ?? null), 'the map sees a rule that is on the backend but not in the folder (its card says “Not saved”)');
await stop(be);
be = await startBackend(c, port);
const kept = !!(await admin('/admin/permissions')).config.collections.Lesson;
console.log(
  `note  this backend (the kit’s, in @nodegx/preview) ${kept ? 'KEPT' : 'dropped'} a backend-only change across a restart: ` +
    (kept ? 'it applies the project’s file only when it has no policy of its own. BACKEND.md describes a backend that re-applies the file every start. The editor writes both, so a change holds under either.' : 'it re-applied the project’s file, as BACKEND.md says.')
);
await admin('/admin/permissions/collections/Lesson', { method: 'DELETE' });

// 6. Back to the standard rule, through the editor.
const map2 = (await page('/api/map')).json;
const reset = await page('/api/table-rule', { table: 'Progress', reset: true, etag: map2.etag, fileStamp: map2.fileStamp });
ok(reset.status === 200 && !(await admin('/admin/permissions')).config.collections.Progress, 'back to the standard rule: gone from the backend');
ok(fs.readFileSync(path.join(copy, 'nodegx.security.json'), 'utf8') === fs.readFileSync(path.join(source, 'nodegx.security.json'), 'utf8'), 'and the file is byte for byte the original again');

// 7. The real app's folder was never touched.
ok(JSON.stringify(hashTree(source)) === JSON.stringify(sourceBefore), `the real app folder is unchanged, every file hashed before and after`);

server.close();
await stop(be);
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
