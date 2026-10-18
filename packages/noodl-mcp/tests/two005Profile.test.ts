/**
 * TWO-005 slice 3 — the profile pages' scripts against fixtures: whose profile, what it says, the grid (newest first,
 * nothing out of the feed, a photo's tile or a post's first words), your own with Edit profile, a member out of the
 * community, and the edit page's photo and form. The function behind them is graded on a real backend
 * (`nodegx-backend/tests/two-005-profile.test.ts`); the pages in a browser by the drive.
 */
import { compiles, Row, run } from './two003Run';
import * as feed from './two005FeedPages';
import * as shipped from './two005ProfilePages';

/** The scripts under test: the shipped ones, or one mutated (the loop at the end). */
const SHIPPED = {
  PROFILE_LOAD: shipped.PROFILE_LOAD,
  EDIT_LOAD: shipped.EDIT_LOAD,
  EDIT_PHOTO: shipped.EDIT_PHOTO,
  EDIT_GATHER: shipped.EDIT_GATHER,
  REMOVE_FACE: shipped.REMOVE_FACE,
  FEED_LOAD: feed.FEED_LOAD,
  POST_LOAD: feed.POST_LOAD
};
let S: Record<keyof typeof SHIPPED, string> = { ...SHIPPED };
const CHECKS: Record<string, () => Promise<void>> = {};
const check = (name: string, fn: () => Promise<void> | void) => {
  CHECKS[name] = async () => fn();
  it(name, async () => fn());
};

const at = (h: number) => `2026-10-15T${String(h).padStart(2, '0')}:00:00.000Z`;
const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
const file = (name: string) => ({ __type: 'File', name, url: `https://b/files/${name}` });

const MEMBERS: Row[] = [
  { objectId: 'm1', name: 'Ann Mensah', bio: 'Alto in the choir. Psalm 46:10.', photo: file('f_ann.png'), status: 'approved', role: 'member', login: 'u1' },
  { objectId: 'm2', name: 'Bob Owusu', status: 'approved', role: 'member', login: 'u2' },
  { objectId: 'm3', name: 'Zed Darko', status: 'approved', role: 'member', login: 'u3', endedAt: at(7), blockedReason: 'spam' },
  { objectId: 'm5', name: 'Wes Ofori', status: 'waiting', role: 'member', login: 'u5' }
];
const LONG = 'Pray for the youth camp this weekend: forty young people, two buses and a lot of rain forecast';
const POSTS: Row[] = [
  { objectId: 'p1', caption: 'Sunday lunch', member: 'm1', createdAt: at(10), photos: [{ name: 'a_lunch.png', url: 'https://b/files/a_lunch.png' }, { name: 'b_choir.png', url: 'https://b/files/b_choir.png' }] },
  { objectId: 'p2', caption: LONG, member: 'm1', createdAt: at(11), photos: [] },
  { objectId: 'p4', caption: 'Hidden', member: 'm1', createdAt: at(13), endedAt: at(14), photos: [] },
  { objectId: 'p6', caption: 'Bob’s', member: 'm2', createdAt: at(12), photos: [] },
  { objectId: 'p3', caption: 'Zed’s', member: 'm3', createdAt: at(9), photos: [] }
];
const TABLES = { Member: MEMBERS, Post: POSTS, Heart: [] as Row[], Comment: [{ objectId: 'c1', post: ptr('Post', 'p1'), member: 'm1', text: 'Amen', createdAt: at(12) }] as Row[] };

const LATER = new Date(Date.now() + 300000).toISOString();
const signer = (refuse: string[] = []) => (f: unknown) => {
  const name = typeof (f as Row).getName === 'function' ? (f as Row).getName() : (f as Row).name;
  if (refuse.includes(name)) throw { error: 'This file is private.' };
  return { url: `https://b/files/${name}?exp=1&sig=s`, kind: 'signed', expiresAt: LATER };
};
const BOB = { id: 'm2', status: 'approved', role: 'member', name: 'Bob Owusu' };
const ANN = { id: 'm1', status: 'approved', role: 'member', name: 'Ann Mensah' };
const profile = (memberId: string, opts: { me?: Row | null; refuse?: string[]; tables?: Record<string, Row[]> } = {}) =>
  run(S.PROFILE_LOAD, { memberId }, {
    current: opts.me === null ? undefined : { id: 'u' },
    tables: opts.tables ?? TABLES,
    kept: {},
    sign: signer(opts.refuse),
    cloud: (name) => {
      if (name !== 'whoAmI') throw new Error(name);
      return { me: opts.me === undefined ? BOB : opts.me };
    }
  });

describe('TWO-005 slice 3 — a profile', () => {
  check('another member’s: their photo by its signed link, name, bio and posts; no Edit profile', async () => {
    const r = await profile('m1');
    expect(r.out).toMatchObject({
      ok: true,
      gone: false,
      name: 'Ann Mensah',
      bio: 'Alto in the choir. Psalm 46:10.',
      hasBio: true,
      initials: 'AM',
      face: 'https://b/files/f_ann.png?exp=1&sig=s',
      hasFace: true,
      noFace: false,
      posts: '2',
      postsWord: 'posts',
      isMe: false,
      empty: false
    });
  });

  check('the grid: newest first, only what the feed shows; a photo post by its first photo, a post of words by its first words', async () => {
    const tiles = (await profile('m1')).out.tiles;
    expect(tiles.map((t: Row) => t.id)).toEqual(['p2', 'p1']);
    expect(tiles[1]).toMatchObject({ src: 'https://b/files/a_lunch.png?exp=1&sig=s', hasPhoto: true, noPhoto: false });
    expect(tiles[1].label).toMatch(/^Photo post, .*: Sunday lunch$/);
    expect(tiles[0]).toMatchObject({ src: '', hasPhoto: false, noPhoto: true });
    expect(tiles[0].words).toBe(`${LONG.slice(0, 59).trim()}…`);
    expect(tiles[0].words.length).toBeLessThanOrEqual(60);
    // Only the first photo of a post is asked for.
    const signed = (await profile('m1')).signed.map((f) => (f as Row).name);
    expect(signed).toEqual(['f_ann.png', 'a_lunch.png']);
  });

  check('your own: Edit profile; nothing posted says so in your words; no member named is your own', async () => {
    const own = await profile('m2');
    expect([own.out.isMe, own.out.posts, own.out.postsWord, own.out.hasBio, own.out.noFace]).toEqual([true, '1', 'post', false, true]);
    const none = await profile('m2', { tables: { ...TABLES, Post: [] } });
    expect([none.out.empty, none.out.emptyWords, none.out.tiles]).toEqual([true, 'You haven’t posted yet. What you share shows here.', []]);
    expect((await profile('m1', { tables: { ...TABLES, Post: [] }, me: BOB })).out.emptyWords).toBe('Ann hasn’t posted yet.');
    expect((await profile('', { me: ANN })).out).toMatchObject({ name: 'Ann Mensah', isMe: true });
  });

  check('🔴 a photo the backend won’t sign shows their initials', async () => {
    const r = await profile('m1', { refuse: ['f_ann.png'] });
    expect([r.out.face, r.out.hasFace, r.out.noFace, r.out.initials]).toEqual(['', false, true, 'AM']);
  });

  check('🔴 a blocked member, one still waiting, and no member at all: not in the community, nothing of theirs shown', async () => {
    for (const id of ['m3', 'm5', 'nope']) {
      const r = await profile(id);
      expect([id, r.out.gone, r.out.ok, r.out.name, r.out.tiles]).toEqual([id, true, false, undefined, undefined]);
    }
  });

  check('🔴 nobody signed in is told to sign in and asks nothing; someone waiting goes to Waiting', async () => {
    const nobody = await profile('m1', { me: null });
    expect([nobody.out.refused, nobody.out.problem, nobody.called, nobody.out.name]).toEqual([true, 'Sign in to see members’ profiles.', [], undefined]);
    expect((await profile('m1', { me: { status: 'waiting', role: 'member' } })).fired).toEqual(['waiting']);
  });
});

describe('TWO-005 slice 3 — faces in the feed', () => {
  const opts = { current: { id: 'u2' }, tables: TABLES, kept: {}, sign: signer(), cloud: () => ({ me: BOB }) };

  check('a card and a comment carry their member’s id and photo; no photo, their initials', async () => {
    const cards = (await run(S.FEED_LOAD, {}, opts)).out.cards;
    const byId = Object.fromEntries(cards.map((c: Row) => [c.id, c]));
    expect(byId.p1).toMatchObject({ memberId: 'm1', face: 'https://b/files/f_ann.png?exp=1&sig=s', hasFace: true, noFace: false });
    expect(byId.p6).toMatchObject({ memberId: 'm2', face: '', hasFace: false, noFace: true, initials: 'BO' });
    const post = await run(S.POST_LOAD, { postId: 'p1' }, { ...opts, kept: {} });
    expect(post.out.comments[0]).toMatchObject({ memberId: 'm1', name: 'Ann Mensah', hasFace: true });
  });

  it('the feed asks for your id, for Your profile', async () => {
    expect((await run(S.FEED_LOAD, {}, opts)).out.meId).toBe('m2');
  });
});

describe('TWO-005 slice 3 — editing your profile', () => {
  const editLoad = (me: Row | null = ANN, refuse: string[] = []) =>
    run(S.EDIT_LOAD, {}, { current: me === null ? undefined : { id: 'u1' }, tables: TABLES, kept: {}, sign: signer(refuse), cloud: () => ({ me }) });
  const upload = (name: string) => ({ getName: () => name, getUrl: () => `https://b/files/${name}` });

  check('the page opens on your profile as it is', async () => {
    const r = await editLoad();
    expect(r.out).toMatchObject({ ok: true, memberId: 'm1', name: 'Ann Mensah', bio: 'Alto in the choir. Psalm 46:10.', initials: 'AM', current: 'https://b/files/f_ann.png?exp=1&sig=s' });
    // Not the first row: whoever is signed in.
    expect((await editLoad(BOB)).out).toMatchObject({ memberId: 'm2', name: 'Bob Owusu', bio: '', current: '' });
    const nobody = await editLoad(null);
    expect([nobody.out.refused, nobody.out.problem, nobody.called]).toEqual([true, 'Sign in to change your profile.', []]);
  });

  check('the photo: kept as it is, a new one shown by its link, Remove takes it off; the same upload twice is one', async () => {
    const kept: Row = {};
    const current = 'https://b/files/f_ann.png?exp=1&sig=s';
    let r = await run(S.EDIT_PHOTO, { current }, { kept, sign: signer() });
    expect(r.out).toEqual({ choice: 'keep', photo: {}, face: current, hasFace: true, noFace: false, canRemove: true });
    const up = upload('g_new.png');
    r = await run(S.EDIT_PHOTO, { current, added: up }, { kept, sign: signer() });
    expect(r.out).toMatchObject({ choice: 'new', photo: { name: 'g_new.png', url: 'https://b/files/g_new.png' }, face: 'https://b/files/g_new.png?exp=1&sig=s', canRemove: true });
    const removal = (await run(S.REMOVE_FACE, {}, {})).out.removed;
    r = await run(S.EDIT_PHOTO, { current, added: up, removed: removal }, { kept, sign: signer() });
    expect(r.out).toMatchObject({ choice: 'none', photo: {}, face: '', hasFace: false, noFace: true, canRemove: false });
    // The upload still on its input doesn't come back; a new one does.
    r = await run(S.EDIT_PHOTO, { current, added: up, removed: removal }, { kept, sign: signer() });
    expect([r.out.choice, r.signed]).toEqual(['none', []]);
    r = await run(S.EDIT_PHOTO, { current, added: upload('h_again.png'), removed: removal }, { kept, sign: signer() });
    expect([r.out.choice, r.out.photo.name]).toEqual(['new', 'h_again.png']);
    // With no photo to begin with, there is nothing to remove.
    expect((await run(S.EDIT_PHOTO, { current: '' }, { kept: {}, sign: signer() })).out).toMatchObject({ choice: 'keep', noFace: true, canRemove: false });
  });

  check('the save: what was typed, else what was there, trimmed; the photo only when it changed', async () => {
    const loaded = { name0: 'Ann Mensah', bio0: 'Alto' };
    let r = await run(S.EDIT_GATHER, { ...loaded, choice: 'keep', photo: {} }, {});
    expect([r.fired, r.out.profile]).toEqual([['go'], { name: 'Ann Mensah', bio: 'Alto' }]);
    r = await run(S.EDIT_GATHER, { ...loaded, bio: '  Soprano now ', choice: 'new', photo: { name: 'g.png', url: 'u' } }, {});
    expect(r.out.profile).toEqual({ name: 'Ann Mensah', bio: 'Soprano now', photo: { name: 'g.png', url: 'u' } });
    r = await run(S.EDIT_GATHER, { ...loaded, bio: '', choice: 'none', photo: {} }, {});
    expect(r.out.profile).toEqual({ name: 'Ann Mensah', bio: '', photo: null });
  });

  check('🔴 an emptied name, a long name or a long bio is held here, with its length', async () => {
    const empty = await run(S.EDIT_GATHER, { name0: 'Ann', name: '  ', choice: 'keep' }, {});
    expect([empty.fired, empty.out.problem]).toEqual([['held'], 'Your name, as the community knows you.']);
    const long = await run(S.EDIT_GATHER, { name0: 'Ann', bio: 'b'.repeat(151), choice: 'keep' }, {});
    expect([long.fired, long.out.problem]).toEqual([['held'], 'A bio of 150 characters or fewer. This one has 151.']);
    const name = await run(S.EDIT_GATHER, { name: 'n'.repeat(81), choice: 'keep' }, {});
    expect([name.fired, name.out.problem]).toEqual([['held'], 'A name of 80 characters or fewer. This one has 81.']);
    expect((await run(S.EDIT_GATHER, { name: 'n'.repeat(80), bio: 'b'.repeat(150), choice: 'keep' }, {})).fired).toEqual(['go']);
  });

  it('every script here compiles', () => {
    for (const code of Object.values(SHIPPED)) expect(compiles(code)).toBe(true);
  });
});

describe('TWO-005 slice 3 — the page scripts’ mutants', () => {
  const THEIRS = 'another member’s: their photo by its signed link, name, bio and posts; no Edit profile';
  const GRID = 'the grid: newest first, only what the feed shows; a photo post by its first photo, a post of words by its first words';
  const OWN = 'your own: Edit profile; nothing posted says so in your words; no member named is your own';
  const UNSIGNED = '🔴 a photo the backend won’t sign shows their initials';
  const GONE = '🔴 a blocked member, one still waiting, and no member at all: not in the community, nothing of theirs shown';
  const NOBODY = '🔴 nobody signed in is told to sign in and asks nothing; someone waiting goes to Waiting';
  const FACES = 'a card and a comment carry their member’s id and photo; no photo, their initials';
  const OPENS = 'the page opens on your profile as it is';
  const PHOTO = 'the photo: kept as it is, a new one shown by its link, Remove takes it off; the same upload twice is one';
  const SAVE = 'the save: what was typed, else what was there, trimmed; the photo only when it changed';
  const HELD = '🔴 an emptied name, a long name or a long bio is held here, with its length';
  /** [what it loosens, script, text in it, what replaces it, the check that must go red] */
  const MUTANTS: Array<[string, keyof typeof SHIPPED, string, string, string]> = [
    ['everyone is me', 'PROFILE_LOAD', "var mine = String(who.id || '') === m.objectId;", 'var mine = true;', THEIRS],
    ['a hidden post in the grid', 'PROFILE_LOAD', 'return !p.endedAt && m && !m.endedAt;', 'return m && !m.endedAt;', GRID],
    ['the grid oldest first', 'PROFILE_LOAD', 'return String(b.createdAt).localeCompare(String(a.createdAt));', 'return String(a.createdAt).localeCompare(String(b.createdAt));', GRID],
    ['every photo of a post asked for', 'PROFILE_LOAD', '(p.photos || []).slice(0, 1)', '(p.photos || [])', GRID],
    ['a long caption shown whole', 'PROFILE_LOAD', 'var cut = words.length > 60 ?', 'var cut = false ?', GRID],
    ['no member named shows nobody', 'PROFILE_LOAD', "var id = String(Inputs.memberId || '') || String(who.id || '');", "var id = String(Inputs.memberId || '');", OWN],
    ['an unsigned photo shown blank', 'PROFILE_LOAD', "return m && m.photo && m.photo.name ? (await linked([m.photo]))[0] || '' : '';", "return m && m.photo ? m.photo.url : '';", UNSIGNED],
    ['a blocked member’s profile shown', 'PROFILE_LOAD', "(!admin && (m.status !== 'approved' || m.endedAt))", "(!admin && m.status !== 'approved')", GONE],
    ['a waiting member’s profile shown', 'PROFILE_LOAD', "(!admin && (m.status !== 'approved' || m.endedAt))", '(!admin && m.endedAt)', GONE],
    ['a stranger’s page asks the backend', 'PROFILE_LOAD', 'if (!Noodl.Users.Current) return null;', '', NOBODY],
    ['a card without its member', 'FEED_LOAD', "memberId: m.objectId || '',", '', FACES],
    ['a card without its face', 'FEED_LOAD', 'var face = await faceOf(m);\n    cards.push', "var face = '';\n    cards.push", FACES],
    ['the edit page opens on someone else', 'EDIT_LOAD', "{ objectId: { equalTo: String(who.id || '') } }", '{}', OPENS],
    ['Remove does nothing', 'EDIT_PHOTO', "keep.set('choice', { kind: 'none' });", '', PHOTO],
    ['an upload added twice', 'EDIT_PHOTO', "if (up && up !== keep.get('addedFrom')) {", 'if (up) {', PHOTO],
    ['nothing to remove offered Remove', 'EDIT_PHOTO', "(c.kind === 'keep' && !!Inputs.current)", "c.kind === 'keep'", PHOTO],
    ['the photo always sent', 'EDIT_GATHER', "if (Inputs.choice === 'new') profile.photo = Inputs.photo;", 'profile.photo = Inputs.photo;', SAVE],
    ['Remove not sent', 'EDIT_GATHER', "if (Inputs.choice === 'none') profile.photo = null;", '', SAVE],
    ['what was there forgotten', 'EDIT_GATHER', 'return typed === undefined ? (loaded || \'\') : String(typed);', "return typed === undefined ? '' : String(typed);", SAVE],
    ['a long bio sent', 'EDIT_GATHER', 'if (bio.length > 150)', 'if (false)', HELD],
    ['an emptied name sent', 'EDIT_GATHER', "if (!name) { Outputs.problem = 'Your name, as the community knows you.'; Outputs.held(); return; }", '', HELD]
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
