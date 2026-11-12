---
id: P127-S7-SBR015MUTANTSTALE
title: SBR-015's drive breaks a function by deleting a script's declared output, the function now runs anyway, and five of the drive's ten checks are red
status: fixed
severity: low
area: "packages/nodegx-backend/tests/sbr015-execution-steps-drive.test.ts `dropBuiltPort` (arm M): removes `out-built` from node `withFlag`'s ports and expects the publish to fail"
found: P127 s7, 2026-10-27, running the backend's trigger and workflow tests for SCHEDULEAUTH
evidence: "MEASURED: `npx jest --runInBand tests/sbr015-execution-steps-drive.test.ts` → 5 failed, 5 passed, and the SAME 5 with SCHEDULEAUTH's three behaviour lines switched off (so not that change). The log: `ARM M — mutant (out-built removed from 1 node): http=200 record=success … steps=7`, body `{\"result\":{…,\"published\":true}}`; arm M and arm A store the same row. The mutant still removes the port (1 node), so what moved is the runtime: a script's undeclared output no longer stops it."
owner: P127 s8
---

What a person sees: nothing. This is the drive's instrument: its "broken" copy is no longer broken, so the five checks
that read the broken run (the person is told quickly, the log names the node, what is downstream is absent, the page
stays a draft, the two arms differ) all read a successful run and fail.

To do: find what a script now does with an output it never declared (likely on purpose, the script-ports work), then
give arm M a break that still breaks, e.g. a script that throws. The checks themselves are fine as they are.

**Fixed (P127 s8, 2026-10-27), in the instrument.** Why the mutant stopped breaking: P112-OWN020-UNWIREDSIGNAL
(`3026899d4`, 2026-10-20) gives a Function loaded from disk a callable for every `Outputs.x()` its code names, declared
or not. So deleting `out-built` left `Outputs.built()` working, on purpose. Arm M now breaks the script at the same
line (`breakBuiltCall`: `Outputs.built()` → `Inputs.sections.built()`, which throws "… is not a function"), one
variable, the receipt still 1. Graded: the drive 10/10 (arm M http 400, `record=error`, 3 steps); with an inert
mutant (the same replace, to itself; receipt 1) the same five checks this row named go red, 5 failed / 5 passed.
