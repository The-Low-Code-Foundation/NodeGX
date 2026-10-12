# P107 — next session

**Written 2026-10-12 (s97, Opus).** Read the [README](README.md) §2–§7, then [NSP-022 §6](NSP-022-BATCH-CLOUD-ONLY.md). §6.5 is
the INVOCATION design and its measurements, §6.6 is what s97 built.

**Model: Opus.**

**Richard's priority (s96, still standing):** *"start focussing asap on the remaining node to spec … so the npm package stuff can
be finished, and the backend specs."* Two nodes are left, both NSP-022's. Everything else on this board waits behind them.

**s97 in one paragraph.** HOST grew THE INVOCATION. The world hands a cloud function its request (`{ headers, body }`, at a
moment on the clock). The request stays open until a Response answers it, a refusal settles it, or `settledAt` settles it from
elsewhere. What the function answers is an `answer` trace event: `respond` (`status`, `body`) or `refuse` (`reason`,
`fields?`). `_noodl_cloudservices` is the process's, and the caller lookup travels on NETWORK. On the runtime target a cloud play
now gets the CLOUD user service and a fresh `Model.Scope` per mount, and the real Request/Response nodes are driven as
`CloudRunner.run` drives them. Request and Response conform: 25 and 8 scenarios, every mutant killed, 14 of 14 planted defects
caught. P107-S97-USERSMEHANG fixed: a `/users/me` answer that was not JSON hung the function until its timeout. Ledger **140 of
147**.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | ✅ s95 | s77 … s95 |
| NSP-009 the ratchet | ✅ s64; floor.runtime **140** since s97 | `6a1ed0084`, s65, s85, s87, s96, s97 |
| NSP-010 a change is a version | ✅ s78 | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (all four re-graded s97) | `649e6864d`, s70 … s84 |
| NSP-020 ports without a viewer | 🟡 Left: Router's labels (ADAPTERLABEL); the cloud nodes' ports (below) | s79 … s87 |
| NSP-021 the second editor | 🟡 Left in §3.2: which runtimes (NSP-022). Round trip (§3.3) = P112 OWN-006 | s87 … s93 |
| **NSP-022 the cloud-only nodes** | 🟡 **15 of 17.** Left: Model Request, Aggregate Records | s96, s97 |
| R35 (the settings say when they make no sense) | ✅ Counter (s95); the other nodes owed — AFTER NSP-022 | `0d81cd398` |

## What s98 does (in order)

1. **Model Request** (`noodl-viewer-cloud/src/nodes/cloud/modelrequest.ts`, read in full in s97). Seams: HOST `secrets` (the
   key, by name, synchronous) and NETWORK (`fetch`, an `AbortController` on the world's clock; s97 measured that the world's
   `fetch` honours the signal and rejects with an `AbortError`). The deadline, the backoff (500 ms doubled) and `retry-after`
   are all world clock (`Date.now`, `setTimeout`).
   - **Two defects first** (measured s97, filed, both open, medium). Fix them before the spec, because the spec would otherwise
     pin a paid triple request:
     - P107-S97-MRNULLRETRY: an Anthropic 200 `null` throws in `readMessagesAnswer`, and the `.catch` retries it as a
       transport fault. The request is sent 3 times, each paid, and the Error says "did not reach the provider".
     - P107-S97-MREMPTYANSWER: an Anthropic 200 `{}` is Done with empty Text. The chat path refuses the same thing.
     - The fix for both: a 200 that is not a Messages answer fails ONCE, with its status, never retried, mirroring
       `readChatAnswer`. One small choice is in it: the code is `network` (as the chat path's) or `http_error`. Take the
       chat path's (`network`); a second code for the same fault is how a graph ends up switching on two.
   - The cost channel: `recordCall` → `runContext.recordModelCall`. The runtime target's run context has NO
     `recordModelCall` (s97 grep), so the target observes nothing. Give the target a sink on the handle, the way Log lines are
     kept (`h.logs`), and grade it in a dedicated test beside conformance.test.ts's "the Log line is an effect" test.
   - Read live, at the moment of use: `timeoutMs` in the timeout sentence and `outputSchema` when the answer lands. `model`
     and the body are read at dispatch.
   - Several presses in a frame are one call. A press while a call is out starts its own call, concurrently: key per call.
2. **Aggregate Records** (`data/aggregatenode.js` over `CloudStore`). First measure whether it reaches the contract's adapter
   (BACKEND) or the legacy store, then decide the seam.
3. The census (`node scripts/node-spec/census.js`), once the peer edits in `nodegx-export` (`plan.ts`,
   `coverage-ledger.json`, its tests) have landed. Check `git status` first. s96 and s97 both left it stale, on purpose.
4. Only after NSP-022:
   - **The cloud nodes' ports (NSP-020 AC4).** `nsp-020-ports-parity.test.ts`'s census walks `noodl-runtime` and
     `noodl-viewer-react` only. Request, Response, Create User and Update User are "no view" in the ledger. Add
     `noodl-viewer-cloud/src/nodes` to its ROOTS. Every cloud module with a `setup` then needs a TABLE row or an EXCLUDED
     reason; Request's hook pushes rule-major (every `pm-` before every `ptype-`).
   - R35's other nodes (s95's handoff step 2), the rules column (step 3), the static reading (step 4).
   - The rules column shows only Request's two input rows. Its real behaviour is `world.invoke`, whose `says` nothing reads
     yet (NSP-018 §6 item 1).

**The recipe** (s96's, unchanged; copy it):
- Read the runtime file and its helpers, and MEASURE through the real runner or a probe before a spec line. s97's measurements
  found two defects before any spec existed.
- Write the spec with `:line` citations, register it in `src/nodes/index.ts` and its file in `CLOUD_NODES`.
- Run `NSP_ONLY=<type> npx jest test/node-spec/conformance.test.ts -t conforms` in noodl-runtime.
- Write the scenarios.
- **Print the runtime's traces for the scenarios** (a scratch `play(cloudTarget(), …)` loop). A first-run pass proves nothing
  until the trace shows the events.
- Plant defects with a loop harness: `ts.transpileModule` on a copy, its `require` handing planted siblings. A pool that never
  sends the case is how a plant survives: s97's two origin plants survived until the pool had `x-forwarded-host` and a trailing
  slash.
- Then the ledger floor, `npm run spec-golden`, `npm run catalog:generate`,
  `node packages/noodl-editor/scripts/spec-disagreements.js`, and the stranger hashes
  (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"` in nodegx-node-spec) when a format file moved.

## Traps s97 hit (all caught before the commit)

- **A Python `str.replace` without a count** wrote the four new `answer` fields into the `stack` and `popup` branches of
  `schema/trace.schema.json` as well. The node-spec package suite caught it (`schema.test.ts`). Anchor schema edits on the
  branch's `const`.
- **A spec input's `displayName`** must be absent where the runtime declares none. `params` on Request and Response has none,
  and `catalog-parity.test.ts` reddened.
- **A backgrounded Bash with heredocs and an inner `&`**: it worked this time, but the job ran orphaned. Run a long suite as its
  own background command, with nothing else in it.

## Human decisions

- **Still Richard's:** P107-S89-NIGHTBOOK is the template owner's (P78). 14 deprecated types have no `replacedBy`; ask only if
  a person hits one.
- **Choices s97 made that the phase had not ruled** (say them in one line if he asks):
  - The invocation lives under HOST (need `host`), not a new need: it is the backend process that hands a function its request.
  - The function's answer is the `answer` event of THE CALLERS, with two new ops.
  - P107-S97-USERSMEHANG fixed in `userservice.js`: the hang blocked grading, and it was a production 504.
- **Small decisions filed, not taken:**
  - P107-S97-NULLBODY (low): a `null` body with a contract is a 500. Read a non-object body as `{}`? That changes what a JSON
    string body does.
  - P107-S97-USERIDBOOLEAN (low): User Id is typed boolean. Count the saved wires from it before retyping.

**Open, filed this phase:** P107-S97-MRNULLRETRY, P107-S97-MREMPTYANSWER (medium, s98 step 1); P107-S97-NULLBODY,
P107-S97-USERIDBOOLEAN (low); P107-S95-MINABOVEMAX (Counter fixed; the others wait behind NSP-022), P107-S94-DEVHEAP (medium),
P107-S93-NOTANAME (low), P107-S92-VIDEOEMBEDSEED (low), P107-S89-NIGHTBOOK (medium), P107-S89-CFEXAMPLES (low),
P107-S89-XMLEXAMPLE (low); P107-S86-STOREDWIRE (medium); P107-S85-RESTCOLTYPES (low); P107-S83-SENDFORM;
P107-S79-ADAPTERLABEL (low); P107-S95-SEED20738.

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 (R26). **P109 holds:** D38, the Page Stack, the
Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s97, 2026-10-12, seed 20738)

- **The 15 cloud specs on the cloud target** (`NSP_ONLY=<the 15> … -t conforms`): all CONFORM at 200, every mutant killed.
  The 13 from s96 were re-run because the target now gives a cloud node a model scope and the cloud user service.
- **Planted controls:** Request 9 / 9, Response 5 / 5 (NSP-022 §6.6). The fix's control: the old lookup restored for one run →
  2 of 25 scenarios and 5 of 200 sequences red; restored.
- **node-spec package** (`npx jest -w 2 --testPathIgnorePatterns stranger.test.ts`): 33 suites, 1,947 tests. 3 red on the
  first run, all mine (the schema's stray fields, two `displayName`s), fixed and re-run green (`schema.test.ts`,
  `catalog-parity.test.ts`: 408 / 408).
- **Stranger:** the hashes were rewritten for the four format files (`schema/trace.schema.json`, `src/spec.ts`,
  `src/trace.ts`, `src/world.ts`). Rounds 1–3 CONFORM: Counter 23 / 23 ×2, UUID 2 / 2, Timer 31 / 32 (the one is its recorded
  equivalent, `equivalent-mutants.ts` :527 — s96's "32 / 32" counted it). **Round 4 read at last:** Dropdown on plain DOM
  CONFORMS. Its mutant pass (AC2, 1,105 mutants, 1,082 killed by the interpreter, the rest recorded equivalents) is green and
  takes **2,179 s (36 min)**. The suite took 2,203 s; it passes, but it is the slowest gate in the phase.
- noodl-viewer-cloud: 16 suites, 264 tests. nodegx-backend `service-http`, `email-flows`, `cwf-014-typed-request-bodies`: 67 / 67.
- `spec-ledger --check` holds at 140 (owed 2); `spec-golden --check` 123 specs fresh, version rule held (2 new goldens, none
  moved); `catalog:check` green after `catalog:generate` (the two nodes' rules); spec-disagreements up to date;
  `runtime-target.test.ts` 15 / 15; `typecheck:runtime`, `:node-spec`, `:cloud` 0.
- **Runtime, every spec** (`npx jest -w 2 test/node-spec`): see the commit message for its reading.
- **Not run:** `test:main`, `test:ci`, the editor's jest, the Jasmine suite, the MCP suite (no editor or MCP source changed;
  the catalog gained two nodes' rules).
