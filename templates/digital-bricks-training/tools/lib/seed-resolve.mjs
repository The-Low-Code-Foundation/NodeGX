/**
 * WHAT A SEED ROW BECOMES IN THE BACKEND — the one owner of that transformation.
 *
 * `setup-backend.mjs` writes it and `check-read-functions.mjs` needs exactly the
 * same rows to test against offline. They were two spellings for one day, and
 * the offline check passed against rows the backend never holds: `seed.json`
 * names a learner's account by USERNAME, the backend stores its OBJECT ID, so
 * every function that joined on `username` found Sam offline and nobody live
 * (TASK-L170 §0). One module, imported by both, so the two cannot part company.
 *
 * Three things happen on the way in, and each is a fact about the backend:
 *   1. A user is created WITHOUT its null fields (the backend has no column
 *      value for "absent" that round-trips any other way).
 *   2. A username a row names becomes the objectId just minted for that user.
 *   (An empty object used to be left off the row — the NodeGX `{}` defect. HLT-018
 *   fixed it in core, and the workaround was removed in L170: it had nothing left
 *   to drop once `facts` became text, and a `{}` that stops round-tripping must
 *   now fail check-seed rather than be excused by it. HLT-018 AC5.)
 *   (Three JSON documents — a lesson's `sections` and `steps`, a context's
 *   `facts` — were stored as `json:`-prefixed TEXT for one day, because
 *   `Noodl.Records` Model-ized nested objects (every section id came back random)
 *   and the SQL adapter JSON-parsed any bracketed string even in a `String`
 *   column. OpenNoodl HLT-022 fixed both — `{ plain: true }` on the read, and a
 *   `String` column is never sniffed — and the workaround was removed whole: this
 *   map, the prefix, the three schema types and every function's `fromText`.
 *   HLT-022 AC6.)
 */

/** The fields that name a user, per collection: seed field → backend field. */
export const USER_REFERENCES = {
  LearnerProfile: ['username', 'userId'],
  ConversationMessage: ['authorUsername', 'authorUserId']
};

/** A user's fields as they are written: roles are applied separately; nulls are not written. */
export const userFields = (u) => {
  const { roles = [], ...fields } = u;
  return { fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null)), roles };
};

/** One seed row as the backend holds it, given how a username maps to an objectId. */
export function resolveRow(collection, row, userIdOf) {
  let out = row;
  const ref = USER_REFERENCES[collection];
  if (ref) {
    const [from, to] = ref;
    const { [from]: name, ...rest } = out;
    out = { ...rest, [to]: userIdOf(name) };
  }
  return out;
}
