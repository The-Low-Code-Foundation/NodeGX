---
id: P123-STU-CHOICENOTENFORCED
title: Studio's "Start a backend" made each declared type's table without its rules for values, so a Choice took any value
status: fixed
commit: nodegx-studio dd314bb
severity: medium
area: nodegx-studio `lib/backend.mjs` provisionFor (collections sent to NodeGX's `provisionBackend` as name + columns only)
found: STU-090, building Swapshop in Studio (opennoodl-33), 2026-10-29; reproduced 2026-10-30
evidence: a copy of Swapshop (Listing.category declared `oneOf` Furniture, Books, Clothes, Electronics) through `provisionFor`: the backend's Listing table read `checks: []`, and a Listing with category "Cars" was created (201)
---

Studio passed `provisionBackend` each declared type's columns and nothing else, and NodeGX's `ProvisionCollection` has no
`checks` either, so a Choice (or a length, a range) declared in `dbCollections[].checks` stayed in the project file. The
backend took any value; only Studio's own drawer showed the choice. (Studio's field drawer did set the rule when the
backend was already running: the gap was a type declared before the backend existed, which is how a blank app is built.)

Fixed in Studio: after provisioning, `provisionFor` sets each declared type's rules on its table (`setChecks`), keeping
the backend's own rules on other fields. A backend that already holds a row breaking a rule refuses it, and its sentence
comes back among the warnings ("1 row already breaks it. Nothing was changed", measured), which *Start a backend*
toasts (read, not driven). Measured on the same copy: the table
carries `chk_Listing_oneof_category`; "Cars" is refused (400, `check-failed`), "Furniture" is created. Gate:
`app/blank-check.mjs` 11/11 (two new rows; 9/11 with the call taken out).

NodeGX's own `provision_backend` (MCP) had the same gap and also erased the declaration: P123-MCP-RULESERASED, fixed
in NodeGX eea8566e3 (not yet in an npm release, so not in Studio's pins; Studio's own fix above does not need it).
