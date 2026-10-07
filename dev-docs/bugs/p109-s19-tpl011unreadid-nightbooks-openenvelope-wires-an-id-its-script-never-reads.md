---
id: P109-S19-TPL011UNREADID
title: Nightbook's generator wires the envelope id into a Function that never reads it, and the door now refuses the build
status: scheduled
phase: P109
task: ISL-046
severity: low
area: template / Nightbook generator (packages/noodl-mcp/tests/tpl011Cloud.ts, uncommitted)
found: P109 ISL-006 s19, 2026-10-05
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-006-A-FUNCTION-SAYS-WHAT-ITS-PORTS-ARE.md §8 s19
---
`envelopeDoor` wires `pm-id → <p>_decide.in-id` for both envelope functions. `openEnvelope`'s "May it be written?" script
(`DECIDE_OPEN_SCRIPT`) never reads `Inputs.id`; it takes the id from the found record. The port is on neither the written
list nor in the code, so the editor drops the wire from the build. Since ISL-006 the door refuses it
(`unknown-function-port`): `tpl011Template.test.ts` goes from 35/35 to 32/35, the three rows that build Nightbook.

**Fix (the pile's owner):** wire `in-id` only where the script reads `Inputs.id` (the seal script does), or put `id` on that
Function's `scriptInputs`. The generator and the Nightbook template are untracked P78 TPL-011 work; not touched here.
