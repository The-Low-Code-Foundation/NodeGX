# P107 — next session

**Written 2026-10-03 (s35).** Read the [README](README.md) §2–§7. s35's record is in two places: [NSP-012 §6.5](NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md)
(Array Filter v2, C59, the name sweep, C60, the Upload File hole) and [NSP-014 §6.43–§6.45](NSP-014-BATCH-DATA-AND-CLOUD.md)
(Query Records slice C, `subscribeFirst`, D29). s34's is NSP-014 §6.40–§6.42.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s34; **s35: `subscribeFirst` (a patch's subscriptions before its backend calls)** | s1 … s35 |
| NSP-002 traces + adapter + runtime target | ✅; **s34: the `socket` trace event; canonical `$bytes`; the target attributes each socket call to the node that made the socket** | s2 … s34 |
| NSP-003 the runner | ✅; s24 `wrapReducers`; s29 `opens`; s31 `world.picker`, `settles`; s33 `drop-subscribe` / `drop-unsubscribe`; s34 `drop-socket`; **s35 `drop-subscribe-first`** | s2 … s35 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s35 refreshed the hashes (`src/spec.ts` only), the three rounds green | `fec895706`, s21 … s35 |
| NSP-007 the world | ✅; … REALTIME (s33), **SOCKET and NETWORK's STREAMED BODY (s34)**; AC1's export half ✗ | s13, s16 … s34 |
| NSP-008 the graph | ✅ — 76 / 76 | s15, s20, s23 … s29 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15; **s35: Array Filter v2 (`in` / `nin`); seven of its scenarios had never filtered (C59); Array Map's one mapping scenario had never mapped (C60)** | s15, s35 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP, streams** | **🟡 24 of 24 conform — s35: Query Records slice C (its realtime half). Left: AC2's export half (P18)** | s8, s21 … s35 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**106 of 147 conform on the runtime (72.1%)** (T1 46/46 · T2 11/11 · **T3 22/39** · T4 27/27; 0 exempt). Graph 76 / 76. What is
left of the 147: the 17 cloud-only nodes (NSP-022, T3), 19 visual nodes (NSP-016, T5), 5 escape hatches (NSP-017, T6).

## Commits this session (on `cline-dev`)

- `3ae3f7288` — Array Filter v2 (spec, scenarios 11 → 16, its own records pool), row C59, NSP-012 §6.5, the README.
- `be5223e48` — the name sweep: Array Map's records twin and pool, row C60, Upload File's second backend, NSP-012 §6.5.
- the slice C commit — `query-records.ts` (realtime half), `DbCollection2.json` (37 → 56), spec.ts + interpreter.ts
  `subscribeFirst`, runner/mutants.ts `drop-subscribe-first`, equivalent-mutants.ts (2 rows), the hashes, row D29, C55's
  note, NSP-014 §6.43–§6.45, the README and this handoff.
- **The census is still NOT regenerated into a commit**: a peer's viewer and export work moves it. No census number
  depends on specs.

## Gate readings

NSP-012 §6.5 and NSP-014 §6.45. In short: Array Filter v2, Array Map and Query Records each conform at seeds 20729, 13 and
20730 and at 10,000 / 10,000 with 0 divergences; mutants killed or declared (Query Records: 2 new declared rows); planted
defects in copies of the runtime nodes caught (Array Filter 5 of 6, the sixth out of the format's reach; Array Map 3 of 3;
Query Records 4 of 4). Package: 18 suites, exit 0, the three stranger rounds green. Whole runtime `test/node-spec/`:
3 suites, 193 passed, exit 0. Both `tsc --noEmit` exit 0.

## What s35 settled

1. **A scenario's NAME is a claim, and nobody had read it against its trace.** Array Filter's "one record, Filtered, First
   Item Id and Count" was a filter-failed on both targets from s15. The filter reads each row's `data`, and the scenario
   handed plain objects. Seven of its eleven scenarios did the same, so equals, regex and the uncompilable pattern were
   graded on one failure. That is also a product defect: a Function's plain array cannot be filtered (C59), nor mapped by
   Array Map (C60). A sweep of all 1,151 scenarios (a failing trace under a name that says nothing of failing) found 17
   candidates and three holes. It takes seconds: **re-run it whenever a batch closes** (NSP-012 §6.5 has the method).
2. **A generated pool must hold what the node can USE.** Array Filter's and Array Map's `items` examples were plain arrays,
   so no generated run ever filtered or mapped. Both now draw registry records from their own pool.
3. **Two frame-end callbacks run in the order first scheduled** (`scheduleAfterInputsHaveUpdated`). Query Records' query and
   reconnect do, and the request group shows it. The format's `subscribeFirst` says so. A spec sets it only when the patch also
   calls a backend: with nothing to order against, its mutant cannot be killed.
4. **A 200-sequence green does not grade a branch the 200 never reach.** Query Records' first deep run had 0 divergences and
   still did NOT conform: three mutant survivors on branches only 10,000 sequences found (a still-connecting subscription
   torn down beside a query). The deep run is where mutants of rare branches first exist. Read its `mutants:` line, not
   only `generated:`.
5. **A swap survivor is often a swap into a twin that differs only in flags already at that value.** Declare exact shapes;
   the reverse direction usually IS killable by a follow-up step that reads the flag (an order it would flip).

## What s36 does

- **A batch: NSP-022 (the 17 cloud-only nodes) or NSP-016 (the 19 visual nodes).** Both need research first. NSP-022 needs a
  second runtime target (`noodl-viewer-cloud`: read what it is and how its nodes run before anything). NSP-016 needs a
  viewer seam for React nodes. **Ask Richard which, in plain words**, if the board does not settle it: *"The next batch is
  either the nodes that only run in cloud functions (17), or the visual nodes like Group, Text and Repeater (19). Which
  first?"*
- **Cheap, on a QUIET box only:** the deep runs s20 listed (clock-driven specs under T9, Pop Component Stack, s11–s14 at
  `NSP_DEEP=10000`); the D24 probe on a `nodegx`-type backend; the name sweep again (it was a throwaway — a gate is better:
  consider making it a package test that lists the candidates and fails on a NEW one).
- **Array Filter's generated reach is low by construction**: the Op candidate is `filterFilterOp-a` while the drawn filter
  fields vary, so 10–18 of 400 sequences pair `in` / `nin` with records (NSP-012 §6.5). The hand scenarios carry it.

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
- Server-Sent Events (s34): C58 (says Connected after a URL change tore the stream down — WebSocket says idle), C56 (Last
  Error / Retry Count / Duplicates Suppressed move unsent), C57 (a non-text Event Types or Method throws).
- **s35, worth asking FIRST — one fix, two nodes: C59 + C60** — *"A Function's list of plain objects wired into Array Filter
  fails as soon as a filter is set, and Array Map fails any script that copies a property. Records work. Make both read a
  plain object's own fields too?"* Then **D29** (Query Records' Realtime Status blank while connecting; C55 now covers Query
  Records too).
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
