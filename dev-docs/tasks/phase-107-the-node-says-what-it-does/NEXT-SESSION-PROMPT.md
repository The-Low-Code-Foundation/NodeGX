# P107 — next session

**Written 2026-10-10 (s79, Fable).** Read the [README](README.md) §2–§7 (R18 is the newest ruling), then
[NSP-020 §3.1 and §6.1](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md) — the design and the five lanes — and
[NSP-019 §5.1](NSP-019-RICHARD-READS-IT.md) (Richard's drive, still owed).

**Model.** s79 was the Fable half of NSP-020 (the format, the context shape, the drive's oracles). What is left is
lane work whose shape §6.1 fixes: **Opus** for L1–L4. L5 (the context builder in `project-contract`, the cache drive,
the MCP wiring) is a cross-package move — say so at its start and offer Fable.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 (507 of 507 reducers in words, `says` required) | s72 … s77 |
| NSP-019 Richard reads it | 🟡 s77: AC1, AC2 and the §2 table built; **AC3 is Richard's drive** | s77 |
| NSP-009 the ratchet | ✅ s64; s65 a `contract` column | `6a1ed0084`, s65 |
| NSP-010 a change is a version | ✅ s78 | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes rewritten s70 … s78) | `649e6864d`, s70 … s78 |
| **NSP-020 ports without a viewer** | 🟡 **s79: design + format + the drive's first proofs** (§3.1, §6.1). Left: lanes L1–L5 | s79 (this commit) |
| NSP-021 the second editor | 📋 not started (depends on NSP-018 ✅ and NSP-020) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

`spec-ledger --check` (s78): exit 0 — 125 of 147 on the runtime · 3 contract · 2 export · 2 exempt · 17 owed, all NSP-022.
s79 did not move it (no spec gained or lost conformance).

## What s79 did

Four read-only measurements (runtime announce path, editor port cache and adapters, the 43 `derived` specs, the
gates), then the design in NSP-020 §3.1 — six decisions, each with the measurement that forced it. Built: `portsOf` /
`drawnPorts` / `needsContext` / `portsDerivability` (`nodegx-node-spec/src/ports.ts`); `PortContext`, `PortMeta.when`,
`ValueInputDecl.narrow`, `DerivedPorts.inputs/outputs(params, context)` + `needs`; `context` on a scenario, through
`play` and `mount`. And reads `context.wired` (the drive's first finding — `collectPorts` counts wires, the spec counted
params); Image's three size-mode ports carry `when`. Three oracles stand: runtime `setup` hooks fired headless
(`noodl-runtime/test/node-spec/nsp-020-ports-parity.test.ts`, 13 / 13, two plants), the editor's condition evaluator
(`noodl-editor/tests-unit/nsp-020/`, 6 / 6, census printed, `WHEN_FLOOR = 3`), adapters not started. Two rows filed:
P107-S79-ADAPTERLABEL (the catalog's `editor-adapter` label is wrong for Router, Query Records, Filter Records),
P107-S79-SILENTCACHE (a stale cached `dynamicports` is trusted, then replaced with no diff).

**Where the task file was wrong:** §6 said 5 of 68 dynamic-port nodes had `ports(params)`; 43 did (s4–s68 closed rows
without writing them here). §3's "mount the node in the interpreted runtime" was the wrong oracle: the runtime announces
from the graph model, so the drive mounts nothing.

## What s80 does

1. **Richard (unchanged from s77):** drive NSP-019 (AC3) and rule its three choices (§5.1); C160, C161, C162.
2. **NSP-020 lanes L1–L4** (§6.1) — independent; in worktrees (`make-worktree.sh`), small runs only, ONE 10,000-sequence
   run at the end on the primary. Start L1 (`needs` + fixtures → `context`) and L2 (`when` on the 445) first: L1 settles
   how `scenario.context` stands in for the project on the runtime target; L2 is mechanical and the biggest count.
   L3 (the padding out, re-derive after a param write) touches the interpreter AND the runtime target — one lane, with
   `spec-golden:check` beside it. L4 is the module table for ~50 `setup` hooks.
3. **Then L5:** `portContextFor(project, nodeId)` in `@nodegx/project-contract`, the cache drive over the templates,
   AC3 (MCP per-instance ports), AC4 (the ledger column from `portsDerivability` and the drives' result).
4. Oracle (c) once P107-S79-ADAPTERLABEL gives the true adapter list.

**Human decisions:** NSP-019 AC3 and its three choices; C160; C161; C162. The Frappe note in NSP-010 §4 is owed to
Richard **before the first `changes` entry answers `project`** — none does yet. NSP-010's and NSP-017's uncommitted
peer notes were left out of s79's commits again.
**P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT. **P112 holds:** P107-SIZE.
`node scripts/bugs.js check` is red at HEAD on 14 pre-existing headers (none P107 s79's; P107-C155 and
P107-S76-FULLBUDGET among them) — a sweep nobody owns.

## Gates (s79)

- node-spec `tsc --noEmit` 0; node-spec jest `ports, pilot, batch, batch-escape, catalog-parity, adapter, runner, types,
  golden` 540 / 540.
- runtime `npx jest test/node-spec/nsp-020-ports-parity.test.ts` 13 / 13 (two PLANTED mutants red as expected).
- editor `npx jest tests-unit/nsp-020` 6 / 6 — prints `3 ports graded by a when, 445 owed (436 no when; 9 #js), 0 unlisted`.
- `tsc -p packages/noodl-editor --noEmit` 0; `typecheck:editor-tests` 0.
- Not run: the full node-spec suite (the stranger suite is 440 s), the runtime conformance batch, `spec-golden:check`
  (no trace can have moved — `golden.ts` hashes declared ports and the play, and `derived.inputs` at `{}` is unchanged
  for every spec), `spec-ledger:check`, `test:main`, `test:ci`. A lane's first act: run `spec-golden:check` and
  `spec-ledger:check` once, before anything else moves.
