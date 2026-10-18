/**
 * TWO-005 slice 1 — the join spec's mutants: each loosens one rule in a SHIPPED script or in the policy (in a copy of
 * the template), and `two-005-join.test.ts` must go red against it.
 *
 * Slow (one backend spec per mutant), so it runs only when asked:
 *
 *     TWO005_MUTANTS=1 npx jest tests/two-005-join-mutants.test.ts
 *
 * A mutant whose text isn't in exactly one script fails here, so a rename can't turn one into a silent green.
 */
import { spawnSync } from 'child_process';
import * as path from 'path';

import { mutateGram } from './helpers/gram-mutant';

const TEMPLATE = path.join(__dirname, '../../../templates/gram');
const RUN = process.env.TWO005_MUTANTS === '1';

jest.setTimeout(1800000);

/** [what it loosens, function (or `policy`), text in its script (or a policy path), what replaces it] */
export const JOIN_MUTANTS: Array<[string, string, string, string]> = [
  ['a second admin set up', 'setUpCommunity', 'if (admin) { Outputs.denied(); return; }', 'if (false) { Outputs.denied(); return; }'],
  ['any token opens the door', 'setUpCommunity', 'if (expected.length === 0 || d !== 0)', 'if (expected.length === 0)'],
  ['a short password for the admin', 'setUpCommunity', 'String(a.password).length < 8', 'String(a.password).length < 1'],
  ['no 13 or older', 'askToJoin', 'if (a.over13 !== true)', 'if (false)'],
  ['a truthy tick counts', 'askToJoin', 'if (a.over13 !== true)', 'if (!a.over13)'],
  ['a long name kept', 'askToJoin', 'if (name.length > 80)', 'if (false)'],
  ['no name needed', 'askToJoin', "if (!name) { refuse('Your name", "if (false) { refuse('Your name"],
  ['any email taken', 'askToJoin', 'var e = email(a.email);', "var e = String(a.email || '').trim().toLowerCase();"],
  ['joined let in at once', 'askToJoin', "status: 'waiting', role: 'member'", "status: 'approved', role: 'member'"],
  ['someone else’s member answered', 'whoAmI', 'var m = await member(Inputs.userId);', "var m = await one('Member', {});"],
  ['a blocked person let in', 'letIn', "if (m.endedAt) { refuse(m.name + ' is blocked. Bring", "if (false) { refuse(m.name + ' is blocked. Bring"],
  ['let in twice, written twice', 'letIn', "if (Inputs.was !== 'approved') {", 'if (true) {'],
  ['the message links to the start', 'letIn', "+ '/sign-in'", "+ '/'"],
  ['no app address needed', 'letIn', "if (app.indexOf('https://') !== 0 && app.indexOf('http://') !== 0)", 'if (false)'],
  ['turned away, reason lost', 'turnAway', "|| 'Not let in.'", "|| 'No.'"],
  ['someone in turned away here', 'turnAway', "if (m.status !== 'waiting')", 'if (false)'],
  ['turned away, sign-in left on', 'turnAway', 'Outputs.disabled = true;', 'Outputs.disabled = false;'],
  ['made an admin before being let in', 'makeAdmin', "if (m.status !== 'approved') { refuse('Let '", "if (false) { refuse('Let '"],
  ['made an admin, the role left as it was', 'makeAdmin', "{ role: 'admin' }, { className: 'Member' }", "{ role: 'member' }, { className: 'Member' }"],
  ['anyone signed in lets people in', 'policy', 'functions.letIn.call', 'authenticated'],
  ['anyone signed in reads every member', 'policy', 'collections.Member.permissions.find', 'authenticated'],
  ['sign-up opened', 'policy', 'signup', 'public']
];

const mutate = (fn: string, from: string, to: string) => mutateGram(TEMPLATE, fn, from, to);

(RUN ? describe : describe.skip)('TWO-005 slice 1 — the join spec’s mutants', () => {
  it.each(JOIN_MUTANTS)('mutant red: %s (%s)', (_what, fn, from, to) => {
    const copy = mutate(fn, from, to);
    const r = spawnSync('npx', ['jest', 'tests/two-005-join.test.ts', '--silent'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, TWO005_TEMPLATE: copy, TWO005_MUTANTS: '' },
      encoding: 'utf8'
    });
    const tally = /Tests:\s+(.*)/.exec(`${r.stdout}\n${r.stderr}`)?.[1] ?? 'no tally';
    // Red means the spec ran and failed: a crash before any test ran would be red for the wrong reason.
    expect([r.status, /failed/.test(tally), /passed/.test(tally)]).toEqual([1, true, true]);
  });
});
