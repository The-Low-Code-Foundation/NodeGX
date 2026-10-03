# P107 — next session

**Written 2026-10-03 (s34).** Read the [README](README.md) §2–§7. s34's record is [NSP-014 §6.40–§6.42](NSP-014-BATCH-DATA-AND-CLOUD.md)
(s33's is §6.37–§6.39). SOCKET and A STREAMED BODY are in the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts)
(SOCKET after PICKER; A STREAMED BODY under NETWORK).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s33; **s34: the `socket` effect, `world.socket`, `world.stream`, `socketAnswer`, `settles` naming a `port`; T17 (`advance` steps timer by timer)** | s1 … s34 |
| NSP-002 traces + adapter + runtime target | ✅; **s34: the `socket` trace event; canonical `$bytes`; the target attributes each socket call to the node that made the socket** | s2 … s34 |
| NSP-003 the runner | ✅; s24 `wrapReducers`; s29 `opens`; s31 `world.picker`, `settles`; s33 `drop-subscribe` / `drop-unsubscribe`; **s34 `drop-socket`, the `socket` need and pool** | s2 … s34 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s34 refreshed the hashes (5 files), the three rounds green | `fec895706`, s21 … s34 |
| NSP-007 the world | ✅; … REALTIME (s33), **SOCKET and NETWORK's STREAMED BODY (s34)**; AC1's export half ✗ | s13, s16 … s34 |
| NSP-008 the graph | ✅ — 76 / 76 | s15, s20, s23 … s29 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 — **Array Filter is stale: the runtime grew `in` / `nin` (P109, `2c38d43a4`), see below** | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP, streams** | **🟡 24 of 24 conform — s34: WebSocket, Server-Sent Events. Left: AC2's export half (P18)** | s8, s21 … s34 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**106 of 147 conform on the runtime (72.1%)** (T1 46/46 · T2 11/11 · **T3 22/39** · T4 27/27; 0 exempt). Graph 76 / 76. What is
left of the 147: the 17 cloud-only nodes (NSP-022, T3), 19 visual nodes (NSP-016, T5), 5 escape hatches (NSP-017, T6).

## Commits this session (on `cline-dev`)

- the s34 commit: `packages/nodegx-node-spec` (world.ts SOCKET + A STREAMED BODY; spec.ts; trace.ts; schema.ts + the JSON
  schema; canonical.ts `$bytes`; interpreter.ts (the socket effect, the stream inbox, T17); runner/mutants.ts, generate.ts,
  compare.ts; `nodes/websocket.ts`, `nodes/sse.ts`, the SSE half of `nodes/stream-parsers.ts`, the index, the declared
  equivalents; `scenarios/net.noodl.WebSocket.json`, `scenarios/net.noodl.SSE.json`, scenarios/README.md; world.test.ts,
  canonical.test.ts, batch-records.test.ts; the hashes), the runtime target (`recordSocket`), the runtime conformance test
  (C57's known row), the three bug files (C56, C57, C58), NSP-014 §6.40–§6.42, the README and this handoff.
- **The census is still NOT regenerated into a commit**: a peer's viewer and export work moves it (s30–s33). No census number
  depends on specs.

## Gate readings

NSP-014 §6.42. In short: WebSocket conformed on its first runtime run (0 divergences); SSE after T17 and one declared
coercion. Both at seeds 20729, 13 and 20730 and at 10,000 / 10,000 with 0 divergences; every mutant killed or declared (12 and
21 declared, each with its reason); six defects planted in copies of the runtime nodes all caught. Package: 18 suites, 837
passed, exit 0. Whole runtime `test/node-spec/`: **3 suites, 193 passed, exit 0**. Export node-spec 12 passed. Both `tsc --noEmit` exit 0.

## What s34 settled

1. **Two seams, both NETWORK-shaped, neither the backend's.** WebSocket reaches the browser through the `WebSocket`
   constructor; SSE through `fetch` with a body that streams (its `auto` transport is fetch whenever fetch exists — always, in a
   play). The connection classes are the NODES' code, so backoff, jitter, heartbeat and the duplicate window are graded on the
   world's clock and random stream.
2. **A host global can reach the real network.** Jest's Node 22 has a real `WebSocket`: every play now has the world's, and
   no `EventSource` (a host's is hidden), so a node that asks for one meets the Node reading.
3. **T17 — the interpreter's clock broke its own rule.** `advance` fired every timer and THEN delivered its inbox, so an answer
   landing mid-advance reached its handler at the advance's end. world.ts CLOCK always said otherwise and the runtime target
   always did otherwise (T6); no spec before SSE read the clock inside a response handler. The interpreter now steps the clock
   timer by timer, delivering every instance's inbox after each. The whole runtime suite and the graph scenarios were re-run:
   nothing else moved.
4. **A swap mutant installs a sibling's WHOLE recorded patch.** With `conn` / `config` as one state key each, a swap brings
   another play's connection; it shows only when a later step reads that connection (a Disconnect's Done vs Unchanged, the
   next reconnect, Text recomputed). Most of s34's survivors were this; hand scenarios carry the follow-up. When a swap
   survives, ask first whether the sibling's connection happens to EQUAL the real one but for ids (s34 met that: give the
   scenario its own Reconnect Delay).
5. **Pools: weight what the node can use.** WebSocket's URL pool joined the generic string pool a wire can deliver — no ws://
   URL in it — so 41 of 400 sequences made a socket. Twelve copies of each real URL took it to 94.

## What s35 does

- **Array Filter v2 — the runtime grew two operators** (P109, `2c38d43a4`, a peer's note): `in` / `nin` ("Is one of" / "Is not
  one of") on string and number filters; the Values port becomes `*` (a wired Array, records by id, or typed `"a, b"`); `nin`
  keeps a row without the property, like `neq`. `nodegx-node-spec/src/nodes/array-filter.ts` lists the 7 old operators and its
  generator never draws `in`, so today's gates are green and blind to it. A behaviour change is a version (NSP-010): read
  `filtercollectionnode.ts` at HEAD, bump the spec, add scenarios, catalog parity (the port's type and description moved).
- **Query Records' realtime half (slice C)** through the REALTIME seam s33 built: its spec refuses the `realtime` port today
  ("NOT IN SLICE A", query-records.ts :163-164). Read dbcollectionnode2.ts :680-760. The count does not move; its grading does.
- **Then a batch:** NSP-022 (the 17 cloud-only nodes — read `noodl-viewer-cloud` first: what a second runtime target needs)
  or NSP-016 (the visual nodes — research first). Ask Richard which, in plain words, if the board does not settle it.
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
- The file dialog (s31): C53, D27 (rides with it).
- Cloud Function (s32): **C54**, D28.
- Subscribe To Changes (s33): C55.
- **Server-Sent Events (s34): C58 (says Connected after a URL change tore the stream down — WebSocket says idle), C56 (Last
  Error / Retry Count / Duplicates Suppressed move unsent), C57 (a non-text Event Types or Method throws).**
- Then R7, R8, R4's confirmation and G1.

The list: `node scripts/bugs.js --from P107`.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to another workstream — do not overwrite it.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts` (or `packages/nodegx-node-spec/tests/zz-*`),
  deleted in the same session (BEFORE the census). The play sinks `console.*` — print with `process.stdout.write`.
- **A survivor list across seeds is cheap on the interpreter**: a zz test calling `runConformance(spec, interpreterAdapter(…),
  { sequences: N, seed: S, mutants: true, equivalent })` and printing `report.mutants.survivors` (s34 used it at 200 on ten
  seeds and at 10,000). Mutants are graded on the interpreter in both runners, so a survivor there IS the runtime run's.
- **The census reads the WORKING TREE:** a peer's uncommitted node source moves it. Diff it before committing.
- `tiers.json` is hand-kept and line-per-node: edit it TEXTUALLY, then `node scripts/node-spec/census.js`.
- A spec behaviour change is a version; an ADDITIVE format change needs the hashes
  (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, check the diff names only what you touched) and
  the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime. A runtime throw is not written into a spec: the spec states the
  sensible reading and the runtime's is a known row with a narrow predicate (C24, C25, C36, C37, C43, C44, **C57**).
- An ABSENCE scenario needs a firing control beside it, or the runner refuses it.
- **JSON has no `undefined`**: a scenario param of `null` is NOT a blank port (`Number(null)` is 0). Write the blank as a
  `{ "set": "<port>" }` step instead (s34 lost a scenario to it).
- **An `object`-typed port parses a JSON string before the setter sees it** (`node.ts`): declare `coerce: 'object-literal'`.
- A world FACE swallows or reports a throw from the node's handler and goes on (s32, s33, s34).
- A new patch EFFECT also needs the mutants' shape (only-when-present) and a drop kind; a new world-handler kind goes in FOUR
  places (spec.ts `WorldHandlers` AND the erased `AnyNodeSpec.world`, interpreter.ts `handleInbound`, runner/mutants.ts
  `reducerNames` + `wrapReducers`).
- Catalog parity compares port descriptions VERBATIM, and defaults.
- Deep-run every new spec before its handoff; grade new specs' mutants on several seeds; print two runtime traces before
  trusting a first-run green; measure REACH on generated sequences; plant defects in a COPY of the runtime node when a first
  run is clean.
