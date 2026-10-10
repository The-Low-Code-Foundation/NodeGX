---
id: P109-S6-D54
title: D54's mutant row reads the wrong colour — a chip publishing a bare name is not swallowed on the re-press
status: fixed
commit: d21517793
phase: P109
task: ISL-036
severity: low
area: noodl-mcp / theme presets (D54)
found: P109 s6, 2026-10-03 (full `noodl-mcp` run; red neighbour, not this session's change)
evidence: packages/noodl-mcp/tests/d54ThemePresetIdentity.test.ts "MUTANT: a chip publishing a bare name is swallowed on the re-press" — Expected "#d9a441", Received "#1e4d8c"
regression: packages/noodl-mcp/tests/d54ThemePresetIdentity.test.ts
---

The mutant arm of D54's spec no longer produces the colour it expects, so either the mutant stopped reaching the
code it sabotages or the preset data moved under it. A mutant arm that cannot redden grades nothing.

**Not attributed** (the P109 s6 change touches no theme code). **Reproduce:**
`cd packages/noodl-mcp && npx jest tests/d54ThemePresetIdentity.test.ts`.

**Fixed 2026-10-10 (P109 s39, ISL-036, `d21517793`).** Re-measured: still red. Bisected (`3f95a804b`..`0951dbbe3`, scratch worktree): the first bad commit is GAM-011 `85c640b6c` (2026-09-17), which made a Function publish an unchanged value when it fires a signal in the same run. The mutant had become correct. The arm now states that rule, and the mutant is the shape GAM-011 does not cover (the name written without the signal, the press sent straight to Picked), which reproduces D54's original failure.
