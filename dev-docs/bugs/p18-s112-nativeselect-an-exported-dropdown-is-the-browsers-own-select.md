---
id: P18-S112-NATIVESELECT
title: An exported Dropdown is the browser's own select — native box size, native chevron, and FieldText where the runtime's text is --foreground
status: open
severity: low
area: export / Dropdown
found: P18 session 112, 2026-10-15, the PLACEHOLDEROPACITY render
evidence: dev-docs/tasks/phase-18-code-export-v2/s112-placeholder-render/readings.json and the three PNGs — the runtime's Dropdown is 32 px tall with its own chevron and text rgb(15, 23, 42); the exported one is about 22 px tall with the native chevron and text rgb(0, 0, 0)
---

The runtime draws a Dropdown as its own box: a wrapper with padding, its label as a span, its own SVG chevron, and a
transparent native `<select>` laid over the top to take the input (`Select.tsx`). The export emits a bare `<select>`
with the node's border and colour (`renderSelect`, `emit/style.ts` role `select`). So:

- the box is the native control's height (about 22 px in Chrome on macOS, against 32 px);
- the chevron is the browser's, drawn in the text colour (so it now fades with the placeholder, P18-S110-PLACEHOLDEROPACITY);
- with no authored colour the text is the UA's `FieldText`, because a `<select>` does not inherit `color`; the runtime's
  label inherits `--foreground`. `base.css` already gives form controls `font: inherit` for the same reason
  (`emit/scaffold.ts` `baseCss`), not `color`.

Every exported Dropdown has this. A `color: inherit` beside `font: inherit` would close the third (it moves every
project's `base.css`, so every corpus app); the first two want `appearance: none` plus the runtime's padding and
chevron, which is a design step, best rendered against the runtime as the placeholder render was.
