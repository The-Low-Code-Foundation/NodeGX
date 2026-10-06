---
id: P107-G1
title: A docs sentence claims no node ever computes from a half-updated upstream; per-write nodes do
status: fixed
commit: 8a177580d
phase: P109
task: ISL-033
severity: low
area: runtime / graph semantics (NSP-008 docs)
found: P107 (the node says what it does) s7, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/graph/c06-upstream-is-pulled-first.json "the same diamond into a per-write node: what the wire carries between the two entries of one pass"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-008-THE-GRAPH.md §6 (row G1) — the row names how it is reproduced and pinned
---

A docs sentence claims no node ever computes from a half-updated upstream; per-write nodes do.

**What:** **C6's sentence is not what a per-write node sees.** *"A node therefore never computes from a half-updated upstream"* is true of a frame-end node (String Format, ✅) and false of a node that computes in its setter: C7's lockstep applies one entry per port per pass and And publishes after each, so `x AND NOT x` carries `true` then `false` on the wire inside one pass (Value Changed fires twice, the Counter behind it reads 3). The export computes it atomically and reads 1 — the export bears the clause out where the runtime does not. Neither is graded by any existing test

**Where:** node.ts drain (`order`, one entry per port per pass) + and.ts :33-49; CONTRACT.md C6

**Status:** **R8 asked** (README §7): fix the sentence (the runtime wins, R3 (a)), or narrow the glitch

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Yes, correct the docs sentence".** The page is rewritten to say what is true: the nodes feeding a node update first, but a node that recomputes on each input sees its inputs one at a time and can send a passing result. No app changes; the exported code stays different here, and that difference stays on the export's list. The question as asked: *"When two inputs of a node change in the same update, may the node briefly send a result built from one new input and one old one?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 8a177580d (P109 ISL-033, 2026-10-06), as ruled.** CONTRACT.md C6 now says the nodes feeding a node update first, but a node that recomputes in each input's setter (And) takes its inputs one at a time and can send a passing result; the export computes it atomically, and that difference stays on the export's list. The c06 scenario claims the corrected sentence (Value Changed twice, Counter 3) and lost its row mark; control (HEAD's claims, no mark) red on exactly it.
