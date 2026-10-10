---
id: P112-S7-LOGICTYPE
title: "The editor's save rewrote a component's declared type from its name — a `logic` component became `visual` in its component.json while the registry kept `logic`"
status: fixed
severity: low
area: editor / v2 save (`packages/noodl-editor/src/editor/src/io/ProjectExporter.ts` `buildComponentV2Files`, `inferComponentType`)
kit: project-contract
found: P112 OWN-006 s7, 2026-10-10 — the editor suite's Electron adapter (OWN-006 AC3) on its small fixture's `Logic/Counter`
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-006-THE-EDITOR-SUITE.md §6.3; the first run read `components/Logic/Counter/component.json: "type" is "visual"; the official editor saves "logic".`
regression: packages/noodl-editor/tests-unit/p112/logicTypeRoundTrip.test.ts
commit: ca1ff42a5
fixed: P112 OWN-006 s7, 2026-10-10 — the declared type is carried (importer → `ComponentModel.componentType` → exporter, and `duplicateComponent`) when it is not what the name says
---

`buildComponentV2Files` wrote `type: inferComponentType(component.name)`, a guess from the path (`/%rootcomponent` →
root, `__cloud__` → cloud, `Pages/` → page, anything else → visual). The importer never read the type, so nothing
carried it. The first time the editor saved a component declared `logic` (the format allows root, page, visual,
logic and cloud; `templates/digital-bricks-training-demo` has three `logic` components), its `component.json` said
`visual`. The registry entry kept `logic` (`ComponentSaver.updateRegistry` keeps `prev?.type`), so after one save
the project's two files disagreed about the same component. The same was true of a page outside `Pages/` and a
visual component inside it.

No reader acts on the stored type today (measured: two `=== 'logic'` readers in the editor, neither reads
`component.json`), which is why this is low. It is a writer changing an authored field the person did not touch,
LEG-006's family.

**Regression:** `tests-unit/p112/logicTypeRoundTrip.test.ts` (2 of 3 red with the exporter's old line put back); the
model leg is the small fixture in `packages/noodl-editor/tests/editor-suite/electronAdapter.test.ts`.

**Fix:** LEG-006's four seams. `reconstructLegacyComponent` sets `componentType` only when the declared type differs
from `inferComponentType(name)`, so no other component gains a key and a no-op save writes nothing (F46).
`ComponentModel` holds it through `fromJSON`/`toJSON`, `duplicateComponent` copies it, and the exporter writes
`component.componentType ?? inferComponentType(name)`.

**Plain words:** *"Saving a project in the editor quietly changed 'this is a logic component' to 'this is a visual
component' in one of its files. It now keeps what the file said."*
