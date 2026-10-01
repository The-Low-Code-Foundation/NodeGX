# P107 — next session

**Written 2026-10-01 (end of s10).** Read the [README](README.md) §2–§7 (**R7, R8 asked; the T4 half's rows C12–C15
are under "Also for a ruling, the T4 half's rows"; C9–C11, D13 under the second batch's; C7, C8, D10–D12 under the
world's; R4's caveat stands**), then [NSP-012 §6.4](NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md) (the component tree, the
twelve T4 nodes, what the sentences held, what is not done), and whichever task file the board points at.

## Board (from the task files, not from this table's predecessor)

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | ✅ s1 | n/a | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s9 — untouched in s10 | n/a | s1 … s9 |
| NSP-002 traces + adapter + runtime target | ✅ s2 … s9; **s10: the runtime target holds a COMPONENT TREE (one real `NodeScope` per declared instance, placed as a loaded app places it), runs `nodeScopeDidInitialize` after wiring, registers a wire's source output, resets the three process-wide managers per play and hands the history manager the world's clock; Event Sender / Receiver / For Each Actions join `VIEWER_NODES`** | n/a | s2 … s10 |
| NSP-003 the runner | ✅ s2 … s9; **s10: a graph step `{ node, advance }`; `components` handed to `mountGraph`; a world whenever a component carries an item** | n/a | s2 … s10 |
| NSP-004 the pilot five | ✅ s3 — untouched | n/a | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ s6, s7; **s10: `canPlay` refuses a world, a component tree and an `advance` in its own words — 39 outside of 43, nothing failed** | n/a | s6, s7, s10 |
| NSP-006 the stranger | ✅ s5 round 1, ✅ s6 round 2; s10 touched NO guarded file (graph.ts and the runner are not in `FORMAT_FILES`). **Round 3 is due FOUR times over (graphs s7, the world s8, the registry s9, the component tree s10)** | n/a | s5, s6, s9 |
| NSP-007 the world | ✅ s8 — AC1's export half ✗ | n/a | s8 |
| NSP-008 the graph | ✅ s7, s9; **s10: the format grew `components` (a tree of instances: `parent`, `item`) and `in` on a node; tag `N` (a node's own sentence graded in a graph); `tests/graph.test.ts` gates every T4 node of NSP-012 named-or-exempt** | n/a | s7, s9, s10 |
| NSP-011 the first batch | ✅ s4 at 200, ✅ s5 at 10,000; AC2 ⏳ | n/a | `c1998f2fa`, s5 |
| NSP-012 the second batch | **🟡 s9: 13 T1 conform at 200 (rows C9–C11, D13). s10: the T4 half — 22 `N` scenarios, 12 of 13 T4 nodes recorded on the runtime, 22 / 22 (rows C12–C15; C12, C13, C14 known on scenarios, C15 in the recorded outcomes); Run Tasks exempt (NSP-015's component boundary); Repeater Item's handshake half out of reach (NSP-016's Repeater). AC2 not run; the deep run not run** | n/a | s9, s10 |
| NSP-020 ports without a viewer | rows only: 10 of 68 dynamic-port nodes have `ports(params)` | — | — |
| NSP-009, NSP-010, NSP-013 … NSP-019, NSP-021 | — | — | — |

Built-but-undriven: 0 (nothing is driven in the app until NSP-019). **46 of 147 conform on the runtime** (T1 31, T2 2,
T3 1, T4 12; 1 exempt).

## Gate readings (2026-10-01, end of s10, before the commit)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | **15 suites, 466 passed, 12 skipped** (both strangers' deep tests) — was 429 |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` · `… nodegx-export …` | exit 0 · exit 0; the runtime's `tsc` names no node-spec file |
| `cd packages/noodl-runtime && npx jest test/node-spec` | graph **54 passed** (42 scenarios + 11 clause gates + 1; known rows G1, C11, C12, C13, C14); conformance + target **54 passed, 34 skipped** — 34 / 34 specs CONFORM at 200, unmoved by the mount refactor |
| `cd packages/nodegx-export && npx jest tests/node-spec-conformance.test.ts tests/node-spec-graph.test.ts` | **CONFORM — 1 passed, 2 diverged as declared, 1 known, 39 outside, 0 failed of 43**; conformance 12 passed, 2 skipped (unchanged) |
| `tests/stranger-suite-hashes.json` | untouched — no guarded file moved in s10 |
| `npm --prefix packages/noodl-editor run test:main` | **NOT RUN** (s3's 564 / 565 stands; nothing this phase touches is in it) |

## What s10 settled

1. **A T4 node is specced by graph scenarios tagged `N`** that name its type, recorded on the runtime, every claim
   written from the node's own sentences first. The five claims that failed on recording were read one by one:
   three were the trace rule misread (an unchanged value is not re-sent), two were the runtime contradicting the
   sentence (C12, C13) — and a sixth (C14) and seventh (C15, seen in the recorded outcomes) followed.
2. **The graph format holds a tree of component INSTANCES, not component definitions.** `components: { id: { parent?,
   item? } }` + `in` on a node is enough for Send Event's three scopes and Repeater Item's item. What a component IS
   (ports, Component Inputs / Outputs) is NSP-015's boundary — Run Tasks waits for it.
3. **The runtime target builds real `NodeScope`s** and places an instance as the app does (an entry of `nodes` /
   `componentInstanceChildren`, a child of a visual node of the parent scope, a known component-model name), so the
   runtime's own walks run over it. The 20 earlier graphs and the 34 specs did not move.
4. **Four findings nobody had graded**: Consume never applied to a Global event (C12); a consumed Children / Siblings
   event stops only inside the component that consumed it — a `return` in a `forEach` (C13); Waiting For keeps the
   refused type after the wait expires (C14); Dispatch says Done when its only action was refused on the spot (C15).

## ⚠️ The checkout, as s10 found and left it

- **Root `package.json` is STILL the peer's stray Nightbook (TPL-011) manifest.** `npm run <anything>` at the root
  fails. Ten sessions have told Richard. Use each package's own `npx jest`.
- `packages/nodegx-export/tests/*.test.ts` and `src/` carry a peer's (P18) open edits; s10's one file there
  (`tests/helpers/node-spec-target.ts`) was committed by pathspec. Nothing in this phase's paths was anyone else's.

## Rulings — R1 R2 R3 R5 R6 ruled; **R4 taken as (a) (confirm); R7 and R8 asked**; rows C2–C15, D1–D13, G1 open; E1–E6 are phase 18's

The rows an author meets first, in plain words: **C11** (Object's `<name> Changed` never fired), **C12** (*"Consume
on a Global event never stopped anything"*), **C15** (*"Dispatch says Done when its one action was refused"*), then
**C7** (HTTP auth never sent a credential) and **C9**.

## What s11 does

- **NSP-013** (24 T1/T2: dates, time, randomness, parsers, animation — on the world as built; `Animate To Value` /
  `States` need the frame tick, which `settle` already is). **Build it; a defect is first only if it blocks an AC.**
  Or **NSP-015** (14 T4: navigation, popups, component utilities) — it needs the component BOUNDARY in the format
  (a component with ports, Component Inputs / Outputs as a graph inside a node); Run Tasks closes with it.
- **Cheap, alongside**: the deep run for the 13 data nodes and the three world nodes (`NSP_DEEP=10000 NSP_ONLY=…`, a
  quiet box, ~15 min); an export reach for the four Variables; a `drop-after` mutant.
- **The third stranger round is due four times over** (README §5's rule). Candidate: a target for the five array
  nodes from `registry.ts`'s header + `world.ts`'s header + the scenarios alone (AC6's second half); or a GRAPH
  interpreter for the `N` scenarios of the store trio from `graph.ts`'s header. `src/registry.ts`, `src/world.ts`
  and `src/graph.ts` join `FORMAT_FILES` then.
- **If any row is ruled "runtime bug"**: each fix ships ALONE with the scenario's `row` mark dropped in the same
  commit (C13: two `for…of` loops in nodescope.ts; C14: one `notifyQueue()` in `unpark`; C12: the global path honours
  the first `true`; C11: one line in modelnode2.ts). Any edit to the 20 guarded files ⇒ refresh
  `tests/stranger-suite-hashes.json` + re-grade BOTH strangers, same commit.

**Human decisions outstanding:** R7; R8; R4's confirmation; rows C2–C15, D1–D13, G1; the stray root `package.json`.

## Before you start

- Shared checkout: pathspec commits or the temp-index CAS, never `git add -A` at the root, never `git stash`, one heavy
  job at a time (the runtime node-spec suite is ~50 s at 200 for 34 specs; the graph test ~15 s; the deep run is one
  job). `uptime` first; `ps` before believing it.
- `npm run test:packages` cannot run from the root while the stray `package.json` is there — use each package's own
  `npx jest`; `cd packages/noodl-runtime && npx jest test/node-spec` for the runtime side.
- **Record mode writes `expect` BEFORE checking claims** (`NSP_RECORD=1 npx jest test/node-spec/graph.test.ts`): a
  failing claim is a finding or a misread — read the recorded frame before deciding; an unchanged value is not
  re-sent, so a claim on a value already on the wire is `absent`, not a repeat.
- A graph claim can name a value, an absence or a signal count — never an outcome; an outcome finding (C15) lives in
  the recorded trace and the task file, and the ratchet goes red the day it changes.
- A dispatched action needs an explicit `id` in a scenario — `action_<n>` draws from a process-wide counter.
- A registry spec names `send` in EVERY patch; a node's reaction to its own write goes in the reducer that writes.
- The runtime's jest compiles this package's files under `strict: false` — `v.ok === false`, never `!v.ok`.
- Parallel Bash calls share ONE working directory — absolute paths in every call of a batch; `echo =====` is an error
  in zsh, so separators are quoted.
