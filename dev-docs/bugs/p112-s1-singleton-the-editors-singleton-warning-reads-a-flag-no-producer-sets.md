---
id: P112-S1-SINGLETON
title: The editor's "only one of these per component" warning can never fire — it reads `type.allowSingleInstanceOnly`, and every producer sends `singleton`
status: fixed
severity: medium
area: editor / node graph warnings (`NodeGraphNode.ts` :1032 — `node-singleton`)
found: P112 (your own NodeGX) s1, 2026-10-03, while building NSP-021 §3.1's editor-knowledge census
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-021-EDITOR-KNOWLEDGE-CENSUS.md §3 (re-checked by grep on `c25fb8ee5`)
commit: 83bb0de10
regression: packages/noodl-editor/tests-unit/nsp-021/duplicateSingleton.test.ts "a second Page warns, on the second only" (and packages/nodegx-project-contract/tests/singleton.test.ts)
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

**P107 s93, 2026-10-12 — the proposed one-word fix is wrong; measured before building.** `NodeGraphModel.hasNodesWithType`
(:1189-1198) is true when ANY node of the type is in the component, the node asking included. So reading `singleton` at
:1029 would mark every Page with "There can only be one instance of this type" as an `error`. Over the 370 projects the
P107 census reads (both formats): **1,477 components hold exactly one singleton node (Page 1,045, `noodl.cloud.request`
432) — all would turn red — and 0 components hold two.** A correct fix counts more than one. The agent's checker has no
singleton rule at all (no `singleton` in `validation/`), so an agent can write two Pages and pass. The catalog marks two
types `singleton`: Page and `noodl.cloud.request`. Whether to build it (editor warning counting > 1, plus a validator
rule for the agent) or delete the dead warning is a ruling: reach today is 0.

**Fixed s93 (`83bb0de10`), R34 "Warn on the second one, in both":** `@nodegx/project-contract/singleton` marks every node after
the first of its singleton type; the editor's `node-singleton` reads `singleton` through it (at `warning`), and the checker's
new `duplicate-singleton` warns on the same nodes. Driven in the editor on a copy of fld-012.
