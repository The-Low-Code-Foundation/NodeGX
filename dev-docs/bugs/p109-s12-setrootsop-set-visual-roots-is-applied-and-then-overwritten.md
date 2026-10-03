---
id: P109-S12-SETROOTSOP
title: update_component's set_visual_roots op answers "applied" and "unchanged" and writes nothing when derivation disagrees
status: fixed
commit: 97a53c579
severity: medium
area: mcp / update_component (operations door, author.ts)
found: P109 ISL-015 AC5 s12, 2026-10-03 (the stranger round)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-015-A-KIT-AUTHOR-READS-THE-TRAPS-BEFORE-MEETING-THEM.md §8 s12
regression: packages/noodl-mcp/tests/setVisualRootsOp.test.ts
---

After a batch of operations the door re-derives `visualRoots` (AWP-002 A20) and passed `explicit: undefined`,
"by construction: a batch has no visual_roots argument". The batch's own `set_visual_roots` op was overwritten.
For a known visual node the two agree, so nobody saw it; for an unknown type (a kit the server had not read) or a
deliberate subset of the roots, the op was reported `applied`, the write `unchanged: true`, and nothing was
written. The stranger round's agent asked for its pad as the root this way and got a component that draws nothing.

**Fixed (s12):** when the batch carries a `set_visual_roots`, the roots the ops produced are explicit
(`author.ts`, beside the A20 re-derive). Spec: unknown-type root and subset red at HEAD, green after; the A20
derivation case green both sides.
