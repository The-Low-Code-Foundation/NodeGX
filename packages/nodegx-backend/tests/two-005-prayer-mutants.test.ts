/**
 * TWO-005 slice 4 — the prayer spec's mutants: each loosens one rule in the SHIPPED `prayFor` or `sharePost`, or in
 * the policy (in a copy of the template), and `two-005-prayer.test.ts` must go red against it.
 *
 * Slow (one backend spec per mutant), so it runs only when asked:
 *
 *     TWO005_MUTANTS=1 npx jest tests/two-005-prayer-mutants.test.ts
 */
import { spawnSync } from 'child_process';
import * as path from 'path';

import { mutateGram } from './helpers/gram-mutant';

const TEMPLATE = path.join(__dirname, '../../../templates/gram');
const RUN = process.env.TWO005_MUTANTS === '1';

jest.setTimeout(1800000);

/** [what it loosens, function (or `policy`), text in its script (or a policy path), what replaces it] */
export const PRAYER_MUTANTS: Array<[string, string, string, unknown]> = [
  // I prayed, on and off
  ['a second I prayed kept', 'prayFor', 'if (a.on && mine.length === 0)', 'if (a.on)'],
  ['taken back, it stays', 'prayFor', 'if (!a.on) for (var i = 0;', 'if (false) for (var i = 0;'],
  ['someone else’s I prayed taken back', 'prayFor', "{ and: [onPost, { doneBy: { equalTo: ptr('_User', Inputs.userId) } }] }", 'onPost'],
  ['on or off not checked', 'prayFor', " || typeof a.on !== 'boolean'", ''],
  // the count
  ['counted by row, not by person', 'prayFor', 'return Object.keys(people).length;', 'return all.length;'],
  ['the count written on every press', 'prayFor', 'if (count !== p.prayedCount) await', 'if (true) await'],
  ['the count never written', 'prayFor', "if (count !== p.prayedCount) await Noodl.Records.save(postId, { prayedCount: count }, { className: 'Post' });", ''],
  // what may be prayed for, and by whom
  ['a post prayed for', 'prayFor', "if (p.kind !== 'prayer') { refuse('Only a prayer request has I prayed.'); return; }", ''],
  ['a hidden request prayed for', 'prayFor', 'if (!p || p.endedAt) return null;', 'if (!p) return null;'],
  ['a blocked member’s request prayed for', 'prayFor', 'return by && !by.endedAt ? p : null;', 'return by ? p : null;'],
  ['a blocked member’s row prays', 'prayFor', "return m && m.status === 'approved' && !m.endedAt ? m : null;", "return m && m.status === 'approved' ? m : null;"],
  // a prayer request is made
  ['a prayer request with a photo', 'sharePost', "if (kind === 'prayer' && photos.length > 0) { refuse('A prayer request is words only.'); return; }", ''],
  ['a prayer request with no words', 'sharePost', '"prayer":"Say what you’d like the members to pray for.",', ''],
  ['any kind shared', 'sharePost', '["post","prayer","testimony","event"].indexOf(kind) < 0', 'false'],
  ['a prayer request with no count', 'sharePost', "if (kind === 'prayer') row.prayedCount = 0;", ''],
  // the policy
  ['every member reads who prayed', 'policy', 'collections.Prayed.permissions.find', ['role:admin', 'role:member']],
  ['members write an I prayed', 'policy', 'collections.Prayed.permissions.create', ['role:member', 'role:admin']],
  ['members write a post’s count', 'policy', 'collections.Post.permissions.update', ['role:member', 'role:admin']],
  ['anyone signed in prays', 'policy', 'functions.prayFor.call', 'authenticated']
];

(RUN ? describe : describe.skip)('TWO-005 slice 4 — the prayer spec’s mutants', () => {
  it.each(PRAYER_MUTANTS)('mutant red: %s (%s)', (_what, fn, from, to) => {
    const copy = mutateGram(TEMPLATE, fn, from, to);
    const r = spawnSync('npx', ['jest', 'tests/two-005-prayer.test.ts', '--silent'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, TWO005_TEMPLATE: copy, TWO005_MUTANTS: '' },
      encoding: 'utf8'
    });
    const tally = /Tests:\s+(.*)/.exec(`${r.stdout}\n${r.stderr}`)?.[1] ?? 'no tally';
    // Red means the spec ran and failed: a crash before any test ran would be red for the wrong reason.
    expect([r.status, /failed/.test(tally), /passed/.test(tally)]).toEqual([1, true, true]);
  });
});
