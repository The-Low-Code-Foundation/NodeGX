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
 *   3. Three JSON DOCUMENTS are stored as JSON TEXT (`STORED_AS_TEXT`). A WORKAROUND,
 *      named, and owned here alone: `Noodl.Records` turns every nested object into a
 *      Model with a generated id (`_deserializeJSON` in noodl-runtime cloudstore.js),
 *      so a lesson came back with every section's `id` replaced by a random one —
 *      and the lesson's steps index its sections BY id — and `facts` gained a random
 *      `id` key on every call. Found by the first live run of L170, invisible
 *      offline. And the text carries a `json:` PREFIX, because plain JSON text did
 *      not survive either: the SQL adapter's `deserializeValue` (noodl-runtime
 *      local-sql QueryBuilder.ts) JSON-parses ANY string that starts and ends with
 *      brackets, even in a `String` column — so the text came back an object and
 *      Records Model-ized it all the same. A second core defect under the first,
 *      found by reading the column back rather than trusting check-seed, which
 *      decodes either shape and could not tell. Removed when OpenNoodl HLT-022
 *      lands: this map, the prefix, the three schema types, and each function's
 *      `fromText`.
 */

/** What marks a stored JSON document — never a bracket, which the adapter would sniff. */
export const TEXT_PREFIX = 'json:';

/** Stored as JSON text until HLT-022 — see point 3 above. */
export const STORED_AS_TEXT = { Lesson: ['sections', 'steps'], ProjectContext: ['facts'] };

const encodeText = (collection, row) => {
  const fields = STORED_AS_TEXT[collection];
  if (!fields) return row;
  const out = { ...row };
  for (const k of fields) if (out[k] !== undefined && out[k] !== null) out[k] = TEXT_PREFIX + JSON.stringify(out[k]);
  return out;
};

/** The inverse, for a reader comparing the backend's rows with the seed. */
export const decodeText = (collection, row) => {
  const fields = STORED_AS_TEXT[collection];
  if (!fields) return row;
  const out = { ...row };
  for (const k of fields) {
    if (out[k] === undefined || out[k] === null) continue;
    // STRICT on purpose: the first version passed an object straight through, so
    // check-seed could not see that the backend had turned the text back into one.
    if (typeof out[k] !== 'string') throw new Error(`${collection}.${k} read back as ${typeof out[k]}, not stored text — it did not survive`);
    if (!out[k].startsWith(TEXT_PREFIX)) throw new Error(`${collection}.${k} is stored text without the ${TEXT_PREFIX} prefix`);
    out[k] = JSON.parse(out[k].slice(TEXT_PREFIX.length));
  }
  return out;
};

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
  let out = encodeText(collection, row);
  const ref = USER_REFERENCES[collection];
  if (ref) {
    const [from, to] = ref;
    const { [from]: name, ...rest } = out;
    out = { ...rest, [to]: userIdOf(name) };
  }
  return out;
}
