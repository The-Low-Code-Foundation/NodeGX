---
id: P107-C37
title: The Record node's "<field> Changed" signals have never fired
status: needs-ruling
severity: high
area: runtime / Record (`DbModel2`)
found: P107 (the node says what it does) s23, 2026-10-02
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
