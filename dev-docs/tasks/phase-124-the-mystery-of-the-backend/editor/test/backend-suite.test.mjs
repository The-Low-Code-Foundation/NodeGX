// P127 BKO-008 — the backend suite, on COPIES with backends of their own: the members-area template (every edit kind:
// grant, revoke, a row trigger, a schedule, turned off, removed) and the todo template (rules only: it has no function).
//
//   1 the map's own adapter says PASS on both    2 the kit's reference writers say PASS
//   3 the control (a writer that skips the file) says FAIL and names the file, on both
//   4 a writer that keeps the same rules but writes the file its own way says FAIL "written differently"
//   5 the command (bin/backend-suite.js) exits 0 on PASS and 1 on FAIL    6 each copy's folder byte-identical at the end
//
//   node test/backend-suite.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runSuite, referenceAdapter, EDIT_KINDS } from '@nodegx/backend-map/kit';
import mapAdapter from './backend-adapter.mjs';
import { hashTree, freePort, stop, makeCopy, startBackend } from './copies.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES = path.resolve(here, '..', '..', '..', '..', '..', 'templates');
const MEMBERS = process.env.MEMBERS_AREA ?? path.join(TEMPLATES, 'members-area');
const TODO = process.env.TODO_LIST ?? path.join(TEMPLATES, 'todo-list');
const CLI = path.join(here, '..', 'bin', 'backend-suite.js');

let failures = 0;
const ok = (cond, words, detail) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${words}${!cond && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 900)}` : ''}`);
  if (!cond) failures++;
};
const edits = (name) => JSON.parse(fs.readFileSync(path.join(here, name), 'utf8'));

// the second control: the same rules, but the file written its own way (four spaces, no newline at the end)
const ownWay = () => {
  const map = mapAdapter();
  let dir;
  return {
    ...map,
    name: 'the backend map, writing the file its own way',
    open: (o) => ((dir = o.project), map.open(o)),
    async apply(edit) {
      const answer = await map.apply(edit);
      const f = path.join(dir, 'nodegx.security.json');
      fs.writeFileSync(f, JSON.stringify(JSON.parse(fs.readFileSync(f, 'utf8')), null, 4));
      return answer;
    }
  };
};

const script = { members: edits('backend-edits-members.json'), todo: edits('backend-edits-todo.json') };
ok(EDIT_KINDS.every((k) => script.members.some((e) => e.kind === k)), `the members-area script has every edit kind (${EDIT_KINDS.join(', ')})`);

for (const [label, source] of [['members', MEMBERS], ['todo', TODO]]) {
  console.log(`\n— ${label}: a copy of ${path.basename(source)} and a backend of its own —`);
  const c = makeCopy(source, `suite-${label}`);
  const port = await freePort();
  const child = await startBackend(c, port);
  const base = `http://127.0.0.1:${port}`;
  const run = (adapter) => runSuite({ adapter, project: c.copy, backend: base, token: c.token, edits: script[label] });
  try {
    const folderBefore = hashTree(c.copy);
    const startRules = await fetch(base + '/admin/permissions', { headers: { Authorization: `Bearer ${c.token}` } }).then((r) => r.json());

    const map = await run(mapAdapter);
    ok(map.pass && map.putBack, `${label}: ${map.line}`, map.differences);

    const ref = await run(referenceAdapter);
    ok(ref.pass && ref.putBack, `${label}: ${ref.line}`, ref.differences);

    const control = await run(path.join(here, 'backend-adapter-skipfile.mjs'));
    ok(!control.pass && control.differences.some((d) => d.includes('nodegx.security.json')), `${label}: the control says FAIL and names nodegx.security.json — ${control.line}`, control.differences);
    if (label === 'members') ok(control.differences.some((d) => d.includes('nodegx.automations.json')), 'members: the control names nodegx.automations.json too (the triggers)', control.differences);
    console.log(control.differences.map((d) => `        ${d}`).join('\n'));

    const own = await run(ownWay);
    ok(!own.pass && own.differences.length === 1 && /written differently/.test(own.differences[0]), `${label}: the same rules written another way say FAIL, once — ${own.differences[0] ?? own.line}`, own.differences);

    const endRules = await fetch(base + '/admin/permissions', { headers: { Authorization: `Bearer ${c.token}` } }).then((r) => r.json());
    // key by key, sorted: a table put back comes last in the backend's answer
    const sorted = (v) => (Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v);
    ok(JSON.stringify(sorted(endRules.config)) === JSON.stringify(sorted(startRules.config)), `${label}: the backend's rules are back as they started, after four runs`);
    const folderAfter = hashTree(c.copy);
    const moved = Object.keys({ ...folderBefore, ...folderAfter }).filter((k) => folderBefore[k] !== folderAfter[k]);
    ok(!moved.length, `${label}: the copy's folder is byte-identical at the end`, moved);

    if (label === 'members') {
      const tokenFile = path.join(c.work, 'ADMIN-TOKEN');
      fs.writeFileSync(tokenFile, c.token + '\n');
      const cli = (adapter) => spawnSync(process.execPath, [CLI, adapter, c.copy, path.join(here, 'backend-edits-members.json'), '--backend', base, '--token-file', tokenFile], { encoding: 'utf8' });
      const pass = cli(path.join(here, 'backend-adapter.mjs'));
      ok(pass.status === 0 && /^PASS — the backend map on /m.test(pass.stdout), `the command exits 0 and says PASS: ${pass.stdout.trim().split('\n')[0]}`, pass.stdout + pass.stderr);
      const fail = cli(path.join(here, 'backend-adapter-skipfile.mjs'));
      ok(fail.status === 1 && /^FAIL — /m.test(fail.stdout) && /nodegx\.security\.json/.test(fail.stdout), `the command exits 1 on the control and names the file: ${fail.stdout.trim().split('\n')[0]}`, fail.stdout + fail.stderr);
    }
  } finally {
    await stop(child);
  }
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nEvery check passed.');
process.exit(failures ? 1 : 0);
