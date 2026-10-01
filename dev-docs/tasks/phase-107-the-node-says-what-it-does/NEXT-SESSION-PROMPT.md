# P107 — next session

**Written 2026-10-01 (end of s13).** Read the [README](README.md) §2–§7 (**C19 and C17 are the rows to ask first** —
both under "Also for a ruling, the time batch's rows"; R7, R8 asked; R4's caveat stands), then
[NSP-013 §6.1c–f](NSP-013-BATCH-DATES-PARSERS-UTILITIES.md) (s13's five nodes and the VIEWPORT seam) and
[NSP-006 §5.7](NSP-006-A-STRANGERS-TARGET.md) (the third stranger round, and what its green does NOT grade).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1 | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s12; **s13: the VIEWPORT seam in the format (`WorldView.viewport/listen/unlisten`, `WorldHandlers.resize`, `needs: 'viewport'`); the settle-delivery sentence** | s1 … s13 |
| NSP-002 traces + adapter + runtime target | ✅; **s13: graph nodes mount under their SCENARIO ids (`mountGraph`); Animate To Value + Screen Resolution registered (`VIEWER_NODES`); C19's KNOWN_ROWS predicate** | s2 … s13 |
| NSP-003 the runner | ✅; **s13: a node with no input port draws settle OR advance (it could never advance before); every spec with a port draws exactly what it drew** | s2 … s13 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅; s13: the graph harness refuses a node with no reducer spec in words naming the HARNESS | s13 |
| NSP-006 the stranger | ✅ rounds 1, 2, **3 (s13: five world nodes, 5/5, 81/81, first run — thin, §5.7)**; round 4 named | `0dfcc2660` |
| NSP-007 the world | ✅ s8, s11, s12; **s13: VIEWPORT (sixth seam) + "A TARGET'S VIEW" (WorldView ↔ World)**; AC1's export half ✗ | s13 |
| NSP-008 the graph | ✅; s13: +4 On App Error scenarios (t07) | s13 |
| NSP-011 / NSP-012 | as s12 (NSP-012 🟡: AC2 export, deep run) | — |
| NSP-013 the time batch | **🟡 23 of 24** — s13: Parse XML, Parse Feed, Animate To Value, On App Error, Screen Resolution. Left: **States**; AC2; the deep run | `75fd8ef10` `ef619ab4e` `28be70626` `74fdbe936` |
| NSP-020 ports without a viewer | rows only | — |
| NSP-009, NSP-010, NSP-014 … NSP-019, NSP-021 | — | — |

**67 of 147 conform on the runtime** (T1 45/46 · T2 9/11 · T3 1/39 · T4 12/27; 1 exempt), counted from `specs` ×
tiers.json — ⚠️ s12's breakdown did not sum to its own 62 (it was T1 43 · T2 6). Catalog parity 54. Graph 46/46.

## Gate readings (2026-10-01, s13, at `0dfcc2660`)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | **16 suites, 579 passed, 17 skipped** (stranger: 3 rounds, 41 passed) |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` · `… noodl-runtime …` | exit 0 · exit 0 |
| `cd packages/noodl-runtime && npx jest test/node-spec` | **3 suites, 132 passed, 54 skipped, exit 0** (at `74fdbe936`; round 3 touched no runtime file) |
| `NSP_SEED=3,77,20728,20729,99991` × the s13 reducer specs on the runtime | all CONFORM; Animate's divergences all C19 |
| interpreter mutant sweep, 20 seeds × Parse XML / Feed / Animate (throwaway, deleted) | no survivors |
| `cd packages/nodegx-export && npx jest tests/node-spec-conformance.test.ts tests/node-spec-graph.test.ts` | **12 passed, 2 skipped** |
| round 3 at `NSP_DEEP=10000`, in primary | 5/5, 0 divergences |
| `npm --prefix packages/noodl-editor run test:main` | NOT RUN (nothing this phase touches is in it) |

## What s13 settled (and where the handoff was wrong)

1. **The s12 count was wrong** — its tier line did not add up to its total. Count from the registry; never carry forward.
2. **A spec whose grammar is a library's imports the library.** Parse XML's tree is fast-xml-parser 4.5.7's; node-spec
   now depends on it (`^4.5.7`). The lockfile hunk was committed on HEAD's lockfile through a temporary index — the
   working tree's lockfile is a peer's stray install (it drops node-spec entirely).
3. **The census's "pure" was wrong for Parse Feed** — `Date.parse` reads a zoneless date in the process's zone (D16).
4. **C19 is app-wide, measured**: one Animate To Value with an empty/null/unknown Easing Curve throws inside
   `runTimers` every frame and every timer in the app stops (31/31 frames; Repeat 0 ticks vs 9 in the control).
5. **A node whose input is other nodes' behaviour is graded by graph `N` scenarios with real raisers** (On App
   Error) — no world seam. The first record failed only its Node Id claims: the HARNESS named nodes `<type>#<n>`.
6. **A portless node never advanced in generation** — fixed for portless only.
7. **Round 3's first-run green grades less than it sounds** (§5.7): no output passes through `undefined` inside an
   advance, UUID has 2 mutants, Screen Resolution 1.

## Rulings — R1 R2 R3 R5 R6 ruled; R4 taken as (a) (confirm); R7, R8 asked; rows open

In plain words, first: **C19** (*"one Animate To Value with an empty Easing Curve stops every animation and Repeat in
the app"* — one line in the setter + a catch in `runTimers`), **C17** (the JSON stream parser hangs on a stray `}`),
then C11, C12, C15, C16, C20, C7, D14, D16. s13's rows: C18, C19, C20, D16, D17, D18 — each in `dev-docs/bugs/`.

## What s14 does

- **States** (NSP-013's last; 1191 lines, dynamic ports, timed transitions on the scheduler — Animate To Value's spec
  is the model for its timer) — a session; or
- **NSP-015** (14 T4 nodes, the component boundary; Run Tasks closes with it).
- **Cheap, alongside**: the deep run for the s11–s13 specs (`NSP_DEEP=10000 NSP_ONLY=…`, quiet box, one batch);
  thicker mutants for UUID / Screen Resolution (a lazy draw, a missing `listen`); a round-4 brief (§5.7's list,
  plus a node whose output goes `undefined` inside an advance).
- **If C19 is ruled "fix it"**: the setter falls back to Ease Out; the scenario's `row` mark, the KNOWN_ROWS entry
  and the spec's "no curve → no move" line go in the same commit; the ledger file → `fixed`.
- **If C17 is ruled "fix it"**: as the s12 handoff said (`i = end > i ? end : i + 1`; drop the jest.mock seam).

**Human decisions outstanding:** C19 and C17 first; R7; R8; R4's confirmation; rows C2–C20, D1–D18, G1; the stray root
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
