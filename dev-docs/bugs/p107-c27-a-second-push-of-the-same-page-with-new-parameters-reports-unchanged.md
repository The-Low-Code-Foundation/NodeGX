---
id: P107-C27
title: A second push or replace of the same page with new parameters, from one Push Component To Stack, reports Unchanged and keeps the old page
status: fixed
commit: 3ae687fbe
phase: P109
task: ISL-028
severity: high
area: runtime / Push Component To Stack + Component Stack (viewer)
found: P107 NSP-015 s18, 2026-10-01
regression: packages/noodl-viewer-react/tests/isl-028-a-second-press-with-new-parameters.test.ts "ISL-028 C27 — Push Component To Stack (push|replace)…" (the second press opens the page with the second id; the same id twice is still Unchanged)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md §6.1d, §6.2
---

One Push Component To Stack whose Target Page stays the same and whose parameters change between
presses — a sidebar or nav bar outside the stack that sets the product id and pushes (or replaces)
"Product" — navigates the first time only. From the second press on it fires Unchanged, the stack
keeps showing the first product, and nothing else happens.

Why: the node hands the stack its LIVE parameter object (`params: this._internal.pageParams`,
navigate.ts :181 push, :210 replace) and the stack keeps that object on the entry it pushes
(navigation-stack.tsx :1000 push, :878 replace). Every later `pm-…` write mutates the object already
on the stack, so the next press asks `_isAlreadyShowing(page, params)` (navigation-stack.tsx :430-457)
to compare an object with itself: same page id, every key equal — "already showing", `hasUnchanged`
(:964-966 push; :831-833 replace when the stack is one deep, which a replace always leaves). NDA-008 §2
(`63f76b628`, 2026-07-29) added the check and names this exact case as the one params keep safe
("master → detail(id=1) → detail(id=2) … must keep pushing"); the identity of the object defeats it.

Measured 2026-10-01 (throwaway runtime probe: the real Push node, a fresh `NavigationHandler`, a
recording stack): two presses, `pm-id` 1 then 2 → both calls hand the same object (`===`), the first
call's params now read `{ id: 2 }`; the real `_isAlreadyShowing` with the entry the first push leaves
(`{ pageInfo: detail, params: <that object> }`) answers `true`. Control: the same check against an
entry holding a copy `{ id: 1 }` answers `false`. Not driven through a mounted Component Stack (a
visual node); the entry's shape is read from :1000.

Not affected: a Push node INSIDE the pushed page (a new instance per page, its own object), a Repeater
row per item, a different Target Page each press.

Proposed: hand a copy — `params: { ...this._internal.pageParams }` at navigate.ts :181 and :210 (the
node's side, one line each); or have the stack copy what it stores. Ships alone.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Hand the stack a copy".** Each press opens the page with the values it was pressed with, so the second product opens. One line each for push and replace, on the node's side. The question as asked: *"Should Push Component To Stack hand the stack a copy of its parameters, so each press keeps its own values?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 3ae687fbe (P109 ISL-028, 2026-10-06), as ruled.**
