# P107 — next session

**Written 2026-10-01 (end of s16).** Read the [README](README.md) §2–§7. Then [NSP-015 §6.1b](NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md),
which holds the LOCATION design (what the navigation family calls, and the two trace events), and the LOCATION
paragraph at the top of [world.ts](../../../packages/nodegx-node-spec/src/world.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1 | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s16; **s16: a patch's `open` effect, `WorldView.userActivation()`, `WorldNeed` `location`** | s1 … s16 |
| NSP-002 traces + adapter + runtime target | ✅; **s16: the `open` trace event (schema, validator); the runtime target registers External Link and attributes each `window.open` to the updating node** | s2 … s16 |
| NSP-003 the runner | ✅; **s16: a `location` spec's sequences draw a window or none and an activation or none** | s2 … s16 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3; **3b (s16): a fresh agent took Animate To Value v2 from the spec alone, one change, green** | `fec895706` |
| NSP-007 the world | ✅; **s16: LOCATION (`open` built, `history` named)**; AC1's export half ✗ | s13, s16 |
| NSP-008 the graph | ✅ (s15 boundary + definitions) | s15 |
| NSP-010 a change is a version | rows only; **s16: two holes the stranger measured, in §4** | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform; **s16: C17, C19, C21 fixed (Animate To Value and States are v2)**. Left: AC2, the deep run | s16 |
| **NSP-015 navigation + components** | **🟡 7 of 14**: + External Link (s16). **Left: 7**: Show / Close Popup, Push Component To Stack, Pop Component Stack, Navigate To Path, Navigate, Page Inputs. AC2 | s15, s16 |
| NSP-020 ports without a viewer | rows only | — |
| NSP-009, NSP-014, NSP-016 … NSP-019, NSP-021 | — | — |

**76 of 147 conform on the runtime** (T1 45/46 · T2 10/11 · T3 1/39 · T4 20/27; 0 exempt). Counted s16 from the 56
specs × tiers.json + On App Error + the 19 graph-graded T4 nodes (a python count, not carried forward). **Graph 55 / 55
on the runtime**; known rows now 5 (G1, C11–C14 — C23 is fixed).

## Commits this session (on `cline-dev`)

`7c0a58369` C23 · `6b3361189` C17 · `fec895706` C19 fallback (spec v2, round 3b) · `808714114` C19 timer pass ·
`d7746dc26` C21 (spec v2) · then the LOCATION + External Link commit and this handoff (see `git log`).

## Gate readings (2026-10-01, s16)

| gate | reading |
|---|---|
| `packages/noodl-runtime`: `npx jest` (whole suite), after the four fixes | **181 suites passed (1 skipped), 3145 passed, 68 skipped, exit 0** |
| `packages/noodl-runtime`: `npx jest test/node-spec`, after LOCATION + External Link | **3 suites, 142 passed, 56 skipped, exit 0** |
| `packages/nodegx-node-spec`: `npx jest` | after the four fixes **16 suites, 598 passed, 17 skipped**; after LOCATION + External Link **17 suites, 606 passed, 17 skipped, exit 0** |
| `npx jest tests/stranger.test.ts tests/schema.test.ts tests/world.test.ts` (node-spec), after the format change | **101 passed, 17 skipped, exit 0** (three rounds, new hashes) |
| `packages/noodl-viewer-react`: the 10 suites touching States / Animate To Value / timers | **143 passed, exit 0**; NDA-004/015, ERG-001 corpus (Parent Component Object) **67 passed** |
| `packages/nodegx-export`: `npx jest tests/node-spec-conformance.test.ts tests/node-spec-graph.test.ts` | **12 passed, 2 skipped, exit 0** before and after the format change (as s15) |
| `tsc --noEmit` on runtime, node-spec, viewer | exit 0 · exit 0 · exit 0 |
| `npm --prefix packages/noodl-editor run test:main` | NOT RUN (nothing this phase touches is in it) |

## What s16 settled (and where the handoff was wrong)

1. **All four rulings came back "fix it"** (C23, C19 "both fixes", C17, C21 "Default + warn"). Each fix shipped
   alone with its `row` mark / known row dropped in the same commit; each was checked as a control (red on the old
   code, green on the new). README §7 has the table.
2. **A spec version change reaches a stranger through the version note alone.** Round 3b took 2 min 12 s and one
   method. It also caught MY v2 scenario grading nothing (the node adopts its first number outright, so no curve
   ran) — fixed and checked against the v1 target. NSP-010 §4 now holds two holes it measured: no field for a change
   note, no mutant that encodes the previous version.
3. **The handoff said one LOCATION event "must also carry path, hash and history".** Measured instead: the family
   writes through exactly two browser calls, so there are two events, each recording what was handed (`open`,
   built; `history`, named for Navigate). Path vs hash is only the URL's shape; `pushState` never fires `hashchange`.
4. **The stray root `package.json` is gone** — it matches HEAD again; `npm run` at the root works. The handoff's
   "still Nightbook's" was stale.
5. Harness: in zsh a command list in `$F` is ONE argument (`npx jest $F` ran nothing, silently) — `${=F}`. A
   `pgrep -f "<pattern>"` wait loop matches its own command line and never ends.

## What s17 does

- **Navigate To Path and the `history` half of LOCATION.** Build what NSP-015 §6.1b names: `history.pushState` →
  `{ t: 'history', op: 'push', url }`, the location's path / search / hash resolved by `URL` against the current
  href (a script `location` field for the start), no `popstate` / `hashchange` from the push itself, and the
  node's own `dispatchEvent(new PopStateEvent('popstate'))` as a world event its listeners hear. Guarded files
  again: refresh hashes, re-run the three rounds in the same commit. Navigate To Path's new-tab arm is `open`.
- **Pop Component Stack / Push Component To Stack / Navigate** need the Page Stack or Router, which are visual
  nodes: a stand-in (say so in the scenario) or wait for NSP-016. Popups the same.
- **Cheap, alongside:** the deep run for s11–s16 (`NSP_DEEP=10000`, quiet box, one batch); a round-4 stranger
  brief — States (derived signal, `pulses`), a graph with the boundary, and External Link (the first `location`
  spec: does LOCATION's paragraph suffice?).
- **AC2 (export)** for the boundary and for External Link: route to P18 when its harness emits more than a latch.

**Human decisions outstanding:** next rows to ask, in plain words: C22, D19, C11, C12, C15, C16, C20, C7, D14, D16
(`node scripts/bugs.js --from P107`); R7; R8; R4's confirmation; G1.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add
  <mine>; commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. A file with two fixes' hunks:
  stage a partial copy with `hash-object -w` + `update-index --cacheinfo`, and check the partials re-compose to the
  working tree first. Never `git add -A`, never `git stash`; one heavy job at a time (States alone is ~4 min on the
  runtime). Peers have open edits in `packages/nodegx-export/` (P18) and in other phases' docs.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same command;
  `play(target, type, params, steps, world)` and `loadScenarios(type)` are the two calls a probe needs.
- A spec behaviour change is a version: plain-words note above `version:`, guarded ⇒ hashes + re-hand the round
  (NSP-006 §5.8's recipe; brief [NSP-006-BRIEF-3B.md](NSP-006-BRIEF-3B.md)); audit the stranger's transcript with
  python over the jsonl (tool_use inputs only).
- Graph claims: write them from the sentence, before recording (`NSP_RECORD=1 … -t "<name>"`).
