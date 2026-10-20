/**
 * TWO-005 slice 5 — the community app's cloud functions for moderation: reporting, hiding, blocking, and the
 * community's rules.
 *
 * Slice 2's shape (`two005Feed.ts`): nobody writes a row directly, every write is a function, as the system, after
 * checking who is writing. The world's rules this slice keeps (`templates/gram/docs/WORLD.md`):
 *
 * - **Nothing is deleted** (rule 1). A hidden post or comment keeps everything; members stop seeing it, admins still do,
 *   with the reason. 🔴 **"Members stop seeing it" is the row's ACL, not the page's filter** (TWO-001 §7.1): the policy
 *   lets every member read every post, and there is no rule for "every post that isn't hidden", so hiding writes the
 *   row's ACL (`ADMINS_ONLY`) and bringing it back opens it to whoever the policy lets read (`POLICY_READS`). A
 *   member who asks the backend for it directly gets nothing.
 * - **A blocked member can't sign in, and their posts and comments are hidden from members until they're let back**
 *   (rule 2). Blocking switches their sign-in off (Update User `disabled`, as `turnAway` does) and gives every post and
 *   comment of theirs the same ACL; letting them back opens each one that isn't hidden for its own reason.
 *   Blocking always records why.
 * - **A report is kept, never shown to the member reported, and only admins see who reported what** (rule 4): the
 *   policy's `Report` and `CommentReport` are the admins' to read, and nobody writes one but `report`.
 * - **Who changed the rules is kept** (rule 6): `writeRules` writes the community's history.
 *
 * - **`report`** (members and admins): a post or a comment, with one of the world's reasons and, for "something else",
 *   a few words. A person reports a thing once: a second report from them answers as the first did and keeps nothing
 *   more. Your own post isn't reported: you take it down.
 * - **`hide`** (members and admins): `hidden: true` hides it, `false` brings it back. A member takes down their own;
 *   an admin hides anyone's, saying why. Only an admin brings one back (a member's own taken down included).
 * - **`block`** (admins): `blocked: true` blocks a member with why; `false` lets them back. Not yourself, not an admin.
 * - **`writeRules`** (admins): the community's rules, every member's to read on the Rules page.
 *
 * @module noodl-mcp/tests/two005Moderate
 */
import { CloudComponent, scripted } from './two003Cloud';
import { quiet, signals, wire } from './two003Pages';
import { FEED_PRELUDE } from './two005Feed';

export const FN_REPORT = 'report';
export const FN_HIDE = 'hide';
export const FN_BLOCK = 'block';
export const FN_WRITE_RULES = 'writeRules';

const MEMBERS_AND_ADMINS = ['role:member', 'role:admin'];

/** The policy's `functions` block for slice 5. */
export const GRAM_SLICE5_FUNCTION_RULES: Record<string, { call: unknown; rateLimit?: { ratePerMinute: number; burst: number } }> = {
  [FN_REPORT]: { call: MEMBERS_AND_ADMINS, rateLimit: { ratePerMinute: 10, burst: 5 } },
  [FN_HIDE]: { call: MEMBERS_AND_ADMINS, rateLimit: { ratePerMinute: 20, burst: 10 } },
  [FN_BLOCK]: { call: 'role:admin' },
  [FN_WRITE_RULES]: { call: 'role:admin' }
};

/**
 * The world's reasons for reporting a post, in the order the form offers them and the queue ranks them: a child shown
 * without a parent's yes first (the world: "so admins see those first").
 */
export const POST_REASONS: ReadonlyArray<{ value: string; words: string }> = [
  { value: 'child-photo', words: 'A child shown without a parent’s yes' },
  { value: 'unkind', words: 'Unkind' },
  { value: 'spam', words: 'Spam' },
  { value: 'other', words: 'Something else' }
];
/** A comment has no photo: the same reasons, less the child's. */
export const COMMENT_REASONS = POST_REASONS.filter((r) => r.value !== 'child-photo');

/** A report's note, and an admin's reason for hiding or blocking, at most this long (refused, not cut). */
export const MOST_NOTE = 500;
export const MOST_REASON = 500;
/** The community's rules at most this long. */
export const MOST_RULES = 5000;
/** What a member taking their own post or comment down records as the reason (they aren't asked why). */
export const TAKEN_DOWN = 'Taken down by the member who wrote it.';
/** The row ACL of a hidden post or comment, and of every one a blocked member wrote: the admins read it, nobody else. */
export const ADMINS_ONLY = { 'role:admin': { read: true } };
/**
 * The row ACL of one brought back: anyone the policy lets read the collection (members and admins), as a row with no
 * ACL is. 🔴 A row's ACL can be replaced and never cleared: the backend drops an `ACL: null` from a write (measured
 * s15, `parse-wire.ts` `classPut`), so "no ACL again" is this.
 */
export const POLICY_READS = { '*': { read: true } };

/** The feed's prelude, with the comment's own "in the feed" and the reasons. */
export const MODERATE_PRELUDE = `${FEED_PRELUDE}
async function commentInFeed(id) {
  var c = id ? await one('Comment', { objectId: { equalTo: id } }) : null;
  if (!c || c.endedAt) return null;
  var by = await one('Member', { objectId: { equalTo: idOf(c.member) } });
  if (!by || by.endedAt) return null;
  return (await postInFeed(idOf(c.post))) ? c : null;
}
function said(v) { return typeof v === 'string' ? v.trim() : ''; }
var ADMINS_ONLY = ${JSON.stringify(ADMINS_ONLY)};
var POLICY_READS = ${JSON.stringify(POLICY_READS)};
`;

// ── report ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export const REPORT_SCRIPT = `${MODERATE_PRELUDE}
var a = Inputs.report;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object') { refuse('Say what you’re reporting, and why.'); return; }
var m = await inMember(Inputs.userId);
if (!m) { refuse('Only members who’ve been let in can report.'); return; }
var note = said(a.note);
if (note.length > ${MOST_NOTE}) { refuse('A note of ${MOST_NOTE} characters or fewer.'); return; }
var isComment = typeof a.commentId === 'string' && a.commentId !== '';
var reasons = isComment ? ${JSON.stringify(COMMENT_REASONS.map((r) => r.value))} : ${JSON.stringify(POST_REASONS.map((r) => r.value))};
if (reasons.indexOf(a.reason) < 0) { refuse(isComment ? 'Say why: unkind, spam or something else.' : 'Say why: a child shown without a parent’s yes, unkind, spam or something else.'); return; }
if (a.reason === 'other' && !note) { refuse('Say in a few words what’s wrong.'); return; }
var row = isComment ? await commentInFeed(text(a.commentId, 64)) : await postInFeed(text(a.postId, 64));
if (!row) { refuse(isComment ? 'This comment isn’t in the feed any more.' : 'This post isn’t in the feed any more.'); return; }
if (idOf(row.member) === m.objectId) { refuse(isComment ? 'This is your own comment. Take it down instead.' : 'This is your own post. Take it down instead.'); return; }
var cls = isComment ? 'CommentReport' : 'Report';
var field = isComment ? 'comment' : 'post';
var on = {};
on[field] = { equalTo: ptr(isComment ? 'Comment' : 'Post', row.objectId) };
// Reported once by each person: the first report stands (the world: a report can't be taken back).
var before = await Noodl.Records.query(cls, { and: [on, { doneBy: { equalTo: ptr('_User', Inputs.userId) } }] }, { plain: true, limit: 1 });
if (before.length === 0) {
  var made = { at: now(), doneBy: ptr('_User', Inputs.userId), reason: a.reason };
  made[field] = ptr(isComment ? 'Comment' : 'Post', row.objectId);
  if (note) made.note = note;
  await Noodl.Records.create(cls, made);
}
Outputs.reported = true;
Outputs.done();`;

// ── hide ───────────────────────────────────────────────────────────────────────────────────────────────────────────

export const HIDE_SCRIPT = `${MODERATE_PRELUDE}
var a = Inputs.hide;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object' || typeof a.hidden !== 'boolean') { refuse('Say whether to hide it or bring it back.'); return; }
var m = await inMember(Inputs.userId);
if (!m) { refuse('Only members who’ve been let in can take a post down.'); return; }
var admin = m.role === 'admin';
var isComment = typeof a.commentId === 'string' && a.commentId !== '';
var cls = isComment ? 'Comment' : 'Post';
var thing = isComment ? 'comment' : 'post';
var id = text(isComment ? a.commentId : a.postId, 64);
var row = id ? await one(cls, { objectId: { equalTo: id } }) : null;
if (!row) { refuse('There is no such ' + thing + '.'); return; }
var mine = idOf(row.member) === m.objectId;
Outputs.id = id;
if (a.hidden) {
  if (!mine && !admin) { refuse('Only an admin can hide someone else’s ' + thing + '. Report it instead.'); return; }
  var why = '${TAKEN_DOWN}';
  if (!mine) {
    why = said(a.reason);
    if (!why) { refuse('Say why it’s hidden. Admins see the reason; the member who wrote it doesn’t.'); return; }
    if (why.length > ${MOST_REASON}) { refuse('A reason of ${MOST_REASON} characters or fewer.'); return; }
  }
  // Hidden already: it stays as it was hidden, with its first reason.
  if (row.endedAt) { Outputs.done(); return; }
  await Noodl.Records.save(id, { endedAt: now(), hiddenReason: why }, { className: cls, acl: ADMINS_ONLY });
  Outputs.done();
  return;
}
if (!admin) { refuse('Only an admin can bring back a ' + thing + '.'); return; }
if (!row.endedAt) { Outputs.done(); return; }
var by = await one('Member', { objectId: { equalTo: idOf(row.member) } });
if (by && by.endedAt) { refuse(by.name + ' is blocked. Let them back first, and their ' + thing + 's come back with them.'); return; }
await Noodl.Records.save(id, { endedAt: null, hiddenReason: null }, { className: cls, acl: POLICY_READS });
Outputs.done();`;

// ── block ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Blocked, with why, or let back; its history; and the ACL on everything they wrote. The sign-in is switched by the
 * Update User after it (`disabled`), which every backend door checks.
 */
export const BLOCK_SCRIPT = `${MODERATE_PRELUDE}
var a = Inputs.block;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object' || typeof a.blocked !== 'boolean') { refuse('Say whether to block them or let them back.'); return; }
var me = await member(Inputs.userId);
var id = text(a.memberId, 64);
var t = id ? await one('Member', { objectId: { equalTo: id } }) : null;
if (!t) { refuse('There is no such member.'); return; }
if (me && t.objectId === me.objectId) { refuse('You can’t block yourself.'); return; }
var reason = said(a.reason);
if (a.blocked) {
  if (t.role === 'admin') { refuse(t.name + ' is an admin. An admin can’t be blocked.'); return; }
  if (!reason) { refuse('Say why. Admins see the reason; ' + t.name + ' doesn’t.'); return; }
  if (reason.length > ${MOST_REASON}) { refuse('A reason of ${MOST_REASON} characters or fewer.'); return; }
}
Outputs.loginId = idOf(t.login);
Outputs.disabled = a.blocked;
Outputs.id = id;
// Already so: nothing to change but the sign-in, which is put as it should be either way.
if (!!t.endedAt === a.blocked) { Outputs.done(); return; }
if (a.blocked) {
  await Noodl.Records.save(id, { blockedReason: reason, endedAt: now() }, { className: 'Member' });
  await history('Member', 'member', id, Inputs.userId, { blocked: { from: false, to: true }, blockedReason: { from: null, to: reason } });
} else {
  await Noodl.Records.save(id, { blockedReason: null, endedAt: null }, { className: 'Member' });
  await history('Member', 'member', id, Inputs.userId, { blocked: { from: true, to: false }, blockedReason: { from: t.blockedReason || null, to: null } });
}
// What they wrote: hidden from members with them, and back with them, all but what was hidden for its own reason.
var theirs = { member: { equalTo: ptr('Member', id) } };
var classes = ['Post', 'Comment'];
for (var k = 0; k < classes.length; k++) {
  var rows = await Noodl.Records.query(classes[k], theirs, { plain: true, limit: 10000 });
  for (var i = 0; i < rows.length; i++) {
    if (!a.blocked && rows[i].endedAt) continue;
    await Noodl.Records.save(rows[i].objectId, {}, { className: classes[k], acl: a.blocked ? ADMINS_ONLY : POLICY_READS });
  }
}
Outputs.done();`;

const BLOCK: CloudComponent = {
  name: FN_BLOCK,
  path: `#__cloud__/${FN_BLOCK}`,
  description: 'Block a member, with why, or let them back: their sign-in, and what they wrote',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', label: 'block(block)', parameters: { params: 'block', 'ptype-block': 'object', 'preq-block': true, allowNoAuth: false } },
    { id: 'run', type: 'JavaScriptFunction', label: 'Blocked or let back, its history, and what they wrote', ports: signals('done', 'refused'), parameters: { functionScript: BLOCK_SCRIPT, ...quiet('block', 'userId') } },
    // `disabled` is the account flag every backend door checks, a magic link included; the generic store can't write it.
    { id: 'login', type: 'noodl.cloud.updateuser', label: 'Their sign-in, off or on', parameters: { properties: 'disabled' } },
    { id: 'ok', type: 'noodl.cloud.response', label: 'Done', parameters: { params: 'id' } },
    { id: 'no', type: 'noodl.cloud.response', label: 'Refused', parameters: { status: 'failure', errorMessage: 'That could not be done.' } }
  ],
  connections: [
    wire('req', 'userId', 'run', 'in-userId'),
    wire('req', 'pm-block', 'run', 'in-block'),
    wire('req', 'receive', 'run', 'run'),
    wire('run', 'out-loginId', 'login', 'userId'),
    wire('run', 'out-disabled', 'login', 'prop-disabled'),
    wire('run', 'out-done', 'login', 'store'),
    wire('run', 'out-id', 'ok', 'pm-id'),
    wire('login', 'done', 'ok', 'send'),
    wire('login', 'failure', 'no', 'send'),
    wire('run', 'out-reason', 'no', 'errorMessage'),
    wire('run', 'out-refused', 'no', 'send'),
    wire('run', 'failure', 'no', 'send')
  ]
};

// ── writeRules ─────────────────────────────────────────────────────────────────────────────────────────────────────

export const WRITE_RULES_SCRIPT = `${MODERATE_PRELUDE}
var a = Inputs.rules;
if (a === undefined || Inputs.userId === undefined) return;
var rules = a && typeof a === 'object' ? said(a.rules) : '';
if (!rules) { refuse('Write the rules first.'); return; }
if (rules.length > ${MOST_RULES}) { refuse('Rules of ${MOST_RULES.toLocaleString('en-GB')} characters or fewer.'); return; }
var c = await one('Community', {});
if (!c) { refuse('The community isn’t set up yet.'); return; }
Outputs.saved = true;
if ((c.rules || '') === rules) { Outputs.done(); return; }
await Noodl.Records.save(c.objectId, { rules: rules }, { className: 'Community' });
await history('Community', 'community', c.objectId, Inputs.userId, { rules: { from: c.rules || null, to: rules } });
Outputs.done();`;

export const GRAM_SLICE5_CLOUD: CloudComponent[] = [
  scripted(FN_REPORT, 'Report a post or a comment to the admins, saying why', 'report', REPORT_SCRIPT, 'reported'),
  scripted(FN_HIDE, 'Hide a post or a comment from the members (your own, or as an admin), or bring it back', 'hide', HIDE_SCRIPT, 'id'),
  BLOCK,
  scripted(FN_WRITE_RULES, 'The community’s rules, and who changed them', 'rules', WRITE_RULES_SCRIPT, 'saved')
];
