# P107 — next session

**Written 2026-10-01 (end of s18).** Read the [README](README.md) §2–§7. Then [NSP-015 §6.1d](NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md),
which holds the STACK seam (why a stand-in, what is recorded, how the real `NavigationHandler` is kept on the runtime),
and the STACK paragraph at the top of [world.ts](../../../packages/nodegx-node-spec/src/world.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1 | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s18; **s18: a patch's `stack` and `back` effects; `WorldView.stackAnswer`, `backAnswer`; `WorldNeed` `stack`** | s1 … s18 |
| NSP-002 traces + adapter + runtime target | ✅; **s18: the `stack` event in the LOCATION group; the runtime target keeps the viewer's REAL `NavigationHandler`, fresh per play, records at it and registers stand-in stacks; a Pop Component Stack in a pushed page gets the world's back callback at mount** | s2 … s18 |
| NSP-003 the runner | ✅; **s18: a `stack` spec's sequences draw a stack script from the pool** | s2 … s18 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b; s18 changed guarded format files additively — hashes refreshed, the three rounds green | `fec895706`, s18 |
| NSP-007 the world | ✅; **s18: STACK, the eighth seam**; AC1's export half ✗ | s13, s16, s17, s18 |
| NSP-008 the graph | ✅ (s15 boundary + definitions) | s15 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-015 navigation + components** | **🟡 10 of 14**: + Push Component To Stack, Pop Component Stack (s18). **Left: 4**: Show / Close Popup, Navigate, Page Inputs. AC2, AC6 | s15 … s18 |
| NSP-020 ports without a viewer | rows only; **s18: Push's `target` / `pm-` ports come from the PROJECT (the Page Stack named Stack and its target component), not the params** | — |
| NSP-009, NSP-014, NSP-016 … NSP-019, NSP-021 | — | — |

**79 of 147 conform on the runtime** (T1 45/46 · T2 10/11 · T3 1/39 · T4 23/27; 0 exempt). Counted s18 from the 59
specs × tiers.json (T1 45 · T2 9 · T3 1 · T4 4) + On App Error + the 19 graph-graded T4 nodes. **Graph 55 / 55 on the
runtime**; known graph rows 5 (G1, C11–C14).

## Commits this session (on `cline-dev`)

One commit: the STACK seam, Push Component To Stack, Pop Component Stack, rows C26–C28, this handoff.

## Gate readings (2026-10-01, s18, on the tree committed with this handoff; parent `6e831345d`)

| gate | reading |
|---|---|
| `packages/nodegx-node-spec`: `npx jest` (whole package, incl. the three stranger rounds + hash gate) | **17 suites, 622 passed, 17 skipped, exit 0** (s17: 614) |
| `packages/nodegx-node-spec`: `npx jest tests/batch-navigation.test.ts` | **15 passed** (4 conformance on the interpreter + 8 LOCATION / PROJECT + 3 STACK mechanism) — run after the last spec edit |
| `packages/noodl-runtime`: `npx jest test/node-spec` | **3 suites, 145 passed, 59 skipped, exit 0** (s17: 143) |
| `packages/noodl-runtime`: `NSP_ONLY="PageStackNavigate,PageStackNavigateBack" … conformance.test.ts` | **both CONFORM** — Push 14 / 14, 200 / 200, 46 / 46 mutants; Pop 11 / 11, 200 / 200, 928 / 933 + 5 declared equivalent |
| deep: `NSP_DEEP=10000 NSP_ONLY=PageStackNavigate … -t deep` | **CONFORMS**, 10,000 / 10,000, 46 / 46 (known C6 129). Launched at load 7 (peers' editors) |
| deep for Pop Component Stack | **NOT RUN** — 933 mutants (30 s at 200); a quiet-box job |
| `tsc --noEmit` on node-spec, runtime | exit 0 · exit 0 |
| `packages/noodl-runtime`: whole `npx jest` | NOT RUN (s16: 181 suites, 3145 passed); s18 touched only `test/helpers/node-spec-target.ts` in it |
| `packages/nodegx-export` node-spec tests | NOT RUN this session (s17: 12 passed, 2 skipped); s18 changed no export code — the trace format grew one event kind |

## What s18 settled (and where the handoff was wrong)

1. **The decision "stand-in or wait for NSP-016" was a stand-in, from what the nodes call.** Push and Pop never touch
   the Page Stack's visual tree: Push hands a request and three callbacks to `NavigationHandler`, Pop calls a callback
   the stack installed and reads `{ ok }` / `{ unchanged }` / `{ code }`. That is HTTP Request's shape; the world plays
   the stack. The handoff framed Push / Pop as "read or write the location THROUGH a Page Stack" — they don't write
   the location at all; the STACK does (`_updateUrlWithTopPage`), and that is the stack's spec.
2. **The handler stays real.** The runtime target gives each play a fresh `NavigationHandler` (a process-wide static
   whose queue would outlive the play) and registers stand-in stacks with it, so the handler's rules (blank → `Main`,
   queue when no stack, fan-out) are graded against the world's model, not copied away. Measured: a queued push sits
   in the real queue; the handler is restored after the play.
3. **A declared `default` never runs its setter** (nodedefinition.ts :539, :575) — the spec's one wrong claim on the
   first run (Stack started `Main`; the runtime hands `undefined`). The same false sentence ("seeded at creation") was
   in External Link's and Navigate To Path's specs, harmless there, now corrected. Worth checking in every spec that
   starts a state field at a declared default.
4. **Three rows, none graded before** — C26 (Push's Back Results / Back Actions never connect: the July TS port dropped
   `registerOutputIfNeeded`), C27 (one Push re-opening the same page with new params says Unchanged — the live params
   object), C28 (a bogus Mode answers nothing). C26 and C27 were found by reading the protocol the seam needed and
   measured with probes and controls; neither shows through the stand-in.
5. Two navigation hazards found in passing (not rows): navigate-back.ts :116-117's comment says a frame's second pop
   reports Unchanged — a real stack says "still animating" (Failure); RouterHandler waits 1 ms on the world's clock
   (`setTimeout`) before it routes, which Navigate's spec will meet.

## What s19 does

- **Navigate (`RouterNavigate`) + Page Inputs** on the STACK seam's pattern: `RouterHandler.instance.navigate(name,
  args)` (router-handler.ts) — record as handed, keep the REAL handler fresh per play (it has its own queue, a 1 ms
  `setTimeout` on the world's clock, and "one router registered ⇒ use it whatever the name"), stand-in routers that
  answer by script. Name the event first (`{ t: 'stack', op: 'route' }` or its own kind — decide from what a stranger
  would read). Page Inputs reads `_setPageParams` from the Router / Stack (page-inputs.ts :64-90): a stand-in hands it
  params the way the stack hands `_setBackCallback`.
- **AC6** (Navigate → back → Navigate, the same location stack on runtime and export) — needs `history.back` and a
  `popstate` the WORLD fires; name it before building.
- **Show / Close Popup**: `showPopup` builds a `Group` in the root scope — read whether a stand-in can honestly stand
  for it the way STACK does (Close Popup's protocol is a callback too: "returns values to the Show Popup that opened it").
- **Cheap, alongside, on a QUIET box only** (`uptime` first; one heavy job): the deep run for Pop Component Stack, and
  for s11–s14's specs (`NSP_DEEP=10000`, one batch; States is slow).
- **AC2 (export)** for the boundary and the location family: route to P18 when its harness emits more than a latch.

**Human decisions outstanding:** next rows to ask, in plain words (README §7 has them written): **C27** first (an author
meets it with any sidebar that opens one page with different ids), then **C26**, **C24**, C28, C25, D20, D21; then
C22, D19, C11, C12, C15, C16, C20, C7, D14, D16 (`node scripts/bugs.js --from P107`); R7; R8; R4's confirmation; G1.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add
  <mine>; commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never
  `git stash`; one heavy job at a time — `uptime` before any deep run. Peers have open edits in `packages/nodegx-export/`
  (P18) and in other phases' docs. The `/next` state file belongs to P108's workstream — do not overwrite it for P107.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same command;
  `play(target, type, params, steps, new World(script))` and `t.install!(world)` + `t.mount` / `t.signal` / `t.settle`
  are the calls a probe needs; `ComponentModel.createFromExportData` + `context.createComponentInstanceNode` is the
  loaded-app path for a connection probe (C26 was measured that way).
- A spec behaviour change is a version: plain-words note above `version:`, guarded ⇒ hashes + re-hand the round
  (NSP-006 §5.8's recipe). An ADDITIVE format change (s17, s18) needs the hashes and the three rounds green, not a new agent.
- A viewer node outside `std-library/` registers through its own list in the runtime target (`VIEWER_NAVIGATION_NODES`).
- A mutant equivalence applies only to SURVIVORS and is printed with its count; keep each row as narrow as its branch.
