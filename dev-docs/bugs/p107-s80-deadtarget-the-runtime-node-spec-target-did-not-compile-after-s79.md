---
id: P107-S80-DEADTARGET
title: The runtime's node-spec target did not compile after s79 — every runtime conformance, graph and target suite failed to run
status: fixed
severity: high
area: node-spec / runtime target (`packages/noodl-runtime/test/helpers/node-spec-target.ts` `derivedSignalOutput`)
found: P107 NSP-020 s80, 2026-10-11 — the first runtime conformance run after s79's format change
evidence: `NSP_ONLY=And npx jest test/node-spec/conformance.test.ts` at HEAD 00be10df0 — "Test suite failed to run", TS2554 at node-spec-target.ts :1488
kit: node-spec
regression: packages/noodl-runtime/test/node-spec/conformance.test.ts
---

Caused by `9a786e0b2` (s79). s79 gave `DerivedPorts.inputs` and `outputs` a required second argument, `context` (`src/spec.ts`), and updated three of
the runtime target's four call sites. The fourth, `derivedSignalOutput` (the connection-time check that a Function's
`out-<z>` is a signal), still called `outputs(params)`. The runtime's jest compiles the target with ts-jest, so
TS2554 stopped every suite that imports it before a single test ran: `conformance.test.ts` (the 125 specs graded on
the runtime), `graph.test.ts`, `runtime-target.test.ts`, and the contract suites that use the target.

**What a person sees:** nothing in the app; the runtime half of every spec's conformance was ungraded from s79's commit
until this fix. The ledger (`spec-ledger --check`) still read 125 of 147 because it counts the specs in the registry
and the graph scenarios' claims (`scripts/node-spec/spec-ledger.js` header), never a run's result.

**Why no gate saw it:** s79's runtime gate was `nsp-020-ports-parity.test.ts`, which imports the spec package and two
runtime modules but not the target. s79's handoff listed the runtime conformance batch under "Not run". "Tests: 0" with
a failed suite is easy to miss in a long log; the jest output says "Test suite failed to run" and nothing else red.

**Fix (s80):** the call passes the instance's port context (`portContexts.get(s.h.id) ?? {}`), the same context the
target now hands every other derived call (L1's plumbing). The whole runtime batch was re-run after it (NSP-020 §6.3).
