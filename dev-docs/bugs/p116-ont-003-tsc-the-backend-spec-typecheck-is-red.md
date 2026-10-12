---
id: P116-ONT-003-tsc
title: The backend's spec typecheck (a PR gate) is red — four errors in the ISL-010 drive spec
status: fixed
fixed: P109 s38, 2026-10-10
commit: 4e0aa53db
severity: medium
area: backend / tests typecheck — `packages/nodegx-backend/tests/isl010-ask-the-owl-drive.test.ts:110-112`
found: P116 ONT-003 s3, 2026-10-08
evidence: `npm run typecheck:backend-tests` (`.github/workflows/pr.yml:39`) on cline-dev at 08bea833f; the file and its helpers are unchanged in the tree since 1e5794beb
---

`npm run typecheck:backend-tests` fails with four errors, all in one spec:

```
tests/isl010-ask-the-owl-drive.test.ts(110,56): error TS18046: 'n' is of type 'unknown'.
tests/isl010-ask-the-owl-drive.test.ts(111,9): error TS2339: Property 'parameters' does not exist on type '{}'.
tests/isl010-ask-the-owl-drive.test.ts(111,34): error TS2339: Property 'parameters' does not exist on type '{}'.
tests/isl010-ask-the-owl-drive.test.ts(112,22): error TS2339: Property 'parameters' does not exist on type '{}'.
```

`bundleAuthoredComponents()` returns a `WorkflowBundle` whose components' `nodes` are untyped, and the spec
reads `n.type` and `model.parameters` off them. The spec itself runs (jest transpiles with
`isolatedModules`, no typecheck), so nothing goes red locally; the PR workflow's typecheck step does. The fix is
local to the spec: type the found node (`as { type: string; parameters?: Record<string, unknown> }`), ~3 lines.
Found while typechecking ONT-003's new specs, which add no errors of their own.

**Fixed (P109 s38, `4e0aa53db`).** The spec types the one node shape it reads and writes (`{ type, parameters }`).
`npm run typecheck:backend-tests`: 4 errors, exit 2 → 0 errors, exit 0. The spec's own run is unchanged (2 passed, 2 skipped
without a local model, the same at HEAD's version).
