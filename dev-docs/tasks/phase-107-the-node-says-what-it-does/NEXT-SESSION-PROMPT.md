# P107 — next session

**Written 2026-10-13 (s100, Opus).** Read the [README](README.md) §2–§7 (R36, R37 are new), then
[NSP-020 §6.12](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md) (the measurement for the build below) and
[NSP-022 §6.9](NSP-022-BATCH-CLOUD-ONLY.md) (what s100 built and drove).

**Model: Opus.**

**Richard's priority (s96):** *"start focussing asap on the remaining node to spec … so the npm package stuff can be finished, and
the backend specs."* Every picker node is graded (ledger 142 of 147, 3 contracts, 2 exempt, 0 owed). What is left is ports,
words and the fixes the specs found.

**s100 in one paragraph.** Richard ruled Aggregate Records' five defects (R36: fix the three plain ones; "Empty, like our backend";
"Fail, naming it"). They are built as the spec's v2 (`9f3e69c9e`) and conform: 37/37 scenarios, 3 seeds, 10,000, 99/99 mutants.
To check the editor half, I drove the dev editor and found a bigger defect. **No cloud node's `setup()` runs in the editor
since WF-007**, so a new Aggregate Records or Query Records placed in a cloud function has no Class, Filter or Property and
cannot be set up. The front-end control has all of them (P107-S100-CLOUDSETUPPORTS, high). Richard ruled R37 **"From the node
specs"**. The build is measured, not started (NSP-020 §6.12).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | ✅ s95 | s77 … s95 |
| NSP-009 the ratchet | ✅ s64; floor.runtime **142**, `owed` empty | `6a1ed0084` … s99 |
| NSP-010 a change is a version | ✅ s78 (Aggregate v2 is its 11th history) | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d`, s70 … s84 |
| **NSP-020 ports without a viewer** | 🟡 **R37's build (below)**; Router's labels (ADAPTERLABEL) | s79 … s87, s100 docs |
| NSP-021 the second editor | 🟡 Left in §3.2: which runtimes. Round trip (§3.3) = P112 OWN-006 | s87 … s93 |
| NSP-022 the cloud-only nodes | ✅ 17 of 17; Aggregate v2 (R36) | s96 … s100 |
| R35 (the settings say when they make no sense) | ✅ Counter (s95); the other nodes owed | `0d81cd398` |

## What s101 does (in order)

1. **R37: the editor draws a cloud node's settings from its spec** (P107-S100-CLOUDSETUPPORTS). The order is in NSP-020 §6.12:
   (1) `DrawnPort` carries the presentation fields the panel needs. Measured over the runtime hooks: enum labels 97, edit-only 49,
   connections-only 15, code editor 8, the filter builder's schema / backend / value-port prefix 6 / 2 / 4, order 5. The filter's
   schema comes from the `PortContext` the spec already reads. (2) One editor adapter for nodes in cloud components whose type
   has a spec (29 types draw derived inputs). **Merge into `CloudDynamicPortsAdapter`**: `setDynamicPorts` replaces, so two
   writers on one node erase each other (SB-017). The editor already draws spec ports for the Problems panel
   (`validation/drawnPortLookup.ts`: `drawnPorts` + `portContextReader` over the live model): reuse that path. (3) Drive it on a
   COPY: a new Aggregate and a new Query Records in a cloud function show Class / Filter / Property beside the front-end control.
   s100's drive recipe is in NSP-022 §6.9 (open via `LocalProjectsModel` + the fiber router; nodes via
   `NodeGraphNode.fromJSON` + `addRoot`; select via `NodeGraphContextTmp.nodeGraph.selectNode(findNodeWithId(id))`). Then the
   editor's jest, and `test:ci` alone on the box.
2. **The census** (`node scripts/node-spec/census.js`) once the peer edits in `nodegx-export` have landed. Still 26 files
   uncommitted at s100's close (`plan.ts`, `coverage-ledger.json`, its tests). Check `git status` first.
3. R35's other nodes, the rules column, the static reading (s95's handoff steps 2–4).
4. P107-S95-SEED20738: the full run is red on most days from mutants that survive one seed. s100's seed showed nine survivors
   in eight specs, and they move with the seed. A hand scenario per survivor ends it. Until then a real red hides in it.

**The recipe for a spec change** (unchanged, worked again): measure through a probe first; `:line` citations; `NSP_ONLY=<type> npx
jest test/node-spec/conformance.test.ts -t conforms` in noodl-runtime plus two `NSP_SEED`s; **print the runtime's traces**
(s100 used a throwaway `test/node-spec/zz-*.test.ts` with `play(cloudTarget(), …)` beside `playReference`, deleted after); then
`node scripts/node-spec/golden.js --type <t>`, `golden.js --check`, `--diff` (read it: a scenario NAME can go stale, as "two rows,
nothing sent" did), `spec-ledger:check`, `catalog:check`, `spec-disagreements.js` after the bug files move.

## Traps s100 hit

- **macOS has no `timeout`.** `timeout 200 grep …` printed nothing and exited, which read as "0 projects use the node". The
  known-firing control (cloud Request, 0 too) caught it. Then a scan through `~/Documents` stalled at 0% CPU, most likely on an
  iCloud placeholder. Scan `~/vscode_projects` and `~/NodeGX-QA` only, and watch the CPU time.
- **A module's `updatePorts` is not the editor's.** Fixing it looked like the editor half and ran nowhere: cloud components get
  `cloud-node-library.json` + `cloudDynamicPorts.ts`, never a hook. Old projects LOOK fine because they kept the ports they saved.
  Test with a NEW node, beside a front-end control.
- **Moving a behaviour can strand a branch.** AGGNOPROP's fix made the `throws` branch reachable only by a list that is not text,
  which no example writes. Its drop-set mutant survived until a scenario wrote `aggregates: 5`.
- **A network fault reaches a spec as `{ name, message }`, not text.** The runtime hands `e.message` on.

## Human decisions

- None open from s100. Still Richard's from before: P107-S89-NIGHTBOOK (P78's); 14 deprecated types have no `replacedBy`.

**Open, filed this phase:** P107-S100-CLOUDSETUPPORTS (high, scheduled R37); P107-S97-NULLBODY, P107-S97-USERIDBOOLEAN (low);
P107-S95-MINABOVEMAX (Counter fixed; the others owed), P107-S95-SEED20738, P107-S94-DEVHEAP (medium), P107-S93-NOTANAME (low),
P107-S92-VIDEOEMBEDSEED (low), P107-S89-NIGHTBOOK (medium), P107-S89-CFEXAMPLES (low), P107-S89-XMLEXAMPLE (low);
P107-S86-STOREDWIRE (medium); P107-S85-RESTCOLTYPES (low); P107-S83-SENDFORM; P107-S79-ADAPTERLABEL (low).
**Fixed s100:** P107-S99-AGGFILTERPREFIX, -AGGCOLUMNS, -AGGWORDS, -AGGSTALE, -AGGNOPROP (`9f3e69c9e`).

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 (R26). **P109 holds:** D38, the Page Stack, the
Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s100, 2026-10-13, seed 20739 unless named)

- **Full runtime node-spec suite, before any s100 edit** (`npx jest -w 2 test/node-spec`, ~27 min): 9 failed / 644 passed. 118
  CONFORM, Aggregate v1 included; every red is a seed survivor or C96 (P107-S95-SEED20738, updated). **Not re-run after the
  edits.** The targeted runs below cover what moved.
- **Aggregate Records v2 on the cloud target:** CONFORMS, 37/37, 200/200, 99/99 on 20739, 20740, 20741; 10,000/10,000 (89 s).
- **After the Parse-wire change** (`aggregate`, `count`, `distinct` pass the server's words): the 16 other cloud specs, Query
  Records and Counter CONFORM. JavaScriptFunction's one survivor is the same branch as before the change.
- noodl-viewer-cloud 266/266; runtime `parse-wire-adapter` + `record-backend-routing` 19/19; node-spec package (no stranger)
  1,954/1,954; runtime port / diagnostics / history tests 354/354.
- `golden --check` 125 specs fresh, version rule held; `spec-ledger --check` 142; `catalog:check` up to date; spec-disagreements
  five rows fixed; typecheck runtime / node-spec / cloud 0; `bugs.js check` 0 problems in s100's files.
- **Not run:** stranger rounds (no format file moved: only `nodes/aggregate-records.ts`), `test:main`, `test:ci`, the editor's
  jest (no editor source changed), the MCP suite.
