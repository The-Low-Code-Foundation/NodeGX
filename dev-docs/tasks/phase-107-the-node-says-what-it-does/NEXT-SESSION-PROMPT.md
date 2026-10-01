# P107 — next session

**Written 2026-10-01 (end of s14).** Read the [README](README.md) §2–§7 (**C19, C17, then C21 are the rows to ask
first** — under "Also for a ruling, the time batch's rows"; R7, R8 asked; R4's caveat stands), then
[NSP-013 §6.1g](NSP-013-BATCH-DATES-PARSERS-UTILITIES.md) (States, the two format additions, the harness's styles)
and NSP-001's s14 paragraph (the format sentence a stranger would read).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1 | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s13; **s14: a derived SIGNAL input (`{ type: 'signal', outcome? }` → `derived.signal`), and `pulses` (declared + derived pulses in one order)** | s1 … s14 |
| NSP-002 traces + adapter + runtime target | ✅; **s14: the runtime target asks the spec whether an unlisted port is a signal; the context has the styles of a project with no colour styles (identity `resolveColor`); States registered (`VIEWER_NODES`)** | s2 … s14 |
| NSP-003 the runner | ✅; **s14: derived signals pulsed (only for a spec that has one — pinned digest unchanged); mutants wrap `derived.signal`, read `pulses`** | s2 … s14 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13) | s13 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3 (re-graded green under s14's hashes); round 4 named | `0dfcc2660` |
| NSP-007 the world | ✅; AC1's export half ✗ | s13 |
| NSP-008 the graph | ✅ (46/46) | s13 |
| NSP-011 / NSP-012 | as s12 (NSP-012 🟡: AC2 export, deep run) | — |
| NSP-013 the time batch | **🟡 24 of 24 conform** — s14: **States**. Left: AC2 (no export reach), the deep run | s14 |
| NSP-020 ports without a viewer | rows only | — |
| NSP-009, NSP-010, NSP-014 … NSP-019, NSP-021 | — | — |

**68 of 147 conform on the runtime** (T1 45/46 · T2 10/11 · T3 1/39 · T4 12/27; 1 exempt) — counted from `specs`
(55) × tiers.json + On App Error and the twelve T4 nodes graph-graded. Catalog parity 55. Graph 46/46.

## Gate readings (2026-10-01, s14, working tree on `72f81ff53` before the s14 commit)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | **16 suites, 583 passed, 17 skipped** (stranger rounds green under the refreshed hashes; States in the batch at seed 13: 20/20, 200/200, 3613 mutants, 0 survivors + the declared frame-end drop-set) |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` · `… noodl-runtime …` | exit 0 · exit 0 |
| `cd packages/noodl-runtime && npx jest test/node-spec` | **exit 0 — 134 passed, 55 skipped**; every spec CONFORMS at 20727 (Color, Color Blend unchanged under the identity styles); States 19/20 + 1 known (C21), 200/200, 5 under C21 |
| `NSP_SEED=3,77,20728,20729,99991` × States on the runtime | all CONFORM, 19/20 + 1 known each; C21 counted 6 / 8 / 11 / 8 / 7, C6 (any port) 2 / 1 / 0 / 0 / 1; every mutant killed or under the declared frame-end drop-set |
| `cd packages/nodegx-export && npx jest tests/node-spec-conformance.test.ts tests/node-spec-graph.test.ts` | **12 passed, 2 skipped** (unchanged; States has no export reach) |
| `npm --prefix packages/noodl-editor run test:main` | NOT RUN (nothing this phase touches is in it) |

## What s14 settled (and where the handoff was wrong)

1. **"States — a session" was right, but not for the reason given.** The 1191 lines were not the work; the format
   could not say the node: a dynamic port that is a SIGNAL with an outcome (`To <state>`), and pulses that interleave
   a declared and a derived output (`State Changed`, `Has Reached B`, `State Changed`, …). Both added (spec.ts guarded,
   hashes refreshed, three rounds green).
2. **The runtime target lacked something the viewer always has** — `context.styles`. A colour transition calls
   `resolveColor` in the timer pass; without styles it would have thrown there (C19's whole-app stop). The target now
   has a project with no colour styles (identity). Palette colours are NOT graded.
3. **A frame end that flags one output several times** (0, false, `undefined`) leaves the wire on the last DEFINED
   value — the first runtime run diverged twice on it. The spec `world.send`s at every `flagOutputDirty` site.
4. **A derived-port spec's mutant branches are combinations of port names**, so a frame-end `drop-set` hit only at a
   sequence's last settle survives on one seed and not another (13: 1, 20727: 9). Declared reducer-wide, as Model2's.
5. **The catalog-parity test probed one seed parameter at a time** — wrong for a node seeded by two (`states`, `values`);
   it now gives every seed at once and replaces every placeholder (one-seed nodes unchanged).
6. **Three rows, measured from the runtime's own traces:** C21 (a non-curve transition loses every move into that state,
   no outcome — the only one the spec cannot write), C22 (a move that animates nothing is overwritten by the run still
   going), D19 (a text the starting state leaves empty reads 0, then keeps the previous state's text).

## Rulings — R1 R2 R3 R5 R6 ruled; R4 taken as (a) (confirm); R7, R8 asked; rows open

In plain words, first: **C19** (one bad Easing Curve stops every timer in the app), **C17** (the JSON stream parser hangs
on a stray `}`), **C21** (a non-curve transition silently loses every move into that state), then C22, D19, C11, C12, C15,
C16, C20, C7, D14, D16. Each in `dev-docs/bugs/` (`node scripts/bugs.js --from P107`: 41 needs-ruling).

## What s15 does

- **NSP-015** (14 T4 nodes, the component boundary; Run Tasks closes with it) — the next batch; or **NSP-014** (data and
  cloud, needs the backend seam).
- **Cheap, alongside:** a graph scenario with a wire into States' `To <state>` (the derived-signal path over a wire is
  allowed by the format and graded by nothing); the deep run for s11–s14 (`NSP_DEEP=10000 NSP_ONLY=…`, quiet box, one
  batch); a round-4 stranger brief that includes States (it would test the derived-signal and `pulses` sentences).
- **If C19 is ruled "fix it"**: setter falls back to Ease Out; scenario `row` mark, KNOWN_ROWS entry and the spec's "no curve
  → no move" go in the same commit; ledger → `fixed`. **C17**: `i = end > i ? end : i + 1`; drop the jest.mock seam.
  **C21**: check the curve before `BezierEasing` (the spec already writes a refused curve as a jump); drop the `row` mark and
  the KNOWN_ROWS entry with it.

**Human decisions outstanding:** C19, C17, C21 first; R7; R8; R4's confirmation; rows C2–C22, D1–D19, G1; the stray root
`package.json` (still Nightbook's — `npm run` at the root fails).

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`; never `git add -A`, never `git stash`; one
  heavy job at a time. Peers have open edits in `packages/nodegx-export/tests/` (P18) and `dev-docs/bugs/p108-*`.
- Throwaway probes: `packages/noodl-runtime/test/node-spec/zz-*.test.ts` or `packages/nodegx-node-spec/tests/zz-*.test.ts`,
  deleted in the same command.
- Any edit to a guarded file (`src/spec.ts`, `coerce.ts`, `canonical.ts`, `trace.ts`, `adapter.ts`, the schema,
  `src/world.ts`, the round specs/scenarios) ⇒ `node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`
  and all three rounds re-graded, same commit.
- Graph claims: from the sentence, before recording (`NSP_RECORD=1 … -t "<name>"`); a failed claim is read against
  the frame before it is called a finding — s13's were the harness.
- zsh: `echo =====` errors; a `grep` pattern with `[^"\\ ]` breaks — use python for transcript audits.
