---
id: P107-C109
title: A Components value that is not a list blanks the stack and its Reset is never answered; a page looked up by its label whose component was never set throws the same way
status: fixed
commit: ed3a693cf
phase: P109
task: ISL-048
severity: low
area: runtime / Component Stack (noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx `resetAsync` :507-546 deletes every page before `_findPage` :386-410 calls `pages.find`; `_findPage` :398-406 reads `pageInfo[pageRef.id].component` for a page with no component)
found: P107 NSP-016 s56, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; recorded on the runtime target (the probe traces in §7.17), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "row C109 — a Components value that is not a list is no components: the stack draws nothing, and a Reset is Failure (no components)" (and "row C109 — a page with no component is not found, by its id and by its label (Failure each); the start page is Unchanged")
---

**What a person sees.** Components wired from something that is not a list (an object, a text) leaves the stack empty — every
page deleted — and a Reset wired to it never says Done or Failure. Separately, a push that names a page by its label, where that
page's component was never picked, does nothing and answers nothing.

**Where.** `resetAsync` deletes the pages first, then looks the start page up with `pages.find`, which throws on a value that is not a
list. `_findPage`'s label branch reads the page's component record without checking it exists.

**How to reproduce.** Play the `regression:` scenario on the runtime target; for the label case, the scenario "a page with no component: …".

**Proposed fix.** Treat a Components value that is not a list as no components (Failure `component-stack/no-components`), and a label
whose page has no component as not found.

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed.** The Components setter stores a value that is not a list as none, so the
reset's own check answers it (Failure `component-stack/no-components`); `_findPage` by label treats a page with no entry (its
component never set) as not found, as by its id. Page Stack spec v5. Runtime 147 / 147 at seeds 13 and 20732; control red on
exactly the 2 C109 scenarios.
