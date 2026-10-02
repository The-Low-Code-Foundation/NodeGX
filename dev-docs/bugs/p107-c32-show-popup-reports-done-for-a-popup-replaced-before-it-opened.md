---
id: P107-C32
title: Two Show Popups pressed in one frame — the first reports Dismissed AND Done, for a popup that never opened
status: needs-ruling
severity: low
area: runtime / NodeContext.showPopup (Show Popup)
found: P107 NSP-015 s20, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md §6.1f, §6.2; packages/nodegx-node-spec/scenarios/graph/t12-popups.json
---

Show Popup's Done says: "Fires once the popup has been opened. Closed and Dismissed are later events
about the same popup, not this signal". When two Show Popup nodes are pressed in the same frame (a button
and a keyboard shortcut, the case `showPopup`'s own docblock names) with the default Replace It, the
first popup is replaced while it is still being built. The first node then reports `Dismissed`, which is
right, and ALSO `Done`, though its popup was never shown. An author who sequences work on Done (focus a
field, start a timer, log "dialog shown") runs it for a dialog nobody saw.

Why: `showPopup` notices the replacement after its `await` (nodecontext.ts :1247-1253), deletes the
half-built popup and RETURNS, so its promise resolves. Show Popup reports Done on any resolution
(showpopup.ts :288-290); it cannot tell "opened" from "returned early".

Measured 2026-10-02 (graph scenario on the runtime target, the real `showPopup`): `a` and `b` (Target a
real component, Replace It) pressed in one frame → in that settle `a`: Dismissed + Done, `b`: Done. The
scenario beside it (the control), `b` pressed one frame later, gives `a`: Done, then `a`: Dismissed + `b`: Done
(both popups opened; correct).

Proposed (a choice): (a) return a marker from `showPopup` for the early return (or reject with a
`dismissed` reason) and have Show Popup report neither Done nor Failure for it (Dismissed already
answered the press). That needs the outcome contract's view: is a press answered by Dismissed alone?
(b) report Failure `show-popup/replaced-before-open`. (c) keep Done and re-word its description.
