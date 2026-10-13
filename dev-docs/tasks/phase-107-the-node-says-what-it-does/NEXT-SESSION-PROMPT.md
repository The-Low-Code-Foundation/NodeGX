# P107 — next session

**Written 2026-10-13 (s102, Opus).** Read the [README](README.md) §2–§7, then
[NSP-020 §6.14](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md) (what s102 built and measured).

**Model: Opus.**

**Richard's priority (s96):** *"start focussing asap on the remaining node to spec … so the npm package stuff can be finished, and
the backend specs."* Every picker node is graded (ledger 142 of 147, 3 contracts, 2 exempt, 0 owed). What is left is ports,
words and the fixes the specs found.

**s102 in one paragraph.** The census was regenerated from HEAD and committed. The peer pile in `nodegx-export` has been
untouched since 2026-10-05 and is still uncommitted, so the census was not built from the working tree. RESTCOLTYPES is
fixed. The format now names the backend's type (`BackendSchema.backendType`) and marks a column the runtime types by the
enhanced mapping (`BackendField.enhanced`, `enums`, plus `ValueOutputDecl.enums`). The Class picker, the Record family and
the User family follow the runtime on a REST backend. The User family was the same bug, found by adding `directus_users`
to the drive: 8 + 4 ports the spec did not draw. JSFILTERVALUES is fixed: Query Records and Aggregate draw a Javascript
filter's variables. R35's first slice is done: Date Add and Date Difference v3 declare their `*/unknown-unit` warning. One
new row: P107-S102-SIGNUPBACKEND, the runtime's. Sign Up reads the Parse `_User` columns whatever the backend.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-000 the census | ✅ regenerated s102 from HEAD (test counts only) | `7d9a55dcd` |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | ✅ s95 | s77 … s95 |
| NSP-009 the ratchet | ✅ s64; floor.runtime **142**, floor.ports **133**, `owed` empty | `6a1ed0084` … s101 |
| NSP-010 a change is a version | ✅ s78 (13 histories now: Date Add v3, Date Difference v3) | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (re-graded s102, `spec.ts` hash refreshed) | `649e6864d`, s70 … s102 |
| **NSP-020 ports without a viewer** | 🟡 **RESTCOLTYPES ✅, JSFILTERVALUES ✅ (s102)**; left: Router's labels (ADAPTERLABEL) | s79 … s102 |
| NSP-021 the second editor | 🟡 Left in §3.2: which runtimes. Round trip (§3.3) = P112 OWN-006 | s87 … s93 |
| NSP-022 the cloud-only nodes | ✅ 17 of 17; Aggregate v2 (R36) | s96 … s100 |
| R35 (the settings say when they make no sense) | 🟡 Counter (s95), Date Add + Date Difference (s102); 7 call sites owed | `0d81cd398`, s102 |

## What s103 does (in order)

1. **R35's other seven call sites** (half 1 of s95's step 2). Each runtime already calls `setDiagnostic`, and no spec declares
   it yet. Declaring one turns on the runtime target's recording for that node, so it is graded as soon as it lands.
   s102's recipe for the date nodes:
   - Copy the sentence function into the spec, with its `:line` citation.
   - Write `diagnostics: { key: { says, message: (i, s) => … } }`.
   - Bump the version, with a `changes` entry whose migration is `none`.
   - Add one scenario that warns and then clears.
   - Run `golden.js --type`, then conformance at 2 seeds.
   - Plant a one-letter mutant in the sentence: it must give divergences.

   The sites, easiest first (sizes not measured yet; read each one first):
   - States: `UNKNOWN_STATE_CODE`, states.ts :723.
   - Group: group.ts :191.
   - Text Input: text-input.ts :300.
   - The controls' helper: controls/utils.ts :410. It serves several controls; count them first.
   - For Each: `repeater/items-not-a-collection`, foreach.tsx :53-71. Its sentence depends on `Model.instanceOf` and
     `describeValue`, so read how the world represents a record first.
   - Icon: `ICON_SOURCE_DIAGNOSTIC`, react-component-node.ts :693.
   - Layout: `dimensions/wired-dimension-becomes-grow`, layout.ts :335. It is shared by every visual node, so it may be a
     format question rather than a per-node one.
2. **R35 half 2: census the contradictions nobody raises.** Slider's Min / Max is the next by name. Each one found is a
   runtime change plus a spec version, as Counter v2 was.
3. **The rules column** (s95's step 3) does not list a node's diagnostics. It reads the generated catalog (`rules.js` →
   `catalog:generate`). That is a regen of a shared file, so check `git status` first.
4. **The static reading** (s95's step 4, not asked yet; offer it). The Problems panel and the agent's checker could evaluate
   a spec's `diagnostics` over saved params with no preview running. Say what it costs and ask.
5. **P107-S95-SEED20738.** s102 saw the same survivors again: Delete Record `afterInputs` ×2 on both seeds, DbModel2
   `modelId` on 20740, Dropdown `person.blur` (stranger round 4). A hand scenario per survivor ends it.
6. **The census:** regenerate it from HEAD, as s102 did (recipe below), or from the working tree once the peer's
   `nodegx-export` pile lands.

**Census from HEAD (s102):** `git archive HEAD packages scripts/node-spec dev-docs/tasks/phase-107-the-node-says-what-it-does |
tar -x -C <scratch>/headtree`, run `node <scratch>/headtree/scripts/node-spec/census.js` (it reads only `fs`, relative to its
own folder), copy `census.json` and `CENSUS.md` back, and commit only those two. `census.js --check` on the working tree then
reads STALE, because of the peer's pile. That is expected and is not a red.

**The recipe for a spec change** (unchanged): measure through a probe first; `:line` citations; `NSP_ONLY=<type> npx jest
test/node-spec/conformance.test.ts` in noodl-runtime with two `NSP_SEED`s; print the runtime's traces; `golden.js --type`,
`--check`, `--diff`; `spec-ledger:check`; `catalog:check`; `spec-disagreements.js --check`. A change to a spec's drawn ports
runs `nsp-020-ports-parity.test.ts` AND `nsp-020-port-context.test.ts`. A change to `spec.ts` re-grades the stranger
rounds (44 min in s102) and then refreshes `stranger-suite-hashes.json`.

## Traps s102 hit

- **`xargs` splits on spaces in a path.** The first reach count read 0 for `cloudservices` across 589 projects because
  "Noodl projects" and "NodeGX test projects" were split. The control (`cloudservices` must be > 0) caught it. Use
  `-print0` / `xargs -0`, or a node script.
- **A `*/` inside a `/** */` docblock closes it.** Writing `*/unknown-unit` in prose broke `date-math.ts` for about 30 s,
  while the stranger suite was running. Write the full keys instead.
- **`json.dumps(indent=2)` reflows a whole scenario file.** Append the new scenario as text to the HEAD version instead
  (+6 lines, not +434).
- **A mutant that does not compile reads `Tests: 0 total`, exit 1.** That is not a kill. Replant it in a form that compiles
  (`|| Math.random() < 2`).
- **noodl-mcp runs on jest, not vitest.** `npx vitest run` reports "beforeEach is not defined" and grades nothing.

## Human decisions

- None open from s102. Still Richard's from before: P107-S89-NIGHTBOOK (P78's); 14 deprecated types have no `replacedBy`.
  P107-S102-SIGNUPBACKEND has one product question inside it: should Sign Up get a Backend picker? The port fix itself
  needs no ruling.

**Open, filed this phase:** P107-S102-SIGNUPBACKEND (low, the runtime's), P107-S101-VERBSPECCED (low, P116's table),
P107-S97-NULLBODY, P107-S97-USERIDBOOLEAN (low); P107-S95-MINABOVEMAX (Counter, Date Add and Date Difference done; 7 owed),
P107-S95-SEED20738, P107-S94-DEVHEAP (medium), P107-S93-NOTANAME (low), P107-S92-VIDEOEMBEDSEED (low), P107-S89-NIGHTBOOK
(medium), P107-S89-CFEXAMPLES (low), P107-S89-XMLEXAMPLE (low); P107-S86-STOREDWIRE (medium); P107-S83-SENDFORM;
P107-S79-ADAPTERLABEL (low). **Fixed s102:** P107-S85-RESTCOLTYPES, P107-S101-JSFILTERVALUES.

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 (R26). **P109 holds:** D38, the Page Stack, the
Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s102, 2026-10-13)

- **Oracle (a) + the saved-project drive** (`nsp-020-ports-parity` + `nsp-020-port-context`): **359 / 359** (2 new cases, the
  Javascript filter). The drive now has `directus_users` and the User family's write nodes; 2 pins (SIGNUPBACKEND).
  Planted mutants: 8 red for RESTCOLTYPES, 5 red for JSFILTERVALUES.
- **Conformance**, seeds 20739 and 20740: all 13 RESTCOLTYPES types, plus Date Add, Date Difference, DbCollection2 and
  Aggregate, ran 200 / 200 with 0 divergences. Reds are only the SEED20738 survivors (Delete Record ×2, DbModel2 `modelId`
  on 20740). Date Add / Date Difference v3: 33 / 33 and 44 / 44 mutants. Control: one letter in the date sentence gives 17
  divergences.
- **Stranger rounds 1–4** (44 min): every node conforms except Dropdown's seed survivor (`person.blur`); hash gate red on
  `spec.ts` only, refreshed, re-run green.
- node-spec package (no stranger) **1,954 / 1,954**; `golden --check` 125 fresh, version rule held, 13 histories;
  `spec-ledger --check` 142 / 133; `catalog:check` up to date; `spec-disagreements --check` up to date.
- Typecheck node-spec / runtime / mcp / project-contract / editor: 0 errors.
- **Editor** `tests-unit/nsp-019` + `nsp-020` + `sb-017`: **548 / 548**. **MCP** nsp020 drawn-ports + wire check: 9 / 9.
- **project-contract** 352 / 353: the 1 is P107-S101-VERBSPECCED (pre-existing).
- **`test:ci`: Jasmine 3,015 specs, 0 failures**, seed 49826, fresh `test-results.json` (finished 15:28:18Z), HEAD `9babd0f0` +
  the working tree (peers' open edits included). Run alone, `.webpack-cache` cleared. The floor of 8 did not appear.
