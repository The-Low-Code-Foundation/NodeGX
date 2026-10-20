/**
 * TWO-005 slice 2 — the feed spec's mutants: each loosens one rule in a SHIPPED script or in the policy (in a copy of
 * the template), and `two-005-feed.test.ts` must go red against it.
 *
 * Slow (one backend spec per mutant), so it runs only when asked:
 *
 *     TWO005_MUTANTS=1 npx jest tests/two-005-feed-mutants.test.ts
 */
import { spawnSync } from 'child_process';
import * as path from 'path';

import { mutateGram } from './helpers/gram-mutant';

const TEMPLATE = path.join(__dirname, '../../../templates/gram');
const RUN = process.env.TWO005_MUTANTS === '1';

jest.setTimeout(1800000);

/** [what it loosens, function (or `policy`), text in its script (or a policy path), what replaces it] */
export const FEED_MUTANTS: Array<[string, string, string, unknown]> = [
  // sharePost — W1: nothing a member posts is public
  ['someone else’s photo posted', 'sharePost', "if (!file || idOf(file.owner) !== String(userId))", 'if (!file)'],
  ['a public photo posted', 'sharePost', "if (!shared) return 'public';", ''],
  ['a photo shared with members only posted (admins can’t see it)', 'sharePost', '["role:member","role:admin"].every', '["role:member"].every'],
  ['a file that isn’t a photo posted', 'sharePost', "if (String(file.contentType || '').indexOf('image/') !== 0) return 'image';", ''],
  ['a photo whose link points elsewhere kept', 'sharePost', "if (url.slice(-(name.length + 7)) !== '/files/' + name) return 'mine';", ''],
  ['a fifth photo', 'sharePost', 'if (photos.length > 4)', 'if (photos.length > 5)'],
  ['an empty post', 'sharePost', "if (!caption && photos.length === 0) { refuse('Write something", "if (false) { refuse('Write something"],
  ['a long caption', 'sharePost', 'if (caption.length > 2200)', 'if (false)'],
  ['a blocked member’s row posts', 'sharePost', "return m && m.status === 'approved' && !m.endedAt ? m : null;", "return m && m.status === 'approved' ? m : null;"],
  ['the caption kept untrimmed', 'sharePost', "var caption = typeof a.caption === 'string' ? a.caption.trim() : '';", "var caption = typeof a.caption === 'string' ? a.caption : '';"],
  // heartPost
  ['a second heart by one person', 'heartPost', 'if (a.on && mine.length === 0)', 'if (a.on)'],
  ['off leaves the heart', 'heartPost', 'if (!a.on) for (var i = 0; i < mine.length; i++)', 'if (!a.on) for (var i = 0; i < 0; i++)'],
  ['the count by row, not by person', 'heartPost', 'count: Object.keys(people).length', 'count: all.length'],
  ['a truthy on counts as on', 'heartPost', "typeof a.on !== 'boolean'", "a.on === undefined"],
  ['a hidden post hearted', 'heartPost', 'if (!p || p.endedAt) return null;', 'if (!p) return null;'],
  ['a blocked member’s post hearted', 'heartPost', 'return by && !by.endedAt ? p : null;', 'return p;'],
  // commentOn
  ['an empty comment', 'commentOn', "if (!words) { refuse('Write a comment first.'); return; }", 'if (false) { return; }'],
  ['a long comment', 'commentOn', 'if (words.length > 1000)', 'if (false)'],
  ['a comment on a hidden post', 'commentOn', 'if (!p || p.endedAt) return null;', 'if (!p) return null;'],
  ['a blocked member’s row comments', 'commentOn', "return m && m.status === 'approved' && !m.endedAt ? m : null;", "return m ? m : null;"],
  // the policy
  ['anyone signed in posts', 'policy', 'functions.sharePost.call', 'authenticated'],
  ['anyone signed in hearts', 'policy', 'functions.heartPost.call', 'authenticated'],
  ['anyone signed in comments', 'policy', 'functions.commentOn.call', 'authenticated']
];

(RUN ? describe : describe.skip)('TWO-005 slice 2 — the feed spec’s mutants', () => {
  it.each(FEED_MUTANTS)('mutant red: %s (%s)', (_what, fn, from, to) => {
    const copy = mutateGram(TEMPLATE, fn, from, to);
    const r = spawnSync('npx', ['jest', 'tests/two-005-feed.test.ts', '--silent'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, TWO005_TEMPLATE: copy, TWO005_MUTANTS: '' },
      encoding: 'utf8'
    });
    const tally = /Tests:\s+(.*)/.exec(`${r.stdout}\n${r.stderr}`)?.[1] ?? 'no tally';
    // Red means the spec ran and failed: a crash before any test ran would be red for the wrong reason.
    expect([r.status, /failed/.test(tally), /passed/.test(tally)]).toEqual([1, true, true]);
  });
});
