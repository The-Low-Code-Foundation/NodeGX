# P107 — next session

**Written 2026-10-11 (s82, Fable).** Read the [README](README.md) §2–§7 (R18 is the newest ruling), then
[NSP-020 §3.1 and §6.6](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md) — the design and THE FORMAT DECISION, with its eight
pieces and the two proofs — and [NSP-019 §5.1](NSP-019-RICHARD-READS-IT.md) (Richard's drive, still owed).

**Model: Opus from here.** s82 (Fable) took the L1 + L3 format decision Richard handed to Fable in s81. What is left on
NSP-020 is lanes on a decided format: moving specs onto it, the field fixes L4 printed, and L5.

**s82 in one paragraph.** At play a node has its params and its wires, never the project. `derived.outputs(params,
context)` is ONE pure function with two readers: an editor hands it the project (`schema`, `backends`, `components` …)
and draws the list; a target hands it the play's context (`PlayContext` = `wired` + `wiredOutputs`, nothing else) and
registers the list — at mount, and again only after a write to a `derived.rederive` param (States' `values`, whose setter
registers at run time; every other node's ports are the PLACING's, as NSP-017's contracts pin) — minus the `onWire`
outputs no wire asks for, plus the wired names `discoverOutput` mints. Reducers ask `world.hasOutput(name)` where the runtime asks
`hasOutput`. A scenario names `wiredOutputs` (its s79 `context` field is refused); a generated sequence draws them from
`derived.outputCandidates`. §6.4's gaps 1–4 are settled in the same change (`narrow` reads RAW params; outcome ports
drawn; `ValueOutputDecl.narrow`; `drawnDefault`). DbModel2 and States are on it: 52 hand traces byte-identical to the
goldens before the change, both targets at 200, both L4 rows graded. The padding that came out hid a runtime crash
(P107-S82-STATESVALUEPORT) — the first thing the honest format found.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | 🟡 s77: AC1, AC2 and the §2 table built; **AC3 is Richard's drive** | s77 |
| NSP-009 the ratchet | ✅ s64; s65 a `contract` column | `6a1ed0084`, s65 |
| NSP-010 a change is a version | ✅ s78 | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (hashes refreshed s82 for spec.ts, adapter.ts, dropdown.ts; all four rounds re-graded — the reading is in the s82 commit message) | `649e6864d`, s70 … s82 |
| **NSP-020 ports without a viewer** | 🟡 s79 design; s80 L2 ✅, L4 ✅; **s82: the L1 + L3 FORMAT DECIDED AND BUILT (§6.6), DbModel2 and States on it; left: L1's other 14 specs, L3's other 3 (Function, Script, Logic Builder), oracle (c), L5** | s79, `00be10df0`, `f5fcd704a`, `84198b4bf`, s82 |
| NSP-021 the second editor | 📋 not started (depends on NSP-020 L5) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

`spec-ledger --check` (s82): exit 0 — 125 of 147 on the runtime · 3 contract · 2 export · 2 exempt · 17 owed, all NSP-022.
s82 moved no spec's conformance.

## What s83 does (in order)

1. **L3's other three onto the format — Function (`JavaScriptFunction`), Script (`Javascript2`), Logic Builder.** Each
   has a fixture list (`FUNCTION_FIXTURES`, `SCRIPT_FIXTURES`, `LOGIC_BUILDER_FIXTURES`) that pads `derived.outputs`.
   On the decided format (§6.6, "What the four padded specs' fixtures were"): the saved ports ARE `derived.outputs(params)`
   at the PLACING (piece 5 — the runtime target writes `model.outputPorts` once at mount from `playOutputs`; a `set code`
   mid-play moves no saved port, and NSP-017's contracts pin that); an output the code WRITES is `discoverOutput` (piece 4
   — the interpreter mints it on `world.send` / `sendDerived` of an unknown name); a Function's SIGNAL outputs are `onWire`
   (piece 3, simplejavascript.ts :609); `outputCandidates` names what a generated sequence may wire; `derived.rederive`
   only where a run-time SETTER registers (States' `values`) — none of the three, most likely. Recipe that worked on
   DbModel2 and States: (a) write each hand scenario's `wiredOutputs` from the output names its HEAD golden trace
   mentions (a script; the plan file is `scratchpad/wire-plan.json`'s shape), (b) move the spec, (c) regenerate the
   golden and diff every trace against HEAD's — **byte-identical or explain**, (d) the interpreter batch suite for the
   node at seeds 13 and 20728 (mutants), (e) `NSP_ONLY=<type>` runtime conformance at the day's seed, (f) the node's
   oracle (a) row from `owedBy: 'L3'` to graded with cases — fix the printed field disagreements while there
   (Function: `intype-` / `outtype-` are `enum`, `in-*` `string`, labels and groups). A seed-only mutant survivor is a
   hand scenario, as s82's DbModel2 one (its `because` says how to make the dropped set observable).
2. **L1's other 14 onto the format** — the Record write family (5), DbCollection2, FilterDBModels, SubscribeToChanges,
   User / Set User Properties / Sign Up, Push Component To Stack, Show Popup, For Each. Same recipe. `record-base.ts`
   already has `classPickerPort`, `backendPickerPort`, `recordWiredFieldNames`, `changedSignal`; the User family's
   `USER_FIELDS` is `RECORD_FIELDS`'s twin. Show Popup's announcement reads the popup's Close Popups (showpopup.ts
   :341-416) — `ComponentInterface` cannot carry that; "a new field is a row" (measure first). Sign File URL and Upload
   File spread `backendPickerPort` and drop their two BACKENDPICKER pins in the module table.
3. **L5** (`portContextFor(project, nodeId)` in `@nodegx/project-contract`: `wired`, `wiredOutputs`, `backends` from
   `backendServices`, `schema`, the rest; the cache drive over the templates (§5); AC3 the MCP's per-instance ports —
   `drawnPorts` draws the outcome ports now; AC4 the ledger column from `portsDerivability`). Oracle (c) waits on
   P107-S79-ADAPTERLABEL.
4. ONE 10,000-sequence run on the primary when L1 and L3 have landed.

**Human decisions:** NSP-019 AC3 and its three choices; C160; C161; C162. The Frappe note in NSP-010 §4 is owed to
Richard **before the first `changes` entry answers `project`** — none does yet. NSP-010's and NSP-017's uncommitted
notes (not this phase's sessions') were left out again.
**P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT, and now **P107-S82-STATESVALUEPORT**
(states.ts :534-541 — `hasOutput` before the flag; when fixed, drop `KNOWN_ROWS.States` in the runtime's
`conformance.test.ts` and the `row` on the States scenario in the same commit) and **P107-S82-STATESLOADGATE**
(states.ts :1248 — drop the `states` guard at load; then the two pins on the States row in `nsp-020-module-table.ts`
go stale and come out). **P112 holds:** P107-SIZE (308.2 KB gzipped against 240).

**Checkout hazards seen in s82 (not this phase's to fix):** a peer's temp-index commit (`74a73de91`, P112 s8) left the
REAL index holding its files as staged deletions (`git diff --cached --stat`: 24 files, 1,518 deletions) — a plain
`git commit` from that index reverts P112's slice. s82 committed through its own temporary index and reset only its own
paths. `src/runner/graph.ts` and `node-spec-target.ts` carry a peer's live unstaged edits beside s82's.

## Gates (s82, this tree; the code commit is `27aa07374` on `61694bc27`)

- 52 hand traces byte-identical to HEAD's goldens before any scenario was added (DbModel2 29 / 29, States 23 / 23);
  then one scenario added to each (a mutant-killer; a `row` scenario). Graph scenarios s07 and t11 carry `wiredOutputs`
  on their Record / States nodes; their recordings did not move (`graph.test.ts` green).
- node-spec `tsc --noEmit` 0; `ports` 62 / 62 (9 new, on probe specs: the two readers, `playOutputs`, `onWire`,
  `discoverOutput` on a write, re-derive after a write, raw `narrow`, the refused `context` field, DbModel2 / States
  pinned); `golden, runner, pilot, adapter, catalog-parity, types, schema` green; `batch-records` DbModel2 and
  `batch-time` States at seeds 13 and 20728 — every mutant killed or declared.
- runtime: `NSP_ONLY=DbModel2,States,net.noodl.controls.options` conformance at 200, seed 20737 — all CONFORM; States'
  4 known attributed to STATESVALUEPORT and its `row` scenario known. `nsp-020-ports-parity` 199 / 199 — 23 graded rows,
  120 cases, 17 owed.
- editor `tests-unit/nsp-020` 452 / 452; `typecheck:editor-tests` 0. `spec-golden:check` 0 (108 specs, 9,209 scenarios
  with the two added); `spec-ledger:check` 0; `node scripts/bugs.js check` — 0 problems in the s82 rows (the ledger as a
  whole carries 12 of others').
- Full node-spec suite (every file but the stranger rounds): 33 suites, 1,886 / 1,886, 515 s, exit 0. Runtime suites that
  import the target — `runtime-target`, `graph` (96 / 96), `function-contract`, `script-contract`, `logic-builder-contract`
  — green after the rederive narrowing (the first draft re-derived the target's model after every write and the Logic
  Builder contract's control went red: the kinds are the placing's). Stranger rounds 45 / 45 (+18 deep skipped), 432 s, graded on this tree.
- Not run: the whole runtime batch, `test:main`, `test:ci`, any 10,000 run.
