---
id: P109-F15
title: A kit node's `defaultCss` lands as inline style that beats the kit's own stylesheet, the docs send `display` there without saying so, and the export drops it
status: scheduled
phase: P109
task: ISL-011
severity: medium
area: kits / React bridge (defaultCss) + docs + export
found: P105 CG-001 §7.1 item 1, 2026-09-27 (audit P109 F15; cause corrected by ISL-011 scoping 2026-10-01)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F15; ISL-011 §2; dev-docs/tasks/phase-105-the-coding-garden/CG-001-THE-KIT.md §7.1
---

The garden kit's 48-cell world drew as one flat rectangle: the kit's stylesheet said `.gd-world { display: grid }`,
its `defaultCss` said `display: block` (as the docs advise), and the inline value won. The same node renders three
ways: canvas and deployed page use `defaultCss` inline, an exported app has no `defaultCss` at all, and the kit's
stylesheet is a third opinion.

**Where:** `packages/noodl-viewer-react/src/react-component-node.ts:989-994` copies `defaultCss` into the start style,
handed to the kit as `props.style` (`:824-851`); `docs-site/docs/custom-nodes.md:147-149` tells authors `display`
"belongs in `defaultCss`" and never says it is inline; `packages/nodegx-export/src/parse/kitSource.ts` and
`src/emit/kits.ts` mention neither `defaultCss` nor `inputCss` (P84 register P40, unowned). Re-read at HEAD `d2b2f0101`.

**Reproduce:** a kit node with `defaultCss: { display: 'block' }` whose root has a class setting `display: grid` → block.

**Workaround:** the garden kit forces `display: grid` after the merge (`library/modules/garden-kit/src/kit.js:1932-1944`),
which takes the CSS Style input away from the person using the node.

**Proposed:** keep `defaultCss` inline and document it (docs page, types, scaffold), and take P40's export half.
🔒 ISL-011 recommends this route. Small (docs) + medium (export).
