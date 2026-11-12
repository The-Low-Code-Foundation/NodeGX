---
id: P109-F11
title: A Group writes layout defaults the author never set as inline style, so a CSS Class rule loses silently
status: fixed
phase: P109
task: ISL-008
severity: medium
area: runtime / visual nodes styling (Group, react-component-node)
found: P105 CG-003 §7.1 item 1, 2026-09-28; also P95 R6, TPL-010, TPL-008 (audit P109 F11)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F11; ISL-008 §2; dev-docs/tasks/phase-105-the-coding-garden/CG-003-THE-PAGES.md:120-124
launch: beta
owner: Beta sweep s18 (2026-10-27)
commit: 3e2b700bf
regression: packages/noodl-viewer-react/tests/isl-008/defaults-layer.test.tsx "a bare Group: no default inline, one defaults class carrying them all"
---

An author gives a Group a `CSS Class` and writes a normal stylesheet rule (centre this card, make this bar `fixed`).
DevTools shows the class applied, but the screen ignores it: the win card stayed pinned to the top until every centring
property was `!important`. The island's stylesheet carries 195 `!important` in 50 KB for this reason, and the lore
"always `!important`" now leaks into every generated stylesheet.

**Where:** Group's `defaultCss` is `{ display: 'flex', position: 'relative', flexDirection: 'column' }`
(`packages/noodl-viewer-react/src/nodes/visual/group.ts:30-34`); the bridge seeds every instance from it
(`react-component-node.ts:994`) plus every `inputCss` default without `applyDefault: false` (`alignItems: flex-start`,
`Position: relative`; `:996-1015`), and `setStyle` writes them on `element.style` (`:1547-1570`). An inline style
outranks any class selector. Re-read at HEAD `d2b2f0101`.

**Reproduce:** a Group with `CSS Class = card` and `.card { position: fixed; align-items: center }` in a CSS
Definition → neither applies.

**Proposed:** write inline only what the author set, and put defaults in a low-priority class. 🔒 ISL-008 asks Richard,
after a census of which stylesheet rules would start applying in shipped projects. Medium.

**Closed by the ledger, not by new code (Beta sweep s18, 2026-10-27).** Richard ruled ISL-008 "Stylesheet beats
defaults" on 2026-10-05 and it was built then (3e2b700bf: a node writes inline only what the author set, its defaults
are a class rule in a sheet first in `<head>`; d24929c80: a cleared panel value is a default again at once). This row
was left `scheduled`. Re-run at HEAD 1086db8c1: the four isl-008 suites green. ISL-008's own owed item (AC7, the
export's half) is P18's and stays in ISL-008, not here.
