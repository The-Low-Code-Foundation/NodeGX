# P107 — next session

**Written 2026-10-03 (s32).** Read the [README](README.md) §2–§7. s32's record is [NSP-014 §6.34–§6.36](NSP-014-BATCH-DATA-AND-CLOUD.md)
(s31's is §6.31–§6.33). NETWORK's XHR face and PROJECT's cloud services are in the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s31; **s32: `WorldView.cloudServices`, `WorldPool.cloudServices` (drawn only when a pool names it)** | s1 … s32 |
| NSP-002 traces + adapter + runtime target | ✅; **s32: the runtime target plays the project's `cloudservices` and the session for its app id** | s2 … s32 |
| NSP-003 the runner | ✅; s24 `wrapReducers`; s29 `opens`; s31 `world.picker`, `settles` | s2 … s31 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s32 refreshed the hashes (spec.ts, world.ts), the three rounds green | `fec895706`, s21 … s32 |
| NSP-007 the world | ✅; AUTH (s26–s29), FILES (s30), PICKER (s31) + **NETWORK's XHR face and PROJECT's cloud services (s32)**; AC1's export half ✗ | s13, s16 … s32 |
| NSP-008 the graph | ✅ — 76 / 76 | s15, s20, s23 … s29 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 21 of 24 — s32: Cloud Function conforms. Left: WebSocket, Server-Sent Events, Subscribe To Changes** | s8, s21 … s32 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**103 of 147 conform on the runtime (70.1%)** (T1 46/46 · T2 11/11 · **T3 19/39** · T4 27/27; 0 exempt). Graph 76 / 76.

## Commits this session (on `cline-dev`)

- the s32 commit: `packages/nodegx-node-spec` (world.ts: the XHR face `worldXMLHttpRequest`, installed in every play, and
  `cloudServices`; spec.ts: `WorldView.cloudServices`, `WorldPool.cloudServices`; interpreter.ts; runner/generate.ts;
  `nodes/cloud-function.ts` + the index; `scenarios/CloudFunction2.json`; scenarios/README.md; world.test.ts +4,
  batch-records.test.ts; the hashes), the runtime target (`test/helpers/node-spec-target.ts`) and the C54 known row
  (`test/node-spec/conformance.test.ts`), the two bug files (C54, D28), NSP-014 §6.34–§6.36, the README and this handoff.
- **The census is still NOT regenerated into a commit:** a peer's viewer and export work is still uncommitted (dynamic
  ports 68 → 69, test counts). Restored from HEAD again. Cloud Function's row does not move; no census number depends on specs.

## Gate readings

NSP-014 §6.36. In short: first run on the runtime 17 / 17 + C54 known and 200 / 200, with ONE mutant survivor (a
deletion nothing read, removed) and C54's throw escaping as an unhandled rejection (the XHR face now reports a
handler's throw, as the DOM does). Then conforms on 20729, 13, 20730 and at 10,000; 26 / 26 mutants. Whole runtime
`test/node-spec/` **190 passed, exit 0**. Package jest **804 passed, exit 0** after the hash refresh. Export node-spec 12
passed; both `tsc --noEmit` exit 0.

## What s32 settled

1. **READ WHAT IT CALLS paid a third time.** The handoff asked "backend contract or a raw fetch?". It was neither: a raw
   `XMLHttpRequest`. NETWORK grew a second face rather than a new seam. One server, two faces, one record.
2. **A throw inside a host callback must be the host's problem, the way the host handles it.** The DOM reports and goes
   on. A world face that let it propagate failed the whole jest SUITE ("Test suite failed to run"), not the scenario.
   Any later face (a socket's `onmessage`, an EventSource's listener) needs the same rule.
3. **A fact of storage is not a fact of metadata.** The session token sits beside `cloudServices` in the script, but the
   target writes it through the real `SessionStore`, and the metadata never carries it.
4. **A pool field added for one spec must not move the others.** `WorldPool.cloudServices` is drawn only when a pool
   names it, so every earlier `project` spec draws what it drew (a world test checks it).
5. **A mutant that survives on a branch nothing reads is a branch to delete, not a mutant to declare.**

## What s33 does

- **The three stream nodes. READ ALL THREE BEFORE DESIGNING** (s32 looked only at what each one opens):
  - **Subscribe To Changes** (`data/subscribetochanges.ts`, 690 lines) goes through the BACKEND layer:
    `createRealtimeSubscription(handle, { collection, where, primaryKey, onEvent, onStatus, onError })` from
    `api/backends/realtime`, after `realtimeSupportFor(handle.type)`. R9 probably puts the seam at that call (the
    subscription as handed, its events and statuses as scripted), not at the SSE `/realtime` wire under it. Check
    whether Query Records' realtime goes through the same door; if so, one seam serves both.
  - **Server-Sent Events** (`agent/sse.ts`, 735) owns an `SseConnection` (`agent/sse-connection.ts`) with TWO
    transports: `EventSource` and a fetch-streamed body. **WebSocket** (`agent/websocket.ts`, 861) owns a
    `WebSocketConnection`. These are NETWORK conversations that answer MANY times (a connection, frames, a close).
    That is probably a STREAM face on NETWORK, scripted as a list of timed events per connection.
  - So it is probably two seams, not one. Decide after reading. Probe the real nodes on the runtime first.
- **Cheap, alongside, on a QUIET box only:** the deep runs s20 listed (clock-driven specs under T9, Pop Component Stack,
  s11–s14 at `NSP_DEEP=10000`); the D24 probe on a `nodegx`-type backend.

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written):
- **C27 + C29 together** (one ruling: "hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21.
- Then C22, D19 (second half), C11 **with C37**, C12, C15, C16, C20, C7, D14, D16.
- The Record family: C34, C36, C35, C33, D22.
- Query Records: C38, C39, C40 + C41 together.
- Filter Records: **C42**, C44, C43.
- The user nodes: **C47**, C45 + C46 together, C48 (with C11 + C37), C49 (with R7), D23, D24, C50, D25 (with C47).
- The files (s30): **C52**, C51, D26 (with C47 + D25).
- The file dialog (s31): C53 (one node for camera and file list — clearing Capture keeps the camera), D27 (rides with it).
- **Cloud Function (s32): C54 (a `null` answer hangs the node — a one-line fix the spec already states), D28 (Error can be an object; with Upload File's same habit).**
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
- **A world FACE (XHR, and next a socket or an event stream) reports a throw from the node's handler and goes on** (s32):
  a throw that escapes a world callback fails the whole jest suite, not the scenario.
- **A new world-handler kind is added in FOUR places**, or a mutant copy goes deaf: spec.ts `WorldHandlers` AND the erased
  `AnyNodeSpec.world` type, interpreter.ts `handleInbound`, and runner/mutants.ts `reducerNames` + `wrapReducers` (s24, s31).
