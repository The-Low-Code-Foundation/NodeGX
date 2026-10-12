---
id: P112-S1-SINGLETON
title: The editor's "only one of these per component" warning can never fire — it reads `type.allowSingleInstanceOnly`, and every producer sends `singleton`
status: open
severity: medium
area: editor / node graph warnings (`NodeGraphNode.ts` :1032 — `node-singleton`)
found: P112 (your own NodeGX) s1, 2026-10-03, while building NSP-021 §3.1's editor-knowledge census
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-021-EDITOR-KNOWLEDGE-CENSUS.md §3 (re-checked by grep on `c25fb8ee5`)
---

`NodeGraphNode.ts:1032` sets the `node-singleton` warning from `this.type.allowSingleInstanceOnly && this.owner.hasNodesWithType(this.type)`.
No producer sets `allowSingleInstanceOnly`: the runtime's library export writes `singleton` (`nodelibraryexport.ts:466-468`), the
cloud library and the workflow library do the same, and a grep of `packages/noodl-runtime/src`, `packages/noodl-viewer-react/src`
and `packages/noodl-editor/src` finds the name in exactly one place, the reader. The delete and copy rules read `type.singleton`
(`NodeGraphNode.ts:655,659`) and work. Only the warning is dead. The one runtime node marked `singleton: true` is Page
(`noodl-viewer-react/src/nodes/navigation/page.ts:52`): a person who places a second Page in one component gets no warning.

**No gate grades it.** No spec names `node-singleton`. `packages/noodl-editor/tests/nodegraph/nodelibrary.js:184,191` builds
a fake library whose singleton types carry `allowSingleInstanceOnly: true` by hand, the dead name, so even a future spec written
over that fixture would pass against a flag the product never ships. Read, not run (a peer's suite was live on the box).

**Plain words:** *"If you put two Component Children in one component, the editor is meant to warn you that only one is allowed.
It never does, because the warning checks a name the node library stopped sending. The fix is one word: read `singleton`."*

**Proposed:** read `this.type.singleton` at :1032 (one word), and change the test fixture to `singleton: true` so the spec grades
the flag the runtime sends; add a case that places two singleton nodes and expects the warning.
