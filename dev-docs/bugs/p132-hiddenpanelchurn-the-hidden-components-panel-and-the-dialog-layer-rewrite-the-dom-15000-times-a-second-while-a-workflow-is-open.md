---
id: P132-HIDDENPANELCHURN
title: With any project open in the editor (a page or a backend workflow), the Components panel and the top bar re-rendered about 480 times a second and the dialog layer's portal changed about 14,000 times a second
status: fixed
phase: P132
task: BWF-008
severity: medium
area: noodl-editor / models/warningsmodel.ts `setWarning` (the cause); ComponentsPanelNew/hooks/useComponentsPanel.ts and NodeTypeAdapters/nameListParameter.warnings.ts (the loop's two ends); core-ui Portal (the amplifier)
found: driving BWF-008 item 3 (the value picker's field trees) in the dev editor on a Greenhouse copy, 2026-11-03 (s11); cause found and fixed 2026-11-04 (s22)
evidence: a MutationObserver on document.body for 2 s, the value picker CLOSED: 29,904 childList mutations on DIV.dialog-layer-portal-target and 3,204 attribute mutations on INPUT.SearchInput-module__SearchInput (placeholder "Filter components", width 0: the Components panel is not the panel on screen). The portal held 49 empty DIVs (class "", outerHTML 11 chars).
launch: none
fixed-evidence: packages/noodl-editor/tests-unit/workflow/p132-hiddenpanelchurn.test.ts (6; HEAD's setWarning red on 4, the loop firing 50 times in 50 ticks); in the dev editor on a Greenhouse copy, 0 DOM changes in 2 s with a page open and with a workflow open and a step picked (were ~28,000)
commit: (this session's NodeGX commit)
---

Seen while measuring whether the new field-tree list re-rendered in a loop: it does not (no mutation was inside
`[role=tree]`), but something else does, all the time. With the Workflows panel showing *When a plant is watered* and
a step selected, the Components panel (hidden behind the Workflows panel) keeps rewriting its filter input's
attributes, and `.dialog-layer-portal-target` keeps adding and removing children: 49 empty `<div>`s sat in it at the
moment of reading. Nothing visible changes. Over 15,000 DOM changes a second costs a laptop's battery and CPU for as
long as a workflow is open, and may be why presses sometimes seemed not to land during this drive.

Not known: whether it happens with a page (not a workflow) open, whether it happened before P132, and what writes it.
First step: the same 2 s observer at HEAD with a page open, then with a workflow open; then React DevTools' "highlight
updates" on the Components panel. The observer used is in the BWF-008 s11 record.

## s22 (2026-11-04): the cause, and the fix

**Not the workflow's.** Measured in the dev editor on a Greenhouse copy with only the App page open, no workflow,
no dialog: 27,524 and 28,140 portal mutations in two 2 s windows. The input churn s11 saw is the same thing (the
Components panel's filter re-rendering with its panel).

**The loop**, found by walking the React fibers (which components got new props between two reads 300 ms apart:
`EditorTopbar` and `ComponentsPanel`), diffing their hooks (`ComponentsPanel`'s warning counter went 45,758 → 45,822 in
120 ms; `EditorTopbar`'s `useTriggerRerender` stamp moved), then wrapping `WarningsModel`'s writers for 1 s (478 calls,
479 notifications, every one from one stack):

`useComponentsPanel` bumps a counter on every `warningsChanged` → the panel rebuilds → `metaFor` →
`RouterAdapter.getPageInfoForComponents` → `readNameList(pageInputs, 'pathParams')` → `WarningsModel.setWarning(ref,
undefined)` (a clear of a warning that was not there) → `scheduleNotifyChanged` → `warningsChanged` one
`setTimeout(1)` later → … about 480 times a second, from the moment a project opened. `EditorTopbar` re-renders on
`warningsChanged` too, and every re-render of a mounted core-ui `Portal` (9 tooltips and 4 menus in the top bar, 32
in all) removes one empty `<div>` from `.dialog-layer-portal-target` and appends a new one: `Portal` makes a fresh
div on each render and moves it in its effect, though nothing is rendered into it.

A clear made INSIDE the notification would not loop (the pending flag swallows it); the re-render is a later task,
which is what closed the loop. Two features each fine alone (PNL-006's warning dot, AIB-001's report-on-read) made it.

**Fixed** at the model: `setWarning` announces only a change. A clear of an absent warning returns; a fresh warning
object with the same words as the one held returns; the same object set again still announces (its owner may have
changed it in place). Spec `tests-unit/workflow/p132-hiddenpanelchurn.test.ts` 6/6, HEAD's model red on 4 (the loop
50 notifications in 50 ticks; fixed: 1). In the dev editor after the fix: 0 mutations in 2 s and 0 `setWarning` calls in
1 s, with the page open, with the Workflows panel up, and with *When a plant is watered* open and a step's properties
showing (s11's state). The top bar's ⚠ 1 is a real warning (the copy's Query Records has no backend).

Left: core-ui `Portal` still swaps an unused empty div on every render of a mounted dialog. Harmless without a render
loop, but it is what turned ~480 renders a second into ~14,000 DOM changes; `useState(() => document.createElement('div'))`
or dropping the div would stop it. Not done here (core-ui, every dialog).
