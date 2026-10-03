# P107 — next session

**Written 2026-10-03 (s33).** Read the [README](README.md) §2–§7. s33's record is [NSP-014 §6.37–§6.39](NSP-014-BATCH-DATA-AND-CLOUD.md)
(s32's is §6.34–§6.36). BACKEND's REALTIME is in the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts),
under FILES.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s32; **s33: the `subscribe` / `unsubscribe` effects, `world.realtime`** | s1 … s33 |
| NSP-002 traces + adapter + runtime target | ✅; **s33: the runtime target plays `createRealtimeSubscription` through the world** | s2 … s33 |
| NSP-003 the runner | ✅; s24 `wrapReducers`; s29 `opens`; s31 `world.picker`, `settles`; **s33 `drop-subscribe` / `drop-unsubscribe`** | s2 … s33 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s33 refreshed the hashes (spec.ts, world.ts), the three rounds green | `fec895706`, s21 … s33 |
| NSP-007 the world | ✅; AUTH (s26–s29), FILES (s30), PICKER (s31), NETWORK's XHR face + PROJECT's cloud services (s32), **BACKEND's REALTIME (s33)**; AC1's export half ✗ | s13, s16 … s33 |
| NSP-008 the graph | ✅ — 76 / 76 | s15, s20, s23 … s29 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 22 of 24 — s33: Subscribe To Changes conforms. Left: WebSocket, Server-Sent Events** | s8, s21 … s33 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**104 of 147 conform on the runtime (70.7%)** (T1 46/46 · T2 11/11 · **T3 20/39** · T4 27/27; 0 exempt). Graph 76 / 76.

## Commits this session (on `cline-dev`)

- the s33 commit: `packages/nodegx-node-spec` (world.ts: REALTIME — `WorldBackend.subscribe`, the handle, `RealtimeScriptEvent`,
  `RealtimeTold`, `REALTIME_FAILURE_KINDS`; spec.ts: the `subscribe` / `unsubscribe` effects, `RealtimeEvent`,
  `world.realtime`; interpreter.ts; runner/mutants.ts; `nodes/subscribe-to-changes.ts` + the index and three declared
  equivalents; `scenarios/SubscribeToChanges.json`; scenarios/README.md; world.test.ts +4, batch-records.test.ts; the
  hashes), the runtime target (`test/helpers/node-spec-target.ts`), the bug file (C55), NSP-014 §6.37–§6.39, the README and
  this handoff.
- **The census is still NOT regenerated into a commit** (not run this session): a peer's viewer and export work is still
  uncommitted and moves it. No census number depends on specs.

## Gate readings

NSP-014 §6.39. In short: the first run on the runtime was 200 / 200 with 0 divergences before any scenario. 8 mutants
survived: 6 were values overwritten before a settle (killed by the 14 scenarios) and 3 were the stuck-flag kind (declared
equivalent). It conforms on 20729, 13 and 20730 and at 10,000 (113 s). Three defects planted in a COPY of the runtime node
were all caught. Whole runtime `test/node-spec/`: **191 passed, exit 0**. Package jest: **814 passed, exit 0** after the hash
refresh. Export node-spec: 12 passed. Both `tsc --noEmit`: exit 0.

## What s33 settled

1. **The handoff's guess was right: two seams, not one.** Subscribe To Changes goes through the backend layer's ONE call
   (`createRealtimeSubscription`), so R9 puts the seam at the operation: a subscribe recorded as handed and answered by a
   scripted stream. **Query Records' realtime half uses the same door** (dbcollectionnode2.ts :697-707). Server-Sent Events
   and WebSocket own raw connections. That is the second seam.
2. **A handle's lifecycle rules belong to the world, not to the spec**: an unchanged status is not told, a fatal error
   stops, a dispose is silent and final. Both targets then play the same handle. The transports' backoff and deadline stay
   with the backend layer's own tests.
3. **A seam the node calls through a module object can be stood in by replacing the export for the play.** The probe
   measured this before anything was built (ts-jest's CommonJS reads `realtime_1.createRealtimeSubscription` at each call).
4. **Reach is bounded by the node's own churn.** Every input write tears the subscription down, so a told status is
   observed only when an advance is followed by a settle with no write between: 5 sequences in 400. The doubling-clock
   pool (Query Records' WRITES) lifted the signals; the scenarios carry the status paths. Recorded, not hidden.
5. **Plant defects in a copy of the runtime node when a first run is clean.** Three planted, three caught. A green first
   run then means the suite grades the runtime, not only the interpreter's mutants.

## What s34 does

- **Server-Sent Events and WebSocket — a NETWORK STREAM face. READ ALL FOUR FILES BEFORE DESIGNING:** `agent/sse.ts` (735)
  with `agent/sse-connection.ts` (TWO transports: `EventSource` and a fetch-streamed body), and `agent/websocket.ts` (861)
  with `agent/websocket-connection.ts`. These are NETWORK conversations that answer MANY times (open, messages, error,
  close), so the face is probably a scripted list of timed events per connection, like REALTIME's stream, recorded at the
  constructor (URL, protocols / headers) and at each `send` / `close`. Probe the real nodes on the runtime first: what does
  each construct, through which global (`EventSource`, `WebSocket`, `fetch` + a `ReadableStream`), and can the play
  install it beside `fetch` / `XMLHttpRequest` without moving any other spec (run the whole runtime suite)? Reconnect timers
  are the NODE's here (no backend layer under them), so they ARE graded, on the world's clock.
- **Cheap, alongside: Query Records' realtime half (a slice C)** through the REALTIME seam s33 built. Its spec refuses the
  `realtime` port today ("NOT IN SLICE A", query-records.ts :163-164) and its Realtime outputs read the unsubscribed state.
  Read dbcollectionnode2.ts :680-760 and its realtime handlers. The count does not move (Query Records is counted); its
  grading does.
- **Cheap, on a QUIET box only:** the deep runs s20 listed (clock-driven specs under T9, Pop Component Stack, s11–s14 at
  `NSP_DEEP=10000`); the D24 probe on a `nodegx`-type backend.

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written):
- **C27 + C29 together** (one ruling: "hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21.
- Then C22, D19 (second half), C11 **with C37**, C12, C15, C16, C20, C7, D14, D16.
- The Record family: C34, C36, C35, C33, D22.
- Query Records: C38, C39, C40 + C41 together.
- Filter Records: **C42**, C44, C43.
- The user nodes: **C47**, C45 + C46 together, C48 (with C11 + C37), C49 (with R7), D23, D24, C50, D25 (with C47).
- The files (s30): **C52**, C51, D26 (with C47 + D25).
- The file dialog (s31): C53 (one node for camera and file list — clearing Capture keeps the camera), D27 (rides with it).
- Cloud Function (s32): **C54** (a `null` answer hangs the node — a one-line fix the spec already states), D28 (Error can be an object; with Upload File's same habit).
- **Subscribe To Changes (s33): C55 (a write of the value an input already holds reconnects; Query Records guards with `valueDidChange`).**
- Then R7, R8, R4's confirmation and G1.

The list: `node scripts/bugs.js --from P107`.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to another workstream — do not overwrite it.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same session (BEFORE the census).
  The play sinks `console.*` — print with `process.stdout.write`. A graph probe: `playGraph(withViewerNodes(runtimeTarget()),
  scenario)`; a graph `advance` step names a node (`{ node, advance }`).
- **The census reads the WORKING TREE:** a peer's uncommitted node source moves it. Diff it before committing; restore
  from HEAD what is not yours (s30).
- `tiers.json` is hand-kept and line-per-node: edit it TEXTUALLY, then `node scripts/node-spec/census.js`.
- A spec behaviour change is a version; an ADDITIVE format change needs the hashes
  (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, check the diff names only what you touched) and
  the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime. A runtime throw is not written into a spec: the spec states the
  sensible reading and the runtime's is a known row with a narrow predicate (C24, C25, C36, C37, C43, C44).
- An ABSENCE scenario needs a firing control beside it, or the runner refuses it ("an arm with no predicate grades
  nothing") — s30's Cloud File drop scenario.
- A format change that hooks earlier (T16) can move RECORDED graph expectations: run the whole runtime suite, and if a graph moves, ask whether the app's wire sees it before re-recording (in a FULL run; restore escape-only files from HEAD).
- Deep-run every new spec before its handoff; grade new specs' mutants on two seeds; print two runtime traces before
  trusting a first-run green; measure REACH on generated sequences; **record a graph scenario in a FULL graph run or re-check it in one** (T13: alone ≠ full).
- **A world FACE (XHR, REALTIME's handle, and next a socket or an event stream) swallows or reports a throw from the node's
  handler and goes on** (s32, s33): a throw that escapes a world callback fails the whole jest suite, not the scenario.
- **A new patch EFFECT also needs the mutants' shape and a drop kind** (s33: `subscribe` / `unsubscribe` → `shapeOf` names
  each only when present, so earlier specs' shapes do not move; `drop-subscribe` / `drop-unsubscribe`).
- **Catalog parity compares port descriptions VERBATIM** with the runtime node's (s33 abridged four and was red): copy them.
- **A new world-handler kind is added in FOUR places**, or a mutant copy goes deaf: spec.ts `WorldHandlers` AND the erased
  `AnyNodeSpec.world` type, interpreter.ts `handleInbound`, and runner/mutants.ts `reducerNames` + `wrapReducers` (s24, s31).
