/**
 * TWO-005 slice 3 — the community app's cloud function for a member's own profile.
 *
 * Slice 1's shape (`two005Cloud.ts`): nobody writes a Member row directly (the policy's `update: nobody`), so a
 * member changes their own profile through this function, as the system, after checking who is writing.
 *
 * - **`editProfile`** (members and admins): their name, a short bio, and a photo, or no photo. 🔴 The photo is held to
 *   W1 exactly as a post's is (`photoProblem`, the feed's prelude): the caller's own upload, shared with the members
 *   and the admins, a photo. Every member sees every profile and nobody else does (the world), so a public profile
 *   photo would be the one thing a stranger could see.
 * - Only what changed is written, with its history (the world's rule 6 keeps who changed a member; a name is how the
 *   admins know who they let in).
 *
 * @module noodl-mcp/tests/two005Profile
 */
import { CloudComponent, scripted } from './two003Cloud';
import { FEED_PRELUDE } from './two005Feed';

export const FN_EDIT_PROFILE = 'editProfile';

/** The policy's `functions` block for slice 3. */
export const GRAM_SLICE3_FUNCTION_RULES: Record<string, { call: unknown; rateLimit?: { ratePerMinute: number; burst: number } }> = {
  [FN_EDIT_PROFILE]: { call: ['role:member', 'role:admin'], rateLimit: { ratePerMinute: 10, burst: 5 } }
};

/** A name's longest, as asking to join takes it. */
export const MOST_NAME = 80;
/** A bio's longest, in characters: a line or two under the name. */
export const MOST_BIO = 150;

// ── editProfile ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * `{ name, bio, photo }`: `photo` left out keeps the one there is, `null` takes it off, `{ name, url }` is a new one.
 * Too long is refused, never cut.
 */
export const EDIT_PROFILE_SCRIPT = `${FEED_PRELUDE}
var a = Inputs.profile;
if (a === undefined || Inputs.userId === undefined) return;
if (!a || typeof a !== 'object') { refuse('Say what to change.'); return; }
var m = await inMember(Inputs.userId);
if (!m) { refuse('Only members who’ve been let in have a profile.'); return; }
var name = typeof a.name === 'string' ? a.name.trim() : '';
if (!name) { refuse('Your name, as the community knows you.'); return; }
if (name.length > ${MOST_NAME}) { refuse('A name of ${MOST_NAME} characters or fewer.'); return; }
var bio = typeof a.bio === 'string' ? a.bio.trim() : '';
if (bio.length > ${MOST_BIO}) { refuse('A bio of ${MOST_BIO} characters or fewer.'); return; }
var next = { name: name, bio: bio };
var had = m.photo && m.photo.name ? String(m.photo.name) : null;
var photo = had;
if (a.photo === null) { next.photo = null; photo = null; }
else if (a.photo !== undefined) {
  var wrong = await photoProblem(a.photo, Inputs.userId);
  if (wrong === 'mine') { refuse('That photo isn’t one you added.'); return; }
  if (wrong === 'public') { refuse('That photo could be seen by people who aren’t members. Add it again in this app.'); return; }
  if (wrong === 'image') { refuse('Only a photo can be a profile photo.'); return; }
  next.photo = { __type: 'File', name: a.photo.name, url: a.photo.url };
  photo = a.photo.name;
}
var changes = diff({ name: m.name || '', bio: m.bio || '', photo: had }, { name: name, bio: bio, photo: photo });
if (Object.keys(changes).length > 0) {
  await Noodl.Records.save(m.objectId, next, { className: 'Member' });
  await history('Member', 'member', m.objectId, Inputs.userId, changes);
}
Outputs.memberId = m.objectId;
Outputs.done();`;

export const GRAM_SLICE3_CLOUD: CloudComponent[] = [
  scripted(FN_EDIT_PROFILE, 'Change your own profile: your name, a short bio, a photo only members see', 'profile', EDIT_PROFILE_SCRIPT, 'memberId')
];
