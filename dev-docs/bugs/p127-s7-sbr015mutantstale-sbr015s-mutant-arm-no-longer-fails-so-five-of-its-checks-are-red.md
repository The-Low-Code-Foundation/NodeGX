---
id: P127-S7-SBR015MUTANTSTALE
title: SBR-015's drive breaks a function by deleting a script's declared output, the function now runs anyway, and five of the drive's ten checks are red
status: open
severity: low
area: "packages/nodegx-backend/tests/sbr015-execution-steps-drive.test.ts `dropBuiltPort` (arm M): removes `out-built` from node `withFlag`'s ports and expects the publish to fail"
found: P127 s7, 2026-10-27, running the backend's trigger and workflow tests for SCHEDULEAUTH
evidence: "MEASURED: `npx jest --runInBand tests/sbr015-execution-steps-drive.test.ts` → 5 failed, 5 passed, and the SAME 5 with SCHEDULEAUTH's three behaviour lines switched off (so not that change). The log: `ARM M — mutant (out-built removed from 1 node): http=200 record=success … steps=7`, body `{\"result\":{…,\"published\":true}}`; arm M and arm A store the same row. The mutant still removes the port (1 node), so what moved is the runtime: a script's undeclared output no longer stops it."
owner: none
---

What a person sees: nothing. This is the drive's instrument: its "broken" copy is no longer broken, so the five checks
that read the broken run (the person is told quickly, the log names the node, what is downstream is absent, the page
stays a draft, the two arms differ) all read a successful run and fail.

To do: find what a script now does with an output it never declared (likely on purpose, the script-ports work), then
give arm M a break that still breaks, e.g. a script that throws. The checks themselves are fine as they are.
