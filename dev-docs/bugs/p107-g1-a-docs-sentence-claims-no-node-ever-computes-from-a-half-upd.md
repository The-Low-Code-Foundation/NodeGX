---
id: P107-G1
title: A docs sentence claims no node ever computes from a half-updated upstream; per-write nodes do
status: needs-ruling
severity: low
area: runtime / graph semantics (NSP-008 docs)
found: P107 (the node says what it does) s7, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-008-THE-GRAPH.md §6 (row G1) — the row names how it is reproduced and pinned
---

A docs sentence claims no node ever computes from a half-updated upstream; per-write nodes do.

**What:** **C6's sentence is not what a per-write node sees.** *"A node therefore never computes from a half-updated upstream"* is true of a frame-end node (String Format, ✅) and false of a node that computes in its setter: C7's lockstep applies one entry per port per pass and And publishes after each, so `x AND NOT x` carries `true` then `false` on the wire inside one pass (Value Changed fires twice, the Counter behind it reads 3). The export computes it atomically and reads 1 — the export bears the clause out where the runtime does not. Neither is graded by any existing test

**Where:** node.ts drain (`order`, one entry per port per pass) + and.ts :33-49; CONTRACT.md C6

**Status:** **R8 asked** (README §7): fix the sentence (the runtime wins, R3 (a)), or narrow the glitch

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
