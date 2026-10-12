# P107 — next session

**Written 2026-10-12, late (s99, Opus).** Read the [README](README.md) §2–§7, then [NSP-022 §6.8](NSP-022-BATCH-CLOUD-ONLY.md) (what
s99 measured, the seam it chose, the five defects).

**Model: Opus.**

**Richard's priority (s96):** *"start focussing asap on the remaining node to spec … so the npm package stuff can be finished, and
the backend specs."* **Done as of s99: NSP-022 is 17 of 17, and the ledger reads 142 of 147 on the runtime, 3 contracts, 2 exempt,
0 owed.** Every picker node is graded, a contract or exempt. What is left on the board is ports, words and the fixes the specs found.

**s99 in one paragraph.** Aggregate Records takes the LEGACY store (`CloudStore.forScope`), so its call is never a BACKEND operation.
In a cloud function it is the Parse wire's `fetch` to HOST's loopback (`_noodl_cloudservices`), on NETWORK, as Request's caller
lookup is. PROJECT grew the project's classes (`collections`, the `dbCollections` metadata the node reads at run time) and
`dbVersionMajor`. The cloud target now declares the cloud build's `_noodl_cloud_runtime_version`. The spec conforms: 35 scenarios;
200/200 on three seeds and 10,000/10,000; 99/99 mutants; 15 of 15 planted defects caught. Five defects were measured with controls
and filed, none fixed (below).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | ✅ s95 | s77 … s95 |
| NSP-009 the ratchet | ✅ s64; floor.runtime **142** since s99, `owed` empty | `6a1ed0084`, s65, s85, s87, s96–s99 |
| NSP-010 a change is a version | ✅ s78 | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (1–3 re-graded s99; 4 last s97) | `649e6864d`, s70 … s84 |
| NSP-020 ports without a viewer | 🟡 Left: Router's labels (ADAPTERLABEL); the cloud nodes' ports (below) | s79 … s87 |
| NSP-021 the second editor | 🟡 Left in §3.2: which runtimes. Round trip (§3.3) = P112 OWN-006 | s87 … s93 |
| **NSP-022 the cloud-only nodes** | ✅ **17 of 17** (s99) | s96 … s99 |
| R35 (the settings say when they make no sense) | ✅ Counter (s95); the other nodes owed, now unblocked | `0d81cd398` |

## What s100 does (in order)

1. **Ask Richard the rulings below** (one AskUserQuestion, plain words). The two highs are wrong answers in production.
2. **The census** (`node scripts/node-spec/census.js`), once the peer edits in `nodegx-export` have landed (26 files uncommitted at
   s99's close: `plan.ts`, `coverage-ledger.json`, its tests). Check `git status` first. s96–s99 all left it stale on purpose.
3. **The cloud nodes' ports (NSP-020 AC4).** `nsp-020-ports-parity.test.ts`'s census walks `noodl-runtime` and
   `noodl-viewer-react` only. Add `noodl-viewer-cloud/src/nodes` to its ROOTS. Every cloud module with a `setup` then needs a TABLE
   row or an EXCLUDED reason. Aggregate Records joins Request, Response, Create User and Update User as "no view". Its spec draws
   ports from `context.schema`, but the runtime's `updatePorts` draws them only for a Parse-shaped cache. That disagreement *is*
   P107-S99-AGGCOLUMNS. Decide which one the parity test grades before adding a row.
4. R35's other nodes (s95's handoff step 2), the rules column (step 3), the static reading (step 4).
5. The rules column shows only Request's two input rows. Its real behaviour is `world.invoke`, whose `says` nothing reads yet (NSP-018
   §6 item 1). Aggregate's frame-end and response `says` are unread the same way.

**The recipe** (s96's, unchanged; it worked again):
- Read the runtime file and its helpers, and MEASURE through a probe before a spec line. s99's probes found four of the five
  defects before the spec existed. Each was a control pair, so no single reading was taken as proof.
- Write the spec with `:line` citations, register it in `src/nodes/index.ts` and its file in `CLOUD_NODES`.
- `NSP_ONLY=<type> npx jest test/node-spec/conformance.test.ts -t conforms` in noodl-runtime; then `NSP_SEED=` two more seeds.
- **Print the runtime's traces for the scenarios** before trusting a pass.
- Plant defects in copies (never on disk): `ts.transpileModule` + `new Function`. For an adapter method, swap the planted
  prototype method in for one run and restore it in a `finally`. **Use a function replacer** (`src.replace(find, () => rep)`):
  a `$'` in the replacement text (`'$sum'`) is a String.replace pattern and produced a SyntaxError.
- Then the ledger floor, `npm run spec-golden`, `npm run catalog:generate`, `node packages/noodl-editor/scripts/spec-disagreements.js`
  (after filing bugs: it lists them), and the stranger hashes when a format file moved.

## Traps s99 hit

- **My own reducer stored nothing** (`aggregates: () => ({ set: {} })`). The first run showed 42 divergences, and reading one pair
  side by side (`playReference` beside `play(cloudTarget())`) found it in a minute. Do the side-by-side before theorising.
- **A probe's `greaterThan` in the retired visual shape is silently no filter**: that shape's operators are `'greater than'`, and
  an unknown one drops the rule. I nearly filed it as a defect.
- **An absence scenario with no firing control is REFUSED** by the runner ("no Class: nothing happens"). Add the write that makes it
  fire at the end.
- **`regression:` in a bug header must be a bare path.** s97's seven P107-S97 files carry `path (scenario name) pins …` and fail
  `node scripts/bugs.js check` (s99's were fixed; s97's were left, not this session's).
- **A peer's full-suite run can land in the middle of your edits.** The `-w 2 test/node-spec` run that was live at s99's start was
  s98's session's (its task file is in that session's scratchpad). Its result was used as step 1's reading, with the caveat below.

## Human decisions (s99's, for Richard)

- **P107-S99-AGGFILTERPREFIX (high):** pass `valuePortPrefix: 'qp-'` as Query Records does (the run-time half), and draw the `qp-`
  ports from the saved shape too (the editor half)? Projects saved with the retired shape keep working either way.
- **P107-S99-AGGCOLUMNS (high):** read the `columns` cache as `queryutils.schemaFor` already does, in both `getAggregates` and
  `updatePorts`? Not yet driven in the editor: first open a built-in-backend project and confirm no Property port is drawn.
- **P107-S99-AGGSTALE (needs a ruling):** an aggregation with no matching record — send `undefined` on every output, or `0` for a sum
  and `null` for the rest?
- **P107-S99-AGGNOPROP:** skip an aggregate with no Property (as one whose Property is not a column is), or fail naming it?
- **P107-S99-AGGWORDS:** pass the server's words on (HLT-023's fix, for `aggregate`, `count`, `distinct`)?
- Each fix moves a scenario and owes a version bump of the spec (NSP-010), same commit.
- **Choices s99 made that the phase had not ruled:** the seam is NETWORK + HOST, not BACKEND (R9 was ruled for contract-resolved
  stores, and this node never reaches one). The project's classes live under PROJECT.
- Still Richard's from before: P107-S89-NIGHTBOOK (P78's); 14 deprecated types have no `replacedBy`.

**Open, filed this phase:** P107-S99-AGGFILTERPREFIX, P107-S99-AGGCOLUMNS (high); P107-S99-AGGNOPROP, P107-S99-AGGSTALE,
P107-S99-AGGWORDS (medium); P107-S97-NULLBODY, P107-S97-USERIDBOOLEAN (low); P107-S95-MINABOVEMAX (Counter fixed; the others now
unblocked), P107-S94-DEVHEAP (medium), P107-S93-NOTANAME (low), P107-S92-VIDEOEMBEDSEED (low), P107-S89-NIGHTBOOK (medium),
P107-S89-CFEXAMPLES (low), P107-S89-XMLEXAMPLE (low); P107-S86-STOREDWIRE (medium); P107-S85-RESTCOLTYPES (low); P107-S83-SENDFORM;
P107-S79-ADAPTERLABEL (low); P107-S95-SEED20738.

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 (R26). **P109 holds:** D38, the Page Stack, the
Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s99, 2026-10-12, seed 20738 unless named)

- **Aggregate Records on the cloud target:** CONFORMS. 35 / 35 scenarios, 200 / 200, 99 / 99 mutants on seeds 20738, 20739 and
  20740; 10,000 / 10,000 (99 s, 0 divergences). Planted: 15 / 15 caught; unplanted control 35 / 35.
- **The 16 earlier cloud specs**, re-run because the target changed (the cloud constant, the metadata install): all CONFORM, every
  mutant killed. Cost channel 2 / 2.
- **The runtime's whole node-spec suite** (s98's session's own run, 1,595 s, finished 23:39): 6 red, exactly the known set
  (P107-S95-SEED20738: DbModel2, JavaScriptFunction, Router, Video, Radio Button survivors and the known-rows row). Everything else
  conforms, so s98 regressed nothing. **Caveat:** it started at 23:12, before Aggregate's spec existed. My target edits landed
  mid-run; they are additive, and the red set did not move. Aggregate was not in it. **Not re-run after s99's edits**: re-run it
  first in s100 (`npx jest -w 2 test/node-spec` in noodl-runtime, ~27 min, alone on the box).
- runtime `runtime-target`, `nsp-020-ports-parity`, `nsp-020-port-context`, `nsp-019-diagnostics`, `nsp-010-counter-history`:
  354 / 354.
- **node-spec package** (`npx jest -w 2 --testPathIgnorePatterns stranger.test.ts`): 33 suites, 1,954 tests. `spec-ledger.test.ts`
  red until the floor and `owed` moved (2 tests), then green with golden and catalog-parity (411 / 411).
- **Stranger:** hashes rewritten (`src/spec.ts`, `src/world.ts`). Rounds 1–3 and the hash gate: 41 / 41. Round 4 NOT re-run (36 min;
  it plays no PROJECT data, the precedent s98 set).
- `spec-ledger --check` holds at 142 (0 owed). `spec-golden --check` 125 specs fresh, version rule held (one new golden).
  `catalog:check` up to date after `catalog:generate` (Aggregate's one rule). spec-disagreements: five rows, all Aggregate's.
  `typecheck:runtime`, `:node-spec`, `:cloud` 0. `bugs.js check`: s99's five clean.
- **Peer's Counter change** (P112-OWN018-COUNTERZERO, `counter.ts` getter, uncommitted at the time): Counter v2 CONFORMS with it
  (8 / 8, 200 / 200). Told the peer, so no version bump is owed from P107.
- **Not run:** `test:main`, `test:ci`, the editor's jest, the Jasmine suite, the MCP suite, noodl-viewer-cloud's own tests (no runtime
  or cloud source changed. The catalog gained one rule, spec-disagreements five rows).
