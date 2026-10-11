---
id: P99-HLT016-SUCCESS
title: A Cloud Function wired from `success` passes validation with 0 errors and never fires
status: fixed
commit: PENDING
phase: P109
task: ISL-042
severity: high
area: editor / validator (Cloud Function)
found: DBT stream TASK-L177 drive, 2026-09-30; recorded in P99 HLT-016 ("not filed as a row")
regression: packages/noodl-mcp/tests/isl042CloudFunctionPorts.test.ts
evidence: dev-docs/tasks/phase-99-the-ones-nobody-owned/HLT-016-A-FUNCTION-CANNOT-WRITE-SAFELY-TWICE.md (the ✅ (a) note, "Found beside it"); commit 30fefc55d; templates/digital-bricks-training/tools/check-write-functions.mjs :86-90
---

A client Cloud Function's outcome ports are `done` and `failure` (ERG-001 renamed `Success` to `Done`). A wire from
`success` — the old name, and the one an agent reaches for — is accepted by `validate_project` / the MCP write gate
with 0 errors, and at run time it never fires: the page sits on "Saving…" for ever and only the browser console says
*"doesn't have a port named success"*.

**Where:** `packages/noodl-editor/src/editor/src/validation/rules/nonexistentPort.ts` :126 — a port the catalog does
not list is skipped, never an error, when `catalog.hasRuntimeDynamicPorts(node.type)`. `CloudFunction2`'s catalog entry
declares `runtime-discovered` + `editor-adapter` (its other ports mirror the called function's Request / Response), so
every unknown port on it — `success` included — is waved through. Read at HEAD 2026-10-01: unchanged.

**How to reproduce:** a `CloudFunction2` node with a connection `fromProperty: "success"` into anything; validate →
0 errors; preview → nothing fires. The DBT template now guards itself with its own check
(`check-write-functions.mjs`); the product does not.

**Proposed:** for `CloudFunction2`, resolve the targeted `__cloud__/<name>` component and check the wire against its
Response ports plus the static ones (the validator holds the project); at the least, error on the renamed outcome names
(`success`) on any node whose static ports carry `done`. Small to medium.

**Fixed, P109 s42 (2026-10-11), the "at the least" half.** Re-measured first: a `CloudFunction2` wired from `success`
got 0 diagnostics from `validate_component` and was written by `create_component`. The runtime mints an output only
if it starts `out-` and an input only if it is `function` or starts `in-` (`cloudfunction2.ts`
`registerOutputIfNeeded` / `registerInputIfNeeded`), so `nonexistentPort` now errors on any other name it does not
list, with `done` among the alternatives. `derivedPortTargets.ts` `cloudFunctionCanMint` holds the rule beside the
prefixes it already owned.

**The resolving half was already built, by DEF-002.** `connection-unknown-derived-port` checks `out-x` / `in-x` against
the called function's Request and Response on the authoring write path. A first version of this fix resolved them
again inside `nonexistentPort`; it was cut as a second pipeline for one fact. Note: that check runs on writes only,
so `validate_project` still does not flag an undeclared `out-x` on a project already on disk.

Spec red 3/3 with both validator files at HEAD, green now. A corpus run over 24 v2 projects on this machine with a
Cloud Function, their saved ports stripped so every wire was judged, gave 0 new errors on 296 `out-*` / `in-*` wires.
The template generators that write Cloud Function wires (sb005, sb006, sb007, tpl001, tpl003, sbr010) pass 341/341.
