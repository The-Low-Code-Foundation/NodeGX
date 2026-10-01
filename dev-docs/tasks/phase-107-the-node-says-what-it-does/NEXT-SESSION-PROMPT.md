# P107 — next session

**Written 2026-10-01 (end of s9).** Read the [README](README.md) §2–§7 (**R7, R8 asked; the second batch's rows C9–C11,
D13 are under "Also for a ruling, the second batch's rows"; C7, C8, D10–D12 under the world's; R4's caveat stands**),
then [NSP-012 §6](NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md) (the registry seam, the four interpreter rules a divergence
each found, the rows, what is not done), and whichever task file the board points at.

## Board (from the task files, not from this table's predecessor)

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | ✅ s1 | n/a | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s8; **s9: the REGISTRY seam — `WorldView.registry` (read AND write), `watch` / `unwatch`, `world.send(port, state)` (the imperative send, the runtime's `flagOutputDirty`), `WorldHandlers.change`, `derived.outputs` + `sendDerived` / `emitDerived`, `init(world, params)`, `editOnly`, `emit` of an outcome port; the interpreter samples outputs at the first settle only (F1 closed), never freezes an external value, never hands a node its own write, re-runs the frame end after a foreign change** | n/a | s1 … s9 |
| NSP-002 traces + adapter + runtime target | ✅ s2 … s8; **s9: `$array` on the wire; the runtime target empties and seeds the two process-wide tables per play, registers derived outputs at mount, hands the node its `model.parameters`** | n/a | s2 … s9 |
| NSP-003 the runner | ✅ s2 … s8; **s9: `equivalent` mutants (declared, counted, never hidden); a branch's shape counts WHICH signals; `editOnly` pools; registry scripts in the world pool** | n/a | s2 … s9 |
| NSP-004 the pilot five | ✅ s3 — untouched | n/a | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ s6, s7 — untouched (12 passed, 2 skipped) | n/a | s6, s7 |
| NSP-006 the stranger | ✅ s5 round 1, ✅ s6 round 2; **s9: three format files moved (spec.ts, coerce.ts, canonical.ts) → hashes refreshed, both rounds re-graded green in the same commit. Round 3 is due THREE times over (graphs s7, the world s8, the registry s9)** | n/a | s5, s6, s9 |
| NSP-007 the world | ✅ s8 — AC1's export half ✗ | n/a | s8 |
| NSP-008 the graph | ✅ s7; **s9: `playGraph` builds a world per play; tags S1 / S2 for shared state; 6 scenarios recorded** | n/a | s7, s9 |
| NSP-011 the first batch | ✅ s4 at 200, ✅ s5 at 10,000; AC2 ⏳ | n/a | `c1998f2fa`, s5 |
| NSP-012 the second batch | **🟡 s9: the 13 T1 nodes — 13 / 13 conform on the runtime at 200** (rows C9, C10, C11, D13); AC5 ✅ (s01–s06); AC6 ✅ on the trace, ✗ the stranger; **the 13 T4 nodes not started; AC2 not run; the deep run not run** | n/a | s9 |
| NSP-020 ports without a viewer | rows only: 10 of 68 dynamic-port nodes have `ports(params)` | — | — |
| NSP-009, NSP-010, NSP-013 … NSP-019, NSP-021 | — | — | — |

Built-but-undriven: 0 (nothing is driven in the app until NSP-019). **34 of 147 conform on the runtime** (T1 31, T2 2, T3 1).

## Gate readings (2026-10-01, end of s9, before the commit)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | **15 suites, 429 passed, 12 skipped** (both strangers' deep tests) — was 14 / 359 |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` | exit 0 |
| `npx tsc -p packages/nodegx-export/tsconfig.json --noEmit` | exit 0 |
| `cd packages/noodl-runtime && npx jest test/node-spec` | **3 suites, 86 passed, 34 skipped** — 34 / 34 specs CONFORM at 200 (Model2 574 / 584 mutants + 10 declared equivalent; known rows C3, C4, C6, C9, C10, C11 still fire); graph 32 / 32 (20 scenarios + the 11 clause gates + 1) |
| `cd packages/nodegx-export && npx jest tests/node-spec-conformance.test.ts tests/node-spec-graph.test.ts` | **2 suites, 12 passed, 2 skipped** — unchanged |
| `node -e "require('./tests/stranger-suite-hashes.helper.js').write()"` | refreshed this session; rounds 1 and 2 green |
| `npm --prefix packages/noodl-editor run test:main` | **NOT RUN** (s3's 564 / 565 stands; nothing this phase touches is in it) |

## What s9 settled

1. **The registry is the fourth seam, and the one a reducer writes.** Records and arrays as one store per play
   (`src/registry.ts`; the header is the rule a target implements), the array diff ported verbatim, anonymous ids from
   the seeded stream with the runtime's own formula, the raw first name kept as the id. A node's behaviour here IS the
   order of reads, writes and notifications, so purity is (state, inputs, registry-before) → (patch, registry-after).
2. **Four interpreter rules, each a divergence first.** Sample at the first settle only (what a frame sends is what its
   steps sent — F1 closed, 21 / 21 unmoved); never freeze a scenario's value (the runtime cannot subscribe to a frozen
   array); never hand a node its own write (the runtime's listener runs INSIDE the write, so the reaction's pulses sit at
   the write — a handler after the reducer put `changed` after `fetched`); `world.send(port, state)` snapshots at the flag
   (Array binds, sends `Items`, then copies — the wire keeps the pre-copy snapshot).
3. **Equivalent mutants are declared, not hidden.** A stuck run flag whose re-run is silent; a value a node writes that
   only another node reads (graded by the graph scenarios named in the row). `src/nodes/equivalent-mutants.ts`; every
   report prints the count.
4. **The dead feature of the batch: C11.** Every Object node offers `<property> Changed` and none has ever fired.
5. **AC5 holds on the runtime** for Arrays, Variables and Objects, with controls; **AC6 holds on the trace** (`$array`).

## ⚠️ The checkout, as s9 found and left it

- **Root `package.json` is STILL the peer's stray Nightbook (TPL-011) manifest.** `npm run <anything>` at the root fails.
  Nine sessions have told Richard. Use each package's own `npx jest`.
- Peers' uncommitted work all over `git status` (P78, P102, P104, P18's export `src/`, `scripts/devtools`, a deleted
  `templates/planner-demo`). Nothing in this phase's paths was anyone else's (checked per path before the commit).

## Rulings — R1 R2 R3 R5 R6 ruled; **R4 taken as (a) (confirm); R7 and R8 asked**; rows C2–C11, D1–D13, G1 open; E1–E6 are phase 18's

The row an author meets first, in plain words: **C11** — *"Every Object node offers a '<name> Changed' signal per
property. None of them has ever fired: the port is drawn and never registered, so a wire from it is dropped inside the
connection. Register it — one line, a behaviour change shipped alone?"* Then **C7** (HTTP auth never sent a credential)
and **C9** (three Do nodes answer once for two presses).

## What s10 does

- **NSP-012's T4 half** (13 graph-by-construction nodes: Send / Receive Event with each propagation scope, Repeater
  Item, Action Dispatcher + Handler, Global Store + Set + Subscribe, Optimistic Update, State History + Undo / Redo, State
  Snapshot, Run Tasks) as graph scenarios on the runtime with claims from the sentence — the registry already holds
  what a Global Store needs; the event bus and the component tree (Repeater Item, Run Tasks) are the seams to find.
  **Build it; a defect is first only if it blocks an AC.** Or **NSP-013** (24 T1/T2: dates, parsers, animation — on the
  world as built; `Animate To Value` / `States` need the frame tick, which `settle` already is).
- **Cheap, alongside**: the deep run for the 13 (`NSP_DEEP=10000 NSP_ONLY="Collection2,…"`, a quiet box, ~15 min);
  the three world nodes' deep run; an export reach for the four Variables; a `drop-after` mutant.
- **The third stranger round is due three times over** (README §5's rule). The candidate now: a target for the five
  array nodes from `registry.ts`'s header + `world.ts`'s header + the scenarios alone — AC6's second half says the
  stranger's target must tell *mutated* from *replaced*. `src/registry.ts` and `src/world.ts` join `FORMAT_FILES` then.
- **If any row is ruled "runtime bug"**: each fix ships ALONE as a behaviour-change commit with the scenario's `row`
  mark and its `KNOWN_ROWS` entry dropped in the same commit (C11: one line in modelnode2.ts `registerOutputIfNeeded`;
  the three s04 / Model2 scenarios flip green). Any edit to the 20 guarded files ⇒ refresh
  `tests/stranger-suite-hashes.json` + re-grade BOTH strangers, same commit.

**Human decisions outstanding:** R7; R8; R4's confirmation; rows C2–C11, D1–D13, G1; the stray root `package.json`.

## Before you start

- Shared checkout: pathspec commits or the temp-index CAS, never `git add -A` at the root, never `git stash`, one heavy job
  at a time (the runtime node-spec suite is ~50 s at 200 for 34 specs; the deep run is one job). `uptime` first; `ps`
  before believing it.
- `npm run test:packages` cannot run from the root while the stray `package.json` is there — use each package's own
  `npx jest`; `cd packages/noodl-runtime && npx jest test/node-spec` for the runtime side.
- A registry spec names `send` in EVERY patch (`send: []` for none): "absent means all" would re-read a shared entry
  another write moved (spec.ts `Patch.send`). A reducer that flags and then writes sends with `w.send(port, st)`.
- A node's reaction to its own write goes in the reducer that writes; `world.change` is for other nodes' writes.
- The runtime's jest compiles this package's files under `strict: false` — `v.ok === false`, never `!v.ok`.
- Parallel Bash calls share ONE working directory — absolute paths in every call of a batch; and `echo =====` is an
  error in zsh (`=cmd` expands), so separators are quoted.
