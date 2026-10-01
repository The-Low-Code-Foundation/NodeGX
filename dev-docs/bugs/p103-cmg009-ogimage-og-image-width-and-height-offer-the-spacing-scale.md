---
id: P103-CMG009-OGIMAGE
title: Page's og:image:width / og:image:height fields offer spacing tokens
status: open
severity: low
area: editor / token picker (Page meta ports)
found: P103 CMG-009 s1 ("Found on the way"), 2026-09-24; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-103-the-composer-grows/CMG-009-A-TOKEN-IN-A-FIELD-READS-AS-A-TOKEN.md (Found on the way); README §5 last row
---

On a Page node, the Open Graph image width and height fields (string meta ports that hold an image's pixel
size for link previews) show the design-token button and offer `--space-4` and the rest of the spacing scale.
Picking one writes `var(--space-4)` into a meta tag, where it means nothing to a crawler.

**Where:** `packages/noodl-editor/src/editor/src/models/StyleTokensModel/TokensForPicking.ts:169`.
`{ test: /(width|height)$/i, categories: ['spacing'] }` matches on the port name alone, and
`og:image:width` ends in `width`.

**Proposed:** an explicit `{ test: /^og:/i, categories: null }` row before the generic dimensions (the table
already refuses shadow blur and spread that way), or key the rule on the port's type as well. One row plus a
pin in the HLT-012 spec. Small.
