---
id: P112-OWN019-WATCHINSIDE
title: "drive_page dropped an `expect` and `for_ms` written inside the watch (`{ watch: { look: [...], for_ms: 3000, expect: { never: … } } }`) without a word — six \"never green\" watches passed with green in their own recorded states, and ran 1.5 s, not 3"
status: fixed
phase: P112
task: OWN-019
severity: high
area: drive steps (`scripts/devtools/drive-steps.js` `watch`, shipped in @nodegx/mcp's render harness)
found: P112 OWN-019 s8, 2026-10-15 (AC3 round K-notimer, Mistral Large 4 on tgz33, checking a planted-mutant quiz) — reported by the agent itself
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s8); s8 scratchpad `ac3/v/K-notimer/agent2.jsonl`
regression: packages/noodl-mcp/tests/own019DriveMoment.test.ts "an expect written inside the watch is read, and a key the watch does not know is refused"
kit: mcp
---

Large 4's report on K-notimer: *"for the flash, the driving tool's automatic 'never green' check did not flag it even
when green states were recorded, so I read the raw state lists it captured."* True: six of its watches carried
`expect: { never: { backgroundName: "green" } }` and answered ok with Canberra green at 731, 719, 944, 941… ms in their
own states. Every one put `expect` (and `for_ms: 3000`) INSIDE `watch`; drive-steps read both only beside it, so the
expectation was never checked and the watch ran the 1,500 ms default. The same family as DESCRIBEINSIDE: an argument
in a place the tool does not read, dropped silently. Large 4 caught it only because it read the raw states.

Fixed: `expect` and `for_ms` are read inside the watch or beside it (both given = refused); any other key inside the
watch is refused by name ("watch does not take \"timeout\" — it takes look, for_ms and expect"), never ignored. The
regression drives the 80 ms flash with the expect nested: it now fails on the green, and the watch runs ~900 ms.
