/**
 * TWO-005 slice 3 — the profile spec's mutants: each loosens one rule in the SHIPPED `editProfile` or in the policy
 * (in a copy of the template), and `two-005-profile.test.ts` must go red against it.
 *
 * Slow (one backend spec per mutant), so it runs only when asked:
 *
 *     TWO005_MUTANTS=1 npx jest tests/two-005-profile-mutants.test.ts
 */
import { spawnSync } from 'child_process';
import * as path from 'path';

import { mutateGram } from './helpers/gram-mutant';

const TEMPLATE = path.join(__dirname, '../../../templates/gram');
const RUN = process.env.TWO005_MUTANTS === '1';

jest.setTimeout(1800000);

/** [what it loosens, function (or `policy`), text in its script (or a policy path), what replaces it] */
export const PROFILE_MUTANTS: Array<[string, string, string, unknown]> = [
  // W1, the photo
  ['someone else’s photo kept', 'editProfile', "if (!file || idOf(file.owner) !== String(userId))", 'if (!file)'],
  ['a public photo kept', 'editProfile', "if (!shared) return 'public';", ''],
  ['a photo admins can’t see kept', 'editProfile', '["role:member","role:admin"].every', '["role:member"].every'],
  ['a file that isn’t a photo kept', 'editProfile', "if (String(file.contentType || '').indexOf('image/') !== 0) return 'image';", ''],
  ['a photo whose link points elsewhere kept', 'editProfile', "if (url.slice(-(name.length + 7)) !== '/files/' + name) return 'mine';", ''],
  ['the photo not checked at all', 'editProfile', 'var wrong = await photoProblem(a.photo, Inputs.userId);', "var wrong = '';"],
  // what is kept, and how
  ['a photo left out taken off', 'editProfile', 'var photo = had;', 'var photo = had; if (a.photo === undefined) { next.photo = null; photo = null; }'],
  ['null leaves the photo on', 'editProfile', 'if (a.photo === null) { next.photo = null; photo = null; }', 'if (a.photo === null) { }'],
  ['an unchanged save keeps history', 'editProfile', 'if (Object.keys(changes).length > 0) {', 'if (true) {'],
  ['no history', 'editProfile', "await history('Member', 'member', m.objectId, Inputs.userId, changes);", ''],
  ['the bio kept untrimmed', 'editProfile', "var bio = typeof a.bio === 'string' ? a.bio.trim() : '';", "var bio = typeof a.bio === 'string' ? a.bio : '';"],
  // too long, empty
  ['an empty name', 'editProfile', "if (!name) { refuse('Your name, as the community knows you.'); return; }", ''],
  ['a long name', 'editProfile', 'if (name.length > 80)', 'if (false)'],
  ['a long bio', 'editProfile', 'if (bio.length > 150)', 'if (false)'],
  ['a long bio cut instead', 'editProfile', 'if (bio.length > 150) { refuse(', 'if (bio.length > 150) { bio = bio.slice(0, 150); } if (false) { refuse('],
  // who
  ['a blocked member’s row edits', 'editProfile', "return m && m.status === 'approved' && !m.endedAt ? m : null;", "return m && m.status === 'approved' ? m : null;"],
  ['a named member edited', 'editProfile', 'var m = await inMember(Inputs.userId);', "var m = a.memberId ? await one('Member', { objectId: { equalTo: String(a.memberId) } }) : await inMember(Inputs.userId);"],
  // the policy
  ['anyone signed in edits', 'policy', 'functions.editProfile.call', 'authenticated'],
  ['members may write a Member row', 'policy', 'collections.Member.permissions.update', ['role:member', 'role:admin']]
];

(RUN ? describe : describe.skip)('TWO-005 slice 3 — the profile spec’s mutants', () => {
  it.each(PROFILE_MUTANTS)('mutant red: %s (%s)', (_what, fn, from, to) => {
    const copy = mutateGram(TEMPLATE, fn, from, to);
    const r = spawnSync('npx', ['jest', 'tests/two-005-profile.test.ts', '--silent'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, TWO005_TEMPLATE: copy, TWO005_MUTANTS: '' },
      encoding: 'utf8'
    });
    const tally = /Tests:\s+(.*)/.exec(`${r.stdout}\n${r.stderr}`)?.[1] ?? 'no tally';
    // Red means the spec ran and failed: a crash before any test ran would be red for the wrong reason.
    expect([r.status, /failed/.test(tally), /passed/.test(tally)]).toEqual([1, true, true]);
  });
});
