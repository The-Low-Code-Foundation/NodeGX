# P107 — next session

**Written 2026-10-01 (end of s17).** Read the [README](README.md) §2–§7. Then [NSP-015 §6.1c](NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md),
which holds the whole LOCATION seam (three calls, three events, one group) and the PROJECT seam, and the LOCATION /
PROJECT paragraphs at the top of [world.ts](../../../packages/nodegx-node-spec/src/world.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1 | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s17; **s17: a patch's `push` and `dispatch` effects; `WorldView.opens`, `pushes`, `projectSettings`; `WorldNeed` `project`** | s1 … s17 |
| NSP-002 traces + adapter + runtime target | ✅; **s17: `history` and `dispatch` events, `open`'s target / features optional, LOCATION events one group in the order made; the runtime target records every location call and installs the project's settings** | s2 … s17 |
| NSP-003 the runner | ✅; **s17: a `project` spec's sequences draw its settings from the pool** | s2 … s17 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b; s17 changed guarded format files additively — hashes refreshed, the three rounds green | `fec895706`, `37ea36ef6` |
| NSP-007 the world | ✅; **s17: LOCATION whole (`open`, `history`, `dispatch`), PROJECT the seventh seam**; AC1's export half ✗ | s13, s16, s17 |
| NSP-008 the graph | ✅ (s15 boundary + definitions) | s15 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-015 navigation + components** | **🟡 8 of 14**: + Navigate To Path (s17). **Left: 6**: Show / Close Popup, Push Component To Stack, Pop Component Stack, Navigate, Page Inputs. AC2 | s15, s16, s17 |
| NSP-020 ports without a viewer | rows only | — |
| NSP-009, NSP-014, NSP-016 … NSP-019, NSP-021 | — | — |

**77 of 147 conform on the runtime** (T1 45/46 · T2 10/11 · T3 1/39 · T4 21/27; 0 exempt). Counted s17 from the 57
specs × tiers.json (T1 45 · T2 9 · T3 1 · T4 2) + On App Error + the 19 graph-graded T4 nodes (a count run, not carried
forward). **Graph 55 / 55 on the runtime**; known graph rows 5 (G1, C11–C14).

## Commits this session (on `cline-dev`)

`37ea36ef6` LOCATION's history + dispatch, PROJECT, Navigate To Path (77 of 147) · then this handoff.

## Gate readings (2026-10-01, s17, at `37ea36ef6`'s tree)

| gate | reading |
|---|---|
| `packages/nodegx-node-spec`: `npx jest` (whole package, incl. the three stranger rounds + hash gate) | **17 suites, 614 passed, 17 skipped, exit 0** |
| `packages/nodegx-node-spec`: `npx jest tests/batch-navigation.test.ts` | **10 passed** (2 conformance on the interpreter + 8 LOCATION / PROJECT mechanism) |
| `packages/noodl-runtime`: `npx jest test/node-spec` | **3 suites, 143 passed, 57 skipped, exit 0** (every spec on the runtime, External Link under the s17 world) |
| `packages/noodl-runtime`: `NSP_ONLY=PageStackNavigateToPath … conformance.test.ts` | **CONFORMS** — 17 / 19 + 2 known (C24, C25), 200 / 200 (33 → C24), 26 / 26 mutants |
| deep: `NSP_DEEP=10000 NSP_ONLY="net.noodl.externallink,PageStackNavigateToPath" … -t deep` | **both CONFORM**, 10,000 / 10,000 each; mutants 26 / 26 and 12 / 12; known C24 1,959 · C25 45 · C6 2. ⚠️ launched at load 11.6 — a peer was busy; wait next time |
| `packages/nodegx-export`: `npx jest tests/node-spec-conformance.test.ts tests/node-spec-graph.test.ts` | **12 passed, 2 skipped, exit 0** (as s16) |
| `tsc --noEmit` on runtime, node-spec | exit 0 · exit 0 (viewer source untouched) |
| `packages/noodl-runtime`: whole `npx jest` | NOT RUN this session (s16: 181 suites, 3145 passed); s17 touched only `test/helpers/node-spec-target.ts` and `test/node-spec/conformance.test.ts` in it |
| `npm --prefix packages/noodl-editor run test:main` | NOT RUN (nothing this phase touches is in it) |

## What s17 settled (and where the handoff was wrong)

1. **The family makes THREE browser calls, not two.** s16 read `window.open` and `history.pushState`; Navigate To
   Path and `api/navigation.ts` also call a bare `dispatchEvent(new PopStateEvent('popstate'))` — the only way the
   router hears a push. It is graded as its own `dispatch` event, after the push, in one LOCATION group kept in the
   order made (a mutant that drops or reorders it is killed).
2. **s16's world returned `null` from every `window.open` — wrong for any caller that checks the handle.** Navigate To
   Path's new-tab arm would have read every open as blocked. The world now returns a stand-in window unless
   `noopener` / `noreferrer` or the popup blocker refuses (activation `false`, a target that is not the page itself).
   External Link never reads the handle; it still conforms at 10,000.
3. **A push can be REFUSED** — a browser throws a `SecurityError` for another origin, and the runtime's frame-end
   callback then loses the frame's outcomes (C25). The world refuses it the same way. Same mechanism for a non-text
   Path (C24). Both are rows, the spec answers Failure (proposed).
4. **The project's settings are a world input** (PROJECT): Navigate To Path reads `navigationPathType` through
   `NoodlRuntime.instance`; the runtime target sets the static to its runtime for the play.
5. Claims written from the source before the runtime ran: 17 of 19 borne out on the first run, the 2 others are the
   rows; the runtime's own traces were read after (probe) — push `#/product/42`, href moved, two presses → one push.

## What s18 does

- **Pop Component Stack / Push Component To Stack / Navigate / Page Inputs**: each reads or writes the location
  THROUGH a Page Stack or a Router, which are visual nodes (navigation-stack.tsx, router.tsx). Decide: a stand-in (a
  scenario that says so; LOCATION's `location.*` reads and `popstate` listeners are already live in the world for a
  router to use) or wait for NSP-016. Popups the same (`showPopup` builds a `Group` in the root scope).
- **AC6** (Navigate → back → Navigate, the same location stack on runtime and export) needs `history.back` — a third
  `history` op and a `popstate` the WORLD fires (traversal), unlike the node's own dispatch. Name it before building.
- **Cheap, alongside:** the deep run for s11–s14's specs (`NSP_DEEP=10000`, one batch, a QUIET box — check `uptime`
  first; States is slow); a round-4 stranger brief — States, a graph with the boundary, and the two LOCATION specs
  (does the world.ts LOCATION paragraph suffice for a target that has no DOM?).
- **AC2 (export)** for the boundary and the location family: route to P18 when its harness emits more than a latch.

**Human decisions outstanding:** next rows to ask, in plain words: **C24** first (an author meets it on any
disconnected wire), C25, D20, D21 (README §7 has the four questions); then C22, D19, C11, C12, C15, C16, C20, C7, D14,
D16 (`node scripts/bugs.js --from P107`); R7; R8; R4's confirmation; G1.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add
  <mine>; commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never
  `git stash`; one heavy job at a time — `uptime` before any deep run. Peers have open edits in `packages/nodegx-export/`
  (P18) and in other phases' docs. The `/next` state file belongs to P108's workstream — do not overwrite it for P107.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same command;
  `play(target, type, params, steps, new World(script))` and `loadScenarios(type)` are the two calls a probe needs.
- A spec behaviour change is a version: plain-words note above `version:`, guarded ⇒ hashes + re-hand the round
  (NSP-006 §5.8's recipe). An ADDITIVE format change (s17) needs the hashes and the three rounds green, not a new agent.
- A viewer node outside `std-library/` registers through its own list in the runtime target (`VIEWER_NAVIGATION_NODES`).
