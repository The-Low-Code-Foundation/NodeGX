/**
 * TWO-005 slice 4 — the community app's cloud function for "🙏 I prayed".
 *
 * Slice 2's shape (`two005Feed.ts`): nobody writes a row directly, every write is a function, as the system, after
 * checking who is writing. A prayer request is a post whose `kind` is `prayer`; `sharePost` makes it.
 *
 * - **`prayFor`** (members and admins): "I prayed" on a prayer request, or taken back (the world: "undo: removing this
 *   one"). Says what it should be rather than toggling, as a heart does, so a press that arrives twice changes nothing.
 * - 🔴 **W4: only the person who asked sees who prayed.** The policy lets a member read their own `Prayed` rows and
 *   the rows on their own requests, and nothing else, so another member can't count them. The count every member
 *   sees is therefore kept on the request (`Post.prayedCount`), counted by person and written here after each press.
 *   Two presses finishing at the same instant can leave it one out until the next press: each counts after its own
 *   write, and the later write wins.
 *
 * A request that is hidden, or whose member is blocked, is out of the feed: nobody prays on it here.
 *
 * @module noodl-mcp/tests/two005Prayer
 */
import { CloudComponent, scripted } from './two003Cloud';
import { FEED_PRELUDE } from './two005Feed';

export const FN_PRAY_FOR = 'prayFor';

/** The policy's `functions` block for slice 4. */
export const GRAM_SLICE4_FUNCTION_RULES: Record<string, { call: unknown; rateLimit?: { ratePerMinute: number; burst: number } }> = {
  [FN_PRAY_FOR]: { call: ['role:member', 'role:admin'], rateLimit: { ratePerMinute: 60, burst: 20 } }
};

// ── prayFor ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** `{ postId, on }`: on is "I prayed", off takes it back. Answers `{ prayed, count }`, the count by person. */
export const PRAY_FOR_SCRIPT = `${FEED_PRELUDE}
async function prayedOn(postId) {
  var all = await Noodl.Records.query('Prayed', { post: { equalTo: ptr('Post', postId) } }, { plain: true, limit: 10000 });
  var people = {};
  all.forEach(function (r) { people[idOf(r.doneBy)] = true; });
  return Object.keys(people).length;
}
var a = Inputs.prayer;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object' || typeof a.on !== 'boolean') { refuse('Say whether you prayed.'); return; }
if (!(await inMember(Inputs.userId))) { refuse('Only members who’ve been let in can pray for a request.'); return; }
var postId = text(a.postId, 64);
var p = await postInFeed(postId);
if (!p) { refuse('This prayer request isn’t in the feed any more.'); return; }
if (p.kind !== 'prayer') { refuse('Only a prayer request has I prayed.'); return; }
var onPost = { post: { equalTo: ptr('Post', postId) } };
var mine = await Noodl.Records.query('Prayed', { and: [onPost, { doneBy: { equalTo: ptr('_User', Inputs.userId) } }] }, { plain: true, limit: 100 });
if (a.on && mine.length === 0) await Noodl.Records.create('Prayed', { post: ptr('Post', postId), at: now(), doneBy: ptr('_User', Inputs.userId) });
if (!a.on) for (var i = 0; i < mine.length; i++) await Noodl.Records.delete(mine[i].objectId, { className: 'Prayed' });
var count = await prayedOn(postId);
// Written only when it moved: a press that changes nothing must not make every phone read the feed again.
if (count !== p.prayedCount) await Noodl.Records.save(postId, { prayedCount: count }, { className: 'Post' });
Outputs.prayed = { prayed: a.on, count: count };
Outputs.done();`;

export const GRAM_SLICE4_CLOUD: CloudComponent[] = [
  scripted(FN_PRAY_FOR, 'I prayed on a prayer request, or taken back; the count, by person, kept on the request', 'prayer', PRAY_FOR_SCRIPT, 'prayed')
];
