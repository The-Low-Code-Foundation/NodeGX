---
id: P108-S9-BKFONT
title: The Blocks node's line and zoom buttons use `font:800 14px inherit` — an invalid shorthand the browser drops, so they render at the default weight and size
status: scheduled
phase: P109
task: ISL-046
severity: low
area: garden-kit / Blocks node CSS (`library/modules/garden-kit/src/blocks.js`, `.gd-bk-line button`, `.gd-bk-zoom button`)
found: P108 (the island works) s9, 2026-10-03 — lane BLOCKS, reading the file's CSS (not driven)
evidence: blocks.js: `font:800 14px inherit` and `font:800 20px/40px inherit` — `inherit` is not a font family inside the `font` shorthand, so the whole declaration is invalid
---

Found while adding the selection bar (whose own CSS avoids it). Not graded on a screenshot yet: compare the zoom
buttons' computed `font-weight` / `font-size` on the deployed page before fixing (`font-family:inherit` as its own
declaration is the fix).
