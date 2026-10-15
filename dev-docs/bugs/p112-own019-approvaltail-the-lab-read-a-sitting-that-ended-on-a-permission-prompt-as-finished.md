---
id: P112-OWN019-APPROVALTAIL
title: "The lab read a sitting that ended on a permission prompt as \"finished\": round-kit's approvalEnd looked at the last 3 journal entries, and Vibe writes the effect and a hooks notice after the \"Allow grep?\" callback"
status: fixed
phase: P112
task: OWN-019
severity: low
area: the lab — `own-018/round-kit.mjs` `approvalEnd`
found: P112 OWN-019 s8, 2026-10-15 (SP1 sitting 3, Richard's music-app round on tgz35: 8 min, ended mid-part on "Allow grep?" for /root/.noodl/backends)
evidence: s8 scratchpad `big/SP1/agent3.jsonl` (the approval callback 4th from the end)
kit: lab
---

SP1's sitting 3 ended after 468 s with its NEXT.md unchanged; sittings.json said `outcome: finished`. Its journal: an
approval callback ("Allow grep? … in /root/.noodl/backends" — outside the sealed folder, a path that does not exist on
this Mac), then the grep effect and a "Hooks completed" notice. approvalEnd read only the last three entries. Now: the
last approval among the last 12 entries with no assistant answer after it. Checked on SP1's journals: sitting 3 →
`approval` with the prompt; sittings 1 and 2 (hand-overs) → nothing.
