# P107 — next session

**Written 2026-09-30 (end of s3).** Read the [README](README.md) §2–§5 and §7 (**R4 is asked there, with numbers**), then
[NSP-004 §6](NSP-004-THE-PILOT-FIVE.md) (the numbers, the rows, the eight decisions), and whichever task file R4 points at.

## Board (from the task files, not from this table's predecessor)

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | ✅ s1 | n/a | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 — s2 reversed two sentences; s3 changed `.on(reducers, derived)` to `.on(reducers, { derived?, afterInputs? })` and grew `derived` (`discover`, `candidates`) | n/a | s1 |
| NSP-002 traces + adapter + runtime target | ✅ s2 — s3 added `PlayError` (a target's throw carries the trace so far) | n/a | `fe9b13cd1` |
| NSP-003 the runner | ✅ s2 — s3 added known rows (`known`, scenario `row`), derived-port generation, `differenceWithThrow` | n/a | `a1b102eb5` |
| NSP-004 the pilot five | ✅ s3 — Switch, And, Condition, String Format specced from source; all five conform at 200 and at 10,000; 71 mutants killed, 0 unreached; **2 wire divergences (C1 fixed in the spec, C2 a runtime bug) + 1 class (C3, runtime bug) + 3 doc-vs-code (D1–D3)**, none graded by an existing test | n/a | the s3 commit |
| NSP-005 … NSP-021 | — | — | — |

Built-but-undriven: 0 (nothing is driven in the app until NSP-019).

## Gate readings (2026-09-30, end of s3)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | 9 suites, **180/180** (was 143) |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` | exit 0 |
| `npx lerna run test --stream --concurrency 1 --scope @nodegx/node-spec` | exit 0, 180/180 |
| `cd packages/noodl-runtime && npx jest` | **179/179 suites** (1 skipped), 3025 passed, 18 skipped; the one red on the first pass was the pinned `User` message now wearing `runtime threw: ` — re-pinned |
| `cd packages/noodl-runtime && npx jest test/node-spec` | 2 suites, 24 passed (5 deep tests skipped without `NSP_DEEP`): pilot loop 200 + mutants, known rows still firing, NSP-003 planted off-by-one, the runtime-target readings |
| deep run, alone on the box: `NSP_DEEP=10000 NSP_REPLAY_DIR=… npx jest test/node-spec/conformance.test.ts -t deep` | 5/5 CONFORM; 37 s per node, 46 s String Format; 3 min 18 s total; String Format 5,719 / 10,000 attributed to row C3, 0 unknown; replay dir empty (nothing unknown to shrink) |
| `npx tsc -p packages/noodl-runtime/tsconfig.json --noEmit` | exit 0 |
| `npm --prefix packages/noodl-editor run test:main` | **564 / 565 suites, 8791 / 8792 tests** (15:17). The one red is `tests-unit/exp-013/exportBadge.test.tsx` — the same pre-existing P18 red s1 and s2 recorded; nothing in the editor reads this phase |

## What s3 settled

1. **The frame-end reducer `afterInputs`** is how "one test per frame" is written without a frame in the spec (Condition;
   every `hasScheduled…` family next). Outcomes still come from the invoking reducer.
2. **`derived.inputs(params)` is what the editor draws; `derived.discover(port)` is what the target registers on first
   write.** Both halves are needed: And's `input <n>` and String Format's any-name are `discover`; the parity gate now grades
   `inputs({})` against the catalog's `dynamicPorts` block. The generator drives derived ports (+ `candidates`).
3. **The spec models the WIRE where the runtime disagrees with itself** — Condition's getters read the live input, its wire
   carries the tested value (C1 → C2). When a generated divergence appears on a value port, ask first which reader the spec
   modelled.
4. **A known row is counted, never hidden**, and the suite asserts it still fires. Predicates narrow: port + value type +
   difference AFTER the step.
5. **A target that throws is a divergence** at the point of death, shrunk like any other.
6. **Unobservable same-value guards are not carried** into a spec (they only add branches a mutant can hide behind).
7. **A hole in the runner, named:** mutants never mutate an output's `from`; a `from`-heavy node (String Format: 2 mutants)
   is graded by the runtime comparison only. An output-function mutant kind belongs in NSP-009.

## ⚠️ The checkout, as s3 found and left it

- **Root `package.json` is STILL the peer's stray Nightbook (TPL-011) manifest** (mtime 2026-09-28 19:14). `npm run
  <anything>` at the root fails. s3 did not touch it. Richard's call; s1 and s2 both told him.
- Peers' uncommitted work all over `git status` (P78 templates, P108, nodegx-export tests, noodl-mcp). None in this phase's
  paths — every diff under `dev-docs/tasks/phase-107-*`, `packages/nodegx-node-spec`, `packages/noodl-runtime/test/node-spec`
  and `…/test/helpers` was s3's. Committed through the temp index with compare-and-swap anyway.

## Rulings — R1 R2 R3 R5 R6 ruled; **R4 is on the table with its numbers (README §7)**, and the rows C2, C3, D1–D3 with it

Ask R4 in plain words if he has not answered: *"Five nodes specced, all conform, and writing them found five things no test
graded — two runtime bugs and three descriptions that lie. About two minutes per spec now the format can say what these
nodes do. Carry on into the batches (13 logic/math/string nodes next), narrow to the pure nodes only, or stop here?"*
Recommendation (a): carry on, NSP-011 first, NSP-005/006 in parallel lanes.

## What s4 does — depends on R4

- **R4 (a):** NSP-011 (13 nodes: logic, math, strings, variables, converters — most of them the two idioms s3 built) with
  one lane, and NSP-005 (the export adapter: run the emitted code for one node headless; String Format and Condition compile
  away, so it runs a component) or NSP-006 (the stranger's target) in a second lane. Every batch row closes on behaviour AND
  catalog parity AND `ports(params)` (README §4.7).
- **R4 (b):** NSP-011 only, then NSP-009 (the ratchet) and stop.
- **Either way, if C2 / C3 are ruled "runtime bug":** each fix ships ALONE as a behaviour-change commit, with its row closed
  in NSP-004 §6.2 and, for C3, the scenario `row` marks removed and the `KNOWN_ROWS` entry deleted in the same commit (the
  test asserting the row still fires goes red otherwise — that is on purpose). For C2 the spec does not change (it already
  models the wire); the runtime's getters move to it.
- **If D1–D3 are ruled "docs wrong":** the descriptions live in the runtime source (`and.ts:57`, `stringformat.ts:52`) and
  in `node-catalog.json`; the parity gate will hold the spec's copy to them, so change the spec's `description` in the same
  commit (or NSP-018 makes the spec the source and the question disappears).

**Human decisions outstanding:** R4; rows C2, C3, D1, D2, D3; the stray root `package.json`.

## Before you start

- Shared checkout: pathspec commits or the temp-index CAS, never `git add -A` at the root, never `git stash`, one heavy job
  at a time (the deep run is one; `test:main` is one).
- `npm run test:packages` cannot run from the root while the stray `package.json` is there — use
  `npx lerna run test --stream --concurrency 1 --scope @nodegx/node-spec`, and `cd packages/noodl-runtime && npx jest
  test/node-spec` for the runtime side.
- Parallel tool calls race the working directory on this harness: use absolute paths in every command.
- The runtime's jest compiles this package's files under `strict: false` — `v.ok === false`, never `!v.ok`, on a
  discriminated union that crosses the package boundary (NSP-002 §5 trap).
