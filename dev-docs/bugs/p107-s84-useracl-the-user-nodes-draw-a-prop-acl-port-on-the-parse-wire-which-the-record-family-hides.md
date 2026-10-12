---
id: P107-S84-USERACL
title: On the Parse wire the User, Set User Properties and Sign Up nodes draw a `prop-ACL` port, which the Record family hides as "access control, not data"
status: fixed
commit: 1c3166c57
severity: low
area: noodl-runtime/src/nodes/std-library/user/user-ports.ts `userPropertyPorts` (:115-150, the `!parseWire && !shouldShowField` guard :131); noodl-viewer-react/src/nodes/std-library/user/signup.ts `updatePorts` (:199-250, `_ignoreKeys` :219)
found: P107 NSP-020 s84 (L1, the User family moved onto the port format), 2026-10-11 — oracle (a) drove the three User rows with an accounts class holding an `ACL` column
evidence: packages/noodl-runtime/test/node-spec/nsp-020-module-table.ts (`USERS`, the User, Set User Properties and Sign Up rows, case "the accounts class"); packages/nodegx-node-spec/src/nodes/user.ts `userFields`
kit: node-spec
---

On a Parse-wire backend the three User-family nodes offer the accounts class's `ACL` column as a property port: a
`prop-ACL` output (and `ACL Changed`) on User, a `prop-ACL` input on Set User Properties and on Sign Up. Every Record
node hides the same column: `parseFieldToSchemaField` marks it `hidden` ("The ACL is access control, not data — no port
has ever been useful for it", schema-ports.ts :377-378) and `recordFieldPorts` applies `shouldShowField`.

**Why:** `userPropertyPorts` skips `shouldShowField` on the Parse wire (`if (!parseWire && !shouldShowField(field))`,
user-ports.ts :131) — so a hidden column is drawn there and nowhere else. Sign Up reads `systemCollections` itself and its
`_ignoreKeys` (:219) does not name `ACL`.

**Measured (s84):** with `_User` holding `ACL: Object`, all three hooks announce `prop-ACL` typed `*` in group
Properties. The specs draw what the runtime draws (R3 (a)), so `userFields` in `user.ts` keeps the column; a planted
`ACL` filter there is red on five cases.

**Plain words:** *"The User node shows a property called ACL next to the person's name and email. It is the record's
access rules, not something about the person, and the Record nodes never show it. Wiring a value into it on Set User
Properties would overwrite the account's own access rules."*

**Not fixed here:** the ruling is whether the User family should hide it like the Record family (most likely: apply
`shouldShowField` on every wire, and add `ACL` to Sign Up's ignore list). When it is fixed, the `USERS` cases go red on
`prop-ACL` until `userFields` filters it too.

**Ruled 2026-10-12 (R29, P107 s91 rulings page, asked in plain words with the reach measured that morning):** **"Hide it, like the Record nodes"** — `shouldShowField` on every wire (user-ports.ts :251 today), `ACL` in Sign Up's `_ignoreKeys`, `userFields` filters it in the spec. 429 User-family nodes in 58 of Richard's projects, none wired to or from ACL. Built s92 (below).

**Fixed 2026-10-12 (P107 s92):** `userPropertyPorts` applies `shouldShowField` on every wire (rule 2 of its doc block
rewritten; on the Parse wire only `ACL` is ever marked hidden, so nothing else moves), Sign Up's `_ignoreKeys` names `ACL`, and
the spec's `userFields` leaves it out. User v5, Set User Properties v3, Sign Up v2, each with a `changes` entry.
`test/nodes/user-ports.test.ts` pinned `prop-ACL` on purpose with the old reasoning; it now pins its absence (8 Changed
signals, not 9).
