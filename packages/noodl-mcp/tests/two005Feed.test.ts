/**
 * TWO-005 slice 2 — the feed's page scripts against fixtures: which posts a member sees and in what order, what each
 * card says (hearts by person, mine among them; comments not hidden), the photos' signed links kept between reads, a
 * post's own page with its comments, the new post's photos, and the forms' own checks. The functions behind them are
 * graded on a real backend (`nodegx-backend/tests/two-005-feed.test.ts`); the pages in a browser by the drive.
 */
import { compiles, Row, run } from './two003Run';
import * as shipped from './two005FeedPages';

/** The scripts under test: the shipped ones, or one mutated (the loop at the end). */
const SHIPPED = {
  FEED_LOAD: shipped.FEED_LOAD,
  POST_LOAD: shipped.POST_LOAD,
  NEW_POST_PHOTOS: shipped.NEW_POST_PHOTOS,
  NEW_POST_GATHER: shipped.NEW_POST_GATHER,
  COMMENT_GATHER: shipped.COMMENT_GATHER,
  HEART_GATHER: shipped.HEART_GATHER,
  REMOVE_PHOTO: shipped.REMOVE_PHOTO
};
let S: Record<keyof typeof SHIPPED, string> = { ...SHIPPED };
/** Every check by its name, so a mutant can name the one it must turn red. */
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
  { objectId: 'm3', name: 'Zed Darko', status: 'approved', role: 'member', login: 'u3', endedAt: at(7) },
  { objectId: 'm4', name: 'Ama Boateng', status: 'approved', role: 'admin', login: 'u4' }
];
const POSTS: Row[] = [
  { objectId: 'p1', caption: 'Sunday lunch', member: 'm1', createdAt: at(10), photos: [{ name: 'a_lunch.png', url: 'https://b/files/a_lunch.png' }, { name: 'b_choir.png', url: 'https://b/files/b_choir.png' }] },
  { objectId: 'p2', caption: 'Pray for the youth camp', member: 'm2', createdAt: at(11), photos: [] },
  { objectId: 'p3', caption: 'Before the block', member: 'm3', createdAt: at(12), photos: [] },
  { objectId: 'p4', caption: 'Broke the rules', member: 'm2', createdAt: at(13), endedAt: at(14), hiddenReason: 'unkind', photos: [] },
  { objectId: 'p5', caption: '', member: 'm4', createdAt: at(9), photos: [{ name: 'c_hall.png', url: 'https://b/files/c_hall.png' }] }
];
const HEARTS: Row[] = [
  { objectId: 'h1', post: ptr('Post', 'p1'), doneBy: ptr('_User', 'u2') },
  { objectId: 'h2', post: ptr('Post', 'p1'), doneBy: ptr('_User', 'u1') },
  // A race kept two rows for one person: counted once.
  { objectId: 'h3', post: ptr('Post', 'p1'), doneBy: ptr('_User', 'u1') },
  { objectId: 'h4', post: ptr('Post', 'p1'), doneBy: ptr('_User', 'u4') }
];
const COMMENTS: Row[] = [
  { objectId: 'c2', post: ptr('Post', 'p1'), member: 'm4', text: 'Lovely', createdAt: at(12) },
  { objectId: 'c1', post: ptr('Post', 'p1'), member: 'm2', text: 'Amen', createdAt: at(11) },
  { objectId: 'c3', post: ptr('Post', 'p1'), member: 'm2', text: 'Unkind words', createdAt: at(13), endedAt: at(14) }
];
const TABLES = { Member: MEMBERS, Post: POSTS, Heart: HEARTS, Comment: COMMENTS };

const ME = { status: 'approved', role: 'member', name: 'Ann Mensah' };
const LATER = new Date(Date.now() + 300000).toISOString();
const signer = (refuse: string[] = []) => (f: unknown) => {
  const name = typeof (f as Row).getName === 'function' ? (f as Row).getName() : (f as Row).name;
  if (refuse.includes(name)) throw { error: 'This file is private.' };
  return { url: `https://b/files/${name}?exp=1&sig=s`, kind: 'signed', expiresAt: LATER };
};
const feed = (opts: { me?: Row | null; kept?: Row; refuse?: string[]; tables?: Record<string, Row[]> } = {}) =>
  run(S.FEED_LOAD, {}, {
    current: opts.me === null ? undefined : { id: 'u1' },
    tables: opts.tables ?? TABLES,
    kept: opts.kept ?? {},
    sign: signer(opts.refuse),
    cloud: (name) => {
      if (name !== 'whoAmI') throw new Error(name);
      return { me: opts.me === undefined ? ME : opts.me };
    }
  });

describe('TWO-005 slice 2 — the feed', () => {
  check('the newest first; nothing hidden, nothing by a blocked member', async () => {
    const r = await feed();
    expect(r.out.ok).toBe(true);
    expect(r.out.cards.map((c: Row) => c.id)).toEqual(['p2', 'p1', 'p5']);
    expect(r.out.empty).toBe(false);
  });

  check('a card: who, the photos by their signed links, the hearts by person with mine first-named, the comments not hidden', async () => {
    const p1 = (await feed()).out.cards[1];
    expect(p1).toMatchObject({
      name: 'Ann Mensah',
      initials: 'AM',
      caption: 'Sunday lunch',
      hasCaption: true,
      hasPhotos: true,
      lostPhotos: false,
      hearted: true,
      heartLabel: '♥ Hearted',
      heartColor: 'var(--heart)',
      hearts: '3 hearts · Bob, you and 1 other',
      comments: 'View all 2 comments',
      toComments: true,
      listComments: true
    });
    expect(p1.photos.map((ph: Row) => ph.src)).toEqual(['https://b/files/a_lunch.png?exp=1&sig=s', 'https://b/files/b_choir.png?exp=1&sig=s']);
    expect(p1.photos[0].alt).toBe('Photo 1 of 2, shared by Ann Mensah');
    const p2 = (await feed()).out.cards[0];
    // Two hearts name both.
    const two = (await feed({ tables: { ...TABLES, Heart: HEARTS.slice(0, 2) } })).out.cards[1];
    expect(two.hearts).toBe('2 hearts · Bob and you');
    // Slice 4b: a card with no photo leads with its words (shown above the heart), so the caption below stays empty.
    expect(p2).toMatchObject({ hearted: false, heartLabel: '♡ Heart', heartColor: 'var(--foreground)', hearts: 'No hearts yet', comments: '', listComments: false, toComments: true, hasPhotos: false, hasCaption: false, wordsFirst: true });
  });

  check('a photo’s link is kept on the page and asked for again only when it is about to run out', async () => {
    const kept: Row = {};
    const first = await feed({ kept });
    expect(first.signed).toHaveLength(3);
    const again = await feed({ kept });
    expect(again.signed).toEqual([]);
    expect(again.out.cards[1].photos[0].src).toBe(first.out.cards[1].photos[0].src);
    // Thirty seconds left: asked again.
    (kept.links as Row)['a_lunch.png'].until = Date.now() + 30000;
    expect((await feed({ kept })).signed.map((f) => (f as Row).name)).toEqual(['a_lunch.png']);
  });

  check('🔴 a photo the backend won’t sign is left out, and the card says one couldn’t be loaded', async () => {
    const p1 = (await feed({ refuse: ['b_choir.png'] })).out.cards[1];
    expect(p1.photos).toHaveLength(1);
    expect(p1.lostPhotos).toBe(true);
  });

  check('🔴 nobody signed in is told to sign in and asks nothing; someone waiting goes to Waiting', async () => {
    const nobody = await feed({ me: null });
    expect([nobody.out.refused, nobody.out.problem, nobody.called, nobody.out.cards]).toEqual([true, 'Sign in to see the feed.', [], undefined]);
    expect((await feed({ me: { status: 'waiting', role: 'member' } })).fired).toEqual(['waiting']);
  });

  check('nothing posted yet says so', async () => {
    const r = await feed({ tables: { ...TABLES, Post: [] } });
    expect([r.out.empty, r.out.cards]).toEqual([true, []]);
  });
});

describe('TWO-005 slice 2 — one post and its comments', () => {
  const post = (postId: string) =>
    run(S.POST_LOAD, { postId }, { current: { id: 'u2' }, tables: TABLES, kept: {}, sign: signer(), cloud: () => ({ me: { status: 'approved', role: 'member' } }) });

  check('the post as the feed shows it, without the way to its own page; the comments oldest first, none hidden', async () => {
    const r = await post('p1');
    expect(r.out.ok).toBe(true);
    expect(r.out.card).toHaveLength(1);
    expect(r.out.card[0]).toMatchObject({ id: 'p1', toComments: false, listComments: false, hearts: '3 hearts · you, Ann and 1 other' });
    expect(r.out.comments.map((c: Row) => [c.name, c.text])).toEqual([['Bob Owusu', 'Amen'], ['Ama Boateng', 'Lovely']]);
    expect(r.out.heading).toBe('2 comments');
  });

  check('🔴 a hidden post, or one by a blocked member, is not in the feed any more', async () => {
    for (const id of ['p4', 'p3', 'nope']) {
      const r = await post(id);
      expect([id, r.out.gone, r.out.ok, r.out.card]).toEqual([id, true, false, undefined]);
    }
  });

  check('a post with no comments says so', async () => {
    expect((await post('p2')).out.heading).toBe('No comments yet');
  });
});

describe('TWO-005 slice 2 — a new post', () => {
  const file = (name: string) => ({ getName: () => name, getUrl: () => `https://b/files/${name}` });

  check('each photo uploaded joins once, shown by its link; Remove takes it off; four at most', async () => {
    const kept: Row = {};
    const one = file('a_1.png');
    let r = await run(S.NEW_POST_PHOTOS, { added: one }, { kept, sign: signer() });
    expect(r.out.tiles).toEqual([{ id: 'a_1.png', name: 'a_1.png', src: 'https://b/files/a_1.png?exp=1&sig=s', alt: 'Photo 1 you added' }]);
    expect(r.out.photos).toEqual([{ name: 'a_1.png', url: 'https://b/files/a_1.png' }]);
    expect([r.out.room, r.out.many]).toEqual([true, true]);
    // The same upload arriving again (another input changed) adds nothing.
    r = await run(S.NEW_POST_PHOTOS, { added: one, removed: '' }, { kept, sign: signer() });
    expect([r.out.photos.length, r.signed.length]).toEqual([1, 0]);
    for (const n of [2, 3, 4, 5]) r = await run(S.NEW_POST_PHOTOS, { added: file(`a_${n}.png`) }, { kept, sign: signer() });
    expect(r.out.photos.map((p: Row) => p.name)).toEqual(['a_1.png', 'a_2.png', 'a_3.png', 'a_4.png']);
    expect(r.out.room).toBe(false);
    const removal = await run(S.REMOVE_PHOTO, { name: 'a_2.png' }, {});
    r = await run(S.NEW_POST_PHOTOS, { added: file('a_5.png'), removed: removal.out.removed }, { kept, sign: signer() });
    expect(r.out.photos.map((p: Row) => p.name)).toEqual(['a_1.png', 'a_3.png', 'a_4.png']);
    expect(r.out.room).toBe(true);
  });

  check('a photo the backend won’t sign still goes in the post; its tile shows nothing', async () => {
    const r = await run(S.NEW_POST_PHOTOS, { added: file('x.png') }, { kept: {}, sign: signer(['x.png']) });
    expect([r.out.photos.length, r.out.tiles[0].src]).toEqual([1, '']);
  });

  check('the share: the caption as written and the photos; a caption over 2,200 characters is held here, with its length', async () => {
    const photos = [{ name: 'a_1.png', url: 'u' }];
    const ok = await run(S.NEW_POST_GATHER, { caption: 'Hello', photos }, {});
    expect([ok.fired, ok.out.post, ok.out.problem]).toEqual([['go'], { caption: 'Hello', photos, kind: 'post' }, '']);
    const long = await run(S.NEW_POST_GATHER, { caption: 'x'.repeat(2201), photos }, {});
    expect([long.fired, long.out.problem]).toEqual([['held'], 'A caption of 2,200 characters or fewer. This one has 2,201.']);
  });

  check('a comment: trimmed; an empty or long one is held here', async () => {
    expect((await run(S.COMMENT_GATHER, { text: '  Amen ', postId: 'p1' }, {})).out.comment).toEqual({ postId: 'p1', text: 'Amen' });
    expect((await run(S.COMMENT_GATHER, { text: ' ', postId: 'p1' }, {})).out.problem).toBe('Write a comment first.');
    expect((await run(S.COMMENT_GATHER, { text: 'y'.repeat(1001), postId: 'p1' }, {})).fired).toEqual(['held']);
  });

  check('a heart says what it should be: on unless it is already', async () => {
    expect((await run(S.HEART_GATHER, { id: 'p1', hearted: true }, {})).out.heart).toEqual({ postId: 'p1', on: false });
    expect((await run(S.HEART_GATHER, { id: 'p1', hearted: false }, {})).out.heart).toEqual({ postId: 'p1', on: true });
    expect((await run(S.HEART_GATHER, { id: 'p1' }, {})).out.heart).toEqual({ postId: 'p1', on: true });
  });

  it('every script here compiles', () => {
    for (const code of Object.values(SHIPPED)) expect(compiles(code)).toBe(true);
  });
});

describe('TWO-005 slice 2 — the page scripts’ mutants', () => {
  const NEWEST = 'the newest first; nothing hidden, nothing by a blocked member';
  const CARD = 'a card: who, the photos by their signed links, the hearts by person with mine first-named, the comments not hidden';
  const KEPT = 'a photo’s link is kept on the page and asked for again only when it is about to run out';
  const LOST = '🔴 a photo the backend won’t sign is left out, and the card says one couldn’t be loaded';
  const NOBODY = '🔴 nobody signed in is told to sign in and asks nothing; someone waiting goes to Waiting';
  const ONE = 'the post as the feed shows it, without the way to its own page; the comments oldest first, none hidden';
  const GONE = '🔴 a hidden post, or one by a blocked member, is not in the feed any more';
  const PHOTOS = 'each photo uploaded joins once, shown by its link; Remove takes it off; four at most';
  const SHARE = 'the share: the caption as written and the photos; a caption over 2,200 characters is held here, with its length';
  const COMMENT = 'a comment: trimmed; an empty or long one is held here';
  const HEART = 'a heart says what it should be: on unless it is already';
  /** [what it loosens, script, text in it, what replaces it, the check that must go red] */
  const MUTANTS: Array<[string, keyof typeof SHIPPED, string, string, string]> = [
    ['a hidden post shown', 'FEED_LOAD', 'return !p.endedAt && m && !m.endedAt;', 'return m && !m.endedAt;', NEWEST],
    ['a blocked member’s post shown', 'FEED_LOAD', 'return !p.endedAt && m && !m.endedAt;', 'return !p.endedAt && m;', NEWEST],
    ['oldest first', 'FEED_LOAD', 'return String(b.createdAt).localeCompare(String(a.createdAt));', 'return String(a.createdAt).localeCompare(String(b.createdAt));', NEWEST],
    ['hearts counted by row', 'FEED_LOAD', 'people.indexOf(u) < 0', 'true', CARD],
    ['mine not named as me', 'FEED_LOAD', "u === mine ? 'you' : firstName(byLogin[u])", 'firstName(byLogin[u])', CARD],
    ['a hidden comment counted', 'FEED_LOAD', "idOf(c.post) === p.objectId && !c.endedAt", 'idOf(c.post) === p.objectId', CARD],
    ['a hearted post offers a heart again', 'FEED_LOAD', "hearted ? '♥ Hearted' : '♡ Heart'", "'♡ Heart'", CARD],
    ['every link asked for on every read', 'FEED_LOAD', 'if (links[name] && links[name].until > soon) return links[name].url;', '', KEPT],
    ['a link kept until it has run out', 'FEED_LOAD', 'var soon = Date.now() + 60000;', 'var soon = Date.now();', KEPT],
    ['a refused photo shown blank', 'FEED_LOAD', 'var urls = (await linked(p.photos)).filter(Boolean);', 'var urls = await linked(p.photos);', LOST],
    ['a stranger’s page asks the backend', 'FEED_LOAD', 'if (!Noodl.Users.Current) return null;', '', NOBODY],
    ['someone waiting sees the feed', 'FEED_LOAD', "if (who.status !== 'approved') { Outputs.waiting(); return; }", '', NOBODY],
    ['the post’s page links to itself', 'POST_LOAD', 'cardsOf(posts, members, hearts, comments, mine, true, prayed)', 'cardsOf(posts, members, hearts, comments, mine, false, prayed)', ONE],
    ['comments newest first', 'POST_LOAD', '.sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });\nvar rows', '.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });\nvar rows', ONE],
    ['a hidden comment listed', 'POST_LOAD', '.filter(function (c) { return !c.endedAt; })', '.filter(function (c) { return true; })', ONE],
    ['a hidden post opened', 'POST_LOAD', 'return !p.endedAt && m && !m.endedAt;', 'return m && !m.endedAt;', GONE],
    ['a photo added twice', 'NEW_POST_PHOTOS', "if (up && up !== keep.get('addedFrom')) {", 'if (up) {', PHOTOS],
    ['a fifth photo', 'NEW_POST_PHOTOS', '.slice(0, 4);', ';', PHOTOS],
    ['Remove does nothing', 'NEW_POST_PHOTOS', 'photos = photos.filter(function (f) { return f.name !== gone; });', '', PHOTOS],
    ['a long caption sent', 'NEW_POST_GATHER', 'if (caption.trim().length > 2200)', 'if (false)', SHARE],
    ['an empty comment sent', 'COMMENT_GATHER', "if (!words) { Outputs.problem = 'Write a comment first.'; Outputs.held(); return; }", '', COMMENT],
    ['the heart sends on twice', 'HEART_GATHER', 'on: Inputs.hearted !== true', 'on: true', HEART]
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
