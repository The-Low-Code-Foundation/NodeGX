---
id: P107-C30
title: A popup that failed to open keeps its place on the popup stack — the next popup reports Dismissed for it, and Escape stops working
status: needs-ruling
severity: medium
area: runtime / NodeContext.showPopup (Show Popup)
found: P107 NSP-015 s20, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md §6.1f, §6.2
---

A Show Popup whose Target cannot be built (a deleted or renamed component, a bundle that fails to load)
reports Failure `show-popup/target-failed`, which is right. But the popup's slot on the runtime's popup
stack is never given back. Two things follow, both visible to an author:

1. **The next popup reports Dismissed for a popup that never opened.** Any later Show Popup with When A
   Popup Is Open = Replace It (the default) dismisses everything on the stack, including the failed slot,
   and the FAILED node fires `Dismissed`. An author's Dismissed branch ("the dialog was replaced") runs
   for a dialog nobody ever saw.
2. **Escape stops reaching a real popup underneath.** With Show On Top, a failed popup above an open one
   is the top modal slot. Escape finds it, it has nothing to cancel, and the key is not spent. The open
   popup beneath cannot be closed with Escape until something else replaces the stack.

Why: `showPopup` pushes the slot synchronously (nodecontext.ts :1243), before it awaits
`nodeScope.createNode(target)` (:1245). When that rejects, nothing removes the slot: there is no `catch`,
and the only code that splices a slot out is `dismiss` (:1220-1236) and `leave` (:1284-1300), which a
failed build never reaches. `cancelTopPopup` (:1183-1195) stops at the top modal slot and returns
`false` when it has no `cancel`.

Measured 2026-10-02 (throwaway runtime probe, the real `showPopup` on the node-spec runtime target, then
graded by the Show Popup spec's two hand scenarios):
- Target `Nope` (Failure), then Target `Popup` with Replace It → the second show reports `Dismissed` on
  the same node, then Done; the stack holds 1 slot (the new popup), so the failed slot was there to dismiss.
- Target `Popup` (open), then Target `Nope` with Show On Top (Failure), then Escape →
  `cancelTopPopup()` returns `false`, no Cancelled, 2 slots remain. Control, the same with no failed
  popup on top: Escape → `true`, Cancelled at the next frame, 0 slots.

Not affected: a Show Popup with no Target (Failure `show-popup/no-target` returns before `showPopup` is
called), an app with no popup host (nothing is pushed).

Proposed: give the slot back when the build fails. In `showPopup`, wrap the `await` and on a rejection
splice `entry` out of `popupStack` (mark it dismissed so a racing replace does not report it) and
rethrow, so Show Popup still reports Failure. One place, no change for any popup that opens.
