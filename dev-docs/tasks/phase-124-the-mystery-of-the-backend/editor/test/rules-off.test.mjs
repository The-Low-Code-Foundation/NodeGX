// NPMAUDIT-BACKENDMAPCHECK — with the backend's rules off (dev-open), every answer about who gets in says
// "let in", and says why first, whatever the rule would say. No backend: a stub that answers like one.
//
//   node test/rules-off.test.mjs

import { dryRuns } from '../lib/rules.mjs';
import { anonymousReach } from '../lib/reach.mjs';

let failures = 0;
const ok = (cond, words) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${words}`);
  if (!cond) failures++;
};

/** A backend whose rule for Task is "signed-in only", with its rules on or off. */
const stub = (security) => ({
  health: async () => ({ backendName: 'stub', security }),
  get: async (p) => (p.startsWith('/admin/users') ? { users: [] } : p.startsWith('/admin/roles') ? { roles: [] } : {}),
  post: async (p, b) => (b.principal.kind === 'anonymous' ? { allowed: false, reason: 'rule "authenticated"' } : { allowed: true, reason: '' })
});
const world = { schema: { tables: [{ name: 'Task' }] }, index: { total: { Task: 3 } } };
const config = { collections: { Task: { permissions: { find: 'authenticated', get: 'authenticated' } } } };

for (const [label, security, open] of [
  ['rules off (dev-open)', { enforced: false, devOpen: true }, true],
  ['rules not enforced', { enforced: false, devOpen: false }, true],
  ['rules on (control)', { enforced: true, devOpen: false }, false]
]) {
  const be = stub(security);
  const checks = await dryRuns(be, 'Task');
  const anon = checks.filter((c) => c.who === 'Someone not signed in');
  ok(anon.length === 2, `${label}: two answers for someone not signed in`);
  if (open) {
    ok(anon.every((c) => c.allowed === true), `${label}: someone not signed in is let in`);
    ok(anon.every((c) => c.reason.startsWith('The backend is NOT enforcing its rules')), `${label}: and every answer says the rules are off first`);
    ok(anon.every((c) => c.ruleAllows === false), `${label}: the rule's own answer is kept, second`);
  } else {
    ok(anon.every((c) => c.allowed === false && !('ruleAllows' in c)), `${label}: someone not signed in is turned away, as the rule says`);
  }
  const reach = await anonymousReach({ be, app: { functions: [] }, world, config });
  ok(reach.tables.Task.reached === (open ? 3 : 0), `${label}: someone not signed in reaches ${open ? 'all 3' : 'none'} of Task's rows (${reach.tables.Task.reached})`);
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
