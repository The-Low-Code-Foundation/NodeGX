# P107 — next session

**Written 2026-10-11 (s85, Opus).** Read the [README](README.md) §2–§7 (**R19 is the newest ruling**). Then read
[NSP-020 §6.9](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md): what s85 built, measured and was told. Then
[NSP-019 §5.1](NSP-019-RICHARD-READS-IT.md), Richard's drive, which is still owed.

**Model: Opus.** Two jobs, in this order: close the deep run's survivors, then R19 part 2 (the wire check).

**s85 in one paragraph.** L5's builder is built and graded: `portContextFor(project, nodeId)` in
`@nodegx/project-contract` (`port-context.ts`) reads a node's `PortContext` from a saved project. The runtime's own hooks
fired over the same saved projects draw what the spec draws on **every one of 7,812 nodes in 212 projects**
(`noodl-runtime/test/node-spec/nsp-020-port-context.test.ts`; Richard's local projects through `NSP_PORT_PROJECTS`). AC4
is in the ledger: **130 of 147** picker nodes have ports an editor can draw without a viewer. AC3 was put to Richard
twice. The first time he asked for research ("it's a big deal"). With the research he ruled **R19, "check wires and show
ports"**. Part 1 is built: `get_component` returns `drawnPorts`. The one 10,000-sequence run ran: **0 divergences on
every spec**, and a handful of mutants survived (below).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | 🟡 s77: AC1, AC2 and the §2 table built; **AC3 is Richard's drive** | s77 |
| NSP-009 the ratchet | ✅ s64; s65 a `contract` column; **s85 a `ports` column (`floor.ports` 130)** | `6a1ed0084`, s65, s85 |
| NSP-010 a change is a version | ✅ s78 | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d`, s70 … s84 |
| **NSP-020 ports without a viewer** | 🟡 s79 … s84 (L1–L4 ✅); **s85: L5's builder ✅, AC4 ✅, AC3 ruled R19, part 1 ✅. Left: the deep run's survivors, R19 part 2, oracle (c)** | s79 … s85 |
| NSP-021 the second editor | 📋 not started (L5 is in; R19 part 2 first) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

`spec-ledger --check` (s85): exit 0, holding at 125 of 147 on the runtime, 3 contract, 2 export, **130 ports**, 2 exempt,
17 owed (all NSP-022).

## What s86 does (in order)

1. **Close the 10,000 run's survivors.** The run (s85, seed 20737, 22 specs: every spec moved onto the format in
   s82–s84) found **0 divergences anywhere**. The mutants left alive, each on a branch only the deep run reached:
   - **Dropdown (`net.noodl.controls.options` v6), 7:** `person.leave`, `person.lift`, `person.press`, `person.touch`,
     `person.release` and `person.click` ×2, each a swap-branch on an UNMOUNT branch (`set` elementFocused / focused /
     onPage (/ pressed), `emit` willUnmount (+ onBlur)) ↔ the empty branch. A person's act on a control that leaves the
     page in that act, with nothing after it that reads what the unmount wrote. 3 of the act's twins are already declared
     equivalent there ("a control leaving the page that was not pressed…"). Check each against that sentence before writing
     a scenario.
   - **For Each v10, 1:** `world.resume` drop-set on the branch that emits Items Rendered with `refresh:failure`.
   - **Record (DbModel2) v4, 1:** `modelId` drop-set on `{set:[modelId], emit:[changed, fetched]}`: the unticked Id
     handed an object naming the bound record. Only a later Fetch reads the stored Id.
   The other 19 conform outright: Show Popup, Push, the five Record CRUD, Query / Filter / Subscribe, User, Set User
   Properties, Sign Up, Upload File, Sign File URL, States (22 min), Function, Script, Logic Builder. Log:
   s85's scratchpad `deep.txt` (gone with the session; the numbers are here).
   For each one, follow the recipe below, on the interpreter first (`npx jest tests/batch-<x>.test.ts -t "<Type>"` in
   `packages/nodegx-node-spec`: seeds 13 and 20728, mutants on). **The trap s85 met on DbModel2's:** a scenario that
   reaches the survivor's branch also records a new example for that reducer, and a swap-branch mutant on a NEIGHBOURING
   branch then hands back that example. If the example's value is one the neighbour's play already holds, nothing can
   tell the two apart. s85's scenario (bind `r1` ticked; untick; Id `r0`; Id `{id: r1, title: new}`; Fetch) killed the
   `modelId` drop-set, as its trace showed (the Fetch asks for `r1`). It also created `modelId swap-branch
   {set:[], emit:[changed]}` at seed 13, which it did not kill. The scenario was taken out again, not committed. Use
   different record ids in the two scenarios: the neighbour's play must hold a value the swap's example does not. Read
   the scenario's trace with a play script (`playReference(spec, params, steps, world, wired, playContextOfScenario(sc))`)
   before asking the runner.
2. **R19 part 2 — the wire check.** The MCP's validator refuses a wire to a port the node does not have, for
   `DRAWN_PORT_TYPES`, and names the right one. The design read in s85:
   - The check is `rules/nonexistentPort.ts` branch (3) in the EDITOR's `validation/` (shared with the MCP through
     `editor-deps`): today it emits `dynamic-port-skipped` (info) for every runtime-port type.
   - `NormProject` carries neither the project metadata (schema, backends) nor each node's saved ports with plug and type.
     So do not import the spec into the validator. Add a callback to `ValidatorOptions`,
     `drawnPorts?(component, nodeId) → { input: Set<string>; output: Set<string> } | undefined`. Branch (3) consults it:
     found → OK; absent → an ERROR with `nearest` alternatives; `undefined` (not a drawn type) → today's info.
   - The MCP supplies it from the **candidate** project (the files after the write), never the disk: `buildNormProject`
     already takes `replace` / `remove` for this; build the `PortProject` the same way (`portProjectFromStore` over the
     store, with the replaced component's files swapped in). `specPorts.ts` has the drawing.
   - Measure before switching it on: run the check over Richard's 181 local projects (as s85's
     `scratchpad/wires.js` did). s85 counted 176 wires on graded types to ports the live editor would not draw. Read a
     sample of them for false refusals before shipping. Known real one: CMG Drive Looks' featured products wire For Each
     `addToBasket` (the port is `itemOutputSignal-addToBasket`; foreach.tsx :1081-1096).
   - The editor runs the same validator. Whether the EDITOR passes the callback too is a separate step; say so.
3. **Oracle (c)**, which waits on P107-S79-ADAPTERLABEL. With it, Cloud Function's and Navigate's specs must learn to
   draw their project-dependent ports (`in-*` from the called function's request, `pm-*` from the target page's Page
   Inputs). s85 measured that neither draws them: `derived.inputs` returns `{}`. Then they join `DRAWN_PORT_TYPES`.

**The L1 recipe, for any spec that moves later** (s82 + s83 + s84, one step per line):
- grep the runtime node's `registerOutputIfNeeded` callers;
- write `wiredOutputs` from the gated names the HEAD trace mentions;
- move the spec;
- diff the traces by scenario name (NOT `golden --check` alone: a moved input hash also reads "stale");
- run the interpreter with mutants at seeds 13 and 20728, and the runtime at 200 with seed 20737;
- for a seed-only survivor, run HEAD's spec at the same seed first, then add the hand scenario that kills it;
- add the oracle (a) cases and a planted break;
- run both graph suites.

**Human decisions:**
- NSP-019 AC3 and its three choices; C160; C161; C162.
- **P107-S84-USERACL**: should the User family hide `ACL` like the Record family?
- The Frappe note in NSP-010 §4 is owed to Richard **before the first `changes` entry answers `project`**. None does yet.
- **Whether the editor's own validator should check wires with the spec too** (R19 named the agent server). Ask after
  part 2 is measured, with the false-refusal count.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

**New in s85, open:** **P107-S85-RESTCOLTYPES** (low, format): the Record spec types a REST `json` column `*` where the
runtime draws Object, and a select column `*` where it draws an Enum with its choices. The fix is a `BackendField` native
flag plus `enums`, so it is a format task.

**P109 holds:**
- D38, the Page Stack, the Router, LIBRARYDOCS and CHR007SNAPSHOT.
- **P107-S82-STATESVALUEPORT** (states.ts :534-541). When it is fixed, drop `KNOWN_ROWS.States` in the runtime's
  `conformance.test.ts` and the `row` on the States scenario in the same commit.
- **P107-S82-STATESLOADGATE** (states.ts :1248). The two pins on the States row in `nsp-020-module-table.ts` then go stale
  and come out.

**Open, kit `project-contract`:** **P107-S83-SENDFORM**. The fix is a `.send()` signal pattern in `function-ports.ts` and
its byte-identical copy. The Function spec then goes to v3 with a `changes` entry naming the id.

**P112 holds:** P107-SIZE (308.2 KB gzipped against 240). Note for it: the MCP bundle grew 1.70 MB in s85 (R19, ruled
with the number).

## Gates (s85, this tree)

- **the drive** `nsp-020-port-context` 7 / 7 (committed corpus 95 projects + 3 synthetic, every node clean; reach > 0 on
  all six fields; 6 planted builder breaks red — commit `7e25341ea`'s message says 8, which is wrong: 4 were red at
  that commit, the unnamed stack and the interface typing went red only after the pages project and the PROJECT check); with `NSP_PORT_PROJECTS` over Richard's projects, 212 projects /
  7,812 nodes clean.
- `nsp-020-ports-parity` 325 / 325 (incl. `DRAWN_PORT_TYPES` held to `TABLE` both ways).
- `project-contract` `tsc` 0; node-spec `tsc` 0; MCP `tsc` 0.
- `spec-ledger:check` 0; `spec-ledger.test.ts` 14 / 14.
- MCP: `nsp020DrawnPorts` 3 / 3 (red with the `DRAWN_PORT_TYPES` filter removed); `tools` + `toolDisclosure` 41 / 41.
  A scratch build bundles the specs: 11.55 MB (from 9.85).
- **the one 10,000 run** (`NSP_DEEP=10000`, seed 20737, `-w 2`, 70 min, 22 specs): 0 divergences on all 22; 19
  CONFORM; 3 DO NOT on mutants alone (Dropdown 7, For Each 1, Record 1). Step 1 above.

- `typecheck:editor-tests` 0 (the spec registry gained an export).

**Not run:** the whole runtime conformance batch, `test:main`, `test:ci`, the full MCP suite, the editor's
`tests-unit/nsp-020` (no editor file moved), the full node-spec suite.
