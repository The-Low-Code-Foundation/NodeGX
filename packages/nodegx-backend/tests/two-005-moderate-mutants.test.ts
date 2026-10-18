/**
 * TWO-005 slice 5 — the moderation spec's mutants: each loosens one rule in the SHIPPED `report`, `hide`, `block` or
 * `writeRules`, or in the policy (in a copy of the template), and `two-005-moderate.test.ts` must go red against it.
 *
 * Slow (one backend spec per mutant), so it runs only when asked:
 *
 *     TWO005_MUTANTS=1 npx jest tests/two-005-moderate-mutants.test.ts
 */
import { spawnSync } from 'child_process';
import * as path from 'path';

import { mutateGram } from './helpers/gram-mutant';

const TEMPLATE = path.join(__dirname, '../../../templates/gram');
const RUN = process.env.TWO005_MUTANTS === '1';

jest.setTimeout(1800000);

/** [what it loosens, function (or `policy`), text in its script (or a policy path), what replaces it] */
export const MODERATE_MUTANTS: Array<[string, string, string, unknown]> = [
  // report
  ['a second report kept', 'report', 'if (before.length === 0) {', 'if (true) {'],
  ['a report with any reason', 'report', 'if (reasons.indexOf(a.reason) < 0)', 'if (false)'],
  ['a comment reported for a child’s photo', 'report', 'var reasons = isComment ? ["unkind","spam","other"]', 'var reasons = isComment ? ["child-photo","unkind","spam","other"]'],
  ['something else with no words', 'report', "if (a.reason === 'other' && !note)", 'if (false)'],
  ['a long note kept', 'report', 'if (note.length > 500)', 'if (false)'],
  ['your own reported', 'report', 'if (idOf(row.member) === m.objectId) {', 'if (false) {'],
  ['a hidden post reported', 'report', 'if (!p || p.endedAt) return null;', 'if (!p) return null;'],
  ['a hidden comment reported', 'report', 'if (!c || c.endedAt) return null;', 'if (!c) return null;'],
  // hide
  ['a member hides another’s', 'hide', 'if (!mine && !admin) {', 'if (false) {'],
  ['hidden with no ACL: members still read it', 'hide', '{ className: cls, acl: ADMINS_ONLY }', '{ className: cls }'],
  ['brought back with no ACL: members still can’t', 'hide', '{ className: cls, acl: POLICY_READS }', '{ className: cls }'],
  ['an admin hides with no reason', 'hide', "if (!why) { refuse('Say why it’s hidden.", "if (false) { refuse('Say why it’s hidden."],
  ['a member’s own taken down with their words', 'hide', 'if (!mine) {\n    why = said(a.reason);', 'if (true) {\n    why = said(a.reason);'],
  ['hidden again: the reason changes', 'hide', 'if (row.endedAt) { Outputs.done(); return; }', ''],
  ['a member brings one back', 'hide', "if (!admin) { refuse('Only an admin can bring back a ' + thing + '.'); return; }", ''],
  ['brought back while blocked', 'hide', 'if (by && by.endedAt) {', 'if (false) {'],
  // block
  ['blocked with no reason', 'block', "if (!reason) { refuse('Say why. Admins see", "if (false) { refuse('Say why. Admins see"],
  ['an admin blocked', 'block', "if (t.role === 'admin') {", 'if (false) {'],
  ['yourself blocked', 'block', 'if (me && t.objectId === me.objectId) {', 'if (false) {'],
  ['their sign-in left on', 'block', 'Outputs.disabled = a.blocked;', 'Outputs.disabled = false;'],
  ['what they wrote left showing', 'block', 'acl: a.blocked ? ADMINS_ONLY : POLICY_READS', 'acl: POLICY_READS'],
  ['let back, what they wrote stays hidden', 'block', 'acl: a.blocked ? ADMINS_ONLY : POLICY_READS', 'acl: ADMINS_ONLY'],
  ['let back brings back what was hidden for itself', 'block', 'if (!a.blocked && rows[i].endedAt) continue;', ''],
  ['blocked with no history', 'block', "await history('Member', 'member', id, Inputs.userId, { blocked: { from: false, to: true }, blockedReason: { from: null, to: reason } });", ''],
  ['blocked twice: the reason changes', 'block', 'if (!!t.endedAt === a.blocked) { Outputs.done(); return; }', ''],
  // writeRules
  ['empty rules saved', 'writeRules', "if (!rules) { refuse('Write the rules first.'); return; }", ''],
  ['too long rules saved', 'writeRules', 'if (rules.length > 5000)', 'if (false)'],
  ['rules with no history', 'writeRules', "await history('Community', 'community', c.objectId, Inputs.userId, { rules: { from: c.rules || null, to: rules } });", ''],
  ['the same rules written twice', 'writeRules', "if ((c.rules || '') === rules) { Outputs.done(); return; }", ''],
  // the policy
  ['members read reports', 'policy', 'collections.Report.permissions.find', ['role:admin', 'role:member']],
  ['members read comment reports', 'policy', 'collections.CommentReport.permissions.find', ['role:admin', 'role:member']],
  ['members write a report', 'policy', 'collections.Report.permissions.create', ['role:member', 'role:admin']],
  ['members write a post', 'policy', 'collections.Post.permissions.update', ['role:member', 'role:admin']],
  ['anyone signed in blocks', 'policy', 'functions.block.call', 'authenticated'],
  ['anyone signed in writes the rules', 'policy', 'functions.writeRules.call', 'authenticated'],
  ['strangers report', 'policy', 'functions.report.call', 'public']
];

(RUN ? describe : describe.skip)('TWO-005 slice 5 — the moderation spec’s mutants', () => {
  it.each(MODERATE_MUTANTS)('mutant red: %s (%s)', (_what, fn, from, to) => {
    const copy = mutateGram(TEMPLATE, fn, from, to);
    const r = spawnSync('npx', ['jest', 'tests/two-005-moderate.test.ts', '--silent'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, TWO005_TEMPLATE: copy, TWO005_MUTANTS: '' },
      encoding: 'utf8'
    });
    const tally = /Tests:\s+(.*)/.exec(`${r.stdout}\n${r.stderr}`)?.[1] ?? 'no tally';
    // Red means the spec ran and failed: a crash before any test ran would be red for the wrong reason.
    expect([r.status, /failed/.test(tally), /passed/.test(tally)]).toEqual([1, true, true]);
  });
});
