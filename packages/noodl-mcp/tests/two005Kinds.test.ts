/**
 * TWO-005 slice 4b — testimonies and events, the page scripts against fixtures: a testimony's card leads with its
 * words and keeps its hearts, an event's card says when it is (in the reader's own time, "was" once it has passed, the
 * year when it isn't this one), every kind but a post wears its pill; a profile counts testimonies apart, as it does
 * prayer requests, and keeps events in the grid; New post's four chips, an event's day and time, and what is held on
 * the page before it is sent. `sharePost`'s half is graded on a real backend (`nodegx-backend/tests/two-005-kinds.test.ts`),
 * the pages in a browser by the drive.
 */
import { compiles, Row, run } from './two003Run';
import * as feed from './two005FeedPages';
import * as profile from './two005ProfilePages';

// A phone in Lagos (UTC+1, no summer time): an event at half past midnight there is the evening before in UTC, so a
// script that reads a day in UTC shows the wrong one. Set before any date below is made.
process.env.TZ = 'Africa/Lagos';

/** The scripts under test: the shipped ones, or one mutated (the loop at the end). */
const SHIPPED = {
  FEED_LOAD: feed.FEED_LOAD,
  PROFILE_LOAD: profile.PROFILE_LOAD,
  NEW_POST_KIND: feed.NEW_POST_KIND,
  NEW_POST_GATHER: feed.NEW_POST_GATHER,
  NEW_POST_WHERE: feed.NEW_POST_WHERE,
  PICK_TESTIMONY: feed.PICK_TESTIMONY,
  PICK_EVENT: feed.PICK_EVENT
};
let S: Record<keyof typeof SHIPPED, string> = { ...SHIPPED };
const CHECKS: Record<string, () => Promise<void>> = {};
const check = (name: string, fn: () => Promise<void> | void) => {
  CHECKS[name] = async () => fn();
  it(name, async () => fn());
};

const NOW = new Date();
/** A day counted from today, at an hour and minute of this machine's own time (what a phone would show). */
const local = (days: number, h: number, m = 0) => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + days, h, m);
const dayOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** How a card should say a day and time, written with the platform's own names for days and months. */
const said = (d: Date) =>
  `${d.toLocaleDateString('en-GB', { weekday: 'long' })} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'long' })}` +
  `${d.getFullYear() === NOW.getFullYear() ? '' : ` ${d.getFullYear()}`}, ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

const SOON = local(3, 9);
const GONE = local(-2, 18, 30);
const NEXT_YEAR = new Date(NOW.getFullYear() + 1, 0, 10, 10, 0);
const MIDNIGHT = local(5, 0, 30);
const at = (h: number) => new Date(NOW.getTime() - (24 - h) * 3600000).toISOString();

const MEMBERS: Row[] = [
  { objectId: 'm1', name: 'Ann Mensah', status: 'approved', role: 'member', login: 'u1' },
  { objectId: 'm2', name: 'Bob Owusu', status: 'approved', role: 'member', login: 'u2' }
];
const POSTS: Row[] = [
  { objectId: 'p1', caption: 'Sunday lunch', kind: 'post', member: 'm1', createdAt: at(1), photos: [] },
  { objectId: 't1', caption: 'The visa came through this morning. Thank you for praying.', kind: 'testimony', member: 'm1', createdAt: at(2), photos: [] },
  { objectId: 'e1', caption: 'Men’s breakfast this Saturday. Bring a friend.', kind: 'event', eventOn: { __type: 'Date', iso: SOON.toISOString() }, member: 'm1', createdAt: at(3), photos: [] },
  { objectId: 'e2', caption: 'Choir practice', kind: 'event', eventOn: { __type: 'Date', iso: GONE.toISOString() }, member: 'm2', createdAt: at(4), photos: [] },
  { objectId: 'e3', caption: 'The new year’s service', kind: 'event', eventOn: NEXT_YEAR.toISOString(), member: 'm2', createdAt: at(5), photos: [] },
  { objectId: 'e4', caption: 'A day nobody wrote down', kind: 'event', member: 'm2', createdAt: at(6), photos: [] },
  { objectId: 'e5', caption: 'The watch night', kind: 'event', eventOn: { __type: 'Date', iso: MIDNIGHT.toISOString() }, member: 'm2', createdAt: at(6), photos: [] },
  { objectId: 'p2', caption: 'The choir after the service', kind: 'post', member: 'm1', createdAt: at(0), photos: [{ name: 'p2.png', url: 'u' }] },
  { objectId: 't2', caption: 'Baptised today, with my whole family there.', kind: 'testimony', member: 'm2', createdAt: at(8), photos: [{ name: 't2.png', url: 'u' }] },
  { objectId: 'e6', caption: 'Harvest thanksgiving', kind: 'event', eventOn: { __type: 'Date', iso: SOON.toISOString() }, member: 'm2', createdAt: at(8), photos: [{ name: 'e6.png', url: 'u' }] },
  { objectId: 'r1', caption: 'A job for my brother.', kind: 'prayer', prayedCount: 0, member: 'm1', createdAt: at(7), photos: [] }
];
const tables = { Member: MEMBERS, Post: POSTS, Heart: [] as Row[], Comment: [] as Row[], Prayed: [] as Row[] };
const as = (login: string) => {
  const m = MEMBERS.find((x) => x.login === login) as Row;
  return {
    current: { id: login },
    tables,
    kept: {},
    cloud: () => ({ me: { id: m.objectId, status: m.status, role: m.role, name: m.name } }),
    sign: (f: unknown) => ({ url: `https://files.example/${(f as Row).name}`, expiresAt: new Date(NOW.getTime() + 3600000).toISOString() })
  };
};
const cards = async () => (await run(S.FEED_LOAD, {}, as('u2'))).out.cards as Row[];
const cardOf = async (id: string) => (await cards()).find((c) => c.id === id) as Row;

describe('TWO-005 slice 4b — a testimony’s card and an event’s', () => {
  check('a testimony leads with its words, wears its pill and keeps its hearts', async () => {
    // With a photo, its words still come before it.
    expect(await cardOf('t2')).toMatchObject({ kindName: 'Testimony', wordsFirst: true, ask: 'Baptised today, with my whole family there.', hasCaption: false, hasPhotos: true, notPrayer: true });
    expect(await cardOf('t1')).toMatchObject({
      kindName: 'Testimony',
      hasKind: true,
      wordsFirst: true,
      ask: 'The visa came through this morning. Thank you for praying.',
      hasCaption: false,
      isPrayer: false,
      notPrayer: true,
      kindClass: '',
      heartLabel: '♡ Heart'
    });
    expect((await cardOf('t1')).when).toMatch(/^Testimony · \d+ h ago$/);
  });

  check('an event says when it is, in the reader’s time; was, once passed; the year when it isn’t this one', async () => {
    // An event with a photo is a post with a day: photo, heart, then its words; with none, its words first.
    expect(await cardOf('e6')).toMatchObject({ kindName: 'Event', hasKind: true, wordsFirst: false, ask: '', hasCaption: true, hasPhotos: true, notPrayer: true });
    expect(await cardOf('e1')).toMatchObject({ kindName: 'Event', wordsFirst: true, ask: 'Men’s breakfast this Saturday. Bring a friend.', hasCaption: false, notPrayer: true });
    expect((await cardOf('e1')).when).toBe(`Event · ${said(SOON)}`);
    expect((await cardOf('e2')).when).toBe(`Event · was ${said(GONE)}`);
    expect((await cardOf('e3')).when).toBe(`Event · ${said(NEXT_YEAR)}`);
    expect((await cardOf('e3')).when).toContain(String(NEXT_YEAR.getFullYear()));
    expect((await cardOf('e4')).when).toBe('Event · its day isn’t known');
    expect((await cardOf('e5')).when).toBe(`Event · ${said(MIDNIGHT)}`);
    expect(MIDNIGHT.getUTCDate()).not.toBe(MIDNIGHT.getDate());
  });

  check('a post wears no pill and says when it was shared; with no photo its words lead; a prayer request’s still do', async () => {
    expect(await cardOf('p2')).toMatchObject({ kindName: '', hasKind: false, wordsFirst: false, ask: '', hasCaption: true, hasPhotos: true });
    expect(await cardOf('p1')).toMatchObject({ kindName: '', hasKind: false, wordsFirst: true, ask: 'Sunday lunch', hasCaption: false });
    expect((await cardOf('p1')).when).toMatch(/^\d+ h ago$/);
    expect(await cardOf('r1')).toMatchObject({ kindName: 'Prayer request', hasKind: true, wordsFirst: true, isPrayer: true, notPrayer: false });
  });
});

describe('TWO-005 slice 4b — a profile counts testimonies apart', () => {
  check('posts, prayer requests and testimonies counted apart, in that order; events stay in the grid', async () => {
    const own = await run(S.PROFILE_LOAD, { memberId: 'm1' }, as('u1'));
    expect(own.out.counts).toEqual([
      { id: 'posts', number: '3', word: 'posts' },
      { id: 'prayers', number: '1', word: 'prayer request' },
      { id: 'testimonies', number: '1', word: 'testimony' }
    ]);
    expect((own.out.tiles as Row[]).map((t) => t.id)).toEqual(['e1', 'p1', 'p2']);
    const bobs = await run(S.PROFILE_LOAD, { memberId: 'm2' }, as('u1'));
    expect((bobs.out.counts as Row[]).map((c) => `${c.number} ${c.word}`)).toEqual(['5 posts', '0 prayer requests', '1 testimony']);
  });
});

describe('TWO-005 slice 4b — New post’s four kinds', () => {
  const kind = (inputs: Row) => run(S.NEW_POST_KIND, inputs, {});

  check('a testimony and an event: their words, photos allowed, their chip lit; only an event asks when', async () => {
    const told = (await kind({ start: 'testimony' })).out;
    expect(told).toMatchObject({ kind: 'testimony', isPost: false, isPrayer: false, isEvent: false, takesPhotos: true, title: 'New testimony', field: 'Your testimony', hint: 'What happened, in your own words.', share: 'Share your testimony', back: '← The feed' });
    expect([told.testimonyFill, told.testimonyInk, told.postFill, told.prayerFill, told.eventFill]).toEqual(['var(--primary)', 'var(--primary-foreground)', 'var(--surface)', 'var(--surface)', 'var(--surface)']);
    const event = (await kind({ start: 'event' })).out;
    expect(event).toMatchObject({ kind: 'event', isEvent: true, takesPhotos: true, title: 'New event', field: 'What is it?', share: 'Share the event' });
    expect([event.eventFill, event.eventInk, event.testimonyFill]).toEqual(['var(--primary)', 'var(--primary-foreground)', 'var(--surface)']);
    expect((await kind({ start: 'prayer' })).out).toMatchObject({ takesPhotos: false, isEvent: false });
    expect((await kind({})).out).toMatchObject({ kind: 'post', takesPhotos: true, isEvent: false, postFill: 'var(--primary)', eventFill: 'var(--surface)' });
  });

  check('the chips switch to a testimony and to an event, pressed again after another', async () => {
    const pick = async (s: 'PICK_TESTIMONY' | 'PICK_EVENT') => (await run(S[s], {}, {})).out.picked as string;
    expect((await kind({ start: 'prayer', picked: await pick('PICK_TESTIMONY') })).out.kind).toBe('testimony');
    expect((await kind({ start: 'testimony', picked: await pick('PICK_EVENT') })).out.kind).toBe('event');
    const first = await pick('PICK_EVENT');
    await new Promise((r) => setTimeout(r, 5));
    expect(await pick('PICK_EVENT')).not.toBe(first);
  });

  check('an event’s day can be picked from today to a year on, in this phone’s days', async () => {
    const out = (await kind({ start: 'event' })).out;
    expect([out.today, out.latest]).toEqual([dayOf(local(0, 0)), dayOf(local(365, 0))]);
  });

  it('the times are every half hour from six to ten at night, shown short and sent with two digits', () => {
    expect(feed.EVENT_TIMES).toHaveLength(33);
    expect(feed.EVENT_TIMES[0]).toEqual({ Label: '6:00', Value: '06:00' });
    expect(feed.EVENT_TIMES).toContainEqual({ Label: '9:30', Value: '09:30' });
    expect(feed.EVENT_TIMES[32]).toEqual({ Label: '22:00', Value: '22:00' });
  });
});

describe('TWO-005 slice 4b — what New post sends, and holds', () => {
  const gather = (inputs: Row) => run(S.NEW_POST_GATHER, inputs, {});
  const photos = [{ name: 'a_1.png', url: 'u' }];

  check('a testimony needs words and may carry photos; an empty one is held here', async () => {
    const told = await gather({ caption: 'God is faithful', photos, kind: 'testimony' });
    expect([told.fired, told.out.post]).toEqual([['go'], { caption: 'God is faithful', photos, kind: 'testimony' }]);
    const empty = await gather({ caption: ' ', photos, kind: 'testimony' });
    expect([empty.fired, empty.out.problem]).toEqual([['held'], 'Tell the members what happened.']);
  });

  check('an event is sent with its day and time as one instant, this phone’s own time; what is missing is held', async () => {
    const ok = await gather({ caption: 'Men’s breakfast', photos, kind: 'event', day: dayOf(SOON), time: '09:00' });
    expect([ok.fired, ok.out.post]).toEqual([['go'], { caption: 'Men’s breakfast', photos, kind: 'event', eventOn: SOON.toISOString() }]);
    const evening = await gather({ caption: 'Vigil', kind: 'event', day: dayOf(SOON), time: '21:30' });
    expect(evening.out.post.eventOn).toBe(local(3, 21, 30).toISOString());
    const held = async (inputs: Row) => {
      const r = await gather({ kind: 'event', ...inputs });
      return [r.fired, r.out.problem];
    };
    expect(await held({ caption: '', day: dayOf(SOON), time: '09:00' })).toEqual([['held'], 'Say what the event is.']);
    expect(await held({ caption: 'Breakfast', time: '09:00' })).toEqual([['held'], 'Choose the event’s day.']);
    expect(await held({ caption: 'Breakfast', day: dayOf(SOON), time: '' })).toEqual([['held'], 'Choose the time it starts.']);
    expect(await held({ caption: 'Breakfast', day: dayOf(local(-1, 0)), time: '12:00' })).toEqual([['held'], 'That time has passed. Choose when the event is.']);
  });

  check('a post never carries a day, whatever the event’s fields held; an unknown kind is a post', async () => {
    const post = await gather({ caption: 'Lunch', photos, kind: 'post', day: dayOf(SOON), time: '09:00' });
    expect(post.out.post).toEqual({ caption: 'Lunch', photos, kind: 'post' });
    expect((await gather({ caption: 'Lunch', kind: 'anything' })).out.post.kind).toBe('post');
  });

  check('a testimony and an event land on the feed', async () => {
    for (const k of ['testimony', 'event']) expect([k, (await run(S.NEW_POST_WHERE, { kind: k }, {})).fired]).toEqual([k, ['feed']]);
  });

  it('every script here compiles', () => {
    for (const code of Object.values(SHIPPED)) expect(compiles(code)).toBe(true);
  });
});

describe('TWO-005 slice 4b — the page scripts’ mutants', () => {
  const TOLD = 'a testimony leads with its words, wears its pill and keeps its hearts';
  const WHEN = 'an event says when it is, in the reader’s time; was, once passed; the year when it isn’t this one';
  const POST = 'a post wears no pill and says when it was shared; with no photo its words lead; a prayer request’s still do';
  const COUNTS = 'posts, prayer requests and testimonies counted apart, in that order; events stay in the grid';
  const KINDS = 'a testimony and an event: their words, photos allowed, their chip lit; only an event asks when';
  const CHIPS = 'the chips switch to a testimony and to an event, pressed again after another';
  const DAYS = 'an event’s day can be picked from today to a year on, in this phone’s days';
  const SENT_TOLD = 'a testimony needs words and may carry photos; an empty one is held here';
  const SENT_EVENT = 'an event is sent with its day and time as one instant, this phone’s own time; what is missing is held';
  const SENT_POST = 'a post never carries a day, whatever the event’s fields held; an unknown kind is a post';
  const WHERE = 'a testimony and an event land on the feed';
  /** [what it loosens, script, text in it, what replaces it, the check that must go red] */
  const MUTANTS: Array<[string, keyof typeof SHIPPED, string, string, string]> = [
    ['a testimony’s words after its photos', 'FEED_LOAD', "var wordsFirst = isPrayer || p.kind === 'testimony' ||", 'var wordsFirst = isPrayer ||', TOLD],
    ['a card with no photo leads with its heart', 'FEED_LOAD', " || (p.photos || []).length === 0;", ';', POST],
    ['every card words first', 'FEED_LOAD', " || (p.photos || []).length === 0;", ' || true;', WHEN],
    ['a testimony without hearts', 'FEED_LOAD', 'notPrayer: !isPrayer,', 'notPrayer: !wordsFirst,', TOLD],
    ['no pill but the prayer request’s', 'FEED_LOAD', "var kindName = KIND_NAMES[p.kind] || '';", "var kindName = isPrayer ? 'Prayer request' : '';", WHEN],
    ['an event says when it was shared', 'FEED_LOAD', "p.kind === 'event' ? 'Event · ' + (eventWhen(p.eventOn) || 'its day isn’t known') : ", '', WHEN],
    ['a passed event not said', 'FEED_LOAD', "return (t.getTime() < Date.now() ? 'was ' : '') + said;", 'return said;', WHEN],
    ['the year never said', 'FEED_LOAD', "var year = t.getFullYear() === new Date().getFullYear() ? '' : ' ' + t.getFullYear();", "var year = '';", WHEN],
    ['the minutes unpadded', 'FEED_LOAD', "String(t.getMinutes()).padStart(2, '0')", 't.getMinutes()', WHEN],
    ['an event’s day read as UTC', 'FEED_LOAD', "days[t.getDay()] + ' ' + t.getDate()", "days[t.getUTCDay()] + ' ' + t.getUTCDate()", WHEN],
    ['every card wears a pill', 'FEED_LOAD', 'hasKind: !!kindName,', 'hasKind: true,', POST],
    ['a testimony a tile in the grid', 'PROFILE_LOAD', "return p.kind !== 'prayer' && p.kind !== 'testimony'; });", "return p.kind !== 'prayer'; });", COUNTS],
    ['an event out of the grid', 'PROFILE_LOAD', "return p.kind !== 'prayer' && p.kind !== 'testimony'; });", "return p.kind === 'post'; });", COUNTS],
    ['testimonies not counted', 'PROFILE_LOAD', "var told = posts.filter(function (p) { return p.kind === 'testimony'; }).length;", 'var told = 0;', COUNTS],
    ['one testimony called testimonies', 'PROFILE_LOAD', "word: told === 1 ? 'testimony' : 'testimonies'", "word: 'testimonies'", COUNTS],
    ['the event chip never lit', 'NEW_POST_KIND', "Outputs.eventFill = fill('event');", "Outputs.eventFill = 'var(--surface)';", KINDS],
    ['the event’s day and time on every kind', 'NEW_POST_KIND', "Outputs.isEvent = kind === 'event';", 'Outputs.isEvent = true;', KINDS],
    ['no photos on a testimony', 'NEW_POST_KIND', "Outputs.takesPhotos = kind !== 'prayer';", "Outputs.takesPhotos = kind === 'post';", KINDS],
    ['a testimony’s words are the post’s', 'NEW_POST_KIND', '"title":"New testimony"', '"title":"New post"', KINDS],
    ['Event pressed says Post', 'PICK_EVENT', "'event|' + Date.now()", "'post|' + Date.now()", CHIPS],
    ['Testimony pressed again says the same', 'PICK_TESTIMONY', "'testimony|' + Date.now()", "'post|'", CHIPS],
    ['the day’s month a month early', 'NEW_POST_KIND', 'String(t.getMonth() + 1)', 'String(t.getMonth())', DAYS],
    ['no latest day', 'NEW_POST_KIND', 'Outputs.latest = dayOf(', 'Outputs.latest = dayOf(today) || dayOf(', DAYS],
    ['an empty testimony sent', 'NEW_POST_GATHER', '"testimony":"Tell the members what happened.",', '', SENT_TOLD],
    ['a testimony sent without its photos', 'NEW_POST_GATHER', "kind !== 'prayer' && Array.isArray(Inputs.photos)", "kind === 'post' && Array.isArray(Inputs.photos)", SENT_TOLD],
    ['an event with no words sent', 'NEW_POST_GATHER', '"event":"Say what the event is."', '"other":""', SENT_EVENT],
    ['an event with no day sent', 'NEW_POST_GATHER', "if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day)) { held('Choose the event’s day.'); return; }", '', SENT_EVENT],
    ['an event with no time sent', 'NEW_POST_GATHER', "if (!/^[0-9]{2}:[0-9]{2}$/.test(time)) { held('Choose the time it starts.'); return; }", '', SENT_EVENT],
    ['a passed event sent', 'NEW_POST_GATHER', "if (at.getTime() < Date.now()) { held('That time has passed. Choose when the event is.'); return; }", '', SENT_EVENT],
    ['the month a month late', 'NEW_POST_GATHER', 'Number(day.slice(5, 7)) - 1', 'Number(day.slice(5, 7))', SENT_EVENT],
    ['the minutes dropped', 'NEW_POST_GATHER', 'Number(time.slice(0, 2)), Number(time.slice(3, 5))', 'Number(time.slice(0, 2)), 0', SENT_EVENT],
    ['a post sent with a day', 'NEW_POST_GATHER', "if (kind === 'event') {", "if (kind === 'event' || Inputs.day) {", SENT_POST],
    ['an event lands on Prayer', 'NEW_POST_WHERE', "if (Inputs.kind === 'prayer')", "if (Inputs.kind === 'prayer' || Inputs.kind === 'event')", WHERE]
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
