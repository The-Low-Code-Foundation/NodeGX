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
  'creatorOwns: false; one visitors read before signing in needs find and get "public". One everyone reads but ' +
  'only the person who made a record changes or deletes: creatorOwns: false, update and delete "creator". Every record a signed-in ' +
  "user makes says who made it in owner, written by the backend from their session; a page never sends it, and no " +
  'other field proves whose a record is: a field the page fills from the User id is whatever the caller sent. Where ' +
  'a cloud function decides who sees what, it checks owner. Records several people may change: a role named from ' +
  "the owner's id, joined only in a cloud function from an invitation's owner; and a collection only a function " +
  'should write keeps create "nobody", because a check in a function guards only its own door (example ' +
  'cloud-members-can-edit-my-records). A value several devices ' +
  'change (a count, a score, a balance) is changed on the server by the amount, never written back whole from what ' +
  'a page holds: Update Record with Add To naming the field and the change (1, -1) wired into it, which updates the ' +
  "record to the server's total (in a script, Noodl.Records.increment); or Update Record with Only If Unchanged. Test as two users: what " +
  'one creates, the other must not read.';

export const OPEN_RULES_NOTE =
  'Dev-open: the rules are written but NOT enforced, so anyone on this machine reads and changes every record, ' +
  'signed in or not, and what you test is not what ships (a deploy refuses to start this way). Call ' +
  'set_backend_enforcement with enforced: true.';
