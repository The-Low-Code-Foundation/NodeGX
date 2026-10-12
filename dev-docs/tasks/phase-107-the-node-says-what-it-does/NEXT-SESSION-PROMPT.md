# P107 — next session

**Written 2026-10-12 (s96, Opus).** Read the [README](README.md) §2–§7, then [NSP-022 §6](NSP-022-BATCH-CLOUD-ONLY.md) (what s96
built and measured, and §6.4, what is left).

**Model: Opus.**

**Richard's priority (s96, his words):** *"start focussing asap on the remaining node to spec … so the npm package stuff can be
finished, and the backend specs."* The remaining nodes are NSP-022's, the cloud-only ones. Everything else on this board waits
behind them.

**s96 in one paragraph.** The runtime grew a cloud target (`cloudTarget()` in `noodl-runtime/test/helpers/node-spec-target.ts`: a
`NoodlRuntime` of type `cloud` with the cloud package's node files registered; `conformance.test.ts` picks it for a cloud type). The
world grew the KEYED SIGN (HMAC `importKey`/`sign`, RFC 2104 over the package's SHA-2) and HOST, a new seam: the four process
globals nodegx-backend installs for a cloud function (`secrets`, `users`, `roles`, `mail`), each recorded as a `host` trace event
and answered by first-match rules. 13 of the 17 cloud nodes conform on it, all on the first or second run, every mutant killed,
13 of 16 defects planted in copies of the runtime files caught (the 3 that survive are outputs cleared to `undefined`, which the
runtime never sends to a wire, node.ts :858). Ledger **138 of 147**, 4 owed.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | ✅ s95 | s77 … s95 |
| NSP-009 the ratchet | ✅ s64; floor.runtime **138** since s96 | `6a1ed0084`, s65, s85, s87, s96 |
| NSP-010 a change is a version | ✅ s78 | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d`, s70 … s84 |
| NSP-020 ports without a viewer | 🟡 Left: Router's labels (ADAPTERLABEL) | s79 … s87 |
| NSP-021 the second editor | 🟡 Left in §3.2: which runtimes (NSP-022). Round trip (§3.3) = P112 OWN-006 | s87 … s93 |
| **NSP-022 the cloud-only nodes** | 🟡 **s96: 13 of 17** (the cloud target, the keyed sign, HOST). Left: Request, Response, Model Request, Aggregate Records | s96 |
| R35 (the settings say when they make no sense) | ✅ Counter (s95); the other nodes owed — AFTER NSP-022 | `0d81cd398` |

## What s97 does (in order)

1. **Request and Response** (NSP-022 §6.4) — the function's first and last events, so they go together. Read
   `noodl-viewer-cloud/src/index.ts` (`NoodlCloudRuntime.run`: how a request reaches `sendRequest(req)`, how a throw becomes the
   answer, how `_sendResponseCallback` and `_requestIsOpen` are installed and torn down), `cloud/request.ts`, `requestContract.ts`,
   `requestOrigin.ts`, `cloud/response.ts`, and the existing tests (`cwf-014-request-contract`, `def022-request-origin`,
   `response-node`, `sb-018-received-is-the-outcome`). Then design the INBOUND INVOCATION seam in the world (the play is handed a
   request `{ headers, body }` at a time on the clock; what the function answers — Response's callback, or the throw — is a trace
   event) and say the design in NSP-022 before building it. Request's auth goes through the UserService (`fetchCurrentUser`):
   check whether the AUTH seam (world.ts) already plays it on the cloud runtime before adding anything. Both have dynamic ports
   (`pm-<name>`, the contract's `type-`/`required-`/`default-` inputs) — the Create User spec's `PROPERTY_PORTS` and Set Object
   Properties' are the patterns.
2. **Model Request** — NETWORK (`fetch` to the provider) and HOST `secrets` (the key, by name): both seams exist. Two providers
   (Anthropic Messages, OpenAI-compatible), retries with Retry-After, a timeout (`AbortController` on the world's clock — check the
   world's `fetch` honours an abort signal), the cost channel (`recordModelCall` on the run context — measure whether the target
   records it; if not, it is an effect the spec must name or a row). 1,056 lines: read all of it before a spec line.
3. **Aggregate Records** — `data/aggregatenode.js` over `CloudStore`: measure whether it reaches the contract's adapter (BACKEND)
   or the legacy store, before deciding the seam.
4. Then the census (`node scripts/node-spec/census.js`) once the peer edits in `nodegx-export` (`plan.ts`, `coverage-ledger.json`,
   its tests) have landed — s96 did not regenerate it because it would have committed their unlanded state (NSP-022 §6.4).
5. Only after NSP-022: R35's other nodes (s95's handoff step 2), the rules column (step 3), the static reading (step 4).

**The recipe s96 used, per node** (copy it): read the runtime file and its shared helpers; write the spec with `:line` citations;
register it in `src/nodes/index.ts` and its file in `CLOUD_NODES`; run `NSP_ONLY=<type> npx jest test/node-spec/conformance.test.ts
-t conforms` in `packages/noodl-runtime` BEFORE the hand scenarios (the generated sequences find the disagreements); then the
scenarios (`scenarios/<type>.json`, each world a `host` script); then plants in an in-memory copy of the runtime file. **The plant
harness that works** is one test with a loop (compile the copy with `ts.transpileModule`, `new Function(require, module, exports)`,
a dependency planted by handing the copy's `require` a planted `./system-users`); a `test.each` of rows with `stopAtFirst` reported
caught plants as passing (NSP-022 §6.2). Then `spec-ledger.json` (remove `owed`, raise the floor), `node scripts/node-spec/golden.js`,
and the gates below.

## Human decisions

- **Still Richard's:** P107-S89-NIGHTBOOK is the template owner's (P78). 14 deprecated types have no `replacedBy`; ask only if a
  person hits one.
- **A choice s96 made the phase had not ruled:** the cloud nodes are graded on the same interpreted runtime with a `cloud`-typed
  `NoodlRuntime`, not a second adapter (NSP-022 §3 had predicted "a second runtime adapter"). Say it in one line if he asks.
- **From s92–s93, unchanged:** a Drag's Enabled with nothing yet leaves dragging ON (R26); `node-singleton` is a warning (R34).

**Open, filed this phase:** P107-S95-MINABOVEMAX (Counter fixed; the others wait behind NSP-022), P107-S94-DEVHEAP (medium),
P107-S93-NOTANAME (low), P107-S92-VIDEOEMBEDSEED (low), P107-S89-NIGHTBOOK (medium), P107-S89-CFEXAMPLES (low), P107-S89-XMLEXAMPLE
(low); P107-S86-STOREDWIRE (medium); P107-S85-RESTCOLTYPES (low); P107-S83-SENDFORM; P107-S79-ADAPTERLABEL (low);
P107-S95-SEED20738. Nothing new filed in s96: every disagreement found was the spec's draft, corrected from the code.

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 (R26). **P109 holds:** D38, the Page Stack, the
Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s96, 2026-10-12, seed 20738)

- **Runtime, every spec** (`npx jest -w 2 test/node-spec` in packages/noodl-runtime, 1,492 s): all 13 cloud specs CONFORM. Red: 6,
  exactly s95's on this seed (P107-S95-SEED20738: mutant survivors in DbModel2, JavaScriptFunction, Router, Radio Button, Video;
  row C96 no longer firing), plus `runtime-target.test.ts` AC1 (it asserted every spec mounts on the BROWSER target; now browser or
  cloud, and a cloud node never on the browser) → fixed, 15 / 15.
- **Planted controls:** 16 defects planted in in-memory copies of the cloud node files (and of the shared `system-users.ts` /
  `system-roles.ts`), 13 caught; the 3 survivors are outputs cleared to `undefined`, never sent to a wire (node.ts :858) — NSP-022 §6.2.
- **node-spec package** (`npx jest -w 2 --testPathIgnorePatterns stranger.test.ts`): 33 suites, 1,939 tests; 2 red on the first run,
  both the pinned world kinds (`host` sorted into `WORLD_KINDS`, page-model.helper.ts) → green, 42 / 42. `sha2.test.ts`: HMAC against
  Node's `createHmac` and RFC 4231.
- **Stranger** (`NSP_ONLY="Counter,Timer,net.noodl.UUID,net.noodl.controls.options" npx jest tests/stranger.test.ts`): hashes
  rewritten for the four format files s96 changed (`schema/trace.schema.json`, `src/spec.ts`, `src/trace.ts`, `src/world.ts` — the
  diff named exactly those); rounds 1–4 CONFORM; mutants caught: Counter 23 / 23 (rounds 1, 2), Timer 32 / 32, UUID 2 / 2 (round 3).
  Round 4 (Dropdown on plain DOM) CONFORMS, 66 / 66 scenarios, 200 / 200; **its mutant pass (1,105 mutants on the DOM target) was
  still running at 35 minutes against the test's 5-minute budget when s96 committed — NOT READ.** s95 ran only Counter here, so there
  is no recent baseline. s97: run `NSP_ONLY=net.noodl.controls.options npx jest tests/stranger.test.ts` alone and read its time.
- `spec-ledger --check` green (138, owed 4); `golden.js --check` 121 specs fresh, version rule held (13 new goldens, no golden moved);
  `catalog:check` green after `catalog:generate` (the diff: `rules` on the 13 nodes, nothing else); `spec-disagreements.js --check`
  up to date; `typecheck:runtime` 0, `typecheck:node-spec` 0, `typecheck:cloud` 0.
- **`spec-census:check` is STALE and was left so** (NSP-022 §6.4): the census reads peer-edited files in nodegx-export.
- **Not run:** `test:main`, `test:ci`, the editor's jest, the Jasmine suite, the MCP suite (no editor or MCP source changed; the catalog
  gained rules, which the MCP's `get_node_type` may now show for the 13 — not measured).
