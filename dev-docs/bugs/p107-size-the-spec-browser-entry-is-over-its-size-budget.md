---
id: P107-SIZE
title: The spec package's browser entry is over its size budget (268.7 KB gzipped against 240 KB), and nothing runs the check
status: open
severity: low
area: node-spec / browser entry (`packages/nodegx-node-spec/src/browser.ts`, budget in `scripts/bundle-size.mjs`)
found: P107 NSP-016 AC4 s69, 2026-10-09
evidence: `npm run size:node-spec` at HEAD cd78b4f05 plus the uncommitted layout model (s69)
kit: node-spec
---

A page that bundles `@nodegx/node-spec` pays 268.7 KB gzipped (1,078.8 KB minified) without `fast-xml-parser`, and
279.4 KB with it. The budget OWN-002 set (§3.4, AC3) is 240 KB gzipped without the parser; `npm run size:node-spec`
exits 1 and prints "OVER".

**Not caused by s69's layout model:** `src/layout.ts` bundled alone is 6.5 KB minified, 2.8 KB gzipped, so the entry
was about 266 KB before it. OWN-002 measured 147.6 KB with 86 specs and estimated about 1.1 KB gzipped per spec, so
the full vocabulary near 215 KB. Today about 128 specs are in the entry: about 1.9 KB per spec. The visual specs
since NSP-016 (v2 to v6, the page model, the drag and the Repeater) are larger than the pilot-shaped specs the
estimate was made from.

**Why nobody saw it:** `size:node-spec` is a root script but no CI workflow and no test runs it. `browser-check`
(which is run) passes.

**To decide (P112, OWN-002's owner):** raise the budget to what the full vocabulary measures, or split the entry
(the visual specs lazy, as the XML parser already is), and put the check where it runs.

**s80 (2026-10-11, P107 NSP-020 L2):** `npm run size:node-spec` now prints 308.2 KB gzipped without the parser (318.8 KB
with it). The `when` functions on 448 conditioned ports added about 6.2 KB gzipped (esbuild `--minify` + `gzip -9` over
`src/browser.ts`: 310.2 KB at HEAD `32745136a`, 316.5 KB after). Still P112's decision; the visual specs remain the bulk.

**s2 of P112 OWN-012 (2026-10-18):** `node scripts/draw-size.mjs` in the package measures what a page that only
draws a screen from the specs pays: the drawer-only entry `src/draw-only.ts` (the drawer, the canvas measurer, the layout
model and a generated table of each visual spec's input defaults, layout roles and portability classes) is 82.6 KB
minified, 12.1 KB gzipped — against 1,210.7 KB / 308.2 KB for the same drawer over the full table (`src/draw-full.ts`)
and 1,391.4 KB / 361.1 KB for the whole browser entry. The table is derived from `src/nodes` by
`scripts/gen-draw-specs.mjs` and held equal to it by `tests/draw-specs.test.ts`, so it is a split, not a copy: the
shape the "split the entry" option in this row would take.
