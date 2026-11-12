// P127 BKO-007 — the hands, end to end, on COPIES: a copy of the training app with its whole world (tables, rules,
// people, deployed functions) on a backend of its own. Every gesture goes through the same POST the page sends, and
// every check reads the backend or the files, never what the map says about itself.
//
//   1 a grant (signed-in people may see a table)  2 a cut  3 the row's maker  4 anyone at all, asked first
//   5 stale pages refused  6 a function dropped on a table: a row-change trigger, and a row made runs it
//   7 a clock dropped on a function: a schedule  8 removing a trigger  9 undo, byte for byte, and refused after an
//   outside change  10 the folder byte-identical at the end  11 the control: a writer that skips the file must fail
//
//   node test/hands.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import { createEditor, serve } from '../server.mjs';
import { makeHands, projectTrigger, analyseProject, backend } from '@nodegx/backend-kit';
import { REAL_APP, hashTree, freePort, stop, makeCopy, startBackend, seedWorld } from './copies.mjs';

let failures = 0;
const ok = (cond, words, detail) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${words}${!cond && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 600)}` : ''}`);
  if (!cond) failures++;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const has = (rule, who) => (Array.isArray(rule) ? rule : [rule]).includes(who);

const c = makeCopy(REAL_APP, 'hands');
const { copy, token } = c;
const port = await freePort();
const be = await startBackend(c, port);
const base = `http://127.0.0.1:${port}`;
// the backend limits admin requests (300 a minute) and this test makes a lot of them: wait and ask again, as lib/backend does
const admin = async (p, init) => {
  for (let i = 0; ; i++) {
    const r = await fetch(base + p, { ...(init ?? {}), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    if (r.status !== 429 || i >= 8) return r.json();
    await new Promise((res) => setTimeout(res, (Number(r.headers.get('retry-after')) || 1) * 1000 + 50));
  }
};
let server;
try {
  seedWorld(c, base);
  const SEC = path.join(copy, 'nodegx.security.json');
  const AUTO = path.join(copy, 'nodegx.automations.json');
  const text = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
  const copyBefore = hashTree(copy);
  const secBefore = text(SEC);
  const autoBefore = text(AUTO);
  console.log(`copy: ${copy}`);

  const editor = createEditor({ project: copy, backend: base, token });
  server = await serve(editor, 0);
  const ed = `http://127.0.0.1:${server.address().port}`;
  const post = (p, body) =>
    fetch(ed + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json() }));
  const map = async () => (await fetch(ed + '/api/map').then((r) => r.json()));
  const seen = async () => {
    const m = await map();
    return { etag: m.etag, fileStamp: m.fileStamp, automationsStamp: m.automationsStamp };
  };

  // The one check every rule gesture is graded by: the backend and the file hold the same entry for the table.
  // It names the place that disagrees, so the control below can be read.
  const bothSay = async (table) => {
    const live = (await admin('/admin/permissions')).config.collections?.[table] ?? null;
    const file = JSON.parse(text(SEC)).collections?.[table] ?? null;
    return { live, file, agree: same(live, file), says: same(live, file) ? 'both agree' : `nodegx.security.json says ${JSON.stringify(file)}; the backend says ${JSON.stringify(live)}` };
  };
  const users = (await admin('/admin/users?limit=200')).users;
  const plain = users.find((u) => !u.roles?.length && !u.disabled);
  const check = async (table, principal, op = 'find') => !!(await admin('/admin/permissions/check', { method: 'POST', body: JSON.stringify({ principal, collection: table, op }) })).allowed;
  const anon = { kind: 'anonymous' };
  const signedIn = { kind: 'user', userId: plain.objectId };
  ok(!!plain, `the copy has a signed-in person with no group (${plain?.username ?? plain?.email ?? '?'})`);

  const TABLE = 'Progress';
  const start = await bothSay(TABLE);
  ok(start.live === null && start.file === null, `${TABLE} starts on the app’s standard rule (nobody), in both places`, start);
  ok(!(await check(TABLE, signedIn)) && !(await check(TABLE, anon)), `the backend’s own dry run: nobody may look at ${TABLE} directly yet`);

  // ── 1. a grant ──
  console.log('\n— 1. drag “Anyone signed in” onto Progress, See —');
  const g = await post('/api/hand/rule', { table: TABLE, who: 'authenticated', what: 'see', ...(await seen()) });
  ok(g.status === 200 && g.json.inBackend && g.json.inFile, `accepted, in the backend and in the file (${g.status}${g.json.error ? ': ' + g.json.error : ''})`, g.json);
  ok(g.json.words === 'Anyone signed in may see the rows of Progress.', `it says what it did: “${g.json.words}”`);
  const g1 = await bothSay(TABLE);
  ok(g1.agree && has(g1.live.permissions.find, 'authenticated') && has(g1.live.permissions.get, 'authenticated') && g1.live.permissions.create === 'nobody', 'both places: find and get let anyone signed in; adding still nobody', g1);
  ok((await check(TABLE, signedIn)) && !(await check(TABLE, anon)) && !(await check(TABLE, signedIn, 'create')), 'the dry run agrees: a signed-in person may look, not add; someone not signed in may not look');

  // ── 2. a cut ──
  console.log('\n— 2. cut the wire —');
  const cut = await post('/api/hand/rule', { table: TABLE, who: 'authenticated', cut: true, ...(await seen()) });
  ok(cut.status === 200 && cut.json.standard === true, `accepted, and it is the standard rule again (${cut.status}${cut.json.error ? ': ' + cut.json.error : ''})`, cut.json);
  const c1 = await bothSay(TABLE);
  ok(c1.live === null && c1.file === null, 'both places fall back to the standard rule (no entry of its own)', c1);
  ok(text(SEC) === secBefore, 'the rules file is byte for byte what it was before the grant');
  ok(!(await check(TABLE, signedIn)), 'the dry run agrees: a signed-in person may not look any more');

  // ── 9a. undo the cut, then the grant ──
  console.log('\n— 9. undo, byte for byte —');
  const u1 = await post('/api/hand/undo', { id: cut.json.undo });
  ok(u1.status === 200 && same((await bothSay(TABLE)).live, g1.live) && (await bothSay(TABLE)).agree, 'undoing the cut brings the grant back, in both places', u1.json);
  const u2 = await post('/api/hand/undo', { id: g.json.undo });
  ok(u2.status === 200 && text(SEC) === secBefore && (await bothSay(TABLE)).live === null, 'undoing the grant leaves the rules file byte-identical and the backend with no entry', u2.json);
  const again = await post('/api/hand/undo', { id: g.json.undo });
  ok(again.status === 409, `an undo already used is refused: “${again.json.error}”`);

  // ── 3. the maker ──
  console.log('\n— 3. drag “Whoever made the row” onto Progress —');
  const mk = await post('/api/hand/rule', { table: TABLE, who: 'maker', ...(await seen()) });
  const m1 = await bothSay(TABLE);
  ok(mk.status === 200 && m1.agree && m1.live?.creatorOwns === true && m1.live.permissions.find === 'nobody', 'both places: makers always see and change their own rows; nobody else gains anything', { mk: mk.json, m1 });
  await post('/api/hand/undo', { id: mk.json.undo });
  ok(text(SEC) === secBefore, 'undone, byte for byte');

  // ── 4. anyone at all is asked first ──
  console.log('\n— 4. anyone at all —');
  const pub = await post('/api/hand/rule', { table: TABLE, who: 'public', what: 'see', ...(await seen()) });
  ok(pub.status === 409 && /Anyone on the internet could see every row of Progress/.test(pub.json.error) && text(SEC) === secBefore && (await bothSay(TABLE)).live === null, `without saying so twice it is refused in words, and nothing changes: “${pub.json.error}”`);
  const pub2 = await post('/api/hand/rule', { table: TABLE, who: 'public', what: 'see', confirmPublic: true, ...(await seen()) });
  ok(pub2.status === 200 && (await check(TABLE, anon)), 'said twice, it is made, and the dry run lets someone not signed in look');
  await post('/api/hand/undo', { id: pub2.json.undo });
  ok(text(SEC) === secBefore && !(await check(TABLE, anon)), 'undone, byte for byte, and the dry run turns them away again');

  // ── 5. stale pages ──
  console.log('\n— 5. a page that saw an older version —');
  const s0 = await seen();
  const st1 = await post('/api/hand/rule', { table: TABLE, who: 'authenticated', what: 'see', ...s0, etag: '"not-what-the-page-saw"' });
  const st2 = await post('/api/hand/rule', { table: TABLE, who: 'authenticated', what: 'see', ...s0, fileStamp: 'an-older-stamp' });
  ok(st1.status === 409 && st2.status === 409 && text(SEC) === secBefore && (await bothSay(TABLE)).live === null, `both refused, nothing changed: “${st1.json.error}” / “${st2.json.error}”`);

  // ── 6. a function dropped on a table ──
  console.log('\n— 6. drop a function on a table: a row-change trigger —');
  const m0 = await map();
  const deployed = m0.functions.filter((f) => f.deployed);
  const FN = deployed[0]?.name;
  const WATCH = 'Signal';
  ok(!!FN && m0.tables.some((t) => t.name === WATCH), `a deployed function (${FN}) and a table to watch (${WATCH})`, deployed.map((f) => f.name));
  const tr = await post('/api/hand/trigger', { fn: FN, table: WATCH, actions: ['create'], automationsStamp: m0.automationsStamp });
  ok(tr.status === 200 && tr.json.inBackend && tr.json.inFile, `accepted, on the backend and in nodegx.automations.json (${tr.status}${tr.json.error ? ': ' + tr.json.error : ''})`, tr.json);
  const id = tr.json.trigger?.id;
  const listed = (await admin('/admin/triggers')).triggers.find((t) => t.id === id);
  const inFile = JSON.parse(text(AUTO) ?? '{"triggers":[]}').triggers.find((t) => t.id === id);
  ok(!!listed && listed.type === 'db-change' && listed.dbChange.collection === WATCH && same(listed.dbChange.actions, ['create']) && listed.target.name === FN, '/admin/triggers lists it: a new row of Signal runs the function', listed);
  // the comparison the drift check makes (nodegx-backend automations/shape.ts): both sides through projectTrigger
  ok(!!inFile && same(projectTrigger(listed), inFile), 'the file’s entry is the backend’s trigger in the project’s shape: no drift', { file: inFile, backend: projectTrigger(listed) });
  ok(/now runs whenever a row of Signal is made/.test(tr.json.words), `it says what it did: “${tr.json.words}”`);
  const before = Date.now();
  const made = await admin(`/api/${WATCH}`, { method: 'POST', body: JSON.stringify({}) });
  let run = null;
  for (let i = 0; i < 30 && !run; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const runs = await admin(`/executions?limit=20&since=${before - 1000}`);
    run = (Array.isArray(runs) ? runs : []).find((r) => r.workflowId === FN && r.startedAt >= before - 1000);
  }
  ok(!!made.objectId && !!run && run.startedAt - before < 3000, `a row made in Signal ran ${FN} within 3 s (${run ? run.startedAt - before + ' ms, ' + run.status : 'no run'})`, { made, run });
  const staleAuto = await post('/api/hand/trigger', { fn: FN, table: WATCH, actions: ['update'], automationsStamp: 'an-older-stamp' });
  ok(staleAuto.status === 409 && (await admin('/admin/triggers')).triggers.length === 1, `a page that saw an older automations file is refused, nothing made: “${staleAuto.json.error}”`);
  const noFn = await post('/api/hand/trigger', { fn: 'Nothing like this', table: WATCH, actions: ['create'] });
  ok(noFn.status === 409, `a function the app hasn’t got is refused: “${noFn.json.error}”`);
  const ut = await post('/api/hand/undo', { id: tr.json.undo });
  ok(ut.status === 200 && text(AUTO) === autoBefore && !(await admin('/admin/triggers')).triggers.some((t) => t.id === id), `undone: the trigger is gone from the backend and the automations file is as it was (${autoBefore === null ? 'none' : 'unchanged'})`, ut.json);

  // ── 7. a clock dropped on a function ──
  console.log('\n— 7. drop a clock on a function: a schedule —');
  const bad = await post('/api/hand/trigger', { fn: FN, cron: '61 9 * * *', automationsStamp: (await map()).automationsStamp });
  ok(bad.status === 409 && /can’t read that schedule/.test(bad.json.error), `a schedule the backend can’t read is refused in its words: “${bad.json.error}”`);
  const pv = await post('/api/hand/schedule', { cron: '0 9 * * *' });
  ok(pv.status === 200 && pv.json.valid && !!pv.json.words && pv.json.next.length === 3, `the backend says when it would run: “${pv.json.words}”, next ${pv.json.next?.[0]}`, pv.json);
  const sc = await post('/api/hand/trigger', { fn: FN, cron: '0 9 * * *', automationsStamp: (await map()).automationsStamp });
  const scListed = (await admin('/admin/triggers')).triggers.find((t) => t.id === sc.json.trigger?.id);
  const scFile = JSON.parse(text(AUTO) ?? '{"triggers":[]}').triggers.find((t) => t.id === sc.json.trigger?.id);
  ok(sc.status === 200 && !!scListed && scListed.schedule.cron === '0 9 * * *' && !!scListed.scheduleWords && same(projectTrigger(scListed), scFile), `on the backend with its words (“${scListed?.scheduleWords}”) and in the file, the same`, { sc: sc.json, scListed, scFile });
  const mapWords = (await map()).triggers.find((t) => t.id === sc.json.trigger?.id);
  ok(mapWords?.scheduleWords === scListed?.scheduleWords, 'the map draws the backend’s own words for it');

  // ── 8. removing it ──
  console.log('\n— 8. remove the schedule —');
  const autoWith = text(AUTO);
  const rm = await post('/api/hand/trigger-remove', { id: sc.json.trigger.id, automationsStamp: (await map()).automationsStamp });
  ok(rm.status === 200 && !rm.json.inBackend && !rm.json.inFile && !(await admin('/admin/triggers')).triggers.some((t) => t.id === sc.json.trigger.id), 'gone from both places', rm.json);
  const urm = await post('/api/hand/undo', { id: rm.json.undo });
  ok(urm.status === 200 && text(AUTO) === autoWith && (await admin('/admin/triggers')).triggers.some((t) => t.id === sc.json.trigger.id), 'undoing the removal puts it back on the backend, and the file byte for byte', urm.json);
  const hook = await admin('/admin/triggers', { method: 'POST', body: JSON.stringify({ type: 'webhook', enabled: true, target: { kind: 'function', name: FN }, webhook: { slug: 'from-outside' } }) });
  const rmHook = await post('/api/hand/trigger-remove', { id: hook.trigger.id });
  ok(rmHook.status === 409 && /secret can’t be given back/.test(rmHook.json.error), `a webhook isn’t removed by the map: “${rmHook.json.error}”`);
  await admin(`/admin/triggers/${hook.trigger.id}`, { method: 'DELETE' });
  await post('/api/hand/undo', { id: sc.json.undo });
  ok(text(AUTO) === autoBefore && !(await admin('/admin/triggers')).triggers.length, 'the schedule undone too: no trigger, the automations file as it was');

  // ── 9b. undo after an outside change ──
  console.log('\n— 9b. an undo after someone else wrote —');
  const g2 = await post('/api/hand/rule', { table: TABLE, who: 'authenticated', what: 'see', ...(await seen()) });
  const touched = text(SEC) + '\n';
  fs.writeFileSync(SEC, touched);
  const late = await post('/api/hand/undo', { id: g2.json.undo });
  ok(late.status === 409 && text(SEC) === touched && has((await bothSay(TABLE)).live.permissions.find, 'authenticated'), `refused, and nothing changed in either place: “${late.json.error}”`);
  fs.writeFileSync(SEC, touched.slice(0, -1));
  const later = await post('/api/hand/undo', { id: g2.json.undo });
  ok(later.status === 200 && text(SEC) === secBefore && (await bothSay(TABLE)).live === null, 'once the file holds exactly what the gesture left again, the undo works: it compares what is there, not when it was written', later.json);

  // ── 10. the folder ──
  console.log('\n— 10. the folder —');
  // the folder hashed once: hashed per file it took ~9 s, longer than the map server's keep-alive, and the next fetch
  // reused the socket the server had closed (ECONNRESET at step 11)
  const copyNow = hashTree(copy);
  const diff = Object.keys({ ...copyBefore, ...copyNow }).filter((k) => copyBefore[k] !== copyNow[k]);
  ok(!diff.length, 'every file of the copy is byte for byte what it was before the first gesture', diff);

  // ── 11. the control ──
  console.log('\n— 11. the control: a writer that skips the file —');
  const files = editor.project.files;
  const skipping = makeHands({ be: backend(base, token), files: { ...files, read: files.read, stamp: files.stamp, remove: files.remove, write() {} }, functions: () => analyseProject(editor.project, []).functions.map((f) => f.name) });
  const m2 = await map();
  await skipping.rule({ table: TABLE, who: 'authenticated', what: 'see', etag: m2.etag, fileStamp: m2.fileStamp }).catch(() => {});
  const ctl = await bothSay(TABLE);
  ok(!ctl.agree && /nodegx\.security\.json says null/.test(ctl.says), `check 1’s own test goes red and names the file: “${ctl.says}”`, ctl);
  await admin(`/admin/permissions/collections/${TABLE}`, { method: 'DELETE' });
} catch (e) {
  ok(false, 'the test ran to the end', e.stack);
} finally {
  server?.close();
  await stop(be);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
