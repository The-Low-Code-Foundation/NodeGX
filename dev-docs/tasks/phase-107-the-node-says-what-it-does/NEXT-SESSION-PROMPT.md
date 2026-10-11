# P107 — next session

**Written 2026-10-11 (s87, Opus).** Read the [README](README.md) §2–§7 (**R20 is the newest ruling**). Then
[NSP-021 §6.1](NSP-021-THE-SECOND-EDITOR.md) (what s87 built and measured) and the census's new
[§5 "the source after"](NSP-021-EDITOR-KNOWLEDGE-CENSUS.md).

**Model: Opus.**

**s87 in one paragraph.** NSP-021 started. The census got AC1's table: every row's spec field, what the MCP reads now,
and what is left (owed, or editor-only with the reason). The two questions the agent server still answered from an
editor adapter now come from the spec: **Navigate** (`ab494b0c2`) and **Cloud Function** (`a8faa0995`; its
`RESULT_FIELDS` padding went the L1 way, `onWire` + `discoverOutput` + `hasOutput`, 19 / 19 traces byte-identical).
**Oracle (c)** is built (`noodl-editor/tests-unit/nsp-020/adapter-ports.test.ts`): the real adapters over a fake project
model made from each saved project. Over Richard's 201 projects: 621 nodes, 0 different. Five planted breaks, each red.
Ports went 130 → 132 of 147. **R20 ruled "Error, as the agent does"** and was built the same session (`2a05e8833`): the
Problems panel refuses a wire to a port the node cannot have. One body, `validation/drawnPortLookup.ts`, serves both
doors.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | 🟡 s77: AC1, AC2 and the §2 table built; **AC3 is Richard's drive** | s77 |
| NSP-009 the ratchet | ✅ s64; s65 `contract`; s85 `ports` (`floor.ports` **132** since s87) | `6a1ed0084`, s65, s85, s87 |
| NSP-010 a change is a version | ✅ s78 | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d`, s70 … s84 |
| NSP-020 ports without a viewer | 🟡 L1–L5 ✅, AC4 ✅, R19 ✅, **oracle (c) ✅ (s87)**, **R20 ✅ (s87)**. Left: Router's labels (ADAPTERLABEL) | s79 … s87 |
| **NSP-021 the second editor** | 🟡 **s87: AC1 ✅, §3.2 begun** (Navigate, Cloud Function). Round trip (§3.3) = P112 OWN-006 | `ab494b0c2`, `a8faa0995`, `ec116ed5a`, `2a05e8833` |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

`spec-ledger --check` (s87): exit 0 — 125 / 147 on the runtime, 3 contract, 2 export, **132 ports**, 2 exempt, 17 owed (all
NSP-022).

## What s88 does (in order)

1. **The R20 drive in the running editor** (s87 could not: a peer's editor held port 9222 — check `lsof -nP
   -iTCP:9222 -sTCP:LISTEN` and the peer list first, and never run a second stack). Open a COPY of `NodeGX test
   projects/CMG Drive Looks B` with the `run-editor` skill. Read `ProjectValidationService.instance.report` in the renderer,
   and look at the Problems panel: the For Each `addToBasket` wire should be an error naming `itemOutputSignal-addToBasket`.
   Count the errors whose message ends "with its settings in this project." against s86's per-project reading. A
   screenshot of the panel is the evidence. Opening a project writes three files into it (memory), so use the copy.
2. **NSP-021's own fields, `typecasts` first.** The census §5 says the MCP's `CatalogIndex.isTypeCompatible` already
   DIFFERS from the editor's table (a signal on either side is allowed), so this is the first place two editors disagree
   today. Measure first: count the wires in Richard's projects where the two answers differ
   ([[count-the-reach-first]]). Only then design where `typecasts` lives (a spec-package table, graded against
   `nodelibraryexport.ts :222-298`).
3. Then `allowAsChild` / visual-ness (the catalog mirrors the rule by hand three times, census §2).
4. **Router** (P107-S79-ADAPTERLABEL) only if a reason appears. It costs 1 ledger row and 0 wires.

**The L1 recipe, for any spec that moves later** (s82 + s83 + s84 + s87, one step per line):
- grep the runtime node's `registerOutputIfNeeded` callers;
- write `wiredOutputs` from the gated names the HEAD trace mentions (s87: a script reading `golden/<type>.json`; keep
  the file's indent and trailing newline — round-trip the HEAD text first);
- move the spec (`onWire` on the derived output, `discoverOutput`, the send asks `world.hasOutput`);
- diff the traces by scenario name (NOT `golden --check` alone: a moved input hash also reads "stale");
- run the interpreter with mutants at seeds 13 and 20728, and the runtime at 200 with seed 20737;
- for a seed-only survivor, run HEAD's spec at the same seed first, then add the hand scenario that kills it;
- add the oracle cases and a planted break;
- run both graph suites.

**Oracle (c) recipe (s87):** a jest test in `noodl-editor/tests-unit/nsp-020/` can run a REAL editor adapter by mocking
`@noodl-models/projectmodel` (`getNodesWithType`, `getComponentWithName`), `@noodl-models/warningsmodel` and
`@noodl-models/nodegraphmodel` (CloudFunctionAdapter also needs `@noodl-models/componentmodel`). Copy the node's params
BEFORE running the adapter, because RouterNavigateAdapter writes `router` into them.

**The survivor recipe (s86):** reproduce on the INTERPRETER at the deep run's own seed. Find the generated sequences
that reach the branch with `discoverBranches(spec).spec` and its `hits`. A sequence that ENDS at the branch is the hole,
so the killing scenario puts a READER after it.

**Human decisions:**
- NSP-019 AC3 and its three choices; C160; C161; C162.
- **P107-S84-USERACL**: should the User family hide `ACL` like the Record family?
- The Frappe note in NSP-010 §4 is owed to Richard **before the first `changes` entry answers `project`**. None does yet.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

**Open, filed this phase:** P107-S86-STOREDWIRE (medium); P107-S85-RESTCOLTYPES (low); P107-S83-SENDFORM;
P107-S79-ADAPTERLABEL (low; s87 note: it no longer blocks oracle (c)).

**P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT (drop
`KNOWN_ROWS.States` and the States scenario's `row` in the same commit) and P107-S82-STATESLOADGATE (two pins in
`nsp-020-module-table.ts`). **P112 holds:** P107-SIZE.

## Gates (s87, this tree)

- oracle (c) 10 / 10, on the committed corpus and on Richard's 201 projects (`NSP_PORT_PROJECTS="…/NodeGX test
  projects:…/Noodl projects"`): 621 nodes, 0 different, 14 pinned.
- R20: `tests-unit/nsp-020/problems-panel-wire-check` 3 / 3 (planted red); editor `tests-unit/nsp-020` 469 / 469.
- runtime `nsp-020-ports-parity` 325 / 325; node-spec `ports` + `spec-ledger` 76 / 76; batch-navigation (Navigate) and
  batch-records (Cloud Function) on the interpreter with mutants at seeds 13 and 20728; runtime conformance at 20737
  (Navigate, Page Inputs, Cloud Function); both graph suites; `spec-golden:check` 0; `spec-ledger:check` 0.
- MCP `nsp020DrawnPorts` + `nsp020WireCheck` + `isl042CloudFunctionPorts` + `def011ScriptPortsDrive` + `toolDisclosure`
  32 / 32 (surface 8,279 / 8,280, unchanged).
- `tsc`: node-spec 0, editor 0, `typecheck:editor-tests` 0. MCP has 3 errors, all in `tests/tpl010Template.test.ts`, a
  peer's uncommitted edit.

**Not run:** the whole MCP suite, `test:main`, `test:ci`, the full node-spec jest suite, and the R20 drive in the running
editor.
