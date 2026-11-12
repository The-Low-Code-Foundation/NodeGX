---
id: P115-HST015-STRINGFILTERS
title: "On Cloudflare every \"contains\", \"starts with\" and \"ends with\" filter failed with \"no such function: nodegx_regexp\", and the conformance suite saw only its one regex case"
status: fixed
commit: adb3aa92a
phase: P115
task: HST-015
severity: high
area: "runtime / local-sql `$regex` (`packages/noodl-runtime/src/api/adapters/local-sql/QueryBuilder.ts`); the lowerings that write it: `nodegx-backend-contract/src/translators/lowering.ts` `lowerToRegex` (Query Records' filters through `queryutils.ts`), `nodegx-backend/src/workflow/steps/records.ts` (a workflow's record steps), `nodegx-backend/src/admin/app/filters.ts` (the Data Browser's \"starts with\")"
regression: packages/nodegx-backend/tests/p115-hst015-durable-object-reds.test.ts "regex"
found: P115 HST-015, 2026-11-06, reading what refusing `$regex` on a Durable Object would cost before declaring it unsupported
fixed: "P115 HST-015, 2026-11-06 (Opus 5.5)"
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-015-THE-THREE-DURABLE-OBJECT-REDS.md §5
---

HST-006 read the `filters/regex` red as "regex filters do not work on Cloudflare" and the plan was to declare regex
unsupported. Read before doing it: the nine string operators the product offers (`contains`, `startsWith`, `endsWith`,
their `IgnoreCase` and `not` forms) are LOWERED onto `$regex` on the built-in backend's wire (`LOWERED_OPERATORS`:
greying them out "reads as the product being broken"), and so are a workflow's record steps and the Data Browser's
"starts with". On node:sqlite `$regex` is a JavaScript function registered on the connection; a Durable Object's SQL
cannot call JavaScript. So on Cloudflare every one of those filters failed, and declaring regex unsupported would have
made it official. The suite saw one case.

**Fixed:** the seven shapes the lowerings write (`lit`, `^lit`, `lit$`, `^lit$`, `^(?![\s\S]*lit)`, `^(?!lit)`,
`^(?![\s\S]*lit$)` over an escaped literal) are plain SQL (`instr`, `substr` against `length`) on a column with TEXT
affinity (`plainRegex.ts`), on every engine. Exact, not approximate: graded value by value against the JavaScript
function (24 values incl. newlines, `ß`, `ſ`, `K`, KELVIN SIGN, `İ`, metacharacters; 16 literals; every operator,
`m` and `iu` flags): 184 asks plain, the same rows as the function on node:sqlite, the stand-in object and workerd.
Case-insensitive is plain only for an ASCII literal without `u` (SQLite's `lower()` is ASCII-only on Cloudflare too:
measured, `lower('ÄKİ')` = `ÄKİ`). A real pattern, a pattern on a number field, and the two map filters are refused
in words before SQLite reads them (*"The built-in backend cannot filter on a pattern (a regular expression) on
Cloudflare: … "Contains", "starts with" and "ends with" on a text field still work."*), which the backend answers 400.
Mutants: `instr >= 0`, the end offset by one, no `lower()`, no refusal wrapper, no text columns: each killed.

**Live, before the fix (2026-11-06, `hst-campus` on Richard's account):** `GET /classes/Reader` with `$regex` `da`,
`^Gr`, `ADA`+`i`, `^.r`: all four **500** `no such function: nodegx_regexp`. Every deployed app's "contains" was
broken. The redeploy carrying `adb3aa92a` is Richard's terminal (the auto-mode classifier refused it to the session).
