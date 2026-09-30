# P107 — next session

**Written 2026-09-30 (end of s4).** Read the [README](README.md) §2–§7 (**R7 is asked in §7, with R4's caveat**), then
[NSP-011 §6](NSP-011-BATCH-LOGIC-MATH-STRINGS.md) (the numbers, the six rows, the eight decisions, §6.4 what is honestly
open), and whichever task file the board points at.

## Board (from the task files, not from this table's predecessor)

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | ✅ s1 | n/a | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 — s3: `.on(reducers, { derived?, afterInputs? })`; **s4: `outcome: 'deferred'` + `afterInputs.outcomes`, `Patch.send`** | n/a | s1 |
| NSP-002 traces + adapter + runtime target | ✅ s2 — s3 `PlayError`; **s4: a frame's value is the last DEFINED value sent; `revive`; `logs` on the handle; `withViewerNodes`** | n/a | `fe9b13cd1` |
| NSP-003 the runner | ✅ s2 — s3 known rows; **s4: outcomes in the branch shape, richest example, `formatParams`** | n/a | `a1b102eb5` |
| NSP-004 the pilot five | ✅ s3 — still conform after s4's format changes (same mutant counts) | n/a | `ef6f3b6e1` |
| NSP-011 the first batch | ✅ s4 — 13 / 13 conform at 200, every mutant killed; **rows C4 C5 C6(→R7) D6 D7 D8 D9**; AC2 waits for NSP-005; **deep run NOT done** (box loaded, §6.4) | n/a | the s4 commit |
| NSP-020 ports without a viewer | rows only: 5 of 68 dynamic-port nodes have `ports(params)` (And, Or, String Format, String Mapper, Color Blend) | — | — |
| NSP-005 … NSP-010, NSP-012 … NSP-021 | — | — | — |

Built-but-undriven: 0 (nothing is driven in the app until NSP-019).

## Gate readings (2026-09-30, end of s4)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | 10 suites, **249 / 249** (was 180) |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` | exit 0 |
| `npx tsc -p packages/noodl-runtime/tsconfig.json --noEmit` | exit 0 |
| `cd packages/noodl-runtime && npx jest test/node-spec` | 2 suites, **38 passed, 18 skipped** (the deep tests); all 18 specs CONFORM at 200 (seed 20726), known rows: C3 113, C4 26 + 37, C6 4 + 4 |
| deep run (10,000) for the 13 | **NOT RUN** — load average 13–17 all session (a peer's four `iw003-*` worktrees + six MCP electrons). One heavy job on a shared box; run it first thing when quiet: `cd packages/noodl-runtime && NSP_DEEP=10000 NSP_ONLY="Boolean,Number,String,Color,Boolean To String,Color Blend,Inverter,net.noodl.Log,Number Remapper,Or,String Mapper,Substring,Value Changed" NSP_REPLAY_DIR=<scratch>/replays npx jest test/node-spec/conformance.test.ts -t deep` (~40 s per node alone; ~9 min) |
| `npx lerna run test --stream --concurrency 1 --scope @nodegx/node-spec` | see the commit message for the reading taken at close |
| `cd packages/noodl-runtime && npx jest` (the whole runtime) | see the commit message — run at close if the box allowed; otherwise NOT RUN and says so |
| `npm --prefix packages/noodl-editor run test:main` | **NOT RUN** this session (heavy; the box was a peer's). s3's reading stands: 564 / 565, the one red P18's `exportBadge` |

## What s4 settled

1. **A deferred outcome is a format thing, not a Variables thing.** Every `hasScheduled…` family that reports at frame end
   (and, later, every async node that reports in a later frame) writes `outcome: 'deferred'` and resolves in `afterInputs`.
   Rule 3 holds at run time. Mutants flip the resolutions; the deferring reducer gets no flip.
2. **The wire's value is the last DEFINED value a frame sent** (node.ts :832-835 sends at the write, :820-822 never sends
   undefined). The interpreter observes after every step. `Patch.send` names the flag calls only where they are conditional.
   A spec whose outputs are never undefined mid-frame is untouched by this — the pilot five's traces did not move.
3. **Unobservable state is still not carried** — three survivors were stores of values the state already held (Variables),
   three were effect-only fields (Log). The fix is always in the spec, never in the runner's gate.
4. **A `swap-branch` example that sets `undefined` is invisible** (C3) and survives by seed; the runner keeps the richest
   example. A survivor that appears on one seed and not another is this, before it is anything else.
5. **`JSON.stringify` drops an `undefined` param** and the report lied about a divergence's params for an hour.
   `formatParams` now shows it. When a "reproducible" divergence does not reproduce standalone, print the Divergence's own
   `reference`/`actual` first.
6. **Viewer-provided nodes are graded against the viewer's source** through jest's require (`withViewerNodes`); the census's
   `providedBy` column is the list. Three of the batch (Color, Value Changed, Color Blend) were the first.
7. **The parallel tool calls race the working directory on this harness** — the second call's `cd` is lost. Absolute paths
   in every command; six scenario files landed in the package root once before this was re-learned.

## ⚠️ The checkout, as s4 found and left it

- **Root `package.json` is STILL the peer's stray Nightbook (TPL-011) manifest** (mtime 2026-09-28 19:14). `npm run
  <anything>` at the root fails. s4 did not touch it. Four sessions have told Richard.
- Peers' uncommitted work all over `git status` (P78 templates, P108 with four `iw003-*` worktrees live, nodegx-export tests,
  noodl-mcp). None in this phase's paths — every diff under `dev-docs/tasks/phase-107-*`, `packages/nodegx-node-spec`,
  `packages/noodl-runtime/test/node-spec` and `…/test/helpers/node-spec-target.ts` was s4's. Committed through the temp
  index with compare-and-swap.

## Rulings — R1 R2 R3 R5 R6 ruled; **R4 taken as (a) from "continue" (confirm); R7 asked (README §7)**; rows C2–C6, D1–D9 open

Ask R7 in plain words if he has not answered: *"If a wire ever carries a size with a unit into a port, that port turns every
later plain value into a size with that unit, for ever — a Value Changed fires on a repeated 2 because of it. Is that a rule
every target must copy, or a runtime quirk to narrow to the ports that declare units?"* Recommendation (a): narrow it.

And the batch's rows, the two an author meets first: **C5** (*a Variable ignores a first value of 0, and a Set before any
Value stores '0' in a String / the number 0 in a Colour — fix the seed?*) and **D8** (*Color Blend shows `#NaNNaNNaN` for a
non-numeric blend value — the P79 E2 shape again — guard it?*).

## What s5 does

- **First, when the box is quiet:** the deep run for the 13 (table above). Any unknown divergence is a shrunk replay in
  `NSP_REPLAY_DIR` → a scenario + a row. Record the numbers in NSP-011 §6.1 (a "deep" column, like NSP-004's).
- **Then one of the two lanes the README's order names** — both answer "does it make targets swappable?":
  - **NSP-006 the stranger's target** (recommended first: its AC3 says every ambiguity becomes a spec fix BEFORE more
    batches, and 18 specs is already more than the brief was written for — hand it the pilot five only, as written). Build
    the worktree with `scripts/devtools/make-worktree.sh` into `../OpenNoodl-worktrees/`, remove `packages/noodl-runtime`,
    `packages/nodegx-export`, `packages/noodl-viewer-react` and this phase's README from it, hash the spec + scenario files
    before and after, launch a non-isolated agent pinned to that path. Ask which files it opened.
  - **NSP-005 the export adapter** (the spike first, §3.1; String Format and Condition compile away, so it runs a component).
- **If any row is ruled "runtime bug"**: each fix ships ALONE as a behaviour-change commit; its scenario's `row` mark and its
  `KNOWN_ROWS` entry go in the same commit (the "still fires" test goes red otherwise — on purpose). For C5 the spec's
  `variableState` seed changes with the runtime (the spec models the runtime); for C4 the spec's abstain stays and the
  runtime moves to it; for R7 (a) the two C6 rows close and nothing in the spec changes.
- **If R4 was not (a)**: stop after the deep run and the rulings; NSP-009 (the ratchet) is the right closing task either way.
- **NSP-012 (arrays, objects, stores, events)** depends on NSP-008 (the graph); do not start it before NSP-008.

**Human decisions outstanding:** R7; R4's confirmation; rows C2, C3, C4, C5, C6, D1–D9; the stray root `package.json`.

## Before you start

- Shared checkout: pathspec commits or the temp-index CAS, never `git add -A` at the root, never `git stash`, one heavy job
  at a time (the deep run is one; the whole runtime suite is one; `test:main` is one). Check `uptime` first.
- `npm run test:packages` cannot run from the root while the stray `package.json` is there — use
  `npx lerna run test --stream --concurrency 1 --scope @nodegx/node-spec`, and `cd packages/noodl-runtime && npx jest
  test/node-spec` for the runtime side.
- Parallel tool calls race the working directory on this harness: use absolute paths in every command.
- The runtime's jest compiles this package's files under `strict: false` — `v.ok === false`, never `!v.ok`, on a
  discriminated union, and a narrowed PROPERTY does not stay narrowed: copy it to a local (canonical.ts `revive`).
