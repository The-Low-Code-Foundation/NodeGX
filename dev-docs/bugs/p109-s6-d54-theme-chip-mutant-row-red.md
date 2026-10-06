---
id: P109-S6-D54
title: D54's mutant row reads the wrong colour — a chip publishing a bare name is not swallowed on the re-press
status: scheduled
phase: P109
task: ISL-036
severity: low
area: noodl-mcp / theme presets (D54)
found: P109 s6, 2026-10-03 (full `noodl-mcp` run; red neighbour, not this session's change)
evidence: packages/noodl-mcp/tests/d54ThemePresetIdentity.test.ts "MUTANT: a chip publishing a bare name is swallowed on the re-press" — Expected "#d9a441", Received "#1e4d8c"
---

The mutant arm of D54's spec no longer produces the colour it expects, so either the mutant stopped reaching the
code it sabotages or the preset data moved under it. A mutant arm that cannot redden grades nothing.

**Not attributed** (the P109 s6 change touches no theme code). **Reproduce:**
`cd packages/noodl-mcp && npx jest tests/d54ThemePresetIdentity.test.ts`.
