/**
 * P112 OWN-026 FIX-01 — what an agent is told when its backend enforces its rules.
 *
 * One copy, read by `provision_backend` and `set_backend_enforcement`, because it is the sentence
 * that replaces "the rules are written but not enforced": what a query returns now, how to share a
 * collection, and how a value several devices change is changed. Generic on purpose (FIX README
 * rule 3): it teaches the backend, never a particular app.
 */
export const ENFORCED_RULES_NOTE =
  'The rules are enforced on this machine as they are deployed. A request with no signed-in user is refused; a ' +
  'record a user creates is read and changed only by that user (creatorOwns), so a query already returns only the ' +
  "signed-in user's own records, with no owner filter needed. Records the backend tools create have no owner: every " +
  'signed-in user reads them. A collection all signed-in users share needs set_collection_permissions with ' +
  'creatorOwns: false; one visitors read before signing in needs find and get "public". A value several devices ' +
  'change (a count, a score, a balance) is changed on the server by the amount, never written back whole from what ' +
  "a page holds: in a Function node, await Noodl.Records.increment(id, { field: amount }, { className: '<collection>' }), " +
  'which updates the record to the server\'s total; or Update Record with Only If Unchanged. Test as two users: what ' +
  'one creates, the other must not read.';

export const OPEN_RULES_NOTE =
  'Dev-open: the rules are written but NOT enforced, so anyone on this machine reads and changes every record, ' +
  'signed in or not, and what you test is not what ships (a deploy refuses to start this way). Call ' +
  'set_backend_enforcement with enforced: true.';
