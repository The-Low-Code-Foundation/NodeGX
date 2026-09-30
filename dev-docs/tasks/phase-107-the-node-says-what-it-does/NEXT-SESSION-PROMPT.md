# P107 — next session

**Written 2026-09-30 (end of s7).** Read the [README](README.md) §2–§7 (**R8 is asked in §7 beside R7; R4's caveat
stands**), then [NSP-008 §6](NSP-008-THE-GRAPH.md) (the graph: who the reference is, the fourteen scenarios, the export's
three shapes, rows G1 / T1 / T2 / E5 / E6, what is not done), and whichever task file the board points at.

## Board (from the task files, not from this table's predecessor)

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | ✅ s1 | n/a | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s6 — untouched in s7 | n/a | s1 … s6 |
| NSP-002 traces + adapter + runtime target | ✅ s2 … s6; **s7: the runtime target is a GRAPH target too (`mountGraph`, `connect`); `settle` is now a frame (`frameStart` / drain / `frameEnd`, twice); a wired pulse's outcome names its input** | n/a | `fe9b13cd1`, s5, s6, s7 |
| NSP-003 the runner | ✅ s2 … s6; **s7: the graph runner `src/runner/graph.ts` (`playGraph`, `runGraphScenarios` with passed · diverged · known · outside · failed · refused)** | n/a | `a1b102eb5`, s5, s6, s7 |
| NSP-004 the pilot five | ✅ s3 — untouched | n/a | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ s6; **s7: `exportGraphTarget` — a graph emitted as one component; `canPlay` = the exporter's refusal; `graphReach` = the lifted outputs** | n/a | s6, s7 |
| NSP-006 the stranger | ✅ s5 round 1, ✅ s6 round 2 — untouched in s7 (no guarded file moved; hashes stand) | n/a | s5, s6 |
| NSP-008 the graph | **✅ s7** — `src/graph.ts` (format, claims, reach), 14 scenarios in `scenarios/graph/`, 3 tests (package 34, runtime 25, export 6); AC1 ✅ AC2 ✅ AC3 ✅ AC4 ✅ as a mechanism | n/a | s7 |
| NSP-011 the first batch | ✅ s4 at 200, ✅ s5 at 10,000; AC2 ⏳ — no batch node has an export reach yet | n/a | `c1998f2fa`, s5 |
| NSP-020 ports without a viewer | rows only: 5 of 68 dynamic-port nodes have `ports(params)` | — | — |
| NSP-007, NSP-009, NSP-010, NSP-012 … NSP-019, NSP-021 | — | — | — |

Built-but-undriven: 0 (nothing is driven in the app until NSP-019).

## Gate readings (2026-09-30, end of s7, before the commit)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | **13 suites, 323 passed, 12 skipped** (both strangers' deep tests) — was 12 / 289 |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` | exit 0 |
| `npx tsc -p packages/nodegx-export/tsconfig.json --noEmit` | exit 0 |
| `cd packages/noodl-runtime && npx jest test/node-spec` | **3 suites, 63 passed, 18 skipped** — 18 / 18 specs still CONFORM at 200 after the frame change; graph 25 / 25 |
| `cd packages/nodegx-export && npx jest tests/node-spec-conformance.test.ts tests/node-spec-graph.test.ts` | **2 suites, 12 passed, 2 skipped**; Counter + Switch CONFORM; graph: 1 passed, 2 diverged as declared, 1 known, 10 outside, 0 failed |
| `node -e "…stranger-suite-hashes.helper…"` | guarded files untouched |
| `npm --prefix packages/noodl-editor run test:main` | **NOT RUN** (s3's 564 / 565 stands; nothing this phase touches is in it) |

## What s7 settled

1. **The runtime is the reference for a graph, and a claim written from the clause is what keeps that honest.** No graph
   interpreter was built; `expect` is recorded (`NSP_RECORD=1`) and every scenario carries `claims` derived from the
   clause's sentence before the recording. 13 of 14 bore the clause out on the first run; the 14th is G1.
2. **G1 → R8:** C6's "never computes from a half-updated upstream" is false of a per-setter node (And) under C7's lockstep;
   true of a frame-end node; and true of the EXPORT, which computes `x && !x` atomically. The sentence describes the export.
3. **Two holes in the runtime target, not the runtime** (T1, T2): a settle that only drained never emitted `frameStart`, so
   a breaker-tripped node never re-armed (C9 froze at 503); a pulse arriving over a wire reached `beginOutcome` with no
   input name (`port: '?'`). Both fixed; the 18 single-node specs did not move. Memory: *a settle that only drains is not a
   frame*.
4. **The exporter emits 3 of 14 graphs whole**, and on them does what the runtime does (C2) or differs exactly where
   Part 2 says (C7, C8 — asserted as DIFFERENCES; equality would fail). A refusal of the probe's own lift is the reach's edge;
   a refusal of a scenario node or wire is `outside`. E5 / E6 routed to phase 18 in the FROM-P107 file.
5. **C10 is R7.** CONTRACT.md already wrote the unit merge down as a clause; R7 (a) would change its second sentence.
6. AC4 is met as a mechanism (a T4 node's behaviour is a graph scenario on the runtime through `mountGraph`); no T4 node was
   specced; a COMPONENT BOUNDARY (Component Inputs / Outputs) is not yet a shape the format has — NSP-015 needs it first.
7. The seam is small on purpose: a target implements `mountGraph` (+ `connect` for a late wire) and keeps its per-node
   traces; the runner assembles the graph trace. No guarded file moved, so no stranger re-grade was owed.

## ⚠️ The checkout, as s7 found and left it

- **Root `package.json` is STILL the peer's stray Nightbook (TPL-011) manifest** (mtime 2026-09-28 19:14). `npm run
  <anything>` at the root fails. Seven sessions have told Richard.
- Peers' uncommitted work all over `git status` (P78, P102, P104, P18's export `src/`, noodl-mcp tests, worktrees); a peer's
  `drive-ig005-robots.js` was running from a P108 worktree all session (load 2.3–2.7). Nothing in this phase's paths was
  anyone else's (checked per path before the commit). `packages/nodegx-export/src/analyze/plan.ts` and `emit/*.ts` still
  carry a PEER's open edits — the export graph target was graded against the working tree, i.e. their exporter.

## Rulings — R1 R2 R3 R5 R6 ruled; **R4 taken as (a) (confirm); R7 and R8 asked (README §7)**; rows C2–C6, D1–D9, G1 open; E1–E6 are phase 18's

R8 in plain words: *"When two inputs of a node change in the same frame, may the node briefly publish a result computed
from one new input and one old one? The runtime does, for nodes that compute on every write; the export never does."*
Recommendation (a): rewrite the sentence; nothing ships.

R7 in plain words (unchanged): *"If a wire ever carries a size with a unit into a port, that port turns every later plain
value into a size with that unit, for ever. A rule every target must copy, or a runtime quirk to narrow?"* Recommendation
(a). New this session: CONTRACT.md C10 IS that behaviour written as a clause — (a) changes C10's second sentence.

And the rows an author meets first: **C5** (a Variable ignores a first value of 0), **D8** (`#NaNNaNNaN`), **C4** (four
`.toString()` setters throw on null).

## What s8 does

- **NSP-007 the world** (fake clock, seeded random, scripted network, scripted backend) — the gate for T2/T3 and for
  NSP-013 / NSP-014; the runner still refuses a spec with `needs`. Design note from s7: the runtime target's `settle` is
  now a real frame, which is where a fake clock's `advance(ms)` hangs (`context.currentFrameTime`, the timer scheduler in
  `_doUpdate`). Or **NSP-012 the second batch** (arrays, objects, variables, stores, events — 26; the 13 T4 ones are graph
  scenarios now). **Build one; a defect is first only if it blocks an AC.**
- **Cheap, alongside**: the three C9/C8/C11 scenarios §6.8 names (each one file); an export reach for the four Variables
  (`value()`); F1 (NSP-006 §5.6) still open.
- **A third stranger round is due** (README §5's rule — the format grew: graphs). The candidate: a spec-level GRAPH engine
  built from CONTRACT.md + the fourteen recordings alone, graded by `runGraphScenarios`. Its brief needs one new sentence per
  clause the recordings settled (G1's, the frame's).
- **If any row is ruled "runtime bug"**: each fix ships ALONE as a behaviour-change commit; its scenario's `row` mark and
  its `KNOWN_ROWS` entry go in the same commit. Any edit to the 20 guarded files ⇒ refresh
  `tests/stranger-suite-hashes.json` + re-grade BOTH strangers, same commit.

**Human decisions outstanding:** R7; R8; R4's confirmation; rows C2, C3, C4, C5, C6, D1–D9, G1; the stray root `package.json`.

## Before you start

- Shared checkout: pathspec commits or the temp-index CAS, never `git add -A` at the root, never `git stash`, one heavy job
  at a time (the runtime deep run is one, ~8 min; the export deep run is 40 s; the graph suites are 2 s each). `uptime`
  first; `ps` before believing it.
- `npm run test:packages` cannot run from the root while the stray `package.json` is there — use each package's own
  `npx jest`; `cd packages/noodl-runtime && npx jest test/node-spec` for the runtime side.
- Graph record mode: `cd packages/noodl-runtime && NSP_RECORD=1 npx jest test/node-spec/graph.test.ts` rewrites every
  scenario's `expect` — read the diff; a claim that fails after recording is a finding, never a claim to edit.
- The runtime's jest compiles this package's files under `strict: false` — `v.ok === false`, never `!v.ok`.
- Parallel Bash calls share ONE working directory — use absolute paths in every call of a batch (s7 lost one edit to it).
