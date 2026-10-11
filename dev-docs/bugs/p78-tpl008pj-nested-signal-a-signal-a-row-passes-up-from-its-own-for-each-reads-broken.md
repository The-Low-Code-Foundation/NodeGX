---
id: P78-TPL008PJ-NESTEDSIGNAL
title: A signal a For Each row passes up from a For Each of its own reads as a broken wire in the deploy's wire check — the wire works in both viewers
status: fixed
phase: P109
task: ISL-044
severity: low
area: editor / NodeGraphModel wire health (`NodeGraphModel.ts:933`), as the deploy runs it (`packages/noodl-preview/src/wireHealth.ts`)
found: TPL-008-PJ s2, 2026-10-05, building the todo list's Projects tab
evidence: dev-docs/tasks/phase-78-the-templates/TPL-008-PJ-THE-PROJECTS-TAB.md §8 s2; `nodegx-deploy.cjs templates/todo-list …` → `wires.broken`
kit: deploy
regression: packages/noodl-preview/tests/gam-023-a-deploy-publishes-every-wire-and-names-the-broken-ones.test.ts "todo-list names nothing" (the check); packages/nodegx-backend/tests/tpl008-projects-drive.test.ts §3e (openTask), §3d (saveProject), §8 "a project money line opens its form" (editMoney) — the wires the check calls broken, driven working on the repo viewer and the box's viewer
---

**What a person sees.** `nodegx-deploy` on the todo list prints three warnings and publishes anyway:

```
/Projects/Project list  plEach.itemOutputSignal-openTask    -> plOut.openTask     Source port doesn't exist.
/Projects/Project list  plEach.itemOutputSignal-editMoney   -> plOut.editMoney    Source port doesn't exist.
/Projects/Project list  plEach.itemOutputSignal-saveProject -> plOut.saveProject  Source port doesn't exist.
```

All three wires work: the drive presses a project's task (openTask), saves a project (saveProject) and presses a project's
money line (editMoney), and each write and each view change lands, on the repo's viewer and on todo.digitalbricks.io's
(sha `57e1cb07…`). So the warning is false, and a warning that is false on a working wire teaches the reader to skip the
warning that is true.

**What the three have in common.** `Projects/Project row` declares each as a `signal` on its Component Outputs, and each is
fed from a For Each **inside the row** (`prTaskEach.itemOutputSignal-open`, `prMoneyEach.itemOutputSignal-edit`,
`prEditEach.itemOutputSignal-save`). The row's other signals — fed from a Button, or from a Function — are not flagged
(`addMoney`, `toggle`, `save`). The likely cause, not yet measured: when the outer For Each mints its `itemOutputSignal-*`
ports from the row's outputs, the inner For Each has not minted its own yet, so the row's output reads as untyped and the
outer one mints it as a value port.

**Open question.** Whether the editor itself draws these three wires as broken when the template is opened (the same
model). Not looked at.

**s3 (same day): a fourth.** `plEach.itemOutputSignal-linkTask -> plOut.linkTask` (Add an existing task, fed from the
row's `prLinkEach`) — the same shape, flagged the same way, and driven working in `tpl008-projects-drive` §9 on both
viewers.


**s4 (P109 s43, 2026-10-11): measured and fixed.** Re-measured first: `nodegx deploy` on a copy of HEAD's
`templates/todo-list` named all four. The cause was the order, as guessed, but in the deploy's own check rather than
in the model. `readWireHealth` ran the runtime once (`registerRuntimeDiscoveredPorts`), and that pass's input was
exported before any For Each had minted its ports. So `Projects/Project row`'s `openTask` was still untyped when the
list's For Each read it, and the For Each minted `itemOutput-openTask`. In the editor the runtime mints the outer
ports again when the row's port types are updated. **Fixed:** the check runs another pass while a pass changes the
components' exported port types (at most four). The todo list settles in three, with 2,036 wires checked and none
named. GAM-023's todo-list row is green, and its other seven rows are unchanged, including *"the wire pass leaves the
exported model as it was"*. The editor's canvas was not opened for this. The open question above stands.
