# P107 — next session

**Written 2026-09-30 (end of s2).** Read the [README](README.md) §2–§5, then [NSP-004](NSP-004-THE-PILOT-FIVE.md),
[NSP-002 §5](NSP-002-TRACES-AND-THE-RUNTIME-ADAPTER.md) (ten decisions the adapters live by) and
[NSP-003 §5](NSP-003-THE-RUNNER.md) (eight decisions the runner lives by).

## Board (from the task files, not from this table's predecessor)

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | ✅ s1 | n/a | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 — two sentences reversed by s2 (NSP-001 §5 shows the strike-throughs) | n/a | s1 |
| NSP-002 traces + adapter + runtime target | ✅ s2 — schema v1, canonicaliser, `TargetAdapter`, `play()`, interpreter adapter; runtime adapter in `noodl-runtime/test/helpers/node-spec-target.ts`; 78/79 runtime-provided picker nodes mount headlessly (User pinned) | n/a | `fe9b13cd1` |
| NSP-003 the runner | ✅ s2 — `runConformance → Report`, seeded generator, shrinker, mutants by discovered branch, `scenarios/Counter.json`; a planted off-by-one in an in-memory copy of counter.ts caught at sequence 43 and shrunk to 2 steps | n/a | the s2 commit after `fe9b13cd1` |
| NSP-004 the pilot five | — | — | — |
| NSP-005 … NSP-021 | — | — | — |

Built-but-undriven: 0 (nothing is driven in the app until NSP-019).

## Gate readings (2026-09-30, end of s2, working tree at the NSP-003 commit)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | 8 suites, **143/143** |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` | exit 0 |
| `npx lerna run test --stream --concurrency 1 --scope @nodegx/node-spec` | exit 0 |
| `cd packages/noodl-runtime && npx jest` | **179/179 suites, 3020 passed, 13 skipped (pre-existing)**, 10.5 s |
| `npx tsc -p packages/noodl-runtime/tsconfig.json --noEmit` | exit 0 |
| `npm --prefix packages/noodl-editor run test:main` | **564 / 565 suites, 8791 / 8792 tests, 53 s.** The one red is `tests-unit/exp-013/exportBadge.test.tsx` — the same pre-existing P18 red s1 recorded (ledger has Parse Feed / Parse XML `translated` since `fcf68a1c7`); nothing in the editor reads this phase yet |

## What s2 settled (including where s1's files were wrong)

1. **Value events sort by port NAME between settles**, not by the spec's declaration order (NSP-001 §5 said declaration
   order). A stranger's target must be able to produce a comparable trace without reading the spec. `trace.ts`,
   `adapter.ts`, NSP-002 §5 decision 4.
2. **Params apply in the caller's key order on every target**, the runtime's own order (`Object.keys(parameters)`).
   NSP-001's interpreter normalised to declaration order; reversed. The NSP-001 AC3 sub-assertion is rewritten
   (the `set` order follows the literal; the observations are unchanged).
3. **`completed` is never an event; an outcome's `port` is the invoking INPUT; a `failure` carries the error CODE.**
   Written into the schema and the runtime adapter (it stamps the input on the token in `beginOutcome`).
4. **Values come from `sendValue`, not getters** — except the first settle's connection-time read of outputs nothing
   sent (`connectInput` delivers a getter's value to a wire made before the first frame). That is how Counter with no
   Start Value publishes 0 and Condition with no params publishes `result: null`.
5. **The runtime adapter drives `setInputValue`, not the queue**, so C8 consolidation and `inputPriority` ordering are
   NOT reproduced — graph clauses, NSP-008's. A lone node gets a minimal scope (`modelScope: undefined` → the global
   `Model`); five picker nodes read it at mount.
6. **A mutant's branch is a patch SHAPE discovered by running the suite**; an unreached branch is named before any
   mutant runs. Four mutation kinds. The mutant suite is the suite that graded the target.
7. **`needs?: WorldNeed[]`** is on the spec format; the runner refuses a spec that declares any until NSP-007.
8. **The one T3 exception measured:** `net.noodl.user.User` cannot mount headlessly (reads
   `NoodlRuntime.Services.UserService` at mount, user.ts:114). Pinned by name in `runtime-target.test.ts`.
9. **Trap found and written into the code:** a `.ts` file this package exports is compiled under the IMPORTER's
   tsconfig when the runtime's tests import it — `strict: false` there, so `if (!v.ok)` on a discriminated union
   did not narrow and `tsc` was green in the package while the runtime's jest went red. `schema.ts` uses
   `v.ok === false` and says why. Memory: *a shared TS file is compiled under the importer's tsconfig*.
10. **Found, not fixed (R3 (a)):** nothing diverged on Counter — 200 sequences on two seeds, seven hand scenarios.

## ⚠️ The checkout, as s2 found and left it

- **Root `package.json` in the working tree is STILL the peer's stray Nightbook (TPL-011) manifest** (mtime
  2026-09-28 19:14). `npm run <anything>` at the root fails. s2 did not revert it (a peer's uncommitted edit) and
  committed through a temporary index with compare-and-swap (memory: *commit your delta through a temporary index*;
  HEAD had moved to a P108 commit `53c4d8d19` between s1 and s2, and the CAS landed on it). If it is still there:
  ask Richard, or if he has ruled, `cp` backups then `git checkout -- package.json package-lock.json`.
- **672 status lines of peers' work** (P78 templates, P108 planner/todo, nodegx-export tests, noodl-mcp tests). None
  in this phase's files. `git status` is not authorship; mtime is.
- `node_modules/@nodegx/node-spec` is the symlink s1 made by hand. `ajv` (already a root devDependency) is now also
  declared by the package for its schema test; the lockfile row was edited through the index, no install was run.

## Rulings — R1 R2 R3 R5 ruled (a); R6 ruled (the editor is a target); **R4 is next** and is asked BY NSP-004

R4 (go / no-go after the pilot): NSP-004 asks it *with its numbers* — how many divergences did five specs find that
the existing tests did not. Do not ask it before the numbers exist.

## What s3 does — NSP-004, the pilot five

1. **Write the four remaining specs from the runtime source**, citing lines, in `src/nodes/`: Switch (`switch.ts`,
   a latch), And (`and.ts`, numbered inputs `input 0`… — the first `derived` ports? No: numbered inputs are a
   runtime mechanism; decide whether the spec declares `input 0 … input N` via `derived.inputs(params)` — the
   generator does not drive derived ports, so And needs hand scenarios), Condition (`condition.ts`: `result` is
   `null` until the first test — the wire delivers it; `Evaluate` is additive to the value setter; `runOnChange-`
   checkboxes are a `shouldRunOnValueChanged` rule — read `run-on-value-change.ts` first), String Format
   (`stringformat.ts`, the first real `derived` ports). Register each in `src/nodes/index.ts`; the catalog-parity
   gate then grades each (`tests/catalog-parity.test.ts`) — a spec's row closes on behaviour AND parity (README §4.7).
2. **Hand scenarios** in `scenarios/<type>.json` for every edge in each file's docblocks and existing tests
   (`packages/noodl-runtime/test/corpus/*` names Counter, Condition, Switch rows), each with a `because`.
3. **Run the conformance test on the runtime** at 200 (`packages/noodl-runtime/test/node-spec/conformance.test.ts` —
   extend it to loop over `specs`), then ONE deep run locally, alone on the box (`sequences: 10_000`, `shrink: true`,
   `replayDir` in scratch): every divergence becomes a §6 row in NSP-004 with the shrunk sequence, both traces, and a
   proposed answer (*spec wrong* / *runtime bug* / *intended*). **No runtime change** (R3 (a)).
4. **Mutants** on every pilot spec (`mutants: true`) — a survivor or an unreached branch means the node is not
   specced; add a hand scenario for the branch rather than lowering the bar.
5. Close NSP-004 §4 with the numbers, then ask **R4** in plain words with those numbers.
6. **Do not touch `noodl-runtime/src/nodes/`**; the runtime adapter and runner are done — extend them only if a pilot
   node needs something they cannot express (numbered inputs on the runtime side: `set(h, 'input 0', v)` already
   works — `registerInputIfNeeded` is called before `hasInput`).

**Human decisions outstanding:** R4 (after NSP-004's numbers). The stray root `package.json` (Richard's call).

## Before you start

- Shared checkout: pathspec commits or the temp-index CAS, never `git add -A` at the root, never `git stash`, one
  heavy job at a time (a deep 10,000-sequence run is one).
- `npm run test:packages` cannot run from the root while the stray `package.json` is there — use
  `npx lerna run test --stream --concurrency 1 --scope @nodegx/node-spec` directly, and `cd packages/noodl-runtime &&
  npx jest test/node-spec` for the runtime side.
- Parallel tool calls race the working directory on this harness: use absolute paths in every command.
