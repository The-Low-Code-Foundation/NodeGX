/**
 * TWO-005 slice 4 — the prayer requests' page scripts against fixtures: a prayer request's card (its words, I prayed
 * with the count kept on it, filled once you have), who prayed shown to the person who asked and to nobody else (W4),
 * the Prayer page, the profile's two counts, the new post's kind, and the sections. The function behind them is graded
 * on a real backend (`nodegx-backend/tests/two-005-prayer.test.ts`), and the policy's part of W4 there too; here the
 * fixtures hand each reader only the `Prayed` rows the policy would. The pages in a browser by the drive.
 */
import { compiles, Row, run } from './two003Run';
import * as feed from './two005FeedPages';
import * as shipped from './two005PrayerPages';
import * as profile from './two005ProfilePages';

/** The scripts under test: the shipped ones, or one mutated (the loop at the end). */
const SHIPPED = {
  FEED_LOAD: feed.FEED_LOAD,
  POST_LOAD: feed.POST_LOAD,
  PRAYER_LOAD: shipped.PRAYER_LOAD,
  PROFILE_LOAD: profile.PROFILE_LOAD,
  NEW_POST_KIND: feed.NEW_POST_KIND,
  NEW_POST_GATHER: feed.NEW_POST_GATHER,
  NEW_POST_WHERE: feed.NEW_POST_WHERE,
  PICK_POST: feed.PICK_POST,
  PICK_PRAYER: feed.PICK_PRAYER,
  PRAY_GATHER: feed.PRAY_GATHER,
  NAV_LOOK: shipped.NAV_LOOK
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
  { objectId: 'm3', name: 'Zed Darko', status: 'approved', role: 'member', login: 'u3', endedAt: at(7), blockedReason: 'spam' },
  { objectId: 'm6', name: 'Cara Boateng', status: 'approved', role: 'member', login: 'u6' },
  { objectId: 'm7', name: 'Dee Asante', status: 'approved', role: 'member', login: 'u7' },
  { objectId: 'm8', name: 'Eli Ofori', status: 'approved', role: 'member', login: 'u8' },
  { objectId: 'm9', name: 'Ama Kumi', status: 'approved', role: 'admin', login: 'u9' }
];
const POSTS: Row[] = [
  { objectId: 'p1', caption: 'Sunday lunch', kind: 'post', member: 'm1', createdAt: at(9), photos: [] },
  { objectId: 'p7', caption: 'Please pray for my mother, who goes into surgery on Friday.', kind: 'prayer', prayedCount: 4, member: 'm1', createdAt: at(11), photos: [] },
  { objectId: 'p8', caption: 'A job for my brother.', kind: 'prayer', prayedCount: 0, member: 'm2', createdAt: at(12), photos: [] },
  { objectId: 'p9', caption: 'Hidden request', kind: 'prayer', prayedCount: 2, member: 'm1', createdAt: at(13), endedAt: at(14), photos: [] },
  { objectId: 'p10', caption: 'Zed’s request', kind: 'prayer', prayedCount: 1, member: 'm3', createdAt: at(10), photos: [] }
];
/** Every I prayed there is; a reader is handed only what the policy lets them read. */
const PRAYED: Row[] = [
  { objectId: 'r1', post: ptr('Post', 'p7'), doneBy: 'u2', createdAt: at(12) },
  { objectId: 'r2', post: ptr('Post', 'p7'), doneBy: 'u6', createdAt: at(12) },
  { objectId: 'r3', post: ptr('Post', 'p7'), doneBy: 'u7', createdAt: at(12) },
  { objectId: 'r4', post: ptr('Post', 'p7'), doneBy: 'u8', createdAt: at(12) },
  // A race's second row: Bob pressed on two phones at once. He is one person who prayed.
  { objectId: 'r6', post: ptr('Post', 'p7'), doneBy: 'u2', createdAt: at(12) },
  { objectId: 'r5', post: ptr('Post', 'p9'), doneBy: 'u2', createdAt: at(13) }
];
/** W4 as the policy reads it: your own rows, the rows on your own requests; an admin every row. */
function visible(login: string): Row[] {
  const me = MEMBERS.find((m) => m.login === login);
  if (me?.role === 'admin') return PRAYED;
  const mine = POSTS.filter((p) => p.member === me?.objectId).map((p) => p.objectId);
  return PRAYED.filter((r) => r.doneBy === login || mine.includes(r.post.objectId));
}
const tables = (login: string, extra: Record<string, Row[]> = {}) => ({ Member: MEMBERS, Post: POSTS, Heart: [] as Row[], Comment: [] as Row[], Prayed: visible(login), ...extra });
const whoIs = (login: string) => {
  const m = MEMBERS.find((x) => x.login === login) as Row;
  return { id: m.objectId, status: m.status, role: m.role, name: m.name };
};
const as = (login: string, extra: Record<string, Row[]> = {}) => ({ current: { id: login }, tables: tables(login, extra), kept: {}, cloud: () => ({ me: whoIs(login) }) });
const cardOf = async (login: string, id: string) => ((await run(S.FEED_LOAD, {}, as(login))).out.cards as Row[]).find((c) => c.id === id) as Row;

describe('TWO-005 slice 4 — a prayer request’s card', () => {
  check('its words, no hearts, the pill; I prayed with the count kept on it, filled once you have', async () => {
    const bobs = await cardOf('u2', 'p7');
    expect(bobs).toMatchObject({
      isPrayer: true,
      notPrayer: false,
      kindClass: 'gm-prayer',
      ask: 'Please pray for my mother, who goes into surgery on Friday.',
      hasCaption: false,
      prayed: true,
      prayLabel: '🙏 You prayed · 4',
      prayInk: 'var(--primary-foreground)',
      prayFill: 'var(--primary)'
    });
    const caras = await cardOf('u6', 'p7');
    expect([caras.prayed, caras.prayLabel, caras.prayFill]).toEqual([true, '🙏 You prayed · 4', 'var(--primary)']);
    // Eli's own row is there; Ama the admin hasn't prayed. Nobody has prayed on Bob's yet: no count.
    const amas = await cardOf('u9', 'p7');
    expect([amas.prayed, amas.prayLabel, amas.prayInk, amas.prayFill]).toEqual([false, '🙏 I prayed · 4', 'var(--primary)', 'var(--surface)']);
    expect((await cardOf('u6', 'p8')).prayLabel).toBe('🙏 I prayed');
    // A post is still a post.
    // A post is still a post (slice 4b: with no photo, its words lead its card, above the heart).
    expect(await cardOf('u2', 'p1')).toMatchObject({ isPrayer: false, notPrayer: true, kindClass: '', ask: 'Sunday lunch', hasCaption: false, whoPrayed: '' });
  });

  check('🔴 W4: only the person who asked is told who prayed; a member, and an admin, are told who sees it', async () => {
    expect((await cardOf('u2', 'p7')).whoPrayed).toBe('Only Ann sees who prayed.');
    // The admin reads every row, and still isn't shown names on someone else's request.
    expect((await cardOf('u9', 'p7')).whoPrayed).toBe('Only Ann sees who prayed.');
    expect((await cardOf('u1', 'p8')).whoPrayed).toBe('Only Bob sees who prayed.');
  });

  check('the person who asked: the first two and how many more on a card, everyone on its page, nobody yet said so', async () => {
    expect((await cardOf('u1', 'p7')).whoPrayed).toBe('Prayed: Bob Owusu, Cara Boateng and 2 others. Only you see who.');
    const page = await run(S.POST_LOAD, { postId: 'p7' }, as('u1'));
    expect(page.out.card[0].whoPrayed).toBe('Prayed: Bob Owusu, Cara Boateng, Dee Asante and Eli Ofori. Only you see who.');
    expect((await cardOf('u2', 'p8')).whoPrayed).toBe('Nobody has prayed yet. Only you will see who does.');
    // Three or fewer are all named; the asker who prayed on their own is "you".
    const three = await run(S.FEED_LOAD, {}, { ...as('u1', { Prayed: [...visible('u1').slice(0, 2), { objectId: 'r9', post: ptr('Post', 'p7'), doneBy: 'u1' }] }) });
    expect((three.out.cards as Row[]).find((c) => c.id === 'p7')?.whoPrayed).toBe('Prayed: Bob Owusu, Cara Boateng and you. Only you see who.');
  });

  check('a request’s page carries who is signed in and shows the sections', async () => {
    const page = await run(S.POST_LOAD, { postId: 'p7' }, as('u2'));
    expect([page.out.meId, page.out.inside, page.out.card[0].isPrayer]).toEqual(['m2', true, true]);
  });
});

describe('TWO-005 slice 4 — the Prayer page', () => {
  check('only prayer requests, newest first, none hidden or by a blocked member; no hearts asked for', async () => {
    const r = await run(S.PRAYER_LOAD, {}, as('u2'));
    expect((r.out.cards as Row[]).map((c) => c.id)).toEqual(['p8', 'p7']);
    expect(r.out).toMatchObject({ ok: true, empty: false, meId: 'm2', inside: true, refused: false });
    expect((r.out.cards as Row[])[1]).toMatchObject({ prayLabel: '🙏 You prayed · 4', whoPrayed: 'Only Ann sees who prayed.' });
  });

  check('none yet says so; nobody signed in is told to sign in and asks nothing; someone waiting goes to Waiting', async () => {
    const none = await run(S.PRAYER_LOAD, {}, as('u2', { Post: POSTS.filter((p) => p.kind !== 'prayer') }));
    expect([none.out.empty, none.out.cards]).toEqual([true, []]);
    const nobody = await run(S.PRAYER_LOAD, {}, { tables: tables('u2'), cloud: () => ({ me: null }) });
    expect([nobody.out.refused, nobody.out.problem, nobody.called, nobody.out.inside]).toEqual([true, 'Sign in to see the prayer requests.', [], undefined]);
    const waiting = await run(S.PRAYER_LOAD, {}, { current: { id: 'u5' }, tables: tables('u2'), cloud: () => ({ me: { status: 'waiting', role: 'member' } }) });
    expect([waiting.fired, waiting.out.inside]).toEqual([['waiting'], undefined]);
  });
});

describe('TWO-005 slice 4 — a profile counts prayer requests apart', () => {
  check('posts and prayer requests counted apart; the grid is the posts; your own lights Profile', async () => {
    const own = await run(S.PROFILE_LOAD, { memberId: 'm1' }, as('u1'));
    // Ann: one post, one prayer request in the feed (the hidden one isn't counted).
    expect([own.out.posts, own.out.postsWord, own.out.prayers, own.out.prayersWord]).toEqual(['1', 'post', '1', 'prayer request']);
    expect((own.out.tiles as Row[]).map((t) => t.id)).toEqual(['p1']);
    expect([own.out.navOn, own.out.meId, own.out.inside]).toEqual(['profile', 'm1', true]);
    const bobs = await run(S.PROFILE_LOAD, { memberId: 'm2' }, as('u1'));
    expect([bobs.out.posts, bobs.out.postsWord, bobs.out.prayers, bobs.out.prayersWord, bobs.out.empty, bobs.out.navOn]).toEqual(['0', 'posts', '1', 'prayer request', true, '']);
  });
});

describe('TWO-005 slice 4 — asking for prayer', () => {
  const kind = (inputs: Row) => run(S.NEW_POST_KIND, inputs, {});
  const stamp = async (script: 'PICK_POST' | 'PICK_PRAYER') => (await run(S[script], {}, {})).out.picked as string;

  check('the page opens on the kind its address asks for; the chips switch it, pressed in any order', async () => {
    expect((await kind({})).out).toMatchObject({ kind: 'post', isPost: true, isPrayer: false, title: 'New post', field: 'Caption', hint: 'What’s happening?', share: 'Share with the members', back: '← The feed', postFill: 'var(--primary)', prayerFill: 'var(--surface)' });
    expect((await kind({ start: 'prayer' })).out).toMatchObject({
      kind: 'prayer',
      isPost: false,
      isPrayer: true,
      title: 'New prayer request',
      field: 'What would you like the members to pray for?',
      hint: 'Who or what, in your own words.',
      share: 'Ask the members to pray',
      back: '← Prayer',
      postFill: 'var(--surface)',
      prayerFill: 'var(--primary)',
      prayerInk: 'var(--primary-foreground)'
    });
    expect((await kind({ start: 'anything' })).out.kind).toBe('post');
    const toPost = await stamp('PICK_POST');
    expect((await kind({ start: 'prayer', picked: toPost })).out.kind).toBe('post');
    expect((await kind({ start: 'prayer', picked: await stamp('PICK_PRAYER') })).out.kind).toBe('prayer');
    // Pressed again later, the same chip says something new, so it arrives.
    await new Promise((r) => setTimeout(r, 5));
    expect(await stamp('PICK_POST')).not.toBe(toPost);
  });

  check('a prayer request is sent as words only, its kind with it; an empty one is held here', async () => {
    const photos = [{ name: 'a_1.png', url: 'u' }];
    const ask = await run(S.NEW_POST_GATHER, { caption: 'Pray for rain', photos, kind: 'prayer' }, {});
    expect([ask.fired, ask.out.post]).toEqual([['go'], { caption: 'Pray for rain', photos: [], kind: 'prayer' }]);
    const empty = await run(S.NEW_POST_GATHER, { caption: '  ', photos, kind: 'prayer' }, {});
    expect([empty.fired, empty.out.problem]).toEqual([['held'], 'Say what you’d like the members to pray for.']);
    const post = await run(S.NEW_POST_GATHER, { caption: '', photos, kind: 'post' }, {});
    expect([post.fired, post.out.post]).toEqual([['go'], { caption: '', photos, kind: 'post' }]);
  });

  check('back, and a share, land where the kind belongs', async () => {
    expect((await run(S.NEW_POST_WHERE, { kind: 'prayer' }, {})).fired).toEqual(['prayer']);
    expect((await run(S.NEW_POST_WHERE, { kind: 'post' }, {})).fired).toEqual(['feed']);
    expect((await run(S.NEW_POST_WHERE, {}, {})).fired).toEqual(['feed']);
  });

  check('I prayed says what it should be: on unless it already is', async () => {
    expect((await run(S.PRAY_GATHER, { id: 'p7', prayed: false }, {})).out.prayer).toEqual({ postId: 'p7', on: true });
    expect((await run(S.PRAY_GATHER, { id: 'p7', prayed: true }, {})).out.prayer).toEqual({ postId: 'p7', on: false });
    expect((await run(S.PRAY_GATHER, { id: 'p7' }, {})).out.prayer).toEqual({ postId: 'p7', on: true });
  });
});

describe('TWO-005 slice 4 — the sections', () => {
  check('the page’s section is plum and bold, the others muted', async () => {
    const r = (await run(S.NAV_LOOK, { on: 'prayer' }, {})).out;
    expect([r.prayerInk, r.prayerWeight]).toEqual(['var(--primary)', 'var(--font-extrabold)']);
    for (const t of ['feed', 'post', 'profile']) expect([t, r[`${t}Ink`], r[`${t}Weight`]]).toEqual([t, 'var(--muted-foreground)', 'var(--font-semibold)']);
    const none = (await run(S.NAV_LOOK, { on: '' }, {})).out;
    expect(shipped.NAV_TABS.map((t) => none[`${t.id}Ink`])).toEqual(shipped.NAV_TABS.map(() => 'var(--muted-foreground)'));
  });

  it('the sections are the picture’s, less Search: Feed, Post, Prayer, Profile', () => {
    expect(shipped.NAV_TABS.map((t) => t.label.split('\n')[1])).toEqual(['Feed', 'Post', 'Prayer', 'Profile']);
  });

  it('every script here compiles', () => {
    for (const code of Object.values(SHIPPED)) expect(compiles(code)).toBe(true);
  });
});

describe('TWO-005 slice 4 — the page scripts’ mutants', () => {
  const CARD = 'its words, no hearts, the pill; I prayed with the count kept on it, filled once you have';
  const W4 = '🔴 W4: only the person who asked is told who prayed; a member, and an admin, are told who sees it';
  const ASKER = 'the person who asked: the first two and how many more on a card, everyone on its page, nobody yet said so';
  const POST = 'a request’s page carries who is signed in and shows the sections';
  const LIST = 'only prayer requests, newest first, none hidden or by a blocked member; no hearts asked for';
  const NONE = 'none yet says so; nobody signed in is told to sign in and asks nothing; someone waiting goes to Waiting';
  const COUNTS = 'posts and prayer requests counted apart; the grid is the posts; your own lights Profile';
  const KIND = 'the page opens on the kind its address asks for; the chips switch it, pressed in any order';
  const WORDS = 'a prayer request is sent as words only, its kind with it; an empty one is held here';
  const WHERE = 'back, and a share, land where the kind belongs';
  const PRAY = 'I prayed says what it should be: on unless it already is';
  const NAV = 'the page’s section is plum and bold, the others muted';
  /** [what it loosens, script, text in it, what replaces it, the check that must go red] */
  const MUTANTS: Array<[string, keyof typeof SHIPPED, string, string, string]> = [
    ['the count read from the rows the reader sees', 'FEED_LOAD', 'var count = Math.max(0, Number(p.prayedCount) || 0);', 'var count = prayers.length;', CARD],
    ['I prayed never filled', 'FEED_LOAD', "prayFill: iPrayed ? 'var(--primary)' : 'var(--surface)',", "prayFill: 'var(--surface)',", CARD],
    ['someone else’s I prayed counted as mine', 'FEED_LOAD', 'var iPrayed = prayers.indexOf(mine) >= 0;', 'var iPrayed = prayers.length > 0;', CARD],
    ['a prayer request with hearts', 'FEED_LOAD', 'notPrayer: !isPrayer,', 'notPrayer: true,', CARD],
    ['the request’s words shown twice', 'FEED_LOAD', 'hasCaption: !!p.caption && !wordsFirst,', 'hasCaption: !!p.caption,', CARD],
    ['every reader told who prayed', 'FEED_LOAD', 'var asked = !!mine && idOf(m.login) === mine;', 'var asked = true;', W4],
    ['an admin told who prayed', 'FEED_LOAD', 'var asked = !!mine && idOf(m.login) === mine;', "var asked = !!mine && (idOf(m.login) === mine || mine === 'u9');", W4],
    ['every name on a card', 'FEED_LOAD', 'var shown = everyone || names.length <= 3 ?', 'var shown = true ?', ASKER],
    ['a prayer counted twice by the same person', 'FEED_LOAD', "if (idOf(r.post) === p.objectId && prayers.indexOf(u) < 0) prayers.push(u);", 'if (idOf(r.post) === p.objectId) prayers.push(u);', ASKER],
    ['the request’s page names two', 'POST_LOAD', 'cardsOf(posts, members, hearts, comments, mine, true, prayed)', 'cardsOf(posts, members, hearts, comments, mine, false, prayed)', ASKER],
    ['the request’s page doesn’t read who prayed', 'POST_LOAD', "var prayed = posts.length ? await all('Prayed', { post: { containedIn: on } }) : [];", 'var prayed = [];', ASKER],
    ['the post page hides the sections', 'POST_LOAD', 'Outputs.inside = true;', '', POST],
    ['every post on the Prayer page', 'PRAYER_LOAD', "await all('Post', { kind: { equalTo: 'prayer' } })", "await all('Post')", LIST],
    ['a hidden request on the Prayer page', 'PRAYER_LOAD', 'return !p.endedAt && m && !m.endedAt;', 'return m && !m.endedAt;', LIST],
    ['the Prayer page doesn’t know what I prayed', 'PRAYER_LOAD', "var prayed = on.length ? await all('Prayed', { post: { containedIn: on } }) : [];", 'var prayed = [];', LIST],
    ['a stranger’s Prayer page asks the backend', 'PRAYER_LOAD', 'if (!Noodl.Users.Current) return null;', '', NONE],
    ['someone waiting sees the requests', 'PRAYER_LOAD', "if (who.status !== 'approved') { Outputs.waiting(); return; }", '', NONE],
    ['a prayer request in the grid', 'PROFILE_LOAD', "posts = posts.filter(function (p) { return p.kind !== 'prayer' && p.kind !== 'testimony'; });", "posts = posts.filter(function (p) { return p.kind !== 'testimony'; });", COUNTS],
    ['prayer requests not counted', 'PROFILE_LOAD', "var asks = posts.filter(function (p) { return p.kind === 'prayer'; }).length;", 'var asks = 0;', COUNTS],
    ['Profile lit on someone else’s', 'PROFILE_LOAD', "Outputs.navOn = mine ? 'profile' : '';", "Outputs.navOn = 'profile';", COUNTS],
    ['the address’s kind ignored', 'NEW_POST_KIND', "KINDS.indexOf(Inputs.start) >= 0 ? Inputs.start : 'post'", "'post'", KIND],
    ['a chip can’t switch back', 'NEW_POST_KIND', "var kind = KINDS.indexOf(picked) >= 0 ? picked : KINDS.indexOf(Inputs.start) >= 0 ? Inputs.start : 'post';", "var kind = KINDS.indexOf(Inputs.start) >= 0 ? Inputs.start : KINDS.indexOf(picked) >= 0 ? picked : 'post';", KIND],
    ['a chip pressed again says the same', 'PICK_POST', "'post|' + Date.now()", "'post|'", KIND],
    ['a prayer request sent with photos', 'NEW_POST_GATHER', "kind !== 'prayer' && Array.isArray(Inputs.photos)", 'Array.isArray(Inputs.photos)', WORDS],
    ['an empty prayer request sent', 'NEW_POST_GATHER', 'if (wordsNeeded[kind] && !caption.trim()) { held(wordsNeeded[kind]); return; }', '', WORDS],
    ['a prayer request sent as a post', 'NEW_POST_GATHER', ".indexOf(Inputs.kind) >= 0 ? Inputs.kind : 'post';", ".indexOf(Inputs.kind) >= 0 ? 'post' : 'post';", WORDS],
    ['a prayer request lands on the feed', 'NEW_POST_WHERE', "if (Inputs.kind === 'prayer') Outputs.prayer(); else Outputs.feed();", 'Outputs.feed();', WHERE],
    ['I prayed sends on twice', 'PRAY_GATHER', 'on: Inputs.prayed !== true', 'on: true', PRAY],
    ['every section lit', 'NAV_LOOK', "Outputs.feedInk = on === 'feed' ?", 'Outputs.feedInk = true ?', NAV]
  ];

  it.each(MUTANTS)('mutant red: %s', async (_what, script, from, to, name) => {
    expect([script, SHIPPED[script].includes(from)]).toEqual([script, true]);
    S = { ...SHIPPED, [script]: SHIPPED[script].split(from).join(to) };
    try {
      await expect(CHECKS[name]()).rejects.toThrow();
    } finally {
      S = { ...SHIPPED };
    }
  });
});
