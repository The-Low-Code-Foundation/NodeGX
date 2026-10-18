/**
 * TWO-005 slice 2 — the community app's cloud functions for posting, hearting and commenting.
 *
 * Slice 1's shape (`two005Cloud.ts`): nobody writes a row directly, every write is one of these, as the system, after
 * checking who is writing. Each is Request → one script → Done / Refused (`scripted`, the marketplace's).
 *
 * - **`sharePost`** (members and admins): a caption, up to four photos, or both. 🔴 The world's rule for children is
 *   that nothing a member posts is public (W1), so every photo must be one the poster uploaded, private, and shared
 *   with the members and the admins (`X-NodeGX-File-Readers`, P121-TWO001-MEMBERSPHOTO). The function reads each
 *   file's own row to check (its owner, `private`, and `readers`: a record read never carries the ACL itself), so a
 *   hand-made call can't put a public photo, or someone else's, in the feed. Slice 4: a post's `kind` may be
 *   `prayer`, a prayer request, which is words only and starts with nobody having prayed (`two005Prayer.ts`).
 *   Slice 4b: `testimony` (words needed, photos allowed) and `event` (words and `eventOn` needed: the world requires
 *   the date for that kind, and the database doesn't keep that rule, so this function does).
 * - **`heartPost`** (members and admins): a heart on, or off again (the world: "undo: removing this one"). Says
 *   what it should be rather than toggling, so a second tap that arrives twice changes nothing. Answers the count,
 *   counted by person, so a heart made twice by a race still counts once.
 * - **`commentOn`** (members and admins): a few words under a post.
 *
 * A post that is hidden, or whose member is blocked, is out of the feed: none of the three touches it (the world:
 * "their posts and comments are hidden from members until they are let back").
 *
 * @module noodl-mcp/tests/two005Feed
 */
import { CloudComponent, scripted } from './two003Cloud';
import { GRAM_PRELUDE } from './two005Cloud';

export const FN_SHARE_POST = 'sharePost';
export const FN_HEART_POST = 'heartPost';
export const FN_COMMENT_ON = 'commentOn';

const MEMBERS_AND_ADMINS = ['role:member', 'role:admin'];

/** The policy's `functions` block for slice 2. */
export const GRAM_SLICE2_FUNCTION_RULES: Record<string, { call: unknown; rateLimit?: { ratePerMinute: number; burst: number } }> = {
  [FN_SHARE_POST]: { call: MEMBERS_AND_ADMINS, rateLimit: { ratePerMinute: 10, burst: 5 } },
  [FN_HEART_POST]: { call: MEMBERS_AND_ADMINS, rateLimit: { ratePerMinute: 60, burst: 20 } },
  [FN_COMMENT_ON]: { call: MEMBERS_AND_ADMINS, rateLimit: { ratePerMinute: 20, burst: 10 } }
};

/**
 * The kinds a member can share: the world's four (slice 4 added the prayer request, slice 4b the testimony and the
 * event).
 */
export const SHARED_KINDS = ['post', 'prayer', 'testimony', 'event'];
/** What a kind told in words says when it has none (a post may be a photo alone). */
export const WORDS_NEEDED: Record<string, string> = {
  prayer: 'Say what you’d like the members to pray for.',
  testimony: 'Tell the members what happened.',
  event: 'Say what the event is.'
};
/** How far ahead an event may be, in days: a year, so a mistyped year is refused rather than kept. */
export const MOST_EVENT_AHEAD_DAYS = 366;

/** At most this many photos in one post. */
export const MOST_POST_PHOTOS = 4;
/** A caption's longest, in characters. */
export const MOST_CAPTION = 2200;
/** A comment's longest, in characters. */
export const MOST_COMMENT = 1000;
/**
 * Who reads a photo in a post: what the posting page uploads it with, and what `sharePost` checks it carries. The
 * first admin holds `role:admin` alone, so both are named.
 */
export const PHOTO_READERS = 'role:member, role:admin';

/**
 * Slice 1's prelude, with the checks every slice-2 function shares: the caller is a member who is in and not
 * blocked, and the post is in the feed (not hidden, its member not blocked).
 */
export const FEED_PRELUDE = `${GRAM_PRELUDE}
async function inMember(userId) {
  var m = await member(userId);
  return m && m.status === 'approved' && !m.endedAt ? m : null;
}
async function postInFeed(id) {
  var p = id ? await one('Post', { objectId: { equalTo: id } }) : null;
  if (!p || p.endedAt) return null;
  var by = await one('Member', { objectId: { equalTo: idOf(p.member) } });
  return by && !by.endedAt ? p : null;
}
/**
 * W1, for every photo a member puts in front of the others (a post's, a profile's): '' when it is the caller's,
 * shared with the members and the admins, a photo, and its link its own; otherwise what is wrong with it.
 */
async function photoProblem(f, userId) {
  var name = f && typeof f.name === 'string' ? f.name : '';
  var url = f && typeof f.url === 'string' ? f.url : '';
  var file = name ? await one('_Files', { storedName: { equalTo: name } }) : null;
  if (!file || idOf(file.owner) !== String(userId)) return 'mine';
  var readers = Array.isArray(file.readers) ? file.readers : [];
  var shared = ${JSON.stringify(PHOTO_READERS.split(', '))}.every(function (r) { return readers.indexOf(r) >= 0; });
  // No private check of its own: the backend writes readers only on a private file (an equivalent mutant said so).
  if (!shared) return 'public';
  if (String(file.contentType || '').indexOf('image/') !== 0) return 'image';
  if (url.slice(-(name.length + 7)) !== '/files/' + name) return 'mine';
  return '';
}
`;

// ── sharePost ──────────────────────────────────────────────────────────────────────────────────────────────────────

export const SHARE_POST_SCRIPT = `${FEED_PRELUDE}
var a = Inputs.post;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object') { refuse('Write something, or add a photo.'); return; }
var m = await inMember(Inputs.userId);
if (!m) { refuse('Only members who’ve been let in can post.'); return; }
var kind = a.kind === undefined ? 'post' : a.kind;
if (${JSON.stringify(SHARED_KINDS)}.indexOf(kind) < 0) { refuse('Share a post, a prayer request, a testimony or an event.'); return; }
var caption = typeof a.caption === 'string' ? a.caption.trim() : '';
if (caption.length > ${MOST_CAPTION}) { refuse('A caption of ${MOST_CAPTION.toLocaleString('en-GB')} characters or fewer.'); return; }
var photos = Array.isArray(a.photos) ? a.photos : [];
if (photos.length > ${MOST_POST_PHOTOS}) { refuse('${MOST_POST_PHOTOS} photos at most in one post.'); return; }
if (kind === 'prayer' && photos.length > 0) { refuse('A prayer request is words only.'); return; }
var wordsNeeded = ${JSON.stringify(WORDS_NEEDED)};
if (!caption && wordsNeeded[kind]) { refuse(wordsNeeded[kind]); return; }
if (!caption && photos.length === 0) { refuse('Write something, or add a photo.'); return; }
// An event's day and time, as an instant (the page sends the poster's local time as one). Only an event keeps it.
var eventOn = null;
if (kind === 'event') {
  var t = typeof a.eventOn === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(a.eventOn) ? Date.parse(a.eventOn) : NaN;
  if (!isFinite(t)) { refuse('Say when the event is: its day and its time.'); return; }
  if (t < Date.now()) { refuse('That time has passed. Choose when the event is.'); return; }
  if (t > Date.now() + ${MOST_EVENT_AHEAD_DAYS} * 86400000) { refuse('An event within the next year, at most.'); return; }
  eventOn = { __type: 'Date', iso: new Date(t).toISOString() };
}
var kept = [];
for (var i = 0; i < photos.length; i++) {
  var wrong = await photoProblem(photos[i], Inputs.userId);
  if (wrong === 'mine') { refuse('A photo in this post isn’t one you added.'); return; }
  if (wrong === 'public') { refuse('A photo in this post could be seen by people who aren’t members. Add it again in this app.'); return; }
  if (wrong === 'image') { refuse('Only photos can go in a post.'); return; }
  kept.push({ name: photos[i].name, url: photos[i].url });
}
var row = { caption: caption, photos: kept, kind: kind, member: ptr('Member', m.objectId) };
// Who prayed is the asker's to see (W4), so the count every member sees is kept on the request itself (prayFor).
if (kind === 'prayer') row.prayedCount = 0;
if (eventOn) row.eventOn = eventOn;
var made = await Noodl.Records.create('Post', row);
Outputs.postId = made.getId();
Outputs.done();`;

// ── heartPost ──────────────────────────────────────────────────────────────────────────────────────────────────────

export const HEART_POST_SCRIPT = `${FEED_PRELUDE}
var a = Inputs.heart;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object' || typeof a.on !== 'boolean') { refuse('Say whether the heart is on or off.'); return; }
if (!(await inMember(Inputs.userId))) { refuse('Only members who’ve been let in can heart a post.'); return; }
var postId = text(a.postId, 64);
if (!(await postInFeed(postId))) { refuse('This post isn’t in the feed any more.'); return; }
var onPost = { post: { equalTo: ptr('Post', postId) } };
var mine = await Noodl.Records.query('Heart', { and: [onPost, { doneBy: { equalTo: ptr('_User', Inputs.userId) } }] }, { plain: true, limit: 100 });
if (a.on && mine.length === 0) await Noodl.Records.create('Heart', { post: ptr('Post', postId), at: now(), doneBy: ptr('_User', Inputs.userId) });
if (!a.on) for (var i = 0; i < mine.length; i++) await Noodl.Records.delete(mine[i].objectId, { className: 'Heart' });
var all = await Noodl.Records.query('Heart', onPost, { plain: true, limit: 10000 });
var people = {};
all.forEach(function (h) { people[idOf(h.doneBy)] = true; });
Outputs.hearts = { hearted: a.on, count: Object.keys(people).length };
Outputs.done();`;

// ── commentOn ──────────────────────────────────────────────────────────────────────────────────────────────────────

export const COMMENT_ON_SCRIPT = `${FEED_PRELUDE}
var a = Inputs.comment;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object') { refuse('Write a comment first.'); return; }
var m = await inMember(Inputs.userId);
if (!m) { refuse('Only members who’ve been let in can comment.'); return; }
var words = typeof a.text === 'string' ? a.text.trim() : '';
if (!words) { refuse('Write a comment first.'); return; }
if (words.length > ${MOST_COMMENT}) { refuse('A comment of ${MOST_COMMENT.toLocaleString('en-GB')} characters or fewer.'); return; }
var postId = text(a.postId, 64);
if (!(await postInFeed(postId))) { refuse('This post isn’t in the feed any more.'); return; }
var made = await Noodl.Records.create('Comment', { text: words, post: ptr('Post', postId), member: ptr('Member', m.objectId) });
Outputs.commentId = made.getId();
Outputs.done();`;

export const GRAM_SLICE2_CLOUD: CloudComponent[] = [
  scripted(FN_SHARE_POST, 'Share a post with the members: a caption, photos shared with members only, or both', 'post', SHARE_POST_SCRIPT, 'postId'),
  scripted(FN_HEART_POST, 'A heart on a post, on or off; the count, by person', 'heart', HEART_POST_SCRIPT, 'hearts'),
  scripted(FN_COMMENT_ON, 'A comment under a post', 'comment', COMMENT_ON_SCRIPT, 'commentId')
];
