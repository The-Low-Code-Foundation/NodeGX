---
id: P107-C29
title: A second Navigate to the same page with new parameters, from one Navigate node, reports Unchanged and keeps the old page
status: needs-ruling
severity: high
area: runtime / Navigate + Router (viewer)
found: P107 NSP-015 s19, 2026-10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md §6.1e, §6.2
---

The Router twin of P107-C27. One Navigate node that stays alive across the navigation — in a header,
a sidebar, anything outside the Router — whose Target Page stays the same and whose parameters change
between presses ("set the product id, Navigate to Product") navigates the first time only. From the
second press on it fires Unchanged, the Router keeps showing the first product, and its Page Inputs
never hear the new id.

Why: the node hands the Router its LIVE parameter object (`params: this._internal.pageParams`,
router-navigate.ts :132; `setPageParam` mutates it in place, :149-151) and the Router keeps that object
as `currentParams` when it builds the page (router.tsx :917). Every later `pm-…` write mutates the
object the Router already holds, so the next navigate's already-showing check
(`_navigateInCurrentWindow`, router.tsx :888-895) compares an object with itself: same page, every
key equal — `hasUnchanged`. The method's own docblock (:882-883) names this exact case as the one the
parameters keep safe ("`/product/{id}` navigated to twice with different ids is the same page and must
still rebuild"); the identity of the object defeats it.

Measured 2026-10-01 (throwaway runtime probe: the real Navigate node through a fresh `RouterHandler`
and a recording router): two presses, `pm-id` 1 then 2 → both navigates hand the same object (`===`),
and the first navigate's params now read `{ id: 2 }`. The real `_navigateInCurrentWindow` (from the
Router's own definition), with `currentParams` = that object (what `_buildPage` leaves, :917) → answers
`unchanged`, builds nothing. Control: the same call with `currentParams` = a copy `{ id: 1 }` → builds.
Not driven through a mounted Router (a visual node); the assignment at :917 is read.

Not affected: a Navigate node INSIDE the page (destroyed with it; the next page's node has its own
object), a Repeater row per item, a different Target Page each press, a navigate from another node.

Proposed: hand a copy — `params: { ...this._internal.pageParams }` at router-navigate.ts :132 (the
node's side, one line); or have the Router copy what it keeps at :917. Same ruling as C27; ships alone.
