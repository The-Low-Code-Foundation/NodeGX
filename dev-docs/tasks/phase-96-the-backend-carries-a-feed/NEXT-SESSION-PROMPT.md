# Phase 96 — next session

Shaped per [PHASE-EXECUTION.md §3](../../guidelines/PHASE-EXECUTION.md): the board, the next task,
the end condition, the register.

## 1. The board (re-derived from the task FILES, 2026-09-18 after s1)

| task | state |
|---|---|
| FED-001 Parse XML / Parse Feed | 🟢 **built, gated and driven.** AC1–AC4 + AC6 green; **AC5 not measured** |
| FED-002 Indexes a collection declares | ⬜ never built |
| FED-003 A function calls a model | ⬜ never built |
| FED-004 A schedule does not trip over itself | ⬜ never built |
| FED-005 A backend speaks MCP | ⬜ never built |
| FED-006 The drive | ⬜ never built |

**All four rulings are in** (README §4): visible nodes + a proven library; one `Model Request` node
with a provider dropdown; MCP stays in this phase and is built last; this phase runs beside 94/95.
**Nothing is gated on a ruling any more.**

## 2. First job, then the next task

**First, and it is fifteen minutes when the box is quiet: FED-001 AC5.** Two
`noodl-viewer-react` production builds — one with `noodl-runtime.ts:304-305` (the two new
`require` lines) commented out, one as it is — and the gzipped delta written into FED-001 §6.
The budget is 50 KB and the evidence says it will come in far under, but *will come in under* is a
prediction and AC5 asks for a number. **Check `uptime` first**: s1 stopped at load 18.9 with a peer
running three webpack watchers, which is exactly when not to start this.

**Then build FED-002** — `indexes` per collection in `schema.json`, unique included, and
upsert-on-unique on create. It is what makes `Parse Feed`'s `Id` output worth having: FED-001
guarantees the id is stable across polls, and FED-002 is what turns that into "the item lands once".
Read FED-001 §5.2 before starting — the `id` ladder's last rung (a hash of title + published) is
reached by real feeds and there is a fixture for it.

## 3. The phase's end condition

README §8: FED-006 green on a fresh backend with one `nodegx-backend` process and nothing beside
it, and Richard has ruled the execution record legible. Distance: FED-002 through FED-006.

## 4. The register

| | finding | owner |
|---|---|---|
| R1 | **A feed graph that wires only the parser's `Failure` hangs for the full function timeout when the FETCH is what failed** (CWF-018). Found by the drive suite's own first run: 30 s, then 504. Not a FED-001 defect — CWF-018 owns the missing function timeout — but it is the shape every feed graph will be drawn in, so it is documented as a pattern on both nodes and wired in both worked examples. **Re-read when FED-004 touches polling.** | CWF-018 |
| R2 | The scoping session's `fast-xml-parser` figure ("MIT, no dependencies, ~40 KB") was wrong at every version and was repeated to Richard when R1 was put to him. Corrected in place in FED-001 §3.1 with the measured numbers. **No action** — recorded because the ruling was taken on the wrong number and still stands on the right one. | — |
