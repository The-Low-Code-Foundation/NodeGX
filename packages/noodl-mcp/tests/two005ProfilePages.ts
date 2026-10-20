/**
 * TWO-005 slice 3 — the community app's profiles, held to the approved picture (`look/gram.html`: "A profile"): a
 * round photo, the member's name and bio, how many posts, Edit profile on your own, and the grid of their posts, three
 * across on a phone and five on a tablet.
 *
 * - **Every member sees every profile; nobody else sees any** (the world). The page reads as the signed-in person,
 *   so the policy decides; a stranger is told to sign in and asks nothing.
 * - **A profile photo is private to the members**, as a post's photos are: uploaded with Readers
 *   `role:member, role:admin` and shown by a signed link (the feed's `linked`, kept on the page).
 * - **The grid is the posts the feed would show** (not hidden, the member not blocked), newest first. A post with
 *   photos shows its first; a post of words shows its first words. Each opens the post.
 * - 🔴 **Each tile is a Button** so a keyboard reaches it (P121-TWO003-GROUPKEYBOARD): a photo's tile is a button laid
 *   over the photo, its label the photo's description, drawn transparent.
 *
 * @module noodl-mcp/tests/two005ProfilePages
 */
import { PHOTO_READERS } from './two005Feed';
import { faceNodes, faceWires, FEED_PAGES, FEED_READ, MEMBER_PAGE, navWires } from './two005FeedPages';
import { NOT_LET_IN } from './two005Cloud';
import { FN_BLOCK, MOST_REASON } from './two005Moderate';
import { GM_BAD_LINE, GM_FINE, GM_LINE, GM_LINE_SMALL, GM_LINK, GM_MAIN, GM_REFUSED, GM_TITLE, GRAM_PAGES, gramShell } from './two005Pages';
import { FN_EDIT_PROFILE, MOST_BIO, MOST_NAME } from './two005Profile';
import { button, call, column, fn, go, group, input, Node, PageComponent, pct, px, rowOf, text, Wire, wire } from './two003Pages';

export const PROFILE_PAGES = {
  member: MEMBER_PAGE,
  edit: '/Pages/EditProfile'
};

export const PROFILE_COMPONENTS = {
  tile: '/Profile/Tile',
  count: '/Profile/Count'
};

/** The longest side a profile photo is sent at: it is drawn 80 px across at most, twice that on a sharp screen. */
export const PROFILE_PHOTO_SIDE = 800;
/** How many characters of a words-only post its tile shows. */
export const TILE_WORDS = 60;

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

// ── /Pages/Member ──────────────────────────────────────────────────────────────────────────────────────────────────

export const PROFILE_LOAD = `${FEED_READ}
if (Inputs.memberId === undefined) return;
// Read so that a block or a let-back runs the page again.
var version = Inputs.changed;
var who = await me();
if (!who) { refused({ error: 'Sign in to see members’ profiles.' }); return; }
if (who.status !== 'approved') { Outputs.waiting(); return; }
var id = String(Inputs.memberId || '') || String(who.id || '');
try {
  var members = await all('Member');
  var theirs = await all('Post', { member: { equalTo: ptr('Member', id) } });
} catch (e) { refused(e); return; }
Outputs.band = who.role === 'admin' ? 'Admin' : '';
Outputs.meId = who.id;
Outputs.inside = true;
Outputs.refused = false;
var m = members.filter(function (x) { return x.objectId === id; })[0];
var admin = who.role === 'admin';
// Slice 5: an admin sees a blocked member's profile (and someone not let in), to see why and let them back.
if (!m || (!admin && (m.status !== 'approved' || m.endedAt))) { Outputs.gone = true; Outputs.ok = false; return; }
// A blocked member's posts are hidden from members with them; an admin sees those not hidden for their own reason.
var posts = m.endedAt
  ? theirs.filter(function (p) { return !p.endedAt; }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); })
  : shown(theirs, members);
Outputs.blocked = !!m.endedAt;
var why = String(m.blockedReason || '').trim();
function sentence(w) { return /[.!?]$/.test(w) ? w : w + '.'; }
var out = m.status === 'waiting' ? (why && why !== '${NOT_LET_IN}' ? 'Not let in: ' + sentence(why) : 'Not let in.') : 'Blocked: ' + sentence(why || 'no reason given');
Outputs.blockedWords = out;
// Not an admin, so never yourself (only an admin sees Block); the block function refuses both in words anyway.
Outputs.canBlock = admin && m.role !== 'admin' && !m.endedAt;
Outputs.canLetBack = admin && !!m.endedAt;
Outputs.blockLabel = 'Block ' + (firstName(m) || 'them');
Outputs.letBackLabel = 'Let ' + (firstName(m) || 'them') + ' back';
var face = await faceOf(m);
var mine = String(who.id || '') === m.objectId;
// Slice 4: a prayer request is counted beside the posts, and isn't a tile in the grid (the picture's counts). Slice 4b:
// a testimony too, which leads with its words as a prayer request does; an event is a post with a day, in the grid.
var asks = posts.filter(function (p) { return p.kind === 'prayer'; }).length;
var told = posts.filter(function (p) { return p.kind === 'testimony'; }).length;
posts = posts.filter(function (p) { return p.kind !== 'prayer' && p.kind !== 'testimony'; });
Outputs.name = m.name || '';
Outputs.bio = m.bio || '';
Outputs.hasBio = !!m.bio;
Outputs.initials = initials(m.name);
Outputs.shade = shade(m.objectId);
Outputs.face = face;
Outputs.hasFace = !!face;
Outputs.noFace = !face;
// The picture's counts, each number over its word: one box per count, drawn by a For Each.
var counts = [
  { id: 'posts', number: String(posts.length), word: posts.length === 1 ? 'post' : 'posts' },
  { id: 'prayers', number: String(asks), word: asks === 1 ? 'prayer request' : 'prayer requests' },
  { id: 'testimonies', number: String(told), word: told === 1 ? 'testimony' : 'testimonies' }
];
Outputs.counts = counts;
Outputs.posts = counts[0].number;
Outputs.postsWord = counts[0].word;
Outputs.prayers = counts[1].number;
Outputs.prayersWord = counts[1].word;
Outputs.testimonies = counts[2].number;
Outputs.testimoniesWord = counts[2].word;
Outputs.isMe = mine;
Outputs.navOn = mine ? 'profile' : '';
var tiles = [];
for (var i = 0; i < posts.length; i++) {
  var p = posts[i];
  var first = (await linked((p.photos || []).slice(0, 1)))[0] || '';
  var words = String(p.caption || '').trim();
  var cut = words.length > ${TILE_WORDS} ? words.slice(0, ${TILE_WORDS - 1}).trim() + '…' : words;
  tiles.push({
    id: p.objectId,
    src: first,
    hasPhoto: !!first,
    noPhoto: !first,
    words: cut || 'A photo that couldn’t be loaded',
    label: (first ? 'Photo post' : 'Post') + ', ' + ago(p.createdAt) + (words ? ': ' + cut : '')
  });
}
Outputs.tiles = tiles;
Outputs.empty = posts.length === 0;
Outputs.emptyWords = mine ? 'You haven’t posted yet. What you share shows here.' : firstName(m) + ' hasn’t posted yet.';
Outputs.gone = false;
Outputs.ok = true;`;

/** Slice 5, an admin's: block this member, saying why. */
export const BLOCK_GATHER = `var reason = typeof Inputs.reason === 'string' ? Inputs.reason.trim() : '';
if (!reason) { Outputs.problem = 'Say why. Admins see the reason; the member doesn’t.'; Outputs.held(); return; }
if (reason.length > ${MOST_REASON}) { Outputs.problem = 'A reason of ${MOST_REASON} characters or fewer. This one has ' + reason.length + '.'; Outputs.held(); return; }
Outputs.problem = '';
Outputs.block = { memberId: Inputs.memberId, blocked: true, reason: reason };
Outputs.go();`;
export const LET_BACK_GATHER = `Outputs.block = { memberId: Inputs.memberId, blocked: false };
Outputs.go();`;
/** Say the members changed, so this page and the admins' queue read again. */
export const MEMBERS_CHANGED = `Outputs.at = String(Date.now());
Outputs.go();`;

const MEMBER: PageComponent = {
  path: PROFILE_PAGES.member,
  description: 'A member’s profile: their photo, name and bio, and the grid of their posts',
  nodes: [
    ...gramShell('mp', 'A profile', 'member/{memberId}', null, 720, ''),
    { id: 'mpUrl', type: 'PageInputs', label: 'Whose profile', parameters: { pathParams: 'memberId' } },
    button('mpBack', 'Back', 'mpBody', '← The feed', GM_LINK),
    group('mpContent', 'The profile', 'mpBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    group('mpHead', 'Photo, how many posts, prayer requests and testimonies', 'mpContent', rowOf({ columnGap: 'var(--space-5)' })),
    ...faceNodes('mp', 'mpHead', 80, 'var(--text-2xl)'),
    // The picture's counts: one group beside the photo, each number over its word.
    group('mpCounts', 'How many posts, prayer requests and testimonies', 'mpHead', rowOf({ columnGap: 'var(--space-4)', cssClassName: 'gm-count' })),
    { id: 'mpEachCount', type: 'For Each', label: 'One box per count', parent: 'mpCounts', parameters: { template: PROFILE_COMPONENTS.count } },
    group('mpWho', 'Name and bio', 'mpContent', column({ rowGap: 'var(--space-1)' })),
    text('mpName', 'Name', 'mpWho', '', { ...GM_TITLE, fontSize: 'var(--text-xl)', as: 'h1' }),
    text('mpBio', 'Bio', 'mpWho', '', { fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 'var(--leading-relaxed)', cssClassName: 'gm-wrap', mounted: false }),
    button('mpEdit', 'Edit profile', 'mpContent', 'Edit profile', { ...GM_LINE_SMALL, mounted: false }),
    // Slice 5, an admin's: why a member is blocked, and Let them back; or Block, with why.
    text('mpBlocked', 'Blocked, and why (admins)', 'mpContent', '', { fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', cssClassName: 'gm-pill gm-wrap gm-pill-bad', mounted: false }),
    text('mpBlockedFine', 'What being blocked means', 'mpContent', 'They can’t sign in, and nothing they wrote is shown to members. Nothing is deleted.', { ...GM_FINE, mounted: false }),
    button('mpLetBack', 'Let them back', 'mpContent', '', { ...GM_LINE_SMALL, mounted: false }),
    group('mpBlock', 'Block (admins)', 'mpContent', column({ rowGap: 'var(--space-2)', paddingTop: 'var(--space-3)', borderStyle: 'solid', borderColor: 'var(--border)', borderTopWidth: px(1), borderBottomWidth: px(0), borderLeftWidth: px(0), borderRightWidth: px(0), mounted: false })),
    field('mpBlockWhy', 'mpBlock', `Why block them (admins see this; ${MOST_REASON} characters at most)`),
    button('mpBlockGo', 'Block', 'mpBlock', '', { ...GM_BAD_LINE, sizeMode: 'contentSize' }),
    text('mpBlockFine', 'What blocking does', 'mpBlock', 'They can’t sign in, and their posts and comments are hidden from members until an admin lets them back. Nothing is deleted.', GM_FINE),
    text('mpBlockError', 'What went wrong', 'mpContent', '', GM_REFUSED),
    text('mpEmpty', 'Nothing posted yet', 'mpContent', '', { ...GM_FINE, mounted: false }),
    group('mpGrid', 'Their posts', 'mpContent', column({ cssClassName: 'gm-grid' })),
    { id: 'mpEach', type: 'For Each', label: 'One tile per post', parent: 'mpGrid', parameters: { template: PROFILE_COMPONENTS.tile } },
    text('mpGone', 'Not in the community', 'mpBody', 'This member isn’t in the community.', { ...GM_FINE, mounted: false }),
    ...refused('mp'),
    fn('mpLoad', 'Their profile and posts', PROFILE_LOAD, ['waiting'], ['memberId']),
    fn('mpBlockGather', 'Block them, with why', BLOCK_GATHER, ['go', 'held'], ['memberId', 'reason']),
    fn('mpLetBackGather', 'Let them back', LET_BACK_GATHER, ['go'], ['memberId']),
    call('mpBlockCall', 'block(block)', FN_BLOCK),
    fn('mpStamp', 'Say the members changed', MEMBERS_CHANGED, ['go']),
    { id: 'mpChanged', type: 'Set Variable', label: 'The members changed', parameters: { name: 'membersChanged', setWith: 'string' } },
    { id: 'mpVersion', type: 'Variable2', label: 'The members changed', parameters: { name: 'membersChanged' } },
    go('mpToFeed', 'To the feed', FEED_PAGES.feed),
    go('mpToEdit', 'To edit your profile', PROFILE_PAGES.edit),
    go('mpToWaiting', 'Not let in yet: to waiting', GRAM_PAGES.waiting)
  ],
  connections: [
    wire('mpUrl', 'pm-memberId', 'mpLoad', 'in-memberId'),
    wire('mpRoot', 'didMount', 'mpLoad', 'run'),
    wire('mpVersion', 'value', 'mpLoad', 'in-changed'),
    wire('mpLoad', 'out-blocked', 'mpBlocked', 'mounted'),
    wire('mpLoad', 'out-blockedWords', 'mpBlocked', 'text'),
    wire('mpLoad', 'out-blocked', 'mpBlockedFine', 'mounted'),
    wire('mpLoad', 'out-canLetBack', 'mpLetBack', 'mounted'),
    wire('mpLoad', 'out-letBackLabel', 'mpLetBack', 'label'),
    wire('mpLoad', 'out-canBlock', 'mpBlock', 'mounted'),
    wire('mpLoad', 'out-blockLabel', 'mpBlockGo', 'label'),
    wire('mpUrl', 'pm-memberId', 'mpBlockGather', 'in-memberId'),
    wire('mpUrl', 'pm-memberId', 'mpLetBackGather', 'in-memberId'),
    wire('mpBlockWhy', 'onTextChanged', 'mpBlockGather', 'in-reason'),
    wire('mpBlockGo', 'onClick', 'mpBlockGather', 'run'),
    wire('mpLetBack', 'onClick', 'mpLetBackGather', 'run'),
    wire('mpBlockGather', 'out-problem', 'mpBlockError', 'text'),
    ...['mpBlockGather', 'mpLetBackGather'].flatMap((g) => [wire(g, 'out-block', 'mpBlockCall', 'in-block'), wire(g, 'out-go', 'mpBlockCall', 'call')]),
    wire('mpBlockCall', 'error', 'mpBlockError', 'text'),
    wire('mpBlockCall', 'done', 'mpBlockWhy', 'clear'),
    wire('mpBlockCall', 'done', 'mpStamp', 'run'),
    wire('mpStamp', 'out-at', 'mpChanged', 'value'),
    wire('mpStamp', 'out-go', 'mpChanged', 'do'),
    wire('mpLoad', 'out-ok', 'mpContent', 'mounted'),
    wire('mpLoad', 'out-gone', 'mpGone', 'mounted'),
    wire('mpLoad', 'out-band', 'mpBar', 'band'),
    ...faceWires('mp', 'mpLoad', 'out-'),
    wire('mpLoad', 'out-counts', 'mpEachCount', 'items'),
    ...navWires('mp', 'mpLoad'),
    wire('mpLoad', 'out-navOn', 'mpNav', 'on'),
    wire('mpLoad', 'out-name', 'mpName', 'text'),
    wire('mpLoad', 'out-bio', 'mpBio', 'text'),
    wire('mpLoad', 'out-hasBio', 'mpBio', 'mounted'),
    wire('mpLoad', 'out-isMe', 'mpEdit', 'mounted'),
    wire('mpLoad', 'out-empty', 'mpEmpty', 'mounted'),
    wire('mpLoad', 'out-emptyWords', 'mpEmpty', 'text'),
    wire('mpLoad', 'out-tiles', 'mpEach', 'items'),
    wire('mpLoad', 'out-waiting', 'mpToWaiting', 'navigate'),
    ...refusedWires('mp', 'mpLoad'),
    wire('mpBack', 'onClick', 'mpToFeed', 'navigate'),
    wire('mpEdit', 'onClick', 'mpToEdit', 'navigate')
  ]
};

// ── /Profile/Tile ──────────────────────────────────────────────────────────────────────────────────────────────────

// ── /Profile/Count ─────────────────────────────────────────────────────────────────────────────────────────────────

/** One of a profile's counts (slice 4b): the number over its word, as the picture draws them. */
const COUNT: PageComponent = {
  path: PROFILE_COMPONENTS.count,
  description: 'One count on a profile: the number over its word',
  nodes: [
    group('ctRoot', 'A count', undefined, column({ alignItems: 'center', cssClassName: 'gm-count' })),
    text('ctNumber', 'The number', 'ctRoot', '', { fontSize: 'var(--text-xl)', fontWeight: 'var(--font-extrabold)', color: 'var(--foreground)', sizeMode: 'contentSize' }),
    text('ctWord', 'What is counted', 'ctRoot', '', { fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)', sizeMode: 'contentSize' }),
    { id: 'ctIn', type: 'Component Inputs', label: 'One count', ports: [{ name: 'number', type: 'string', plug: 'output' }, { name: 'word', type: 'string', plug: 'output' }] }
  ],
  connections: [wire('ctIn', 'number', 'ctNumber', 'text'), wire('ctIn', 'word', 'ctWord', 'text')]
};

const TILE: PageComponent = {
  path: PROFILE_COMPONENTS.tile,
  description: 'One post in a profile’s grid: its first photo or its first words; opens the post',
  nodes: [
    group('tlRoot', 'A post in the grid', undefined, column({ cssClassName: 'gm-tile' })),
    { id: 'tlImage', type: 'Image', label: 'Its first photo', parent: 'tlRoot', parameters: { width: pct(100), height: pct(100), sizeMode: 'explicit', objectFit: 'cover', mounted: false } },
    // Over the photo, so a keyboard reaches it and a screen reader names it; its words are drawn transparent.
    button('tlOpen', 'Open the post (over the photo)', 'tlRoot', '', { backgroundColor: 'transparent', borderStyle: 'none', color: 'transparent', fontSize: 'var(--text-xs)', cssClassName: 'gm-tile-hit', mounted: false }),
    button('tlWords', 'Open the post (its first words)', 'tlRoot', '', { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)', borderStyle: 'none', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', paddingLeft: 'var(--space-2)', paddingRight: 'var(--space-2)', paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', cssClassName: 'gm-tile-hit gm-tile-words', mounted: false }),
    {
      id: 'tlIn',
      type: 'Component Inputs',
      label: 'One post in the grid',
      ports: [
        ...['id', 'src', 'words', 'label'].map((name) => ({ name, type: 'string', plug: 'output' })),
        { name: 'hasPhoto', type: 'boolean', plug: 'output' },
        { name: 'noPhoto', type: 'boolean', plug: 'output' }
      ]
    },
    go('tlToPost', 'To the post', FEED_PAGES.post)
  ],
  connections: [
    wire('tlIn', 'src', 'tlImage', 'src'),
    wire('tlIn', 'label', 'tlImage', 'alt'),
    wire('tlIn', 'hasPhoto', 'tlImage', 'mounted'),
    wire('tlIn', 'hasPhoto', 'tlOpen', 'mounted'),
    wire('tlIn', 'label', 'tlOpen', 'label'),
    wire('tlIn', 'noPhoto', 'tlWords', 'mounted'),
    wire('tlIn', 'words', 'tlWords', 'label'),
    wire('tlIn', 'id', 'tlToPost', 'pm-postId'),
    wire('tlOpen', 'onClick', 'tlToPost', 'navigate'),
    wire('tlWords', 'onClick', 'tlToPost', 'navigate')
  ]
};

// ── /Pages/EditProfile ─────────────────────────────────────────────────────────────────────────────────────────────

export const EDIT_LOAD = `${FEED_READ}
var who = await me();
if (!who) { refused({ error: 'Sign in to change your profile.' }); return; }
if (who.status !== 'approved') { Outputs.waiting(); return; }
try {
  var rows = await all('Member', { objectId: { equalTo: String(who.id || '') } });
} catch (e) { refused(e); return; }
var m = rows[0] || {};
Outputs.memberId = String(who.id || '');
Outputs.name = m.name || '';
Outputs.bio = m.bio || '';
Outputs.initials = initials(m.name);
Outputs.shade = shade(m.objectId || who.id);
Outputs.current = await faceOf(m);
Outputs.band = who.role === 'admin' ? 'Admin' : '';
Outputs.refused = false;
Outputs.ok = true;`;

/**
 * The photo while the page is open: the one there is (`current`), a new upload, or none (Remove). `choice` says which
 * the save sends: `keep` sends nothing, `none` takes it off, `new` sends the upload.
 */
export const EDIT_PHOTO = `var keep = Component.Object;
var up = Inputs.added;
if (up && up !== keep.get('addedFrom')) {
  keep.set('addedFrom', up);
  if (typeof up.getName === 'function' && up.getName()) {
    var shown = '';
    try { shown = (await Noodl.Files.sign(up)).url; } catch (e) { shown = ''; }
    keep.set('choice', { kind: 'new', name: up.getName(), url: up.getUrl(), shown: shown });
  }
}
if (Inputs.removed && Inputs.removed !== keep.get('removedFrom')) {
  keep.set('removedFrom', Inputs.removed);
  keep.set('choice', { kind: 'none' });
}
var c = keep.get('choice') || { kind: 'keep' };
var src = c.kind === 'new' ? c.shown : c.kind === 'none' ? '' : String(Inputs.current || '');
Outputs.choice = c.kind;
Outputs.photo = c.kind === 'new' ? { name: c.name, url: c.url } : {};
Outputs.face = src;
Outputs.hasFace = !!src;
Outputs.noFace = !src;
Outputs.canRemove = c.kind === 'new' || (c.kind === 'keep' && !!Inputs.current);`;

/** Remove: when, so pressing it again after a new photo still says so. */
export const REMOVE_FACE = `Outputs.removed = String(Date.now());
Outputs.go();`;

export const EDIT_GATHER = `function v(typed, loaded) { return typed === undefined ? (loaded || '') : String(typed); }
var name = v(Inputs.name, Inputs.name0).trim();
var bio = v(Inputs.bio, Inputs.bio0).trim();
if (!name) { Outputs.problem = 'Your name, as the community knows you.'; Outputs.held(); return; }
if (name.length > ${MOST_NAME}) { Outputs.problem = 'A name of ${MOST_NAME} characters or fewer. This one has ' + name.length + '.'; Outputs.held(); return; }
if (bio.length > ${MOST_BIO}) { Outputs.problem = 'A bio of ${MOST_BIO} characters or fewer. This one has ' + bio.length + '.'; Outputs.held(); return; }
var profile = { name: name, bio: bio };
if (Inputs.choice === 'new') profile.photo = Inputs.photo;
if (Inputs.choice === 'none') profile.photo = null;
Outputs.problem = '';
Outputs.profile = profile;
Outputs.go();`;

const EDIT: PageComponent = {
  path: PROFILE_PAGES.edit,
  description: 'Edit your profile: your photo, your name, a short bio',
  nodes: [
    ...gramShell('ep', 'Edit profile', 'profile/edit', null, 560),
    group('epContent', 'Edit profile', 'epBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    button('epBack', 'Back', 'epContent', '← Your profile', GM_LINK),
    text('epTitle', 'Heading', 'epContent', 'Edit profile', GM_TITLE),
    group('epPhotoRow', 'Your photo, and changing it', 'epContent', rowOf({ columnGap: 'var(--space-4)' })),
    ...faceNodes('ep', 'epPhotoRow', 80, 'var(--text-2xl)'),
    group('epPhotoActions', 'Change or remove', 'epPhotoRow', column({ rowGap: 'var(--space-2)', alignItems: 'flex-start' })),
    button('epChange', 'Change photo', 'epPhotoActions', 'Change photo', GM_LINE_SMALL),
    button('epRemove', 'Remove photo', 'epPhotoActions', 'Remove photo', { ...GM_LINK, fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)', mounted: false }),
    text('epUploading', 'Sending the photo', 'epContent', 'Making the photo smaller and sending it…', { ...GM_FINE, mounted: false }),
    text('epPhotoError', 'Why the photo didn’t go', 'epContent', '', GM_REFUSED),
    text('epPhotoFine', 'Who sees it', 'epContent', 'Only members who’ve been let in see your photo and your profile.', GM_FINE),
    field('epName', 'epContent', 'Your name'),
    field('epBio', 'epContent', `Bio (${MOST_BIO} characters at most)`, { type: 'textArea', placeholder: 'A line about you: what you do at church, a verse you love.' }),
    button('epSave', 'Save', 'epContent', 'Save', GM_MAIN),
    text('epError', 'What went wrong', 'epContent', '', GM_REFUSED),
    ...refused('ep'),
    fn('epLoad', 'Your profile as it is', EDIT_LOAD, ['waiting']),
    { id: 'epPick', type: 'Open File Picker', label: 'Choose a photo', parameters: { acceptedFileTypes: 'image/*' } },
    {
      id: 'epUpload',
      type: 'Upload File',
      label: `Send it, shrunk to ${PROFILE_PHOTO_SIDE} px, for the members only`,
      parameters: { readers: PHOTO_READERS, shrinkTo: PROFILE_PHOTO_SIDE, photoQuality: 80 }
    },
    { id: 'epBusy', type: 'Switch', label: 'Sending a photo' },
    fn('epPhoto', 'The photo, while the page is open', EDIT_PHOTO, []),
    fn('epRemoveStamp', 'Take the photo off', REMOVE_FACE, ['go']),
    fn('epGather', 'The profile, as one save', EDIT_GATHER, ['go', 'held'], ['name', 'name0', 'bio', 'bio0', 'choice', 'photo']),
    call('epCall', 'editProfile(profile)', FN_EDIT_PROFILE),
    go('epToProfile', 'To your profile', PROFILE_PAGES.member),
    go('epToWaiting', 'Not let in yet: to waiting', GRAM_PAGES.waiting)
  ],
  connections: [
    wire('epRoot', 'didMount', 'epLoad', 'run'),
    wire('epLoad', 'out-ok', 'epContent', 'mounted'),
    wire('epLoad', 'out-band', 'epBar', 'band'),
    wire('epLoad', 'out-waiting', 'epToWaiting', 'navigate'),
    ...refusedWires('ep', 'epLoad'),
    wire('epLoad', 'out-memberId', 'epToProfile', 'pm-memberId'),
    wire('epBack', 'onClick', 'epToProfile', 'navigate'),
    wire('epLoad', 'out-initials', 'epInitials', 'text'),
    wire('epLoad', 'out-shade', 'epAv', 'backgroundColor'),
    wire('epLoad', 'out-current', 'epPhoto', 'in-current'),
    wire('epPhoto', 'out-face', 'epFace', 'src'),
    wire('epPhoto', 'out-hasFace', 'epFace', 'mounted'),
    wire('epPhoto', 'out-noFace', 'epInitials', 'mounted'),
    wire('epPhoto', 'out-canRemove', 'epRemove', 'mounted'),
    wire('epChange', 'onClick', 'epPick', 'open'),
    wire('epPick', 'file', 'epUpload', 'file'),
    wire('epPick', 'done', 'epUpload', 'upload'),
    wire('epPick', 'done', 'epBusy', 'on'),
    wire('epUpload', 'completed', 'epBusy', 'off'),
    wire('epBusy', 'state', 'epUploading', 'mounted'),
    wire('epUpload', 'error', 'epPhotoError', 'text'),
    wire('epUpload', 'cloudFile', 'epPhoto', 'in-added'),
    wire('epRemove', 'onClick', 'epRemoveStamp', 'run'),
    wire('epRemoveStamp', 'out-removed', 'epPhoto', 'in-removed'),
    ...(['name', 'bio'] as const).flatMap((f) => {
      const id = f === 'name' ? 'epName' : 'epBio';
      return [wire('epLoad', `out-${f}`, id, 'startValue'), wire('epLoad', `out-${f}`, 'epGather', `in-${f}0`), wire(id, 'onTextChanged', 'epGather', `in-${f}`)];
    }),
    wire('epPhoto', 'out-choice', 'epGather', 'in-choice'),
    wire('epPhoto', 'out-photo', 'epGather', 'in-photo'),
    wire('epSave', 'onClick', 'epGather', 'run'),
    wire('epGather', 'out-problem', 'epError', 'text'),
    wire('epGather', 'out-profile', 'epCall', 'in-profile'),
    wire('epGather', 'out-go', 'epCall', 'call'),
    wire('epCall', 'error', 'epError', 'text'),
    wire('epCall', 'done', 'epToProfile', 'navigate')
  ]
};

/** Leaves first, then the pages that place them. */
export const GRAM_SLICE3_LEAVES: PageComponent[] = [TILE, COUNT];
export const GRAM_SLICE3_PAGES: PageComponent[] = [MEMBER, EDIT];
