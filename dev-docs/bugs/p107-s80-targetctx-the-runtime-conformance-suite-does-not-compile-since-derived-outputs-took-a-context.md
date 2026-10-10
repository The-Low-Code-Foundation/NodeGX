---
id: P107-S80-TARGETCTX
title: The runtime conformance suite does not compile since `derived.outputs` took a context — node-spec-target.ts :1488 calls it with one argument
status: open
severity: high
area: noodl-runtime/test/helpers/node-spec-target.ts `derivedSignalOutput` (:1484-1489) against nodegx-node-spec/src/spec.ts `DerivedPorts.outputs` (:1252, `AnyNodeSpec`'s erased copy)
found: P107 NSP-020 s80 (L4), 2026-10-11 — running conformance on the nodes whose specs L4 changed
evidence: `cd packages/noodl-runtime && NSP_ONLY="Or" npx jest test/node-spec/conformance.test.ts` → "Test suite failed to run … node-spec-target.ts:1488:12 TS2554: Expected 2 arguments, but got 1", Tests 0
---

s79 (`9a786e0b2`, NSP-020) made `context` a required second argument of `derived.inputs` / `derived.outputs` and passed
`{}` at the runtime target's three `derived.*` calls — but `derivedSignalOutput` (:1484-1489) still calls
`outputs(params)`. ts-jest type-checks the helper, so **every suite that imports `node-spec-target.ts` fails to run**
— `conformance.test.ts`, `runtime-target.test.ts`, the contract suites — with `Tests: 0`, which reads as nothing at all
rather than as red. s79's gate list says "Not run: … the runtime batch", which is how it got in.

**Measured with type diagnostics off** (a jest config with ts-jest `diagnostics: false`, so the play itself runs):
Or, String Mapper, Color Blend, Expression, Array Filter, Pop Component Stack, Navigate To Path and Text Input conform at
200; Close Popup has one surviving mutant (`afterInputs` drop-set over `closeAction`/`pending`) — the same with the spec
at HEAD, so not L4's change, and unread past that.

**Fix (one line):** `return outputs(params, {})[port]?.type === 'signal';` — then run the runtime batch. L1 edits this
file (the target builds its fake project from `scenario.context`), so the fix belongs with whichever lane lands first.
