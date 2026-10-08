---
id: P107-C130
title: Items holding a null keep a Repeater's old rows on screen, and a Refresh, Template or Template Type change made after it in the same frame is lost — with every later Refresh, which is never answered again
status: open
severity: medium
area: runtime / Repeater (noodl-viewer-react/src/nodes/std-library/data/foreach.tsx `scheduleCopyItems` :895-921 → `collection.set` throws on a null item (collection.ts :597, model.ts `instanceOf` :265); node.ts `update` :759-763 runs a node's frame-end callbacks in one loop, so the throw drops the rest; `scheduleRefresh` :453-468 then sees `hasScheduledRefresh` still true for good)
found: P107 NSP-016 s59, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.20; recorded on the runtime target (the s59 probe traces), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/For Each.json "a list with a null in it keeps the old rows; a Refresh asked after it in the frame is lost, and so is every later one (row C130)"
---

**What a person sees.** A list is handed a new set of items with one empty entry in it (an Array Map whose function returned
nothing for one item, say). The Repeater keeps showing the previous items — nothing on the wire says the new ones were refused. If the
same frame also pressed Refresh or changed the Template, that is lost too, and from then on the Repeater never rebuilds: Refresh is
never answered and a new Template is not applied to the rows already there.

**Where.** The copy of Items runs as one of the Repeater's frame-end callbacks and `collection.set` throws at the `null`. Node.update
runs a node's callbacks in a single loop, so a rebuild scheduled after the copy in the same frame never runs — but
`hasScheduledRefresh` was already set, and only the rebuild itself clears it. Every later `scheduleRefresh` returns at its first line.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec copies the behaviour (R3).

**Proposed fix.** Two small ones: skip a `null` / `undefined` item in the copy (or report it once, `repeater/items-not-a-collection`
already exists) instead of throwing; and clear `hasScheduledRefresh` in the scheduled callback rather than in `refresh()`, so a lost
callback cannot leave the flag set. A ruling on the first: skip the empty entry, or refuse the whole list and say so.
