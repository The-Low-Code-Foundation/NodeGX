---
id: P107-C31
title: A Close Popup in a nested popup cannot close the outer popup by name — the Popup input's "when popups are nested" never works
status: needs-ruling
severity: medium
area: runtime / NodeContext.showPopup + Close Popup (viewer)
found: P107 NSP-015 s20, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md §6.1f, §6.2; packages/nodegx-node-spec/scenarios/graph/t12-popups.json
---

Close Popup's Popup input says: "Which popup to close when popups are nested; leave blank to close the
nearest enclosing one". Its docblock (closepopup.ts :89-90) gives the case: "popups nest — a popup
opened from inside a popup gives a Close Popup node two honest answers, and only the author knows which
was meant". That case never works. A Close Popup inside the INNER popup that names the OUTER one fails
with `close-popup/target-not-found` ("This node is not inside a popup named …"), and the outer popup
stays open. The only popup a Close Popup can ever find is the one it sits in.

Why: `showPopup` builds every popup in the ROOT component's scope (nodecontext.ts :1215, :1245), whoever
opened it. A popup's component walk (componentwalk.ts) therefore goes popup → root, never through the
popup that opened it. `showPopup` does record the opener (`popupNode.popupParent = args.senderNode`,
:1258), but nothing in the runtime or the viewer reads `popupParent`.

Measured 2026-10-02 (graph scenario on the runtime target, the real `showPopup` and Close Popup, popups
as real component models): Show Popup → Outer; a Show Popup in Outer (Show On Top) → Inner; a Close Popup
in Inner with Popup = `Outer`, pressed by Inner's input. Probe at its `close()`: candidates `["Inner"]`,
miss `close-popup/target-not-found`; the opener of Outer never hears Closed. Control: the same Close
Popup placed in Outer itself, Popup = `Outer` → candidates `["Outer"]`, closes; the opener hears Closed.

Proposed (a choice): (a) make the walk cross from a popup to its opener: in `componentAncestors`, or
only in Close Popup's `resolvePopup`, continue from `popup.popupParent` when a component has one, so the
input does what it says; or (b) say what it does: the Popup input only ever matches the enclosing popup.
Re-word its description and docblock, or remove it. (a) is a change of where a nested Close Popup
resolves, so it needs a ruling.
