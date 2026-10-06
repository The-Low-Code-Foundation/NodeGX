---
id: P107-C37
title: The Record node's "<field> Changed" signals have never fired
status: fixed
commit: b67698798
phase: P109
task: ISL-027
severity: high
area: runtime / Record (`DbModel2`)
found: P107 (the node says what it does) s23, 2026-10-02
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/DbModel2.json "a fetched field that differs on the bound record pulses its <field> Changed (ISL-027, C37)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.8 (row C37); scenario `DbModel2.json` "C37: …"; graph `scenarios/graph/s07-the-record-watches.json` third scenario
---

The Record node's "<field> Changed" signals have never fired — row C11's twin, on the backend's Record node.

**Where:** `packages/noodl-runtime/src/nodes/std-library/data/dbmodelnode2.ts`. The editor offers a `<field> Changed`
signal beside every field output (`updatePorts`, `includeChangedSignals: true`, :560); `registerOutputIfNeeded`
(:473-481) registers `prop-` names only; the pulse at :142 is guarded by `hasOutput('changed-' + name)`, so it never
fires. A wire from the port goes the way C11's does (the connection asks for an output nobody registered —
nodescope.ts :149-153; that half is C11's measurement, the same code path, not re-measured here).

**What the trace shows (measured s23):** a Record bound to `r1` whose `title` moves (its own Fetch's answer, or Update
Record writing it) pulses `Changed` and re-sends `title` — and never `title Changed`. The control beside it: the same
node pulses `Changed` for a key it has no output for (scenario "bound and watching…", graph s07 first scenario), so the
listener runs; only the per-field signal is missing. 3 of 200 generated sequences meet it on seed 20728.

**Plain words:** *"Every Record node offers a 'title Changed' (one per field) signal. None of them has ever fired, and
wiring one silently does nothing — the same as the Object node's."*

**Proposed:** register `changed-<field>` in `registerOutputIfNeeded` beside `prop-` — one line; rule it WITH C11 (one
question: "make the per-property Changed signals work on both nodes").

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Make them fire".** Each 'title Changed' pulses when that value changes. A one-line change to the Record node. Apps that already have such a wire will start running whatever it leads to, which is what their builders meant. The question as asked: *"Should the Record node's per-field Changed signals fire when that field changes?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s22, ISL-027), as ruled "Make them fire".** One shape in all three (C11, C37, C48): each node registers `changed-<field>` when a wire asks, so the pulse behind `hasOutput` reaches it. The specs had never been graded on the signal's ORDER (the runtime never sent it): 17 generated divergences on the Object and 1 on the Record were one shape, fixed in the specs with the format's `pulses` (Object v3, Record v2; the User already used it). Runtime at seeds 20732 and 13: all three conform, 0 divergences. Control (HEAD's three runtime files): the five scenarios fail, plus 35 / 2 / 18 generated.
