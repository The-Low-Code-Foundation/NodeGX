---
id: P107-C11
title: The Object node's "<property> Changed" signals have never fired
status: scheduled
phase: P109
task: ISL-027
severity: high
area: runtime / Object
found: P107 (the node says what it does) s9, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.2 (row C11) — the row names how it is reproduced and pinned
---

The Object node's "<property> Changed" signals have never fired.

**Where:** Object (:451-460, :517-525; nodescope.ts :149-153)

**What the wire shows:** **`<property> Changed` never fires**: the editor draws the port, nothing registers it — a wire from it throws inside the connection and is dropped, and the pulse at :113 is guarded by `hasOutput`

**Plain words:** *"Every Object node offers a 'name Changed' signal per property. None of them has ever fired, and wiring one silently fails."* 32 counted; s04 and three Model2 scenarios under the row

**Proposed:** register `changed-<p>` in `registerOutputIfNeeded` — one line, ships alone

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Make them fire".** Each 'name Changed' pulses when that value changes. A one-line change to the Object node. Apps that already have such a wire will start running whatever it leads to, which is what their builders meant. The question as asked: *"Should the Object node's per-property Changed signals fire when that property changes?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)
