# P107 — next session

**Written 2026-10-01 (end of s19).** Read the [README](README.md) §2–§7. Then [NSP-015 §6.1e](NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md),
which holds the ROUTE seam and the POPUP seam named for you, and the ROUTE paragraph at the top of
[world.ts](../../../packages/nodegx-node-spec/src/world.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1 | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s19; **s19: a patch's `route` effect; `WorldView.routeAnswer`; the world handler `page`; `WorldNeed` `router`** | s1 … s19 |
| NSP-002 traces + adapter + runtime target | ✅; **s19: the `route` event in the LOCATION group; the runtime target keeps the viewer's REAL `RouterHandler`, fresh per play, records at it and registers stand-in routers; a Page Inputs is handed the script's `page` params at mount and on the clock** | s2 … s19 |
| NSP-003 the runner | ✅; **s19: a `router` spec's sequences draw a router script from the pool; the mutant runner wraps `world.page`** | s2 … s19 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b; s19 changed guarded format files additively — hashes refreshed, the three rounds green | `fec895706`, s19 |
| NSP-007 the world | ✅; **s19: ROUTE, the ninth seam**; AC1's export half ✗ | s13, s16 … s19 |
| NSP-008 the graph | ✅ (s15 boundary + definitions) | s15 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-015 navigation + components** | **🟡 12 of 14**: + Navigate, Page Inputs (s19). **Left: 2**: Show Popup, Close Popup (the POPUP seam). AC2; AC6 moved to the Router (NSP-016) | s15 … s19 |
| NSP-020 ports without a viewer | rows only; **s19: Page Inputs' ports ARE derivable (from Path / Query Parameters); Navigate's `router` / `target` / `pm-` come from the PROJECT, like Push's** | — |
| NSP-009, NSP-014, NSP-016 … NSP-019, NSP-021 | — | — |

**81 of 147 conform on the runtime** (T1 45/46 · T2 10/11 · T3 1/39 · T4 25/27; 0 exempt). Counted s19 from the 61
specs × tiers.json (T1 45 · T2 9 · T3 1 · T4 6, by script) + On App Error + the 19 graph-graded T4 nodes. **Graph 55 / 55
on the runtime**; known graph rows 5 (G1, C11–C14).

## Commits this session (on `cline-dev`)

`18c594961` — the ROUTE seam, Navigate v1, Page Inputs, row C29. Then one commit: Navigate v2 (the deep run's
finding), T9 (`Clock.step`; the runtime target steps one timer at a time), this handoff.

## Gate readings (2026-10-01, s19)

| gate | reading |
|---|---|
| `packages/nodegx-node-spec`: `npx jest` (whole package, on the tree of the second commit) | **17 suites, 633 passed, 17 skipped, exit 0** (s18: 622) |
| `npx jest tests/stranger.test.ts` after each hash refresh (first: schema, spec.ts, trace.ts, world.ts; second: world.ts only — the diffs named nothing else) | **41 passed, 17 skipped, exit 0** both times |
| `packages/noodl-runtime`: `npx jest test/node-spec`, AFTER the T9 target change | **3 suites, 147 passed, 61 skipped, exit 0** (s18: 145) — every clock-driven spec re-graded under one-timer stepping |
| `NSP_ONLY="RouterNavigate" … conformance.test.ts` (v2) | **CONFORMS** — 22 / 22, 200 / 200, 74 / 74 mutants. Page Inputs 8 / 8, 200 / 200, 1 / 1 |
| deep: `NSP_DEEP=10000 NSP_ONLY="RouterNavigate,PageInputs" … -t deep` | v1: **Navigate DOES NOT CONFORM, 1 divergence** (→ v2, T9). v2: **both CONFORM, 10,000 / 10,000** (Navigate 74 / 74, known C6 93; Page Inputs 1 / 1). Run at load 5 |
| `tsc --noEmit` on node-spec, runtime | exit 0 · exit 0 |
| `packages/noodl-runtime`: whole `npx jest` | NOT RUN (s16: 181 suites); s19 touched only `test/helpers/node-spec-target.ts` in it |
| `packages/nodegx-export` node-spec tests | NOT RUN (s17: 12 passed); s19 changed no export code |

## What s19 settled (and where the handoff was wrong)

1. **ROUTE is its own event, not a `stack` op.** A Router is not a Component Stack, and its handler's rules differ — all
   read from router-handler.ts and graded against the REAL one: it hands a request on **1 ms later** (`setTimeout`, the
   world's clock — measured: `advance 0` answers nothing, `advance 1` answers); **one registered name takes every
   request**; otherwise the name is looked up AS HANDED — **no blank-is-`Main` on the navigate side** (only
   `registerRouter` maps it). The spec asks the clock for the handler's millisecond (`after`, tag `route`).
2. **Page Inputs only ever hears from a Router.** The Component Stack hands a page its params as the page component's own
   inputs (navigation-stack.tsx :974-977), never `_setPageParams`; the node's docblocks say otherwise. Its hand-offs MERGE
   (a key not handed keeps its old value — the Router's own TODO at router.tsx :520).
3. **Row C29** — C27 on the Router: the node's live `pageParams` is kept as the Router's `currentParams`, so a second
   navigate from the same node to the same page with new params answers Unchanged. Measured with the real
   `_navigateInCurrentWindow` (`require(router).default.node.methods`) and a copy as control. A memory now names the
   shape: [alias-kept-self-compares].
4. **The handoff was wrong about AC6.** It said "AC6 needs `history.back` and a `popstate` the world fires". Navigate never
   touches the location: the ROUTER pushes the URL and listens for `popstate`. With the world playing the Router, AC6 is
   the Router's spec (NSP-016) and the export's (P18); no NSP-015 node can grade it.
5. **The deep run earns its keep.** Navigate v1 was green at 200 and in a probe; 10,000 found the order of two answers
   in one millisecond (Failure at once, Done at the frame's end — v2), and writing v2's scenario found **T9**: the
   runtime target fired same-time timers in one sweep. Run the deep run on every new spec before calling it done.
6. **JSON cannot say `undefined`**, and a Router's no-target (Target `undefined`) is not its page-not-found (`null`), so a
   route rule matches `noTarget: true`. Any future seam that answers by "was it set" needs the same.

## What s20 does

- **POPUP, the tenth seam (Show Popup, Close Popup)** — design FIRST, from what the nodes call (NSP-015 §6.1e's last
  paragraph has the reading). Show Popup calls `this.context.showPopup(target, popupParams, { stackPolicy, closeOnEscape,
  modal, accessibleName, onCancelPopup, onDismissPopup, onClosePopup })` and settles on the promise; Closed / Dismissed /
  Cancelled / a close action arrive LATER through the callbacks. Close Popup walks its component owners for
  `_popupCloseHandler` (closepopup.ts :207-252). **The decision to make:** `NodeContext.showPopup` (nodecontext.ts
  :1212-1330) is RUNTIME code, not a visual node — the one-modal-slot policy (replace dismisses every open popup
  synchronously, before the first `await`), the next-frame `leave`, the published close handler. Recommended: keep it
  REAL on the runtime target (as STACK / ROUTE keep their handlers) and stand in only the host hooks (`onShowPopup` /
  `onClosePopup` — recorded as a `popup` event), the popup component (a registered DEFINITION, s15) and its `Group`
  (`createPrimitiveNode('Group')` — register the viewer's or stub it) and `requestAnimationFrame`; the world then models
  the slot policy and the close timing, and Close Popup is graded as a graph (a Show Popup and a popup definition holding
  a Close Popup — the round trip the census asks for). Name the event and the script before building.
  Read in passing (not rows yet): with no `onShowPopup` host the call returns at once and Show Popup reports Done for a
  popup never opened (:1213); `showPopup` reads `popupParams` after `await createNode` — not kept, so no C27 shape here.
- **Cheap, alongside, on a QUIET box only** (`uptime` first; one heavy job): **the clock-driven specs' deep runs again
  under T9** (Delay, Repeat, HTTP Request, Animate To Value, States, Screen Resolution, Navigate To Path… — their 10,000
  readings predate one-timer stepping; they are re-graded green at 200 only); the deep run for Pop Component Stack (933
  mutants), and for s11–s14's specs (`NSP_DEEP=10000`, one batch; States is slow).
- **AC2 (export)** for the boundary and the location family: route to P18 when its harness emits more than a latch.

**Human decisions outstanding:** next rows to ask, in plain words (README §7 has them written): **C27 + C29 together**
first (one ruling: "hand a copy" — an author meets them with any sidebar or header that opens one page with different
ids, through a Component Stack or a Router), then **C26**, **C24**, C28, C25, D20, D21; then C22, D19, C11, C12, C15, C16,
C20, C7, D14, D16 (`node scripts/bugs.js --from P107`); R7; R8; R4's confirmation; G1.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add
  <mine>; commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never
  `git stash`; one heavy job at a time — `uptime` before any deep run. Peers commit on `cline-dev` between yours (s19:
  `ed78054bd` landed mid-session). The `/next` state file belongs to P108's workstream — do not overwrite it for P107.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same command;
  `play(target, type, params, steps, new World(script))` RETURNS the trace; for a hand-driven probe `t.install!(world)`,
  `t.mount(type, params)` (sync), `t.set` / `t.signal`, `await t.settle()` (no handle), `await t.advance!(h, ms)`. A
  viewer node's real method is reachable as `require(<file>).default.node.methods.<name>` (C29 was measured that way).
- The runtime package compiles the specs under `strict: false`: a patch's `send: []` on a node with NO declared value
  output does not type there (node-spec's own `tsc` passes) — name only `sendDerived` (Page Inputs).
- A spec behaviour change is a version: plain-words note above `version:`, guarded ⇒ hashes + re-hand the round
  (NSP-006 §5.8). An ADDITIVE format change (s17–s19) needs the hashes (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`,
  then check the diff names only what you touched) and the three rounds green, not a new agent.
- A viewer node outside `std-library/` registers through `VIEWER_NAVIGATION_NODES` in the runtime target.
- A scenario whose reference trace has no observation event is refused (an absence needs a firing signal beside it).
