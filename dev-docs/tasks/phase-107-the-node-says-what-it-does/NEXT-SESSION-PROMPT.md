# P107 — next session

**Written 2026-10-02 (end of s20).** Read the [README](README.md) §2–§7. NSP-015 is 14 of 14; its s20 record is
[NSP-015 §6.1f](NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md), and the POPUP paragraph is in the header of
[world.ts](../../../packages/nodegx-node-spec/src/world.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1 | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s20; **s20: a patch's `popup` effect; `WorldView.popupAnswer`, `popupsInside`; the world handler `popup`; `WorldNeed` `popup`** | s1 … s20 |
| NSP-002 traces + adapter + runtime target | ✅; **s20: the `popup` event in the LOCATION group; the runtime target keeps the REAL `NodeContext.showPopup` and stands in the host, the container `Group`, `requestAnimationFrame`, a fresh root scope per play, the project's components; T10, T11, T12 fixed (NSP-015 §6.1f)** | s2 … s20 |
| NSP-003 the runner | ✅; **s20: a `popup` spec's sequences draw a popup world from the pool; the mutant runner wraps `world.popup`** | s2 … s20 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b; s20 changed guarded format files additively — hashes refreshed (the diff named exactly schema JSON, spec.ts, trace.ts, world.ts), the three rounds green | `fec895706`, s20 |
| NSP-007 the world | ✅; **s20: POPUP, the tenth seam**; AC1's export half ✗ | s13, s16 … s20 |
| NSP-008 the graph | ✅ (s15 boundary + definitions); **s20: t12, the popup round trip (5 scenarios, 2 rows)** | s15, s20 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-015 navigation + components** | **🟡 14 of 14 conform** — s20: Show Popup, Close Popup. **Left: AC2 (export, P18)**; AC6 is the Router's (NSP-016) | s15 … s20 |
| NSP-020 ports without a viewer | rows only; **s20: §6 lists the navigation family — own-params (Pop, Page Inputs, Close Popup) vs project (Push, Navigate, Show Popup)** | s20 |
| NSP-009, NSP-014, NSP-016 … NSP-019, NSP-021 | — | — |

**83 of 147 conform on the runtime (56.5%)** (T1 45/46 · T2 10/11 · T3 1/39 · **T4 27/27**; 0 exempt). Counted s20 from the
63 specs × tiers.json (T1 45 · T2 9 · T3 1 · T4 8) + On App Error + the 19 graph-graded T4 nodes. **Graph 60 / 60 on the
runtime**; known graph rows 7 (G1, C11–C14, C31, C32).

## Commits this session (on `cline-dev`)

One commit, s20: the POPUP seam, Show Popup, Close Popup, t12, rows C30–C32, a Navigate scenario, the docs, this handoff.

## Gate readings (2026-10-02, s20, on the tree of the s20 commit; HEAD before it `68b1549f5`)

| gate | reading |
|---|---|
| `packages/nodegx-node-spec`: `npx jest` (whole package) | **17 suites, 649 passed, 17 skipped, exit 0** (s19: 633) — the stranger rounds green on the refreshed hashes |
| `packages/noodl-runtime`: `npx jest test/node-spec` | **3 suites, 154 passed, 63 skipped, exit 0** (s19: 147), seed 20728 |
| `NSP_ONLY="NavigationShowPopup,NavigationClosePopup" … conformance.test.ts` (200) | **both CONFORM** — Show Popup 22 / 22, 200 / 200, 142 / 142 mutants; Close Popup 12 / 12, 200 / 200, 242 / 244 (2 declared equivalent) |
| deep: `NSP_DEEP=10000` same two, `-t deep` — on the FINAL target (re-run after T12) | **both CONFORM, 10,000 / 10,000** — Show Popup 223 / 223 (known C6 50), Close Popup 242 / 244 (C6 48); 250 s at load ~2–3. The first deep run (before T12) read the same |
| `NSP_SEED=20727` / `20728`, Navigate | at s19's seed 74 / 74 on this tree; at 20728 one survivor (an answer-only frame never followed by a settle) → a hand scenario added → 74 / 74, 23 / 23 |
| `NSP_RECORD=1 … graph.test.ts -t popup…` | t12: 5 / 5 — 3 claims borne out, 2 rows known (C31, C32), recorded after the T12 fix |
| `tsc --noEmit` on node-spec, runtime (runtime includes `test/`) | exit 0 · exit 0 |
| `packages/noodl-runtime`: whole `npx jest` | NOT RUN (s16: 181 suites); s20 touched only `test/helpers/node-spec-target.ts` there |
| `packages/nodegx-export` node-spec tests | NOT RUN (s17: 12 passed); s20 changed no export code |

## What s20 settled (and where the handoff was wrong)

1. **The recommendation held: `showPopup` stays REAL.** Unlike STACK / ROUTE, the thing called is runtime code, so the slot
   policy is GRADED; the world plays only the host, the project's components and the person (a close through the popup's
   Close Popup, Escape). Ten probe questions answered before a spec line was written; every hand claim held on the first
   run (Show Popup 22 / 22, Close Popup 12 / 12).
2. **Three rows, all measured:** **C30** — a popup whose build fails keeps its slot (next Replace It reports Dismissed on
   the failed node; Escape under it is dead); **C31** — a Close Popup can never close the outer popup by name (every popup
   is built in the root scope; `popupParent` is read by nothing; the probe at its `close()` saw candidates `["Inner"]`);
   **C32** — two Show Popups in one frame: the first reports Dismissed AND Done for a popup never opened. Ledger files
   filed; plain-words questions in README §7.
3. **Three holes in the runtime TARGET (not the app):** T10 no bundle map (a missing component's message was the
   harness's TypeError); T11 a pulse on a port the node lacks was recorded; T12 popup calls attributed through the
   opener's async context and a sole-subject fallback — now by the subject whose `update()` is on the stack.
4. **A seed-dependent kill is not a kill.** Navigate's 74 / 74 at s19 depended on seed 20727's sequences; seed 20728 left
   one. Hand scenarios must reach every frame-end branch AND settle after it.
5. **The handoff was wrong in one place:** it said README §7 had C29's plain words. It did not; written at s20.
6. Read in passing (not rows): a Target naming a node TYPE builds that node as a popup; a Show Popup inside a popup with
   the default Replace It dismisses its own popup — as its description says (nesting needs Show On Top).

## What s21 does

- **Pick the next batch — recommended: NSP-014 (records, users, files, HTTP, cloud), first half (the frontend data
  nodes).** T3 is 1 / 39, the largest gap left; NSP-007 names backend as the fifth seam that "arrives with NSP-014,
  reusing the request seam". Design the BACKEND seam first from what the nodes call (as POPUP was: what is runtime code
  and is graded, what is outside and is played). NSP-014's own status line says it will likely split (frontend /
  cloud-only) — split it first, from the census.
  The alternative: **NSP-009 the ratchet** (the number in PR CI), small and protective; good to land before the number
  moves again.
- **Cheap, alongside, on a QUIET box only** (`uptime` first; one heavy job): the clock-driven specs' deep runs under T9
  (Delay, Repeat, HTTP Request, Animate To Value, States, Screen Resolution, Navigate To Path — their 10,000 readings
  predate one-timer stepping); Pop Component Stack's deep run (933 mutants); s11–s14's specs at `NSP_DEEP=10000`.
  ALSO: re-run the 200-gate on two more seeds (`NSP_SEED=20729`, `20730`) to find other seed-dependent survivors like
  Navigate's — each one a hand scenario.
- **AC2 (export)** for the boundary, the location family and the popups: route to P18 when its harness emits more than
  a latch.

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written): **C27 + C29 together** (one
ruling: "hand a copy"), then **C30** (the popup an author meets first), **C26**, **C24**, C31, C32, C28, C25, D20, D21;
then C22, D19, C11, C12, C15, C16, C20, C7, D14, D16 (`node scripts/bugs.js --from P107`); R7; R8; R4's confirmation; G1.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add
  <mine>; commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never
  `git stash`; one heavy job at a time — `uptime` before any deep run. The `/next` state file belongs to P108's
  workstream — do not overwrite it for P107.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same command. **The play
  sinks `console.*`** — print from a probe with `process.stdout.write`. A viewer node's real method can be watched by
  patching `require(<file>).default.node.methods.<name>` BEFORE the target registers it (C31 was measured that way).
- **A play's ids come from the world's random stream** (`guid()` → `Math.random`): anything that outlives a play (a
  scope, a table) meets the same ids next play — make it fresh per play (s20's root scope).
- A spec behaviour change is a version (plain-words note above `version:`; guarded ⇒ hashes + re-hand the round). An
  ADDITIVE format change needs the hashes (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, check
  the diff names only what you touched) and the three rounds green, not a new agent.
- A viewer node outside `std-library/` registers through `VIEWER_NAVIGATION_NODES` in the runtime target.
- A scenario's `row` means KNOWN TO FAIL on the runtime; a row the spec FOLLOWS (C30) carries no `row` mark.
- A scenario whose reference trace has no observation event is refused (an absence needs a firing signal beside it).
