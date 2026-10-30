// P127 BKO-009 — the backend suite's read half (lib/handed.mjs), on the Riverside club: a members-area copy whose
// backend was filled through the app's own doors (`phase-127-the-backend-in-the-open/day/lab.mjs`). A hand-written
// adapter that knows the club's rules says PASS; two controls say FAIL and name the person and the table: one shows
// Dev (still waiting) the notices, one shows a function handing back a row it only reads. The command says the same.
// Reading writes nothing: the copy's folder is byte-identical at the end.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runSuite } from '@nodegx/backend-kit';
import handedAdapter from './handed-adapter.mjs';
import { hashTree } from './copies.mjs';
import { makeMembersLab, stop } from '../../../phase-127-the-backend-in-the-open/day/lab.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(path.dirname(fileURLToPath(import.meta.resolve('@nodegx/backend-kit/package.json'))), 'bin', 'backend-suite.js');
let failures = 0;
const ok = (cond, words, detail) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${words}${!cond && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 900)}` : ''}`);
  if (!cond) failures++;
};

const work = path.join(here, '.work', `handed-${Date.now()}`);
fs.mkdirSync(work, { recursive: true });
console.log('\n— the read half: the Riverside club, filled through its own doors, on a backend of its own —');
const lab = await makeMembersLab({ dir: work });
try {
  const before = hashTree(lab.app);
  const run = (mode) => runSuite({ adapter: handedAdapter(mode), project: lab.app, backend: lab.base, token: lab.token, edits: [] });

  const honest = await run('honest');
  ok(honest.pass && /steps shown to 3 people/.test(honest.line), honest.line, honest.differences);
  ok(honest.handed?.notGraded === 0, 'every step was graded (none changes data, no path rule)', honest.handed);

  const liar = await run('liar');
  ok(!liar.pass && liar.differences.some((d) => /^Dev, step 3 \(Announcement\): the editor shows 3 rows of Announcement the backend didn’t hand them/.test(d)), `the liar control says FAIL, naming Dev and Announcement — ${liar.differences[0] ?? liar.line}`, liar.differences);

  const naming = await run('naming');
  ok(!naming.pass && naming.differences.length === 2 && naming.differences.every((d) => /\(myNotifySetting\): the editor shows 1 row of Member the backend didn’t hand them/.test(d)), `the naming control says FAIL for the moderator and the member, never for Dev — ${naming.differences[0] ?? naming.line}`, naming.differences);

  const pick = await runSuite({ adapter: handedAdapter('honest'), project: lab.app, backend: lab.base, token: lab.token, edits: [], people: ['ben@riverside.test', 'Nobody Here'] });
  ok(!pick.pass && pick.differences.length === 1 && /No one called “Nobody Here”/.test(pick.differences[0]) && pick.handed.people === 1, `people named by email are graded, an unknown one is said — ${pick.differences[0]}`, pick);

  // before the command runs: spawnSync blocks this process past the backend's keep-alive, and the next fetch would reuse
  // a socket the backend has closed (ECONNRESET)
  const keys = (await fetch(lab.base + '/admin/keys', { headers: { Authorization: `Bearer ${lab.token}` } }).then((r) => r.json())).keys ?? [];
  ok(!keys.some((k) => !k.revoked), 'no working key is left behind (each person’s key is deleted after their steps)', keys);

  const tokenFile = path.join(work, 'ADMIN-TOKEN');
  const editsFile = path.join(work, 'none.json');
  fs.writeFileSync(tokenFile, lab.token + '\n');
  fs.writeFileSync(editsFile, '[]\n');
  const cli = (mode) => spawnSync(process.execPath, [CLI, path.join(here, 'handed-adapter.mjs'), lab.app, editsFile, '--backend', lab.base, '--token-file', tokenFile], { encoding: 'utf8', env: { ...process.env, HANDED_MODE: mode } });
  const pass = cli('honest');
  ok(pass.status === 0 && /^PASS — a day in the life \(hand-written\) on /m.test(pass.stdout), `the command exits 0: ${pass.stdout.trim().split('\n')[0]}`, pass.stdout + pass.stderr);
  const fail = cli('liar');
  ok(fail.status === 1 && /^FAIL — /m.test(fail.stdout) && /Dev, step 3/.test(fail.stdout), `the command exits 1 on the liar and names Dev: ${fail.stdout.trim().split('\n')[0]}`, fail.stdout + fail.stderr);

  const after = hashTree(lab.app);
  const moved = Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k]);
  ok(!moved.length, 'reading wrote nothing: the copy’s folder is byte-identical', moved);
} finally {
  await stop(lab.child);
}
console.log(failures ? `\n${failures} check(s) FAILED` : '\nEvery check passed.');
process.exit(failures ? 1 : 0);
