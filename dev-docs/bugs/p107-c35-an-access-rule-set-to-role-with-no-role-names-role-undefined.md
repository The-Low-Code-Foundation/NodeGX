---
id: P107-C35
title: An access rule set to Role with no Role named writes the ACL key `role:undefined`
status: fixed
commit: 8ec177377
phase: P109
task: ISL-029
severity: low
area: runtime / Record family — Create / Update Record, `addAccessControl` `_getACL`
found: P107 (the node says what it does) s22, 2026-10-02
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/SetDbModelProperties.json "a Role rule naming no role refuses the save: the not-sendable sentence, nothing written or sent; named, the save goes out with it (v3, C35)" (and NewDbModelProperties.json "access rules: … (v3, C35)")
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.5 (row C35); scenario `NewDbModelProperties.json` "a Role rule with no Role names `role:undefined`"
---

An access rule set to Role with no Role named writes the ACL key `role:undefined`.

**Where:** `packages/noodl-runtime/src/nodes/std-library/data/dbmodelcrudbase.ts` `_getACL` (:1014-1016):
`acl['role:' + rule.role] = _rule(rule)` with no guard. NDA-012 fixed the same shape on the User branch (:1000-1013 —
"an unresolvable user is not a user": `acl['undefined']` locked a record to a principal that cannot exist); the Role
branch was not touched.

**What the call shows (measured s22, probe then scenario):** a rule with Target `role` and the Role port never written
→ the create carries `acl: { "role:undefined": { read: true, write: true } }`. Because the ACL is then non-empty, the
"no rules, no ACL" path cannot rescue it: on the NodeGX backend the record is readable and writable only by a role
called `undefined`.

**Plain words:** *"If you add an access rule, pick 'Role', and forget to type the role's name, the record gets locked to
a role literally called 'undefined' — nobody can read it."*

**Proposed:** skip the rule when the Role is empty, as the User branch does (`if (rule.role) acl['role:' + rule.role] =
…`). A behaviour change; ships alone.

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Refuse the save and say why".** The node fires Failure with a sentence saying the Role rule has no role named. Nothing is saved. The author finds the slip at once. A modest change, and an app with this slip stops saving until it is fixed. The question as asked: *"What should happen when a Role access rule has no role named?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 8ec177377 (P109 ISL-029, 2026-10-06), as ruled.**
