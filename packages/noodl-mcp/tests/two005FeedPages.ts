/**
 * TWO-005 slice 2 — the community app's feed, held to the approved picture (`look/gram.html`: "The feed" and
 * "Posting"): newest first, each post its member's initials and name, its photos, a heart and its count, the caption,
 * and "View all N comments"; a new post with photos, a caption, the rule about children's photos, and "Share with the
 * members"; one post with its comments under it.
 *
 * - **Every photo is private to the members.** The posting page uploads it with Readers `role:member, role:admin`
 *   (P121-TWO001-MEMBERSPHOTO), and `sharePost` refuses any photo that isn't. An `<img>` carries no session, so each
 *   photo is shown through a signed link (`Noodl.Files.sign`, one script for the page, the links kept on the page
 *   until a minute before they run out, so a reload keeps the same address and the browser doesn't fetch it again).
 * - **Counts move without a reload** (AC2): the feed listens for changes to hearts, comments and posts (Subscribe To
 *   Changes) and reads again; a heart or comment made on this phone says so to the page as well.
 *
 * @module noodl-mcp/tests/two005FeedPages
 */
import { FN_COMMENT_ON, FN_HEART_POST, FN_SHARE_POST, MOST_CAPTION, MOST_COMMENT, MOST_EVENT_AHEAD_DAYS, MOST_POST_PHOTOS, PHOTO_READERS, SHARED_KINDS, WORDS_NEEDED } from './two005Feed';
import { DATE_PICKER_DESCRIPTION, datePickerGraph } from './datePicker';
import { FN_HIDE } from './two005Moderate';
import { FN_PRAY_FOR } from './two005Prayer';
import { GM_FINE, GM_LINE, GM_LINE_SMALL, GM_LINK, GM_MAIN, GM_REFUSED, GM_TITLE, GRAM_PAGES, GRAM_READ, gramShell } from './two005Pages';
import { button, call, column, DROPDOWN, fn, go, group, input, Node, PageComponent, pct, px, rowOf, text, Wire, wire } from './two003Pages';

export const FEED_PAGES = {
  feed: GRAM_PAGES.feed,
  newPost: '/Pages/NewPost',
  post: '/Pages/Post'
};

/** A member's profile (slice 3, `two005ProfilePages.ts`): a name on a card or a comment opens it. */
export const MEMBER_PAGE = '/Pages/Member';
/** The prayer requests (slice 4, `two005PrayerPages.ts`): where a new prayer request goes once it's shared. */
export const PRAYER_PAGE = '/Pages/Prayer';
/** Reporting a post or a comment (slice 5, `two005ModeratePages.ts`), at `report?post=…` or `?comment=…`. */
export const REPORT_PAGE = '/Pages/Report';
/** One post or comment as an admin sees it, its reports, Hide and Bring it back (slice 5), at `admin/look?post=…`. */
export const LOOK_PAGE = '/Pages/Admin/Look';

export const FEED_COMPONENTS = {
  card: '/Feed/PostCard',
  photo: '/Feed/Photo',
  comment: '/Feed/CommentRow',
  newPhoto: '/Feed/NewPhoto',
  datePicker: '/UI/DatePicker'
};

/** The longest side a photo is sent at: a phone's photo is shrunk before it goes (P121-TWO008-UPLOADSHRINK). */
export const POST_PHOTO_SIDE = 1600;
/** What each kind but a post is called on its pill, and on New post's chips (slice 4b). */
export const KIND_NAMES: Record<string, string> = { prayer: 'Prayer request', testimony: 'Testimony', event: 'Event' };
/** The times an event can start, every half hour from six in the morning to ten at night: "9:00" shown, "09:00" sent. */
export const EVENT_TIMES = Array.from({ length: 33 }, (_, i) => {
  const h = 6 + Math.floor(i / 2);
  const m = i % 2 ? '30' : '00';
  return { Label: `${h}:${m}`, Value: `${String(h).padStart(2, '0')}:${m}` };
});
/** How many posts the feed shows: the newest. */
export const FEED_SHOWS = 30;

const FIELD = {
  useLabel: true,
  sizeMode: 'contentHeight',
  width: pct(100),
  backgroundColor: 'var(--surface)',
  borderStyle: 'solid',
  borderWidth: 'var(--border-1)',
  borderColor: 'var(--border-control)',
  borderRadius: 'var(--radius-md)',
  paddingLeft: 'var(--space-3)',
  paddingRight: 'var(--space-3)',
  paddingTop: 'var(--space-2-5)',
  paddingBottom: 'var(--space-2-5)',
  fontSize: 'var(--text-base)',
  color: 'var(--foreground)',
  labelfontSize: 'var(--text-sm)',
  labelfontWeight: 'var(--font-semibold)',
  labelcolor: 'var(--foreground)'
};
const field = (id: string, parent: string, label: string, extra: Record<string, unknown> = {}): Node => ({ ...input(id, parent, label, extra), parameters: { ...FIELD, label, ...extra } });
/** The small filled button: the outline's size and shape, plum, no border at all. */
const { borderWidth: _bw, borderColor: _bc, ...SMALL_SHAPE } = GM_LINE_SMALL;
const SMALL_MAIN = { ...SMALL_SHAPE, backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', borderStyle: 'none' };
const META = { fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' };
/** A word button with no box: the heart, Comment. */
const ACTION = { ...GM_LINK, fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)' };

/** Slice 5: Report, Take down, Hide…: small muted words, under a post and under each comment. */
const MOD_ACTION = { ...ACTION, fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--muted-foreground)', paddingTop: 'var(--space-0-5)', paddingBottom: 'var(--space-0-5)', mounted: false };

/** A choice between kinds: a pill, plum when chosen (its colours wired). */
const CHIP = { ...GM_LINE_SMALL, fontSize: 'var(--text-sm)', borderRadius: px(999), paddingLeft: 'var(--space-3-5)', paddingRight: 'var(--space-3-5)' };

/** A member's name that opens their profile: the name's own look, as a button a keyboard reaches. */
export const NAME_LINK = { ...GM_LINK, color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', paddingTop: 'var(--space-0)', paddingBottom: 'var(--space-0)', cssClassName: 'gm-wrap' };

/**
 * A member's round face: their profile photo when there is one, else their initials on their shade. The group is
 * `${p}Av`, wired from `${inputs}`' `face`, `hasFace`, `noFace`, `initials` and `shade`.
 */
export function faceNodes(p: string, parent: string, size: number, initialsSize = 'var(--text-xs)'): Node[] {
  return [
    group(`${p}Av`, 'Their face', parent, { width: px(size), height: px(size), sizeMode: 'explicit', cssClassName: 'gm-av' }),
    { id: `${p}Face`, type: 'Image', label: 'Their photo', parent: `${p}Av`, parameters: { width: px(size), height: px(size), sizeMode: 'explicit', objectFit: 'cover', borderRadius: pct(50), mounted: false } },
    text(`${p}Initials`, 'Their initials, with no photo', `${p}Av`, '', { fontSize: initialsSize, fontWeight: 'var(--font-extrabold)', color: 'var(--primary-foreground)', sizeMode: 'contentSize' })
  ];
}
export const faceWires = (p: string, from: string, prefix = ''): Wire[] => [
  wire(from, `${prefix}face`, `${p}Face`, 'src'),
  wire(from, `${prefix}hasFace`, `${p}Face`, 'mounted'),
  wire(from, `${prefix}noFace`, `${p}Initials`, 'mounted'),
  wire(from, `${prefix}initials`, `${p}Initials`, 'text'),
  wire(from, `${prefix}shade`, `${p}Av`, 'backgroundColor')
];

/** What a page shows when its read was refused: the reason, and the way to sign in. */
function refused(p: string): Node[] {
  return [
    group(`${p}Refused`, 'Refused: why, and sign in', `${p}Body`, column({ rowGap: 'var(--space-3)', mounted: false })),
    text(`${p}RefusedWhy`, 'Why', `${p}Refused`, '', GM_REFUSED),
    button(`${p}RefusedSignIn`, 'Sign in', `${p}Refused`, 'Sign in', GM_LINE),
    go(`${p}ToSignIn`, 'To sign in', GRAM_PAGES.signIn)
  ];
}
const refusedWires = (p: string, loader: string): Wire[] => [
  wire(loader, 'out-problem', `${p}RefusedWhy`, 'text'),
  wire(loader, 'out-refused', `${p}Refused`, 'mounted'),
  wire(`${p}RefusedSignIn`, 'onClick', `${p}ToSignIn`, 'navigate')
];
/** The sections (slice 4), shown to a member who's been let in, with Profile on their own. */
export const navWires = (p: string, loader: string): Wire[] => [wire(loader, 'out-meId', `${p}Nav`, 'meId'), wire(loader, 'out-inside', `${p}Nav`, 'show')];

// ── the scripts' shared prelude ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Slice 1's read prelude, and what both the feed and a post's page need: the posts a member may see (not hidden, not
 * by a blocked member, newest first), a card for each, and the signed links for their photos.
 */
export const FEED_READ = `${GRAM_READ}
function ptr(c, id) { return { __type: 'Pointer', className: c, objectId: String(id) }; }
function shown(posts, members) {
  var by = {};
  members.forEach(function (m) { by[m.objectId] = m; });
  return posts
    .filter(function (p) { var m = by[idOf(p.member)]; return !p.endedAt && m && !m.endedAt; })
    .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
}
function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
/** Slice 4b: what each kind but a post is called on its pill. */
var KIND_NAMES = ${JSON.stringify(KIND_NAMES)};
/**
 * When an event is, in the reader's own time: "Saturday 18 October, 9:00", the year only when it isn't this one, and
 * "was" once it has passed.
 */
function eventWhen(at) {
  var t = at ? new Date(at.iso || at) : null;
  if (!t || !isFinite(t.getTime())) return '';
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var year = t.getFullYear() === new Date().getFullYear() ? '' : ' ' + t.getFullYear();
  var said = days[t.getDay()] + ' ' + t.getDate() + ' ' + months[t.getMonth()] + year + ', ' + t.getHours() + ':' + String(t.getMinutes()).padStart(2, '0');
  return (t.getTime() < Date.now() ? 'was ' : '') + said;
}
function firstName(m) { return String((m && m.name) || '').trim().split(' ')[0]; }
/** A link for each photo, kept on the page until a minute before it runs out: a reload asks again for none of them. */
async function linked(photos) {
  var keep = Component.Object;
  var links = keep.get('links') || {};
  var soon = Date.now() + 60000;
  var urls = await Promise.all((photos || []).map(async function (f) {
    var name = f && f.name ? String(f.name) : '';
    if (!name) return '';
    if (links[name] && links[name].until > soon) return links[name].url;
    try {
      var l = await Noodl.Files.sign(f);
      links[name] = { url: l.url, until: l.expiresAt ? Date.parse(l.expiresAt) : soon + 3600000 };
      return l.url;
    } catch (e) { return ''; }
  }));
  keep.set('links', links);
  return urls;
}
/**
 * The cards: who, when, the photos, the hearts by person (mine among them), the comments not hidden. A prayer request
 * (slice 4) has no hearts: its words, "I prayed" with the count kept on it, and who prayed for the person who asked
 * only (W4: the prayed rows are the ones the reader may read, their own and those on their own requests). Slice 4b: a
 * testimony leads with its words, as a prayer request does, and has hearts; an event says when it is where a post says
 * when it was shared. Every kind but a post wears its pill. A card with no photo leads with its words too (the shots:
 * an event's words sat under "No hearts yet").
 */
async function cardsOf(posts, members, hearts, comments, mine, onItsPage, prayed) {
  var by = {}, byLogin = {};
  members.forEach(function (m) { by[m.objectId] = m; byLogin[idOf(m.login)] = m; });
  var cards = [];
  for (var i = 0; i < posts.length; i++) {
    var p = posts[i];
    var m = by[idOf(p.member)] || {};
    var isPrayer = p.kind === 'prayer';
    var kindName = KIND_NAMES[p.kind] || '';
    // Words lead a prayer request, a testimony, and any card with no photo (else the heart comes before what it's on).
    var wordsFirst = isPrayer || p.kind === 'testimony' || (p.photos || []).length === 0;
    var asked = !!mine && idOf(m.login) === mine;
    var prayers = [];
    (prayed || []).forEach(function (r) { var u = idOf(r.doneBy); if (idOf(r.post) === p.objectId && prayers.indexOf(u) < 0) prayers.push(u); });
    var iPrayed = prayers.indexOf(mine) >= 0;
    var count = Math.max(0, Number(p.prayedCount) || 0);
    var people = [];
    hearts.forEach(function (h) { var u = idOf(h.doneBy); if (idOf(h.post) === p.objectId && people.indexOf(u) < 0) people.push(u); });
    var said = comments.filter(function (c) { return idOf(c.post) === p.objectId && !c.endedAt; }).length;
    var hearted = people.indexOf(mine) >= 0;
    var names = people.slice(0, 2).map(function (u) { return u === mine ? 'you' : firstName(byLogin[u]); }).filter(Boolean);
    var urls = (await linked(p.photos)).filter(Boolean);
    var face = await faceOf(m);
    cards.push({
      id: p.objectId,
      memberId: m.objectId || '',
      name: m.name || '',
      face: face,
      hasFace: !!face,
      noFace: !face,
      initials: initials(m.name),
      shade: shade(m.objectId || p.objectId),
      when: p.kind === 'event' ? 'Event · ' + (eventWhen(p.eventOn) || 'its day isn’t known') : p.kind === 'testimony' ? 'Testimony · ' + ago(p.createdAt) : ago(p.createdAt),
      caption: p.caption || '',
      hasCaption: !!p.caption && !wordsFirst,
      isPrayer: isPrayer,
      notPrayer: !isPrayer,
      kindName: kindName,
      hasKind: !!kindName,
      wordsFirst: wordsFirst,
      kindClass: isPrayer ? 'gm-prayer' : '',
      ask: wordsFirst ? p.caption || '' : '',
      prayed: iPrayed,
      prayLabel: (iPrayed ? '🙏 You prayed' : '🙏 I prayed') + (count > 0 ? ' · ' + count : ''),
      prayInk: iPrayed ? 'var(--primary-foreground)' : 'var(--primary)',
      prayFill: iPrayed ? 'var(--primary)' : 'var(--surface)',
      whoPrayed: !isPrayer ? '' : asked ? whoPrayed(prayers, byLogin, mine, onItsPage) : 'Only ' + (firstName(m) || 'the person who asked') + ' sees who prayed.',
      photos: urls.map(function (u, n) { return { id: u, src: u, alt: 'Photo ' + (n + 1) + ' of ' + urls.length + ', shared by ' + (m.name || 'a member') }; }),
      hasPhotos: urls.length > 0,
      lostPhotos: (p.photos || []).length > urls.length,
      hearted: hearted,
      heartLabel: hearted ? '♥ Hearted' : '♡ Heart',
      heartColor: hearted ? 'var(--heart)' : 'var(--foreground)',
      hearts: people.length === 0 ? 'No hearts yet' : plural(people.length, 'heart', 'hearts') + ' · ' + (people.length > 2 ? names.join(', ') + ' and ' + plural(people.length - 2, 'other', 'others') : names.join(' and ')),
      comments: said === 0 ? '' : said === 1 ? 'View 1 comment' : 'View all ' + said + ' comments',
      toComments: !onItsPage,
      listComments: !onItsPage && said > 0
    });
  }
  return cards;
}
/** "a, b and c". */
function listed(names) { return names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]; }
/** Who prayed, for the person who asked: everyone on the request's own page, the first two and how many more on a card. */
function whoPrayed(prayers, byLogin, mine, everyone) {
  if (prayers.length === 0) return 'Nobody has prayed yet. Only you will see who does.';
  var names = prayers.map(function (u) { return u === mine ? 'you' : (byLogin[u] && byLogin[u].name) || 'a member'; });
  var shown = everyone || names.length <= 3 ? names : names.slice(0, 2).concat([plural(names.length - 2, 'other', 'others')]);
  return 'Prayed: ' + listed(shown) + '. Only you see who.';
}
/** A member's profile photo by its signed link, or '' (no photo, or the backend won't sign it): then their initials. */
async function faceOf(m) {
  return m && m.photo && m.photo.name ? (await linked([m.photo]))[0] || '' : '';
}
function refused(e) { Outputs.problem = why(e); Outputs.refused = true; Outputs.ok = false; }
`;

// ── /Pages/Feed ────────────────────────────────────────────────────────────────────────────────────────────────────

export const FEED_LOAD = `${FEED_READ}
// Read so that a heart, a comment or a post made anywhere runs the feed again.
var version = Inputs.changed;
var who = await me();
if (!who) { refused({ error: 'Sign in to see the feed.' }); return; }
if (who.status !== 'approved') { Outputs.waiting(); return; }
try {
  var members = await all('Member');
  var posts = shown(await all('Post'), members).slice(0, ${FEED_SHOWS});
  var on = posts.map(function (p) { return ptr('Post', p.objectId); });
  var hearts = on.length ? await all('Heart', { post: { containedIn: on } }) : [];
  var comments = on.length ? await all('Comment', { post: { containedIn: on } }) : [];
  var prayed = on.length ? await all('Prayed', { post: { containedIn: on } }) : [];
} catch (e) { refused(e); return; }
var mine = Noodl.Users.Current ? String(Noodl.Users.Current.id || '') : '';
Outputs.cards = await cardsOf(posts, members, hearts, comments, mine, false, prayed);
Outputs.empty = posts.length === 0;
Outputs.isAdmin = who.role === 'admin';
Outputs.band = who.role === 'admin' ? 'Admin' : '';
Outputs.meId = who.id;
Outputs.inside = true;
Outputs.refused = false;
Outputs.ok = true;`;

/** One Subscribe To Changes per collection whose rows move a card. */
const listen = (p: string, collection: string): Node => ({ id: `${p}Live${collection}`, type: 'SubscribeToChanges', label: `${collection}s, as they change`, parameters: { collectionName: collection } });

const FEED: PageComponent = {
  path: FEED_PAGES.feed,
  description: 'The feed: the newest posts, their photos, hearts and comments',
  nodes: [
    ...gramShell('fd', 'The feed', 'feed', null, 560, 'feed'),
    group('fdContent', 'The feed', 'fdBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    group('fdTop', 'Heading and New post', 'fdContent', rowOf({ columnGap: 'var(--space-2)' })),
    text('fdTitle', 'Heading', 'fdTop', 'The feed', { ...GM_TITLE, cssClassName: 'gm-read gm-wrap gm-grow' }),
    button('fdNew', 'New post', 'fdTop', '＋ New post', SMALL_MAIN),
    button('fdQueue', 'Waiting for you', 'fdContent', 'Waiting for you', { ...GM_LINE_SMALL, mounted: false }),
    text('fdEmpty', 'Nothing posted yet', 'fdContent', 'Nothing posted yet. Share a photo from today, or a few words.', { ...GM_FINE, mounted: false }),
    group('fdList', 'The posts', 'fdContent', column({ rowGap: 'var(--space-5)' })),
    { id: 'fdEach', type: 'For Each', label: 'One card per post', parent: 'fdList', parameters: { template: FEED_COMPONENTS.card } },
    text('fdPrivate', 'Nothing here is public', 'fdContent', 'Only members who’ve been let in see posts. Nothing here is public.', GM_FINE),
    ...refused('fd'),
    fn('fdLoad', 'The newest posts, as cards', FEED_LOAD, ['waiting']),
    { id: 'fdChanged', type: 'Variable2', label: 'The feed changed', parameters: { name: 'feedChanged' } },
    listen('fd', 'Heart'),
    listen('fd', 'Comment'),
    listen('fd', 'Post'),
    go('fdToNew', 'To a new post', FEED_PAGES.newPost),
    go('fdToWaiting', 'Not let in yet: to waiting', GRAM_PAGES.waiting),
    go('fdToQueue', 'To the admins’ queue', GRAM_PAGES.queue)
  ],
  connections: [
    wire('fdRoot', 'didMount', 'fdLoad', 'run'),
    wire('fdChanged', 'value', 'fdLoad', 'in-changed'),
    ...['Heart', 'Comment', 'Post'].map((c) => wire(`fdLive${c}`, 'changed', 'fdLoad', 'run')),
    wire('fdLoad', 'out-ok', 'fdContent', 'mounted'),
    wire('fdLoad', 'out-cards', 'fdEach', 'items'),
    wire('fdLoad', 'out-empty', 'fdEmpty', 'mounted'),
    wire('fdLoad', 'out-band', 'fdBar', 'band'),
    wire('fdLoad', 'out-isAdmin', 'fdQueue', 'mounted'),
    wire('fdLoad', 'out-waiting', 'fdToWaiting', 'navigate'),
    ...refusedWires('fd', 'fdLoad'),
    wire('fdNew', 'onClick', 'fdToNew', 'navigate'),
    ...navWires('fd', 'fdLoad'),
    wire('fdQueue', 'onClick', 'fdToQueue', 'navigate')
  ]
};

// ── /Feed/PostCard ─────────────────────────────────────────────────────────────────────────────────────────────────

export const HEART_GATHER = `Outputs.heart = { postId: Inputs.id, on: Inputs.hearted !== true };
Outputs.go();`;
/** "I prayed" on, or taken back (slice 4): says which, as a heart does. */
export const PRAY_GATHER = `Outputs.prayer = { postId: Inputs.id, on: Inputs.prayed !== true };
Outputs.go();`;
/** Say the feed changed, so the page reads again (whichever card changed it). */
export const FEED_STAMP = `Outputs.at = String(Date.now());
Outputs.go();`;

const POST_CARD: PageComponent = {
  path: FEED_COMPONENTS.card,
  description: 'One post: who and when, the photos, the heart, the caption, the comments; a prayer request: its words and I prayed; a testimony its words first; an event when it is',
  nodes: [
    group('pcRoot', 'A post', undefined, column({ rowGap: 'var(--space-2-5)', paddingBottom: 'var(--space-4)', borderStyle: 'solid', borderColor: 'var(--border)', borderBottomWidth: px(1), borderTopWidth: px(0), borderLeftWidth: px(0), borderRightWidth: px(0) })),
    group('pcHead', 'Who, and when', 'pcRoot', rowOf({ columnGap: 'var(--space-2-5)' })),
    ...faceNodes('pc', 'pcHead', 34),
    group('pcWho', 'Name and when', 'pcHead', column({ cssClassName: 'gm-grow', alignItems: 'flex-start' })),
    button('pcName', 'Name: their profile', 'pcWho', '', NAME_LINK),
    text('pcWhen', 'When', 'pcWho', '', META),
    text('pcKind', 'Its kind: Prayer request, Testimony, Event', 'pcHead', '', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-extrabold)', color: 'var(--accent-foreground)', sizeMode: 'contentSize', cssClassName: 'gm-kind', mounted: false }),
    text('pcAsk', 'Its words first: what to pray for, a testimony', 'pcRoot', '', { fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 'var(--leading-relaxed)', cssClassName: 'gm-wrap', mounted: false }),
    group('pcGallery', 'The photos, swiped one at a time', 'pcRoot', column({ cssClassName: 'gm-gallery', mounted: false })),
    { id: 'pcEachPhoto', type: 'For Each', label: 'One per photo', parent: 'pcGallery', parameters: { template: FEED_COMPONENTS.photo } },
    text('pcLost', 'A photo that couldn’t be shown', 'pcRoot', 'A photo in this post couldn’t be loaded.', { ...META, mounted: false }),
    group('pcActions', 'Heart (or I prayed) and comment', 'pcRoot', rowOf({ columnGap: 'var(--space-4)' })),
    button('pcHeart', 'Heart', 'pcActions', '♡ Heart', ACTION),
    button('pcPray', 'I prayed', 'pcActions', '🙏 I prayed', { ...GM_LINE_SMALL, fontSize: 'var(--text-sm)', borderRadius: px(999), paddingLeft: 'var(--space-3-5)', paddingRight: 'var(--space-3-5)', mounted: false }),
    button('pcComment', 'Comment', 'pcActions', 'Comment', { ...ACTION, mounted: false }),
    text('pcHearts', 'How many hearts, and whose', 'pcRoot', '', { fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--foreground)', cssClassName: 'gm-wrap' }),
    text('pcCaption', 'The caption', 'pcRoot', '', { fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 'var(--leading-relaxed)', cssClassName: 'gm-wrap', mounted: false }),
    text('pcWhoPrayed', 'Who prayed (the asker’s alone)', 'pcRoot', '', { ...META, cssClassName: 'gm-wrap', mounted: false }),
    button('pcComments', 'The comments', 'pcRoot', '', { ...ACTION, color: 'var(--muted-foreground)', fontWeight: 'var(--font-semibold)', mounted: false }),
    text('pcError', 'What went wrong', 'pcRoot', '', { ...GM_REFUSED, mounted: false }),
    {
      id: 'pcIn',
      type: 'Component Inputs',
      label: 'One post',
      ports: [
        { name: 'id', type: 'string', plug: 'output' },
        { name: 'memberId', type: 'string', plug: 'output' },
        { name: 'name', type: 'string', plug: 'output' },
        { name: 'initials', type: 'string', plug: 'output' },
        { name: 'shade', type: 'string', plug: 'output' },
        { name: 'face', type: 'string', plug: 'output' },
        { name: 'hasFace', type: 'boolean', plug: 'output' },
        { name: 'noFace', type: 'boolean', plug: 'output' },
        { name: 'when', type: 'string', plug: 'output' },
        { name: 'caption', type: 'string', plug: 'output' },
        { name: 'hasCaption', type: 'boolean', plug: 'output' },
        { name: 'photos', type: 'array', plug: 'output' },
        { name: 'hasPhotos', type: 'boolean', plug: 'output' },
        { name: 'lostPhotos', type: 'boolean', plug: 'output' },
        { name: 'hearted', type: 'boolean', plug: 'output' },
        { name: 'heartLabel', type: 'string', plug: 'output' },
        { name: 'heartColor', type: 'string', plug: 'output' },
        { name: 'hearts', type: 'string', plug: 'output' },
        { name: 'comments', type: 'string', plug: 'output' },
        { name: 'toComments', type: 'boolean', plug: 'output' },
        { name: 'listComments', type: 'boolean', plug: 'output' },
        { name: 'isPrayer', type: 'boolean', plug: 'output' },
        { name: 'notPrayer', type: 'boolean', plug: 'output' },
        { name: 'kindClass', type: 'string', plug: 'output' },
        { name: 'kindName', type: 'string', plug: 'output' },
        { name: 'hasKind', type: 'boolean', plug: 'output' },
        { name: 'wordsFirst', type: 'boolean', plug: 'output' },
        { name: 'ask', type: 'string', plug: 'output' },
        { name: 'prayed', type: 'boolean', plug: 'output' },
        { name: 'prayLabel', type: 'string', plug: 'output' },
        { name: 'prayInk', type: 'string', plug: 'output' },
        { name: 'prayFill', type: 'string', plug: 'output' },
        { name: 'whoPrayed', type: 'string', plug: 'output' }
      ]
    },
    fn('pcHeartGather', 'The heart on, or off again', HEART_GATHER, ['go'], ['id', 'hearted']),
    call('pcHeartCall', 'heartPost(heart)', FN_HEART_POST),
    fn('pcPrayGather', 'I prayed, or taken back', PRAY_GATHER, ['go'], ['id', 'prayed']),
    call('pcPrayCall', 'prayFor(prayer)', FN_PRAY_FOR),
    { id: 'pcFailed', type: 'Switch', label: 'The last heart was refused' },
    fn('pcStamp', 'Say the feed changed', FEED_STAMP, ['go']),
    { id: 'pcChanged', type: 'Set Variable', label: 'The feed changed', parameters: { name: 'feedChanged', setWith: 'string' } },
    go('pcToPost', 'To the post and its comments', FEED_PAGES.post),
    go('pcToMember', 'To their profile', MEMBER_PAGE)
  ],
  connections: [
    wire('pcIn', 'name', 'pcName', 'label'),
    ...faceWires('pc', 'pcIn'),
    wire('pcIn', 'memberId', 'pcToMember', 'pm-memberId'),
    wire('pcName', 'onClick', 'pcToMember', 'navigate'),
    wire('pcIn', 'when', 'pcWhen', 'text'),
    wire('pcIn', 'photos', 'pcEachPhoto', 'items'),
    wire('pcIn', 'hasPhotos', 'pcGallery', 'mounted'),
    wire('pcIn', 'lostPhotos', 'pcLost', 'mounted'),
    wire('pcIn', 'kindClass', 'pcRoot', 'cssClassName'),
    wire('pcIn', 'kindName', 'pcKind', 'text'),
    wire('pcIn', 'hasKind', 'pcKind', 'mounted'),
    wire('pcIn', 'ask', 'pcAsk', 'text'),
    wire('pcIn', 'wordsFirst', 'pcAsk', 'mounted'),
    wire('pcIn', 'notPrayer', 'pcHeart', 'mounted'),
    wire('pcIn', 'notPrayer', 'pcHearts', 'mounted'),
    wire('pcIn', 'isPrayer', 'pcPray', 'mounted'),
    wire('pcIn', 'prayLabel', 'pcPray', 'label'),
    wire('pcIn', 'prayInk', 'pcPray', 'color'),
    wire('pcIn', 'prayFill', 'pcPray', 'backgroundColor'),
    wire('pcIn', 'whoPrayed', 'pcWhoPrayed', 'text'),
    wire('pcIn', 'isPrayer', 'pcWhoPrayed', 'mounted'),
    wire('pcIn', 'id', 'pcPrayGather', 'in-id'),
    wire('pcIn', 'prayed', 'pcPrayGather', 'in-prayed'),
    wire('pcPray', 'onClick', 'pcPrayGather', 'run'),
    wire('pcPrayGather', 'out-prayer', 'pcPrayCall', 'in-prayer'),
    wire('pcPrayGather', 'out-go', 'pcPrayCall', 'call'),
    wire('pcPrayCall', 'error', 'pcError', 'text'),
    wire('pcPrayCall', 'failure', 'pcFailed', 'on'),
    wire('pcPrayCall', 'done', 'pcFailed', 'off'),
    wire('pcPrayCall', 'done', 'pcStamp', 'run'),
    wire('pcIn', 'heartLabel', 'pcHeart', 'label'),
    wire('pcIn', 'heartColor', 'pcHeart', 'color'),
    wire('pcIn', 'hearts', 'pcHearts', 'text'),
    wire('pcIn', 'caption', 'pcCaption', 'text'),
    wire('pcIn', 'hasCaption', 'pcCaption', 'mounted'),
    wire('pcIn', 'comments', 'pcComments', 'label'),
    wire('pcIn', 'listComments', 'pcComments', 'mounted'),
    wire('pcIn', 'toComments', 'pcComment', 'mounted'),
    wire('pcIn', 'id', 'pcHeartGather', 'in-id'),
    wire('pcIn', 'hearted', 'pcHeartGather', 'in-hearted'),
    wire('pcHeart', 'onClick', 'pcHeartGather', 'run'),
    wire('pcHeartGather', 'out-heart', 'pcHeartCall', 'in-heart'),
    wire('pcHeartGather', 'out-go', 'pcHeartCall', 'call'),
    wire('pcHeartCall', 'error', 'pcError', 'text'),
    wire('pcHeartCall', 'failure', 'pcFailed', 'on'),
    wire('pcHeartCall', 'done', 'pcFailed', 'off'),
    wire('pcFailed', 'state', 'pcError', 'mounted'),
    wire('pcHeartCall', 'done', 'pcStamp', 'run'),
    wire('pcStamp', 'out-at', 'pcChanged', 'value'),
    wire('pcStamp', 'out-go', 'pcChanged', 'do'),
    wire('pcIn', 'id', 'pcToPost', 'pm-postId'),
    wire('pcComments', 'onClick', 'pcToPost', 'navigate'),
    wire('pcComment', 'onClick', 'pcToPost', 'navigate')
  ]
};

// ── /Feed/Photo ────────────────────────────────────────────────────────────────────────────────────────────────────

const PHOTO: PageComponent = {
  path: FEED_COMPONENTS.photo,
  description: 'One photo in a post, square, the width of the card',
  nodes: [
    { id: 'phImage', type: 'Image', label: 'The photo', parameters: { width: pct(100), height: px(320), sizeMode: 'explicit', objectFit: 'cover', borderRadius: 'var(--radius-lg)', cssClassName: 'gm-photo' } },
    { id: 'phIn', type: 'Component Inputs', label: 'One photo', ports: [{ name: 'src', type: 'string', plug: 'output' }, { name: 'alt', type: 'string', plug: 'output' }] }
  ],
  connections: [wire('phIn', 'src', 'phImage', 'src'), wire('phIn', 'alt', 'phImage', 'alt')]
};

// ── /Pages/NewPost ─────────────────────────────────────────────────────────────────────────────────────────────────

export const NEW_POST_LOAD = `${GRAM_READ}
var who = await me();
if (!who) { Outputs.problem = 'Sign in to post.'; Outputs.refused = true; Outputs.ok = false; return; }
if (who.status !== 'approved') { Outputs.waiting(); return; }
Outputs.band = who.role === 'admin' ? 'Admin' : '';
Outputs.refused = false;
Outputs.ok = true;`;

/**
 * The photos added while the page is open: an upload joins the list (with a link to show it), a tile's Remove takes
 * it off. At most four, as `sharePost` takes.
 */
export const NEW_POST_PHOTOS = `var keep = Component.Object;
var photos = keep.get('photos') || [];
var up = Inputs.added;
if (up && up !== keep.get('addedFrom')) {
  keep.set('addedFrom', up);
  if (typeof up.getName === 'function' && up.getName()) {
    var shown = '';
    try { shown = (await Noodl.Files.sign(up)).url; } catch (e) { shown = ''; }
    photos = photos.concat([{ name: up.getName(), url: up.getUrl(), shown: shown }]).slice(0, ${MOST_POST_PHOTOS});
  }
}
if (Inputs.removed && Inputs.removed !== keep.get('removedFrom')) {
  keep.set('removedFrom', Inputs.removed);
  var gone = String(Inputs.removed).split('|')[0];
  photos = photos.filter(function (f) { return f.name !== gone; });
}
keep.set('photos', photos);
Outputs.photos = photos.map(function (f) { return { name: f.name, url: f.url }; });
Outputs.tiles = photos.map(function (f, n) { return { id: f.name, name: f.name, src: f.shown, alt: 'Photo ' + (n + 1) + ' you added' }; });
Outputs.room = photos.length < ${MOST_POST_PHOTOS};
Outputs.many = photos.length > 0;`;

export const NEW_POST_GATHER = `var caption = typeof Inputs.caption === 'string' ? Inputs.caption : '';
var kind = ${JSON.stringify(SHARED_KINDS)}.indexOf(Inputs.kind) >= 0 ? Inputs.kind : 'post';
var wordsNeeded = ${JSON.stringify(WORDS_NEEDED)};
function held(why) { Outputs.problem = why; Outputs.held(); }
if (caption.trim().length > ${MOST_CAPTION}) { held('A caption of ${MOST_CAPTION.toLocaleString('en-GB')} characters or fewer. This one has ' + caption.trim().length.toLocaleString('en-GB') + '.'); return; }
if (wordsNeeded[kind] && !caption.trim()) { held(wordsNeeded[kind]); return; }
// A prayer request is words only: photos added before switching to it stay on the page and aren't sent.
var post = { caption: caption, photos: kind !== 'prayer' && Array.isArray(Inputs.photos) ? Inputs.photos : [], kind: kind };
if (kind === 'event') {
  // The day from the Date picker (YYYY-MM-DD) and the time from the list (HH:MM), read as this phone's own time.
  var day = typeof Inputs.day === 'string' ? Inputs.day : '';
  var time = typeof Inputs.time === 'string' ? Inputs.time : '';
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day)) { held('Choose the event’s day.'); return; }
  if (!/^[0-9]{2}:[0-9]{2}$/.test(time)) { held('Choose the time it starts.'); return; }
  var at = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), Number(time.slice(0, 2)), Number(time.slice(3, 5)));
  if (at.getTime() < Date.now()) { held('That time has passed. Choose when the event is.'); return; }
  post.eventOn = at.toISOString();
}
Outputs.problem = '';
Outputs.post = post;
Outputs.go();`;

/** What New post says for each kind: its heading, the words' label and hint, the button, and the way back. */
export const NEW_POST_SAYS: Record<string, { title: string; field: string; hint: string; share: string; back: string }> = {
  post: { title: 'New post', field: 'Caption', hint: 'What’s happening?', share: 'Share with the members', back: '← The feed' },
  prayer: { title: 'New prayer request', field: 'What would you like the members to pray for?', hint: 'Who or what, in your own words.', share: 'Ask the members to pray', back: '← Prayer' },
  testimony: { title: 'New testimony', field: 'Your testimony', hint: 'What happened, in your own words.', share: 'Share your testimony', back: '← The feed' },
  event: { title: 'New event', field: 'What is it?', hint: 'What, where, and who it’s for.', share: 'Share the event', back: '← The feed' }
};

/**
 * Slice 4: a post or a prayer request; slice 4b: a testimony or an event too (the picture's four chips). The page opens
 * on the kind its address asks for (`?kind=prayer` from the Prayer page), and the chips switch it; each chip says when
 * it was pressed, so pressing one again after another still arrives. An event's day can be picked from today to a
 * year on (`sharePost` refuses the rest).
 */
export const NEW_POST_KIND = `var KINDS = ${JSON.stringify(SHARED_KINDS)};
var SAYS = ${JSON.stringify(NEW_POST_SAYS)};
var picked = typeof Inputs.picked === 'string' ? Inputs.picked.split('|')[0] : '';
var kind = KINDS.indexOf(picked) >= 0 ? picked : KINDS.indexOf(Inputs.start) >= 0 ? Inputs.start : 'post';
Outputs.kind = kind;
Outputs.isPost = kind === 'post';
Outputs.isPrayer = kind === 'prayer';
Outputs.isEvent = kind === 'event';
Outputs.takesPhotos = kind !== 'prayer';
// The chosen chip plum, the others outlined. Each port by name: the door reads a Function's ports from its code.
function ink(k) { return k === kind ? 'var(--primary-foreground)' : 'var(--primary)'; }
function fill(k) { return k === kind ? 'var(--primary)' : 'var(--surface)'; }
Outputs.postInk = ink('post');
Outputs.postFill = fill('post');
Outputs.prayerInk = ink('prayer');
Outputs.prayerFill = fill('prayer');
Outputs.testimonyInk = ink('testimony');
Outputs.testimonyFill = fill('testimony');
Outputs.eventInk = ink('event');
Outputs.eventFill = fill('event');
Outputs.title = SAYS[kind].title;
Outputs.field = SAYS[kind].field;
Outputs.hint = SAYS[kind].hint;
Outputs.share = SAYS[kind].share;
Outputs.back = SAYS[kind].back;
function dayOf(t) { return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }
var today = new Date();
Outputs.today = dayOf(today);
Outputs.latest = dayOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() + ${MOST_EVENT_AHEAD_DAYS - 1}));`;
export const PICK_POST = `Outputs.picked = 'post|' + Date.now();`;
export const PICK_PRAYER = `Outputs.picked = 'prayer|' + Date.now();`;
export const PICK_TESTIMONY = `Outputs.picked = 'testimony|' + Date.now();`;
export const PICK_EVENT = `Outputs.picked = 'event|' + Date.now();`;
/** Back, and where a share lands: a prayer request on the Prayer page, a post on the feed. */
export const NEW_POST_WHERE = `if (Inputs.kind === 'prayer') Outputs.prayer(); else Outputs.feed();`;

const NEW_POST: PageComponent = {
  path: FEED_PAGES.newPost,
  description: 'A new post: photos, a caption, shared with the members; or a prayer request, in words; or a testimony; or an event, with its day and time',
  nodes: [
    ...gramShell('np', 'New post', 'new-post', null, 560),
    { id: 'npUrl', type: 'PageInputs', label: 'Which kind to start on', parameters: { queryParams: 'kind' } },
    group('npContent', 'New post', 'npBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    button('npBack', 'Back', 'npContent', '← The feed', GM_LINK),
    text('npTitle', 'Heading', 'npContent', 'New post', GM_TITLE),
    // The picture's four kinds; a phone wraps them onto a second line.
    group('npKinds', 'A post, a prayer request, a testimony or an event', 'npContent', rowOf({ columnGap: 'var(--space-2)', rowGap: 'var(--space-2)', flexWrap: 'wrap' })),
    button('npKindPost', 'Post', 'npKinds', 'Post', CHIP),
    button('npKindPrayer', 'Prayer request', 'npKinds', KIND_NAMES.prayer, CHIP),
    button('npKindTestimony', 'Testimony', 'npKinds', KIND_NAMES.testimony, CHIP),
    button('npKindEvent', 'Event', 'npKinds', KIND_NAMES.event, CHIP),
    group('npPhotoBox', 'The photos (every kind’s but a prayer request’s)', 'npContent', column({ rowGap: 'var(--space-4)' })),
    group('npTiles', 'The photos added', 'npPhotoBox', column({ cssClassName: 'gm-tiles', mounted: false })),
    { id: 'npEachTile', type: 'For Each', label: 'One tile per photo', parent: 'npTiles', parameters: { template: FEED_COMPONENTS.newPhoto } },
    button('npAddPhoto', 'Add a photo', 'npPhotoBox', '＋ Add a photo', { ...GM_LINE, sizeMode: 'contentHeight', width: pct(100), borderStyle: 'dashed' }),
    text('npUploading', 'Sending the photo', 'npPhotoBox', 'Making the photo smaller and sending it…', { ...GM_FINE, mounted: false }),
    text('npPhotoError', 'Why the photo didn’t go', 'npPhotoBox', '', GM_REFUSED),
    field('npCaption', 'npContent', 'Caption', { type: 'textArea', placeholder: 'What’s happening?' }),
    // Slice 4b: an event's day (the library's Date picker) and the time it starts (every half hour).
    group('npWhen', 'When the event is', 'npContent', column({ rowGap: 'var(--space-3)', mounted: false })),
    { id: 'npDay', type: FEED_COMPONENTS.datePicker, label: 'The event’s day', parent: 'npWhen', parameters: { Label: 'Day', 'Show Label': true } },
    { id: 'npTime', type: DROPDOWN, label: 'The time it starts', parent: 'npWhen', parameters: { ...FIELD, label: 'Starts at', placeholder: 'Choose a time', value: '', items: EVENT_TIMES } },
    text('npPrayerFine', 'Who sees a prayer request', 'npContent', 'Every member who’s been let in sees your request and how many prayed. Only you see who prayed.', { ...GM_FINE, mounted: false }),
    group('npRule', 'Before you post a photo of children', 'npPhotoBox', column({ rowGap: 'var(--space-1)', paddingLeft: 'var(--space-3-5)', paddingRight: 'var(--space-3-5)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', cssClassName: 'gm-rule' })),
    text('npRuleTitle', 'Heading', 'npRule', 'Before you post a photo of children', { fontSize: 'var(--text-sm)', fontWeight: 'var(--font-extrabold)', color: 'var(--foreground)' }),
    text('npRuleWords', 'The rule', 'npRule', 'No photo of a child without their parent’s yes. Members can report a photo that breaks this, and admins see those reports first.', { ...GM_FINE, color: 'var(--foreground)' }),
    button('npShare', 'Share with the members', 'npContent', 'Share with the members', GM_MAIN),
    text('npError', 'What went wrong', 'npContent', '', GM_REFUSED),
    text('npPrivate', 'Nothing is public', 'npContent', 'Only members who’ve been let in see posts. Nothing is public.', GM_FINE),
    ...refused('np'),
    fn('npLoad', 'Who is posting', NEW_POST_LOAD, ['waiting']),
    { id: 'npPick', type: 'Open File Picker', label: 'Choose a photo', parameters: { acceptedFileTypes: 'image/*' } },
    {
      id: 'npUpload',
      type: 'Upload File',
      label: `Send it, shrunk to ${POST_PHOTO_SIDE} px, for the members only`,
      parameters: { readers: PHOTO_READERS, shrinkTo: POST_PHOTO_SIDE, photoQuality: 80 }
    },
    { id: 'npBusy', type: 'Switch', label: 'Sending a photo' },
    fn('npPhotos', 'The photos, while the page is open', NEW_POST_PHOTOS, []),
    { id: 'npRemoved', type: 'Variable2', label: 'A photo was taken off', parameters: { name: 'postPhotoRemoved' } },
    fn('npKind', 'Which kind, and what the page says for it', NEW_POST_KIND, []),
    fn('npPickPost', 'Post pressed', PICK_POST, []),
    fn('npPickPrayer', 'Prayer request pressed', PICK_PRAYER, []),
    fn('npPickTestimony', 'Testimony pressed', PICK_TESTIMONY, []),
    fn('npPickEvent', 'Event pressed', PICK_EVENT, []),
    fn('npGather', 'The post, as one share', NEW_POST_GATHER, ['go', 'held'], ['caption', 'photos', 'kind', 'day', 'time']),
    call('npCall', 'sharePost(post)', FN_SHARE_POST),
    fn('npStamp', 'Say the feed changed', FEED_STAMP, ['go']),
    { id: 'npChanged', type: 'Set Variable', label: 'The feed changed', parameters: { name: 'feedChanged', setWith: 'string' } },
    fn('npWhere', 'Back to where it came from', NEW_POST_WHERE, ['feed', 'prayer'], ['kind']),
    go('npToFeed', 'To the feed', FEED_PAGES.feed),
    go('npToPrayer', 'To the prayer requests', PRAYER_PAGE),
    go('npToWaiting', 'Not let in yet: to waiting', GRAM_PAGES.waiting)
  ],
  connections: [
    wire('npRoot', 'didMount', 'npLoad', 'run'),
    // Runs once on arrival (an address with no kind sends no value), then whenever a chip is pressed.
    wire('npRoot', 'didMount', 'npKind', 'run'),
    wire('npUrl', 'pm-kind', 'npKind', 'in-start'),
    wire('npKindPost', 'onClick', 'npPickPost', 'run'),
    wire('npKindPrayer', 'onClick', 'npPickPrayer', 'run'),
    wire('npKindTestimony', 'onClick', 'npPickTestimony', 'run'),
    wire('npKindEvent', 'onClick', 'npPickEvent', 'run'),
    ...['Post', 'Prayer', 'Testimony', 'Event'].flatMap((k) => [
      wire(`npPick${k}`, 'out-picked', 'npKind', 'in-picked'),
      wire('npKind', `out-${k.toLowerCase()}Ink`, `npKind${k}`, 'color'),
      wire('npKind', `out-${k.toLowerCase()}Fill`, `npKind${k}`, 'backgroundColor')
    ]),
    wire('npKind', 'out-title', 'npTitle', 'text'),
    wire('npKind', 'out-field', 'npCaption', 'label'),
    wire('npKind', 'out-hint', 'npCaption', 'placeholder'),
    wire('npKind', 'out-share', 'npShare', 'label'),
    wire('npKind', 'out-back', 'npBack', 'label'),
    wire('npKind', 'out-takesPhotos', 'npPhotoBox', 'mounted'),
    wire('npKind', 'out-isPrayer', 'npPrayerFine', 'mounted'),
    wire('npKind', 'out-isEvent', 'npWhen', 'mounted'),
    wire('npKind', 'out-today', 'npDay', 'Min'),
    wire('npKind', 'out-latest', 'npDay', 'Max'),
    wire('npDay', 'Value', 'npGather', 'in-day'),
    wire('npTime', 'value', 'npGather', 'in-time'),
    wire('npKind', 'out-kind', 'npGather', 'in-kind'),
    wire('npKind', 'out-kind', 'npWhere', 'in-kind'),
    wire('npLoad', 'out-ok', 'npContent', 'mounted'),
    wire('npLoad', 'out-band', 'npBar', 'band'),
    wire('npLoad', 'out-waiting', 'npToWaiting', 'navigate'),
    ...refusedWires('np', 'npLoad'),
    wire('npBack', 'onClick', 'npWhere', 'run'),
    wire('npWhere', 'out-feed', 'npToFeed', 'navigate'),
    wire('npWhere', 'out-prayer', 'npToPrayer', 'navigate'),
    wire('npAddPhoto', 'onClick', 'npPick', 'open'),
    wire('npPick', 'file', 'npUpload', 'file'),
    wire('npPick', 'done', 'npUpload', 'upload'),
    wire('npPick', 'done', 'npBusy', 'on'),
    wire('npUpload', 'completed', 'npBusy', 'off'),
    wire('npBusy', 'state', 'npUploading', 'mounted'),
    wire('npUpload', 'error', 'npPhotoError', 'text'),
    wire('npUpload', 'cloudFile', 'npPhotos', 'in-added'),
    wire('npRemoved', 'value', 'npPhotos', 'in-removed'),
    wire('npPhotos', 'out-tiles', 'npEachTile', 'items'),
    wire('npPhotos', 'out-many', 'npTiles', 'mounted'),
    wire('npPhotos', 'out-room', 'npAddPhoto', 'mounted'),
    wire('npPhotos', 'out-photos', 'npGather', 'in-photos'),
    wire('npCaption', 'onTextChanged', 'npGather', 'in-caption'),
    wire('npShare', 'onClick', 'npGather', 'run'),
    wire('npGather', 'out-problem', 'npError', 'text'),
    wire('npGather', 'out-post', 'npCall', 'in-post'),
    wire('npGather', 'out-go', 'npCall', 'call'),
    wire('npCall', 'error', 'npError', 'text'),
    wire('npCall', 'done', 'npStamp', 'run'),
    wire('npStamp', 'out-at', 'npChanged', 'value'),
    wire('npStamp', 'out-go', 'npChanged', 'do'),
    wire('npCall', 'done', 'npWhere', 'run')
  ]
};

// ── /Feed/NewPhoto ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Remove: the photo's name, with when, so taking the same one off twice still says so. */
export const REMOVE_PHOTO = `Outputs.removed = Inputs.name + '|' + Date.now();
Outputs.go();`;

const NEW_PHOTO: PageComponent = {
  path: FEED_COMPONENTS.newPhoto,
  description: 'One photo added to a new post, and Remove',
  nodes: [
    group('nfRoot', 'A photo added', undefined, column({ rowGap: 'var(--space-1)' })),
    { id: 'nfImage', type: 'Image', label: 'The photo', parent: 'nfRoot', parameters: { width: pct(100), height: px(96), sizeMode: 'explicit', objectFit: 'cover', borderRadius: 'var(--radius-md)', cssClassName: 'gm-photo' } },
    button('nfRemove', 'Remove', 'nfRoot', 'Remove', { ...ACTION, fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }),
    { id: 'nfIn', type: 'Component Inputs', label: 'One photo added', ports: [{ name: 'name', type: 'string', plug: 'output' }, { name: 'src', type: 'string', plug: 'output' }, { name: 'alt', type: 'string', plug: 'output' }] },
    fn('nfGone', 'Take this photo off', REMOVE_PHOTO, ['go'], ['name']),
    { id: 'nfSay', type: 'Set Variable', label: 'A photo was taken off', parameters: { name: 'postPhotoRemoved', setWith: 'string' } }
  ],
  connections: [
    wire('nfIn', 'src', 'nfImage', 'src'),
    wire('nfIn', 'alt', 'nfImage', 'alt'),
    wire('nfIn', 'name', 'nfGone', 'in-name'),
    wire('nfRemove', 'onClick', 'nfGone', 'run'),
    wire('nfGone', 'out-removed', 'nfSay', 'value'),
    wire('nfGone', 'out-go', 'nfSay', 'do')
  ]
};

// ── /Pages/Post ────────────────────────────────────────────────────────────────────────────────────────────────────

export const POST_LOAD = `${FEED_READ}
// Read so that a heart or a comment made anywhere runs the page again.
var version = Inputs.changed;
if (Inputs.postId === undefined) return;
var who = await me();
if (!who) { refused({ error: 'Sign in to see this post.' }); return; }
if (who.status !== 'approved') { Outputs.waiting(); return; }
var id = String(Inputs.postId || '');
var admin = who.role === 'admin';
try {
  var members = await all('Member');
  var found = await all('Post', { objectId: { equalTo: id } });
  // Slice 5: an admin opens a hidden post too (its ACL lets only the admins read it), and is told it's hidden, and why.
  var posts = admin ? found : shown(found, members);
  var on = [ptr('Post', id)];
  var hearts = posts.length ? await all('Heart', { post: { containedIn: on } }) : [];
  var comments = posts.length ? await all('Comment', { post: { containedIn: on } }) : [];
  var prayed = posts.length ? await all('Prayed', { post: { containedIn: on } }) : [];
} catch (e) { refused(e); return; }
Outputs.band = who.role === 'admin' ? 'Admin' : '';
Outputs.meId = who.id;
Outputs.inside = true;
Outputs.refused = false;
if (posts.length === 0) { Outputs.gone = true; Outputs.ok = false; return; }
var by = {};
members.forEach(function (m) { by[m.objectId] = m; });
var mine = Noodl.Users.Current ? String(Noodl.Users.Current.id || '') : '';
Outputs.card = await cardsOf(posts, members, hearts, comments, mine, true, prayed);
var p0 = posts[0];
var author = by[idOf(p0.member)] || {};
var meId = String(who.id || '');
var own = author.objectId === meId;
var hiddenWords = p0.endedAt ? 'Hidden from members: ' + (p0.hiddenReason || 'no reason given') + '.' : author.endedAt ? 'Hidden from members while ' + (author.name || 'its member') + ' is blocked.' : '';
// Slice 5: a member reports someone else's post and takes their own down; an admin looks at its reports and hides it.
Outputs.hiddenWords = hiddenWords;
Outputs.isHidden = !!hiddenWords;
Outputs.canReport = !own && !hiddenWords;
Outputs.canTakeDown = own && !hiddenWords;
Outputs.canLook = admin && !own;
var said = comments
  .filter(function (c) { return !c.endedAt; })
  // An admin reads a blocked member's comments too; the page lists them for nobody (they come back with the member).
  .filter(function (c) { var w = by[idOf(c.member)]; return !!w && !w.endedAt; })
  .sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });
var rows = [];
for (var i = 0; i < said.length; i++) {
  var c = said[i];
  var m = by[idOf(c.member)] || {};
  var face = await faceOf(m);
  var theirs = (m.objectId || '') === meId;
  rows.push({ id: c.objectId, memberId: m.objectId || '', name: m.name || '', initials: initials(m.name), shade: shade(m.objectId || c.objectId), face: face, hasFace: !!face, noFace: !face, when: ago(c.createdAt), text: c.text || '', canReport: !theirs && !hiddenWords, canTakeDown: theirs && !hiddenWords, canLook: admin && !theirs });
}
Outputs.comments = rows;
Outputs.heading = said.length === 0 ? 'No comments yet' : said.length === 1 ? '1 comment' : said.length + ' comments';
Outputs.gone = false;
Outputs.ok = true;`;

export const COMMENT_GATHER = `var words = typeof Inputs.text === 'string' ? Inputs.text.trim() : '';
if (!words) { Outputs.problem = 'Write a comment first.'; Outputs.held(); return; }
if (words.length > ${MOST_COMMENT}) { Outputs.problem = 'A comment of ${MOST_COMMENT.toLocaleString('en-GB')} characters or fewer. This one has ' + words.length.toLocaleString('en-GB') + '.'; Outputs.held(); return; }
Outputs.problem = '';
Outputs.comment = { postId: Inputs.postId, text: words };
Outputs.go();`;

/** Slice 5: your own post, taken down (members stop seeing it; only an admin brings it back). */
export const TAKE_DOWN_POST = `Outputs.hide = { postId: Inputs.postId, hidden: true };
Outputs.go();`;
export const TAKE_DOWN_COMMENT = `Outputs.hide = { commentId: Inputs.id, hidden: true };
Outputs.go();`;

const POST: PageComponent = {
  path: FEED_PAGES.post,
  description: 'One post and its comments, and writing one',
  nodes: [
    ...gramShell('po', 'A post', 'post/{postId}', null, 560, ''),
    { id: 'poUrl', type: 'PageInputs', label: 'Which post', parameters: { pathParams: 'postId' } },
    button('poBack', 'Back', 'poBody', '← The feed', GM_LINK),
    group('poContent', 'The post and its comments', 'poBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    text('poHidden', 'Hidden from members (an admin sees it)', 'poContent', '', { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-extrabold)', sizeMode: 'contentSize', cssClassName: 'gm-pill gm-wrap gm-pill-quiet', mounted: false }),
    group('poCardBox', 'The post', 'poContent', column({})),
    { id: 'poEachCard', type: 'For Each', label: 'The post, as the feed shows it', parent: 'poCardBox', parameters: { template: FEED_COMPONENTS.card } },
    group('poMod', 'Report, take down, its reports', 'poContent', rowOf({ flexWrap: 'wrap', columnGap: 'var(--space-4)', rowGap: 'var(--space-1)' })),
    button('poReport', 'Report this post', 'poMod', 'Report this post', MOD_ACTION),
    button('poTakeDown', 'Take this post down', 'poMod', 'Take this post down', MOD_ACTION),
    button('poLook', 'Its reports, and hiding it (admins)', 'poMod', 'Reports and hiding', MOD_ACTION),
    group('poConfirm', 'Take it down?', 'poContent', column({ rowGap: 'var(--space-2)', paddingLeft: 'var(--space-3-5)', paddingRight: 'var(--space-3-5)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', cssClassName: 'gm-rule', mounted: false })),
    text('poConfirmWords', 'What taking it down does', 'poConfirm', 'Take it down? Members stop seeing it straight away. Nothing is deleted, and only an admin can bring it back.', { ...GM_FINE, color: 'var(--foreground)' }),
    group('poConfirmRow', 'Yes, or keep it', 'poConfirm', rowOf({ columnGap: 'var(--space-3)' })),
    button('poDown', 'Yes, take it down', 'poConfirmRow', 'Yes, take it down', { ...GM_LINE_SMALL, color: 'var(--bad)', borderColor: 'var(--bad)' }),
    button('poKeep', 'Keep it', 'poConfirmRow', 'Keep it', GM_LINK),
    text('poHeading', 'How many comments', 'poContent', '', { fontSize: 'var(--text-base)', fontWeight: 'var(--font-extrabold)', color: 'var(--foreground)' }),
    group('poList', 'The comments', 'poContent', column({ rowGap: 'var(--space-3)' })),
    { id: 'poEachComment', type: 'For Each', label: 'One row per comment', parent: 'poList', parameters: { template: FEED_COMPONENTS.comment } },
    field('poWrite', 'poContent', 'Your comment', { type: 'textArea' }),
    button('poSend', 'Comment', 'poContent', 'Comment', GM_MAIN),
    text('poError', 'What went wrong', 'poContent', '', GM_REFUSED),
    text('poGone', 'Not in the feed', 'poBody', 'This post isn’t in the feed any more.', { ...GM_FINE, mounted: false }),
    ...refused('po'),
    fn('poLoad', 'The post and its comments', POST_LOAD, ['waiting'], ['postId']),
    { id: 'poChanged', type: 'Variable2', label: 'The feed changed', parameters: { name: 'feedChanged' } },
    listen('po', 'Heart'),
    listen('po', 'Comment'),
    listen('po', 'Post'),
    fn('poGather', 'The comment', COMMENT_GATHER, ['go', 'held'], ['text', 'postId']),
    { id: 'poConfirmSw', type: 'Switch', label: 'Asked: take it down?' },
    fn('poDownGather', 'Take this post down', TAKE_DOWN_POST, ['go'], ['postId']),
    call('poDownCall', 'hide(hide)', FN_HIDE),
    fn('poDownStamp', 'Say the feed changed', FEED_STAMP, ['go']),
    { id: 'poDownSay', type: 'Set Variable', label: 'The feed changed', parameters: { name: 'feedChanged', setWith: 'string' } },
    go('poToReport', 'To report it', REPORT_PAGE),
    go('poToLook', 'To its reports (admins)', LOOK_PAGE),
    call('poCall', 'commentOn(comment)', FN_COMMENT_ON),
    fn('poStamp', 'Say the feed changed', FEED_STAMP, ['go']),
    { id: 'poSay', type: 'Set Variable', label: 'The feed changed', parameters: { name: 'feedChanged', setWith: 'string' } },
    go('poToFeed', 'To the feed', FEED_PAGES.feed),
    go('poToWaiting', 'Not let in yet: to waiting', GRAM_PAGES.waiting)
  ],
  connections: [
    wire('poUrl', 'pm-postId', 'poLoad', 'in-postId'),
    wire('poRoot', 'didMount', 'poLoad', 'run'),
    wire('poChanged', 'value', 'poLoad', 'in-changed'),
    ...['Heart', 'Comment', 'Post'].map((c) => wire(`poLive${c}`, 'changed', 'poLoad', 'run')),
    ...navWires('po', 'poLoad'),
    wire('poLoad', 'out-ok', 'poContent', 'mounted'),
    wire('poLoad', 'out-gone', 'poGone', 'mounted'),
    wire('poLoad', 'out-card', 'poEachCard', 'items'),
    wire('poLoad', 'out-comments', 'poEachComment', 'items'),
    wire('poLoad', 'out-heading', 'poHeading', 'text'),
    wire('poLoad', 'out-band', 'poBar', 'band'),
    wire('poLoad', 'out-waiting', 'poToWaiting', 'navigate'),
    ...refusedWires('po', 'poLoad'),
    wire('poBack', 'onClick', 'poToFeed', 'navigate'),
    wire('poLoad', 'out-hiddenWords', 'poHidden', 'text'),
    wire('poLoad', 'out-isHidden', 'poHidden', 'mounted'),
    wire('poLoad', 'out-canReport', 'poReport', 'mounted'),
    wire('poLoad', 'out-canTakeDown', 'poTakeDown', 'mounted'),
    wire('poLoad', 'out-canLook', 'poLook', 'mounted'),
    wire('poUrl', 'pm-postId', 'poToReport', 'pm-post'),
    wire('poReport', 'onClick', 'poToReport', 'navigate'),
    wire('poUrl', 'pm-postId', 'poToLook', 'pm-post'),
    wire('poLook', 'onClick', 'poToLook', 'navigate'),
    wire('poTakeDown', 'onClick', 'poConfirmSw', 'on'),
    wire('poKeep', 'onClick', 'poConfirmSw', 'off'),
    wire('poConfirmSw', 'state', 'poConfirm', 'mounted'),
    wire('poUrl', 'pm-postId', 'poDownGather', 'in-postId'),
    wire('poDown', 'onClick', 'poDownGather', 'run'),
    wire('poDownGather', 'out-hide', 'poDownCall', 'in-hide'),
    wire('poDownGather', 'out-go', 'poDownCall', 'call'),
    wire('poDownCall', 'error', 'poError', 'text'),
    wire('poDownCall', 'done', 'poDownStamp', 'run'),
    wire('poDownStamp', 'out-at', 'poDownSay', 'value'),
    wire('poDownStamp', 'out-go', 'poDownSay', 'do'),
    wire('poDownCall', 'done', 'poToFeed', 'navigate'),
    wire('poUrl', 'pm-postId', 'poGather', 'in-postId'),
    wire('poWrite', 'onTextChanged', 'poGather', 'in-text'),
    wire('poSend', 'onClick', 'poGather', 'run'),
    wire('poGather', 'out-problem', 'poError', 'text'),
    wire('poGather', 'out-comment', 'poCall', 'in-comment'),
    wire('poGather', 'out-go', 'poCall', 'call'),
    wire('poCall', 'error', 'poError', 'text'),
    wire('poCall', 'done', 'poWrite', 'clear'),
    wire('poCall', 'done', 'poStamp', 'run'),
    wire('poStamp', 'out-at', 'poSay', 'value'),
    wire('poStamp', 'out-go', 'poSay', 'do')
  ]
};

// ── /Feed/CommentRow ───────────────────────────────────────────────────────────────────────────────────────────────

const COMMENT_ROW: PageComponent = {
  path: FEED_COMPONENTS.comment,
  description: 'One comment: who, when, what they said; Report, or Take down your own',
  nodes: [
    group('cmRoot', 'A comment', undefined, rowOf({ columnGap: 'var(--space-2-5)', alignItems: 'flex-start' })),
    ...faceNodes('cm', 'cmRoot', 28),
    group('cmWords', 'Who, when, and what', 'cmRoot', column({ cssClassName: 'gm-grow' })),
    group('cmHead', 'Who and when', 'cmWords', rowOf({ columnGap: 'var(--space-2)' })),
    button('cmName', 'Name: their profile', 'cmHead', '', { ...NAME_LINK, fontSize: 'var(--text-sm)' }),
    text('cmWhen', 'When', 'cmHead', '', { ...META, sizeMode: 'contentSize' }),
    text('cmText', 'What they said', 'cmWords', '', { fontSize: 'var(--text-sm)', color: 'var(--foreground)', lineHeight: 'var(--leading-relaxed)', cssClassName: 'gm-wrap' }),
    group('cmMod', 'Report, take down, its reports', 'cmWords', rowOf({ columnGap: 'var(--space-3)' })),
    button('cmReport', 'Report this comment', 'cmMod', 'Report', MOD_ACTION),
    button('cmTakeDown', 'Take this comment down', 'cmMod', 'Take down', MOD_ACTION),
    button('cmLook', 'Its reports, and hiding it (admins)', 'cmMod', 'Reports and hiding', MOD_ACTION),
    text('cmError', 'What went wrong', 'cmWords', '', { ...GM_REFUSED, fontSize: 'var(--text-xs)' }),
    {
      id: 'cmIn',
      type: 'Component Inputs',
      label: 'One comment',
      ports: [
        ...['id', 'memberId', 'name', 'initials', 'shade', 'face', 'when', 'text'].map((name) => ({ name, type: 'string', plug: 'output' })),
        ...['hasFace', 'noFace', 'canReport', 'canTakeDown', 'canLook'].map((name) => ({ name, type: 'boolean', plug: 'output' }))
      ]
    },
    go('cmToMember', 'To their profile', MEMBER_PAGE),
    go('cmToReport', 'To report it', REPORT_PAGE),
    go('cmToLook', 'To its reports (admins)', LOOK_PAGE),
    fn('cmDownGather', 'Take this comment down', TAKE_DOWN_COMMENT, ['go'], ['id']),
    call('cmDownCall', 'hide(hide)', FN_HIDE),
    fn('cmStamp', 'Say the feed changed', FEED_STAMP, ['go']),
    { id: 'cmChanged', type: 'Set Variable', label: 'The feed changed', parameters: { name: 'feedChanged', setWith: 'string' } }
  ],
  connections: [
    wire('cmIn', 'name', 'cmName', 'label'),
    ...faceWires('cm', 'cmIn'),
    wire('cmIn', 'memberId', 'cmToMember', 'pm-memberId'),
    wire('cmName', 'onClick', 'cmToMember', 'navigate'),
    wire('cmIn', 'when', 'cmWhen', 'text'),
    wire('cmIn', 'text', 'cmText', 'text'),
    wire('cmIn', 'canReport', 'cmReport', 'mounted'),
    wire('cmIn', 'canTakeDown', 'cmTakeDown', 'mounted'),
    wire('cmIn', 'canLook', 'cmLook', 'mounted'),
    wire('cmIn', 'id', 'cmToReport', 'pm-comment'),
    wire('cmReport', 'onClick', 'cmToReport', 'navigate'),
    wire('cmIn', 'id', 'cmToLook', 'pm-comment'),
    wire('cmLook', 'onClick', 'cmToLook', 'navigate'),
    wire('cmIn', 'id', 'cmDownGather', 'in-id'),
    wire('cmTakeDown', 'onClick', 'cmDownGather', 'run'),
    wire('cmDownGather', 'out-hide', 'cmDownCall', 'in-hide'),
    wire('cmDownGather', 'out-go', 'cmDownCall', 'call'),
    wire('cmDownCall', 'error', 'cmError', 'text'),
    wire('cmDownCall', 'done', 'cmStamp', 'run'),
    wire('cmStamp', 'out-at', 'cmChanged', 'value'),
    wire('cmStamp', 'out-go', 'cmChanged', 'do')
  ]
};

/** Leaves first, then the pages that place them. */
// ── /UI/DatePicker ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Slice 4b: the library's Date picker (`datePicker.ts`, the todo list's), for an event's day. */
const DATE_PICKER: PageComponent = (() => {
  const graph = datePickerGraph('gdp');
  return { path: FEED_COMPONENTS.datePicker, description: DATE_PICKER_DESCRIPTION, nodes: graph.nodes as unknown as Node[], connections: graph.connections };
})();

export const GRAM_SLICE2_LEAVES: PageComponent[] = [PHOTO, POST_CARD, NEW_PHOTO, COMMENT_ROW, DATE_PICKER];
export const GRAM_SLICE2_PAGES: PageComponent[] = [FEED, NEW_POST, POST];
