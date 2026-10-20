/**
 * TWO-005 slice 5 — the moderation pages' scripts against fixtures: reporting a post or a comment, the admins' queue
 * (reported, hidden, blocked), an admin's look at one post or comment, Report / Take down / Reports and hiding on a
 * post's page, Block and Let them back on a profile, and the rules. The functions behind them are graded on a real
 * backend (`nodegx-backend/tests/two-005-moderate.test.ts`), and the ACL that hides a row there too; here the fixtures
 * hand each reader only the rows the backend would (a member gets no hidden row, nothing a blocked member wrote, and
 * no report). The pages in a browser by the drive.
 */
import { compiles, Row, run } from './two003Run';
import * as feed from './two005FeedPages';
import * as shipped from './two005ModeratePages';
import * as profile from './two005ProfilePages';
import { GRAM_SLICE5_CLOUD, TAKEN_DOWN } from './two005Moderate';

/** The scripts under test: the shipped ones, or one mutated (the loop at the end). */
const SHIPPED = {
  REPORT_LOAD: shipped.REPORT_LOAD,
  REPORT_GATHER: shipped.REPORT_GATHER,
  MODERATION_LOAD: shipped.MODERATION_LOAD,
  QUEUE_ROW_WHERE: shipped.QUEUE_ROW_WHERE,
  LOOK_LOAD: shipped.LOOK_LOAD,
  LOOK_HIDE: shipped.LOOK_HIDE,
  LOOK_BRING_BACK: shipped.LOOK_BRING_BACK,
  RULES_LOAD: shipped.RULES_LOAD,
  RULES_GATHER: shipped.RULES_GATHER,
  POST_LOAD: feed.POST_LOAD,
  TAKE_DOWN_POST: feed.TAKE_DOWN_POST,
  TAKE_DOWN_COMMENT: feed.TAKE_DOWN_COMMENT,
  PROFILE_LOAD: profile.PROFILE_LOAD,
  BLOCK_GATHER: profile.BLOCK_GATHER,
  LET_BACK_GATHER: profile.LET_BACK_GATHER
};
let S: Record<keyof typeof SHIPPED, string> = { ...SHIPPED };
const CHECKS: Record<string, () => Promise<void>> = {};
const check = (name: string, fn: () => Promise<void> | void) => {
  CHECKS[name] = async () => fn();
  it(name, async () => fn());
};

const at = (h: number) => `2026-10-15T${String(h).padStart(2, '0')}:00:00.000Z`;
const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });

const MEMBERS: Row[] = [
  { objectId: 'm1', name: 'Ann Mensah', status: 'approved', role: 'member', login: 'u1' },
  { objectId: 'm2', name: 'Bob Owusu', status: 'approved', role: 'member', login: 'u2' },
  { objectId: 'm3', name: 'Zed Darko', status: 'approved', role: 'member', login: 'u3', endedAt: at(7), blockedReason: 'Selling in the comments' },
  { objectId: 'm4', name: 'Vic Tetteh', status: 'waiting', role: 'member', login: 'u4', endedAt: at(8), blockedReason: 'Not let in.' },
  { objectId: 'm5', name: 'Wes Ofori', status: 'waiting', role: 'member', login: 'u5' },
  { objectId: 'm6', name: 'Cara Boateng', status: 'approved', role: 'member', login: 'u6' },
  { objectId: 'm9', name: 'Ama Kumi', status: 'approved', role: 'admin', login: 'u9' },
  { objectId: 'm10', name: 'Pat Asare', status: 'approved', role: 'admin', login: 'u10' }
];
const POSTS: Row[] = [
  { objectId: 'p1', caption: 'Sunday lunch', kind: 'post', member: 'm1', createdAt: at(9), photos: [] },
  { objectId: 'p6', caption: 'My new shop is open', kind: 'post', member: 'm2', createdAt: at(10), photos: [] },
  { objectId: 'p12', caption: 'Pray for my mother', kind: 'prayer', prayedCount: 0, member: 'm1', createdAt: at(11), photos: [] },
  { objectId: 'p4', caption: 'Something unkind', kind: 'post', member: 'm1', createdAt: at(8), endedAt: at(14), hiddenReason: 'Unkind', photos: [] },
  { objectId: 'p13', caption: 'Wrong photo', kind: 'post', member: 'm2', createdAt: at(8), endedAt: at(15), hiddenReason: TAKEN_DOWN, photos: [] },
  { objectId: 'p3', caption: 'Buy my phones', kind: 'post', member: 'm3', createdAt: at(6), photos: [] },
  { objectId: 'p14', caption: 'Zed’s hidden', kind: 'post', member: 'm3', createdAt: at(6), endedAt: at(7), hiddenReason: 'Spam', photos: [] }
];
const COMMENTS: Row[] = [
  { objectId: 'c1', text: 'Who let you in?', post: ptr('Post', 'p1'), member: 'm2', createdAt: at(10) },
  { objectId: 'c2', text: 'Well done!', post: ptr('Post', 'p6'), member: 'm1', createdAt: at(11) },
  { objectId: 'c3', text: 'Cheap phones here', post: ptr('Post', 'p1'), member: 'm6', createdAt: at(10), endedAt: at(13), hiddenReason: 'Spam' },
  { objectId: 'c4', text: 'DM me', post: ptr('Post', 'p1'), member: 'm3', createdAt: at(9) }
];
const REPORTS: Row[] = [
  { objectId: 'r1', post: ptr('Post', 'p1'), doneBy: 'u2', reason: 'unkind', at: { iso: at(12) } },
  { objectId: 'r2', post: ptr('Post', 'p1'), doneBy: 'u6', reason: 'child-photo', note: 'My niece, no yes from her mum', at: { iso: at(11) } },
  // More said unkind than said a child: the child's reason still names it.
  { objectId: 'r7', post: ptr('Post', 'p1'), doneBy: 'u10', reason: 'unkind', at: { iso: at(10) } },
  { objectId: 'r3', post: ptr('Post', 'p6'), doneBy: 'u1', reason: 'spam', at: { iso: at(13) } },
  // A race's second row: Ann sent it on two phones at once. She is one person who reported it.
  { objectId: 'r4', post: ptr('Post', 'p6'), doneBy: 'u1', reason: 'spam', at: { iso: at(13) } },
  { objectId: 'r5', post: ptr('Post', 'p4'), doneBy: 'u2', reason: 'unkind', at: { iso: at(13) } },
  { objectId: 'r6', post: ptr('Post', 'p3'), doneBy: 'u1', reason: 'spam', at: { iso: at(10) } }
];
const COMMENT_REPORTS: Row[] = [
  { objectId: 'k1', comment: ptr('Comment', 'c1'), doneBy: 'u1', reason: 'unkind', note: 'Rude to a new member', at: { iso: at(12) } },
  { objectId: 'k2', comment: ptr('Comment', 'c3'), doneBy: 'u2', reason: 'spam', at: { iso: at(12) } }
];

/** What the backend hands a reader: an admin everything; anyone else no hidden row, nothing of a blocked member's, no report. */
function tables(login: string): Record<string, Row[]> {
  const me = MEMBERS.find((m) => m.login === login);
  const admin = me?.role === 'admin';
  const blocked = MEMBERS.filter((m) => m.endedAt).map((m) => m.objectId);
  const open = (r: Row) => admin || (!r.endedAt && !blocked.includes(r.member));
  return {
    Member: MEMBERS,
    Post: POSTS.filter(open),
    Comment: COMMENTS.filter(open),
    Heart: [],
    Prayed: [],
    Report: admin ? REPORTS : [],
    CommentReport: admin ? COMMENT_REPORTS : [],
    Community: [{ objectId: 'g1', name: 'The gram', rules: 'Be kind.\nNo photo of a child without their parent’s yes.' }]
  };
}
const whoIs = (login: string) => {
  const m = MEMBERS.find((x) => x.login === login) as Row;
  return { id: m.objectId, status: m.status, role: m.role, name: m.name };
};
const as = (login: string | null) =>
  login === null ? { tables: tables(''), kept: {}, cloud: () => { throw new Error('a stranger’s page asked the backend'); } } : { current: { id: login }, tables: tables(login), kept: {}, cloud: () => ({ me: whoIs(login) }) };

describe('TWO-005 slice 5 — reporting', () => {
  check('a post: what it is and whose, the post’s four reasons, who won’t see it', async () => {
    const r = await run(S.REPORT_LOAD, { post: 'p1' }, as('u2'));
    expect(r.out).toMatchObject({ ok: true, kind: 'post', id: 'p1', title: 'Report a post', what: 'A post by Ann Mensah: “Sunday lunch”', own: false, other: true, thanks: 'Thanks. The admins will look at it. Ann won’t see who reported it.' });
    expect(r.out.reasons.map((x: Row) => x.Value)).toEqual(['child-photo', 'unkind', 'spam', 'other']);
    expect(r.out.reasons.map((x: Row) => x.Label)).toEqual(['A child shown without a parent’s yes', 'Unkind', 'Spam', 'Something else']);
    expect((await run(S.REPORT_LOAD, { post: 'p12' }, as('u2'))).out.what).toBe('A prayer request by Ann Mensah: “Pray for my mother”');
  });

  check('a comment: its own reasons (no child’s), what it says', async () => {
    const r = await run(S.REPORT_LOAD, { comment: 'c1' }, as('u1'));
    expect(r.out).toMatchObject({ ok: true, kind: 'comment', id: 'c1', title: 'Report a comment', what: 'A comment by Bob Owusu: “Who let you in?”', other: true });
    expect(r.out.reasons.map((x: Row) => x.Value)).toEqual(['unkind', 'spam', 'other']);
  });

  check('your own: no form, told to take it down instead', async () => {
    const r = await run(S.REPORT_LOAD, { post: 'p1' }, as('u1'));
    expect([r.out.ok, r.out.own, r.out.other]).toEqual([true, true, false]);
    expect((await run(S.REPORT_LOAD, { comment: 'c2' }, as('u1'))).out.own).toBe(true);
  });

  check('🔴 not in the feed: hidden, a blocked member’s, under a hidden post, unknown, nothing named', async () => {
    // As an admin, who reads every row: the script's own check, not the fixture's.
    for (const [what, inputs] of [['hidden', { post: 'p4' }], ['blocked member’s', { post: 'p3' }], ['hidden comment', { comment: 'c3' }], ['blocked member’s comment', { comment: 'c4' }], ['unknown', { post: 'nope' }], ['nothing', {}]] as Array<[string, Row]>) {
      const r = await run(S.REPORT_LOAD, inputs, as('u9'));
      expect([what, r.out.gone, r.out.ok]).toEqual([what, true, false]);
    }
  });

  check('nobody signed in is told to sign in and asks nothing; someone waiting goes to Waiting', async () => {
    const r = await run(S.REPORT_LOAD, { post: 'p1' }, as(null));
    expect([r.out.refused, r.out.problem, r.called]).toEqual([true, 'Sign in to report a post.', []]);
    expect((await run(S.REPORT_LOAD, { post: 'p1' }, as('u5'))).fired).toEqual(['waiting']);
  });

  check('a report is held without a reason, as something else without a note, or too long; sent with the post or the comment', async () => {
    const send = (inputs: Row) => run(S.REPORT_GATHER, inputs, {});
    let r = await send({ kind: 'post', id: 'p1', reason: '', note: '' });
    expect([r.fired, r.out.problem]).toEqual([['held'], 'Choose why.']);
    r = await send({ kind: 'post', id: 'p1', reason: 'other', note: '   ' });
    expect([r.fired, r.out.problem]).toEqual([['held'], 'Say in a few words what’s wrong.']);
    r = await send({ kind: 'post', id: 'p1', reason: 'spam', note: 'x'.repeat(501) });
    expect([r.fired, r.out.problem]).toEqual([['held'], 'A note of 500 characters or fewer. This one has 501.']);
    r = await send({ kind: 'post', id: 'p1', reason: 'child-photo', note: '  my niece  ' });
    expect([r.fired, r.out.report]).toEqual([['go'], { postId: 'p1', reason: 'child-photo', note: 'my niece' }]);
    r = await send({ kind: 'comment', id: 'c1', reason: 'unkind' });
    expect(r.out.report).toEqual({ commentId: 'c1', reason: 'unkind', note: '' });
  });
});

describe('TWO-005 slice 5 — the admins’ queue', () => {
  const queue = (login: string | null) => run(S.MODERATION_LOAD, {}, as(login));

  check('🔴 reported: one row per post or comment, by person, the child’s first and then the newest; none dealt with', async () => {
    const r = await queue('u9');
    expect(r.out.ok).toBe(true);
    expect(r.out.reported.map((x: Row) => x.id)).toEqual(['post:p1', 'post:p6', 'comment:c1']);
    const [p1, p6, c1] = r.out.reported;
    expect([p1.pill, p1.pillClass, p1.kind, p1.itemId, p1.look]).toEqual(['A child shown without a parent’s yes', 'gm-pill gm-pill-bad', 'post', 'p1', 'Look']);
    expect(p1.sub).toMatch(/^Post by Ann Mensah · reported by 3 members · /);
    expect([p6.pill, p6.pillClass]).toEqual(['Spam', 'gm-pill gm-pill-gold']);
    expect(p6.sub).toMatch(/^Post by Bob Owusu · reported by 1 member · /);
    expect([c1.pill, c1.kind]).toEqual(['Unkind', 'comment']);
    expect(c1.sub).toMatch(/^Comment by Bob Owusu · reported by 1 member · /);
    expect([r.out.reportedHeading, r.out.noneReported]).toEqual(['Reported (3)', false]);
  });

  check('hidden: every hidden post and comment, the newest hidden first, with why; blocked members’ hidden ones too', async () => {
    const r = await queue('u9');
    expect(r.out.hidden.map((x: Row) => x.id)).toEqual(['post:p13', 'post:p4', 'comment:c3', 'post:p14']);
    expect(r.out.hidden[0]).toMatchObject({ pill: 'Hidden', pillClass: 'gm-pill gm-pill-quiet', kind: 'post', itemId: 'p13' });
    expect(r.out.hidden[0].sub).toMatch(new RegExp(`^Post by Bob Owusu · ${TAKEN_DOWN.replace('.', '[.]')} · `));
    expect(r.out.hidden[2].sub).toMatch(/^Comment by Cara Boateng · Spam · /);
    expect([r.out.hiddenHeading, r.out.hasHidden]).toEqual(['Hidden from members (4)', true]);
  });

  check('blocked: each member out, the newest first, and why; someone not let in says only that; each opens their profile', async () => {
    const r = await queue('u9');
    expect(r.out.blocked.map((x: Row) => [x.title, x.kind, x.itemId, x.look, x.hasPill, x.hasTitle])).toEqual([
      ['Vic Tetteh', 'member', 'm4', 'Profile', false, true],
      ['Zed Darko', 'member', 'm3', 'Profile', false, true]
    ]);
    expect(r.out.blocked[0].sub).toMatch(/^Not let in · /);
    expect(r.out.blocked[1].sub).toMatch(/^Blocked: Selling in the comments · /);
    expect([r.out.blockedHeading, r.out.hasBlocked]).toEqual(['Blocked (2)', true]);
  });

  check('nothing reported says so', async () => {
    const r = await run(S.MODERATION_LOAD, {}, { ...as('u9'), tables: { ...tables('u9'), Report: [], CommentReport: [] } });
    expect([r.out.reported, r.out.noneReported, r.out.reportedHeading]).toEqual([[], true, 'Reported (0)']);
  });

  check('the moderation lists are the admins’: a member is told so, and nobody asks nothing', async () => {
    const member = await queue('u1');
    expect([member.out.refused, member.out.problem, member.out.reported]).toEqual([true, 'This page is the admins’. Sign in as an admin to see it.', undefined]);
    const nobody = await queue(null);
    expect([nobody.out.refused, nobody.out.called]).toEqual([true, undefined]);
    expect(nobody.called).toEqual([]);
  });

  check('Look opens the post, the comment, or the profile', async () => {
    for (const [kind, fired] of [['post', 'post'], ['comment', 'comment'], ['member', 'member']]) expect([kind, (await run(S.QUEUE_ROW_WHERE, { kind }, {})).fired]).toEqual([kind, [fired]]);
  });
});

describe('TWO-005 slice 5 — an admin’s look', () => {
  const look = (inputs: Row, login = 'u9') => run(S.LOOK_LOAD, inputs, as(login));

  check('🔴 a post: the feed’s card, in the feed, every report with who and why, the child’s first; the reason it starts with', async () => {
    const r = await look({ post: 'p1' });
    expect(r.out).toMatchObject({ ok: true, isPost: true, isComment: false, title: 'A post', state: 'In the feed: every member sees it.', stateClass: 'gm-pill gm-wrap gm-pill-ok', canHide: true, canBringBack: false, kind: 'post', id: 'p1', authorId: 'm1', profileLabel: 'Ann’s profile' });
    expect(r.out.card.map((c: Row) => c.id)).toEqual(['p1']);
    expect(r.out.reports.map((x: Row) => [x.pill, x.pillClass, x.note, x.hasNote])).toEqual([
      ['A child shown without a parent’s yes', 'gm-pill gm-pill-bad', 'My niece, no yes from her mum', true],
      ['Unkind', 'gm-pill gm-pill-gold', '', false],
      ['Unkind', 'gm-pill gm-pill-gold', '', false]
    ]);
    expect(r.out.reports[0].who).toMatch(/^Reported by Cara Boateng · /);
    expect(r.out.reportsHeading).toBe('Reported by 3 members');
    expect(r.out.suggest).toBe('A child shown without a parent’s yes');
    // Ann sent hers twice: one member.
    expect((await look({ post: 'p6' })).out.reportsHeading).toBe('Reported by 1 member');
    expect((await look({ post: 'p12' })).out).toMatchObject({ title: 'A prayer request', reportsHeading: 'Nobody has reported it.', suggest: '' });
  });

  check('🔴 hidden: why, and Bring it back; a blocked member’s: hidden while blocked, no Bring it back until they’re let back', async () => {
    let r = await look({ post: 'p4' });
    expect(r.out).toMatchObject({ state: 'Hidden from members: Unkind.', stateClass: 'gm-pill gm-wrap gm-pill-quiet', canHide: false, canBringBack: true, hasBlockedNote: false });
    r = await look({ post: 'p3' });
    expect(r.out).toMatchObject({ state: 'Hidden from members while Zed Darko is blocked.', canHide: true, canBringBack: false });
    r = await look({ post: 'p14' });
    expect(r.out).toMatchObject({ canHide: false, canBringBack: false, hasBlockedNote: true, blockedNote: 'Zed Darko is blocked. Let them back from their profile first.' });
  });

  check('a comment: what it says, who wrote it, what it is under, its reports; under a hidden post says so', async () => {
    const r = await look({ comment: 'c1' });
    expect(r.out).toMatchObject({ ok: true, isPost: false, isComment: true, title: 'A comment', commentText: 'Who let you in?', under: 'Under Ann Mensah’s post: “Sunday lunch”', card: [], kind: 'comment', id: 'c1', suggest: 'Unkind' });
    expect(r.out.commentBy).toMatch(/^Bob Owusu · /);
    expect(r.out.reports.map((x: Row) => x.note)).toEqual(['Rude to a new member']);
    expect((await look({ comment: 'c3' })).out).toMatchObject({ state: 'Hidden from members: Spam.', canBringBack: true });
  });

  check('the look is the admins’; nothing named, or no such thing, says so', async () => {
    const member = await look({ post: 'p1' }, 'u1');
    expect([member.out.refused, member.out.problem, member.out.card]).toEqual([true, 'This page is the admins’. Sign in as an admin to see it.', undefined]);
    expect((await look({ post: 'nope' })).out.gone).toBe(true);
    expect((await look({})).out.gone).toBe(true);
  });

  check('hiding sends why: what was typed, or the reason it started with; none, or too long, is held; bringing back sends no reason', async () => {
    let r = await run(S.LOOK_HIDE, { kind: 'post', id: 'p1', reason0: 'A child shown without a parent’s yes' }, {});
    expect([r.fired, r.out.hide]).toEqual([['go'], { hidden: true, reason: 'A child shown without a parent’s yes', postId: 'p1' }]);
    r = await run(S.LOOK_HIDE, { kind: 'comment', id: 'c1', reason0: 'Unkind', reason: '  Rude to a new member  ' }, {});
    expect(r.out.hide).toEqual({ hidden: true, reason: 'Rude to a new member', commentId: 'c1' });
    r = await run(S.LOOK_HIDE, { kind: 'post', id: 'p1', reason0: 'Unkind', reason: '' }, {});
    expect([r.fired, r.out.problem]).toEqual([['held'], 'Say why it’s hidden. Admins see the reason; the member who wrote it doesn’t.']);
    r = await run(S.LOOK_HIDE, { kind: 'post', id: 'p1', reason: 'x'.repeat(501) }, {});
    expect([r.fired, r.out.problem]).toEqual([['held'], 'A reason of 500 characters or fewer. This one has 501.']);
    expect((await run(S.LOOK_BRING_BACK, { kind: 'post', id: 'p4' }, {})).out.hide).toEqual({ hidden: false, postId: 'p4' });
    expect((await run(S.LOOK_BRING_BACK, { kind: 'comment', id: 'c3' }, {})).out.hide).toEqual({ hidden: false, commentId: 'c3' });
  });
});

describe('TWO-005 slice 5 — on a post’s page, and a profile', () => {
  const postPage = (postId: string, login: string) => run(S.POST_LOAD, { postId }, as(login));

  check('🔴 a post’s page: Report on someone else’s, Take down on your own, Reports and hiding for an admin; the same on each comment', async () => {
    let r = await postPage('p1', 'u2');
    expect([r.out.canReport, r.out.canTakeDown, r.out.canLook, r.out.isHidden]).toEqual([true, false, false, false]);
    expect(r.out.comments.map((c: Row) => [c.id, c.canReport, c.canTakeDown, c.canLook])).toEqual([['c1', false, true, false]]);
    r = await postPage('p1', 'u1');
    expect([r.out.canReport, r.out.canTakeDown, r.out.canLook]).toEqual([false, true, false]);
    expect(r.out.comments.map((c: Row) => [c.id, c.canReport, c.canTakeDown])).toEqual([['c1', true, false]]);
    r = await postPage('p1', 'u9');
    expect([r.out.canReport, r.out.canTakeDown, r.out.canLook]).toEqual([true, false, true]);
    // The admin reads the hidden comment and Zed's too; the page lists neither.
    expect(r.out.comments.map((c: Row) => [c.id, c.canLook])).toEqual([['c1', true]]);
  });

  check('🔴 an admin opens a hidden post, told why, and may only look; a member doesn’t open it', async () => {
    let r = await postPage('p4', 'u9');
    expect([r.out.ok, r.out.hiddenWords, r.out.isHidden, r.out.canReport, r.out.canTakeDown, r.out.canLook]).toEqual([true, 'Hidden from members: Unkind.', true, false, false, true]);
    expect((await postPage('p3', 'u9')).out.hiddenWords).toBe('Hidden from members while Zed Darko is blocked.');
    // Ann wrote p4: she is a member, and it is gone for her.
    r = await postPage('p4', 'u1');
    expect([r.out.gone, r.out.ok]).toEqual([true, false]);
  });

  check('take down sends your own post, or comment, hidden', async () => {
    expect((await run(S.TAKE_DOWN_POST, { postId: 'p1' }, {})).out.hide).toEqual({ postId: 'p1', hidden: true });
    expect((await run(S.TAKE_DOWN_COMMENT, { id: 'c1' }, {})).out.hide).toEqual({ commentId: 'c1', hidden: true });
  });

  const profileOf = (memberId: string, login: string) => run(S.PROFILE_LOAD, { memberId }, as(login));

  check('🔴 an admin sees a blocked member’s profile, why, their posts, and Let them back; a member doesn’t', async () => {
    let r = await profileOf('m3', 'u9');
    expect(r.out).toMatchObject({ ok: true, blocked: true, canLetBack: true, canBlock: false, letBackLabel: 'Let Zed back' });
    expect(r.out.blockedWords).toBe('Blocked: Selling in the comments.');
    // Their posts, all but the one hidden for its own reason.
    expect(r.out.tiles.map((t: Row) => t.id)).toEqual(['p3']);
    r = await profileOf('m4', 'u9');
    expect([r.out.ok, r.out.blockedWords, r.out.canLetBack]).toEqual([true, 'Not let in.', true]);
    for (const id of ['m3', 'm4', 'm5']) expect([id, (await profileOf(id, 'u1')).out.gone]).toEqual([id, true]);
  });

  check('🔴 Block is an admin’s, on a member who is in: not on an admin, not on yourself, not twice', async () => {
    let r = await profileOf('m2', 'u9');
    expect([r.out.canBlock, r.out.blockLabel, r.out.blocked, r.out.canLetBack]).toEqual([true, 'Block Bob', false, false]);
    expect((await profileOf('m10', 'u9')).out.canBlock).toBe(false);
    expect((await profileOf('m9', 'u9')).out.canBlock).toBe(false);
    expect((await profileOf('m2', 'u1')).out.canBlock).toBe(false);
  });

  check('Block sends why, and is held without it; Let them back sends no reason', async () => {
    let r = await run(S.BLOCK_GATHER, { memberId: 'm2', reason: '  Selling  ' }, {});
    expect([r.fired, r.out.block]).toEqual([['go'], { memberId: 'm2', blocked: true, reason: 'Selling' }]);
    r = await run(S.BLOCK_GATHER, { memberId: 'm2', reason: ' ' }, {});
    expect([r.fired, r.out.problem]).toEqual([['held'], 'Say why. Admins see the reason; the member doesn’t.']);
    r = await run(S.BLOCK_GATHER, { memberId: 'm2', reason: 'x'.repeat(501) }, {});
    expect(r.fired).toEqual(['held']);
    expect((await run(S.LET_BACK_GATHER, { memberId: 'm3' }, {})).out.block).toEqual({ memberId: 'm3', blocked: false });
  });
});

describe('TWO-005 slice 5 — the rules', () => {
  check('everyone reads the rules, kept in their lines; only an admin gets the editor; a stranger asks nothing', async () => {
    const stranger = await run(S.RULES_LOAD, {}, as(null));
    expect([stranger.out.rules, stranger.out.isAdmin, stranger.called]).toEqual(['Be kind.\nNo photo of a child without their parent’s yes.', false, []]);
    expect((await run(S.RULES_LOAD, {}, as('u1'))).out).toMatchObject({ isAdmin: false, band: '' });
    expect((await run(S.RULES_LOAD, {}, as('u5'))).out.isAdmin).toBe(false);
    expect((await run(S.RULES_LOAD, {}, as('u9'))).out).toMatchObject({ isAdmin: true, band: 'Admin', current: 'Be kind.\nNo photo of a child without their parent’s yes.' });
    const none = await run(S.RULES_LOAD, {}, { ...as('u1'), tables: { ...tables('u1'), Community: [] } });
    expect([none.out.rules, none.out.current]).toEqual(['The admins haven’t written the rules yet.', '']);
  });

  check('a save sends what was typed, or what was there; empty or too long is held', async () => {
    expect((await run(S.RULES_GATHER, { rules0: 'Be kind.', rules: '  Be kind. Pray.  ' }, {})).out.save).toEqual({ rules: 'Be kind. Pray.' });
    expect((await run(S.RULES_GATHER, { rules0: 'Be kind.' }, {})).out.save).toEqual({ rules: 'Be kind.' });
    let r = await run(S.RULES_GATHER, { rules0: 'Be kind.', rules: '' }, {});
    expect([r.fired, r.out.problem]).toEqual([['held'], 'Write the rules first.']);
    r = await run(S.RULES_GATHER, { rules: 'x'.repeat(5001) }, {});
    expect([r.fired, r.out.problem]).toEqual([['held'], 'Rules of 5,000 characters or fewer. These have 5,001.']);
  });
});

describe('TWO-005 slice 5 — every script compiles, and each check catches what it is for', () => {
  it('the pages’ scripts and the functions’ scripts compile', () => {
    const fns = GRAM_SLICE5_CLOUD.flatMap((c) => c.nodes.map((n) => (n.parameters as Row | undefined)?.functionScript).filter((x): x is string => typeof x === 'string'));
    expect(fns.length).toBe(4);
    expect([...Object.entries(SHIPPED), ...fns.map((f, i) => [`fn${i}`, f] as [string, string])].filter(([, code]) => !compiles(code)).map(([k]) => k)).toEqual([]);
  });

  const REPORT_POST = 'a post: what it is and whose, the post’s four reasons, who won’t see it';
  const REPORT_COMMENT = 'a comment: its own reasons (no child’s), what it says';
  const OWN = 'your own: no form, told to take it down instead';
  const GONE = '🔴 not in the feed: hidden, a blocked member’s, under a hidden post, unknown, nothing named';
  const NOBODY = 'nobody signed in is told to sign in and asks nothing; someone waiting goes to Waiting';
  const SEND = 'a report is held without a reason, as something else without a note, or too long; sent with the post or the comment';
  const REPORTED = '🔴 reported: one row per post or comment, by person, the child’s first and then the newest; none dealt with';
  const HIDDEN = 'hidden: every hidden post and comment, the newest hidden first, with why; blocked members’ hidden ones too';
  const BLOCKED = 'blocked: each member out, the newest first, and why; someone not let in says only that; each opens their profile';
  const ADMINS = 'the moderation lists are the admins’: a member is told so, and nobody asks nothing';
  const WHERE = 'Look opens the post, the comment, or the profile';
  const LOOK = '🔴 a post: the feed’s card, in the feed, every report with who and why, the child’s first; the reason it starts with';
  const LOOK_HIDDEN = '🔴 hidden: why, and Bring it back; a blocked member’s: hidden while blocked, no Bring it back until they’re let back';
  const LOOK_COMMENT = 'a comment: what it says, who wrote it, what it is under, its reports; under a hidden post says so';
  const LOOK_ADMINS = 'the look is the admins’; nothing named, or no such thing, says so';
  const HIDE = 'hiding sends why: what was typed, or the reason it started with; none, or too long, is held; bringing back sends no reason';
  const POST_ACTIONS = '🔴 a post’s page: Report on someone else’s, Take down on your own, Reports and hiding for an admin; the same on each comment';
  const POST_HIDDEN = '🔴 an admin opens a hidden post, told why, and may only look; a member doesn’t open it';
  const PROFILE_BLOCKED = '🔴 an admin sees a blocked member’s profile, why, their posts, and Let them back; a member doesn’t';
  const PROFILE_BLOCK = '🔴 Block is an admin’s, on a member who is in: not on an admin, not on yourself, not twice';
  const BLOCK = 'Block sends why, and is held without it; Let them back sends no reason';
  const RULES = 'everyone reads the rules, kept in their lines; only an admin gets the editor; a stranger asks nothing';
  const RULES_SAVE = 'a save sends what was typed, or what was there; empty or too long is held';
  /**
   * [what it loosens, script, text in it, what replaces it, the check that must go red]. Two the first run left green
   * were equivalent and are gone: "every member opens a hidden post" (a member is never handed the row: its ACL, graded
   * on the backend) and "you can block yourself" (only an admin sees Block, and an admin can't be blocked; the clause
   * went from the page).
   */
  const MUTANTS: Array<[string, keyof typeof SHIPPED, string, string, string]> = [
    ['a comment offered the child’s reason', 'REPORT_LOAD', '(isComment ? [{"value":"unkind"', '(false ? [{"value":"unkind"', REPORT_COMMENT],
    ['a post offered a comment’s reasons', 'REPORT_LOAD', '(isComment ? [{"value":"unkind"', '(true ? [{"value":"unkind"', REPORT_POST],
    ['your own reported', 'REPORT_LOAD', "var own = author.objectId === String(who.id || '');", 'var own = false;', OWN],
    ['a hidden post reported', 'REPORT_LOAD', 'if (!row || !post || row.endedAt || !author || author.endedAt)', 'if (!row || !post || !author || author.endedAt)', GONE],
    ['a blocked member’s reported', 'REPORT_LOAD', 'if (!row || !post || row.endedAt || !author || author.endedAt)', 'if (!row || !post || row.endedAt || !author)', GONE],
    ['a stranger’s report page asks the backend', 'REPORT_LOAD', 'if (!Noodl.Users.Current) return null;', '', NOBODY],
    ['someone waiting reports', 'REPORT_LOAD', "if (who.status !== 'approved') { Outputs.waiting(); return; }", '', NOBODY],
    ['sent with no reason', 'REPORT_GATHER', "if (!reason) { Outputs.problem = 'Choose why.'; Outputs.held(); return; }", '', SEND],
    ['something else with no words', 'REPORT_GATHER', "if (reason === 'other' && !note) {", 'if (false) {', SEND],
    ['a comment sent as a post', 'REPORT_GATHER', "if (Inputs.kind === 'comment') r.commentId = Inputs.id; else r.postId = Inputs.id;", 'r.postId = Inputs.id;', SEND],
    ['reports counted by row', 'MODERATION_LOAD', "if (!g.people[u]) { g.people[u] = true; g.reasons[r.reason] = (g.reasons[r.reason] || 0) + 1; }", "g.people[u + Math.random()] = true; g.reasons[r.reason] = (g.reasons[r.reason] || 0) + 1;", REPORTED],
    ['the child’s not first', 'MODERATION_LOAD', "open.sort(function (a, b) { return (a.top === 'child-photo' ? 0 : 1) - (b.top === 'child-photo' ? 0 : 1) || b.latest.localeCompare(a.latest); });", 'open.sort(function (a, b) { return b.latest.localeCompare(a.latest); });', REPORTED],
    ['the child’s pill lost to the commonest', 'MODERATION_LOAD', "(a === 'child-photo' ? -1 : 0) - (b === 'child-photo' ? -1 : 0) || g.reasons[b] - g.reasons[a]", 'g.reasons[b] - g.reasons[a]', REPORTED],
    ['a hidden post still reported', 'MODERATION_LOAD', "function out(row) { var m = by[idOf(row.member)]; return !!row.endedAt || !m || !!m.endedAt; }", "function out(row) { var m = by[idOf(row.member)]; return !m || !!m.endedAt; }", REPORTED],
    ['a blocked member’s still reported', 'MODERATION_LOAD', "function out(row) { var m = by[idOf(row.member)]; return !!row.endedAt || !m || !!m.endedAt; }", "function out(row) { var m = by[idOf(row.member)]; return !!row.endedAt || !m; }", REPORTED],
    ['hidden oldest first', 'MODERATION_LOAD', 'hidden.sort(function (a, b) { return when(b.row.endedAt).localeCompare(when(a.row.endedAt)); });', 'hidden.sort(function (a, b) { return when(a.row.endedAt).localeCompare(when(b.row.endedAt)); });', HIDDEN],
    ['hidden comments not listed', 'MODERATION_LOAD', ".concat(comments.filter(function (c) { return c.endedAt; })", '.concat([].filter(function (c) { return c.endedAt; })', HIDDEN],
    ['not let in said twice', 'MODERATION_LOAD', "(why && why !== 'Not let in.' ? ': ' + why : '')", "(why ? ': ' + why : '')", BLOCKED],
    ['a member reads the moderation lists', 'MODERATION_LOAD', '  await adminsOnly();\n  var members', '  var members', ADMINS],
    ['every row opens a post', 'QUEUE_ROW_WHERE', "if (Inputs.kind === 'member') Outputs.member(); else if (Inputs.kind === 'comment') Outputs.comment(); else Outputs.post();", 'Outputs.post();', WHERE],
    ['the reports’ people counted by row', 'LOOK_LOAD', "'Reported by ' + plural(Object.keys(people).length, 'member', 'members')", "'Reported by ' + plural(lines.length, 'member', 'members')", LOOK],
    ['no reason to start with', 'LOOK_LOAD', "Outputs.suggest = top ? reasonWords(top) : '';", "Outputs.suggest = '';", LOOK],
    ['a hidden one offered Hide again', 'LOOK_LOAD', 'Outputs.canHide = !hidden;', 'Outputs.canHide = true;', LOOK_HIDDEN],
    ['brought back while blocked', 'LOOK_LOAD', 'Outputs.canBringBack = hidden && !blocked;', 'Outputs.canBringBack = hidden;', LOOK_HIDDEN],
    ['a blocked member’s post said to be in the feed', 'LOOK_LOAD', "  : blocked ? 'Hidden from members while '", "  : false ? 'Hidden from members while '", LOOK_HIDDEN],
    ['a comment’s reports read from the posts’', 'LOOK_LOAD', "isComment ? await all('CommentReport', { comment: { equalTo: ptr('Comment', id) } }) : await all('Report'", "false ? await all('CommentReport', { comment: { equalTo: ptr('Comment', id) } }) : await all('Report'", LOOK_COMMENT],
    ['a member looks', 'LOOK_LOAD', 'try { await adminsOnly(); } catch (e) { refused(e); return; }', '', LOOK_ADMINS],
    ['hidden with no reason', 'LOOK_HIDE', "if (!reason) { Outputs.problem = 'Say why it’s hidden.", "if (false) { Outputs.problem = 'Say why it’s hidden.", HIDE],
    ['what was typed ignored', 'LOOK_HIDE', 'var typed = Inputs.reason === undefined ? Inputs.reason0 : Inputs.reason;', 'var typed = Inputs.reason0;', HIDE],
    ['your own post reported', 'POST_LOAD', 'Outputs.canReport = !own && !hiddenWords;', 'Outputs.canReport = !hiddenWords;', POST_ACTIONS],
    ['someone else’s taken down', 'POST_LOAD', 'Outputs.canTakeDown = own && !hiddenWords;', 'Outputs.canTakeDown = !hiddenWords;', POST_ACTIONS],
    ['a member offered the reports', 'POST_LOAD', 'Outputs.canLook = admin && !own;', 'Outputs.canLook = !own;', POST_ACTIONS],
    ['someone else’s comment taken down', 'POST_LOAD', 'canTakeDown: theirs && !hiddenWords,', 'canTakeDown: !hiddenWords,', POST_ACTIONS],
    ['an admin can’t open a hidden post', 'POST_LOAD', 'var posts = admin ? found : shown(found, members);', 'var posts = shown(found, members);', POST_HIDDEN],
    ['a hidden post not said to be', 'POST_LOAD', "var hiddenWords = p0.endedAt ? 'Hidden from members: '", "var hiddenWords = false ? 'Hidden from members: '", POST_HIDDEN],
    ['an admin is shown no blocked member', 'PROFILE_LOAD', "(!admin && (m.status !== 'approved' || m.endedAt))", "(m.status !== 'approved' || m.endedAt)", PROFILE_BLOCKED],
    ['a blocked member’s hidden post in the grid', 'PROFILE_LOAD', 'theirs.filter(function (p) { return !p.endedAt; })', 'theirs', PROFILE_BLOCKED],
    ['an admin can be blocked', 'PROFILE_LOAD', "&& m.role !== 'admin' && !m.endedAt;", '&& !m.endedAt;', PROFILE_BLOCK],
    ['a member can block', 'PROFILE_LOAD', "Outputs.canBlock = admin && m.role", 'Outputs.canBlock = m.role', PROFILE_BLOCK],
    ['blocked with no reason', 'BLOCK_GATHER', "if (!reason) { Outputs.problem = 'Say why.", "if (false) { Outputs.problem = 'Say why.", BLOCK],
    ['the editor for everyone', 'RULES_LOAD', "var admin = !!who && who.status === 'approved' && who.role === 'admin';", 'var admin = !!who;', RULES],
    ['a stranger’s rules page asks the backend', 'RULES_LOAD', 'if (!Noodl.Users.Current) return null;', '', RULES],
    ['saved what was there, not what was typed', 'RULES_GATHER', 'var typed = Inputs.rules === undefined ? Inputs.rules0 : Inputs.rules;', 'var typed = Inputs.rules0;', RULES_SAVE],
    ['empty rules saved', 'RULES_GATHER', "if (!rules) { Outputs.problem = 'Write the rules first.'; Outputs.held(); return; }", '', RULES_SAVE]
  ];

  it.each(MUTANTS)('mutant red: %s', async (_what, script, from, to, name) => {
    expect([script, SHIPPED[script].split(from).length - 1]).toEqual([script, 1]);
    S = { ...SHIPPED, [script]: SHIPPED[script].split(from).join(to) };
    try {
      await expect(CHECKS[name]()).rejects.toThrow();
    } finally {
      S = { ...SHIPPED };
    }
  });
});
