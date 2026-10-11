---
id: P108-S9-BKFONT
title: The Blocks node's line and zoom buttons use `font:800 14px inherit` — an invalid shorthand the browser drops, so they render at the default weight and size
status: fixed
commit: PENDING
phase: P109
task: ISL-046
severity: low
area: garden-kit / Blocks node CSS (`library/modules/garden-kit/src/blocks.js`, `.gd-bk-line button`, `.gd-bk-zoom button`)
found: P108 (the island works) s9, 2026-10-03 — lane BLOCKS, reading the file's CSS (not driven)
regression: packages/noodl-mcp/tests/cg001GardenKit.test.ts "P109 ISL-046 BKFONT"
evidence: blocks.js: `font:800 14px inherit` and `font:800 20px/40px inherit` — `inherit` is not a font family inside the `font` shorthand, so the whole declaration is invalid
---

Found while adding the selection bar (whose own CSS avoids it). Not graded on a screenshot yet: compare the zoom
buttons' computed `font-weight` / `font-size` on the deployed page before fixing (`font-family:inherit` as its own
declaration is the fix).

**Fixed, P109 s42 (2026-10-11).** Measured first in Chrome on a page holding the kit's two rules exactly: both buttons
computed `400 13.3333px` (the browser default), so both declarations were dropped. Written longhand
(`font-weight:800;font-size:14px` and `font-weight:800;font-size:20px;line-height:40px`, `font-family:inherit` kept),
they compute `800 14px` and `800 20px / 40px`. Rebuilt with `library/modules/garden-kit/build.mjs`. The regression
reads every `font` shorthand in the built `index.js` (inherit is a whole value or nothing); red on HEAD's kit, beside a
known-firing arm.
