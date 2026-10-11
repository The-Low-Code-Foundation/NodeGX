# P107 — next session

**Written 2026-10-11 (s83, Opus).** Read the [README](README.md) §2–§7 (R18 is the newest ruling). Then read
[NSP-020 §6.6 and §6.7](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md): the decided format, and how s83 put the last three
padded specs on it. Then [NSP-019 §5.1](NSP-019-RICHARD-READS-IT.md), Richard's drive, which is still owed.

**Model: Opus.** The format is decided. What is left on NSP-020 is lanes on it: L1's 14 specs, then L5.

**s83 in one paragraph.** L3 is done: Function, Script and Logic Builder are on the format (§6.7), and no spec pads its
ports with fixtures any more. The three keep their saved ports in three different ways:
- **Function:** a signal is sent only when wired, but its callable exists for every saved signal. A value exists when
  wired or once the code writes it.
- **Script:** every saved port is registered at each read. A write never mints a port.
- **Logic Builder:** both kinds are minted by the code's own write or send.

There was one format addition, `discoverOutput(port, as)`: a Logic Builder send to a name its blocks never declared
pulses a value port. The runtime target now saves every drawn output, `onWire` included, and still registers only the
play's list. Every Function and Logic Builder hand trace is byte-identical to HEAD's. Script moved 2 traces, both
explained, and went to v2 as the spec correcting itself (`migration: none`). Found **P107-S83-SENDFORM**: code that only
uses `Outputs.x.send()` gets a value port and throws (P66 FIX-016 had measured it, but it was never ledgered).

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
| NSP-006 the stranger | ✅ rounds 1–4 (the `spec.ts` hash refreshed s83; all four rounds re-graded — see Gates) | `649e6864d`, s70 … s83 |
| **NSP-020 ports without a viewer** | 🟡 s79 design; s80 L2 ✅, L4 ✅; s82 the format (§6.6); **s83 L3 ✅ (§6.7). Left: L1's 14 specs, L5, oracle (c)** | s79 … s83 |
| NSP-021 the second editor | 📋 not started (depends on NSP-020 L5) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

`spec-ledger --check` (s83): exit 0, holding at 125 of 147 on the runtime, 3 contract, 2 export, 2 exempt, 17 owed (all
NSP-022). s83 moved no spec's conformance.

## What s84 does (in order)

1. **L1's 14 onto the format.** The specs are the Record write family (5), DbCollection2, FilterDBModels,
   SubscribeToChanges, User, Set User Properties, Sign Up, Push Component To Stack, Show Popup and For Each. Each is
   `owedBy: 'L1'` in `noodl-runtime/test/node-spec/nsp-020-module-table.ts`, and its printed disagreements are the to-do
   list (`npx jest test/node-spec/nsp-020-ports-parity.test.ts -t '<type>'`).

   **The recipe (s82 + s83):**
   - **(0)** Grep the runtime node's `registerOutputIfNeeded` CALLERS first. A param setter, a wire (`nodescope.ts`
     :150), the node's own write, and the saved ports (`model.outputPorts`, read only by Function and Script) are four
     different pieces.
   - **(a)** Write each hand scenario's `wiredOutputs` from the output names its HEAD golden trace mentions. Only for
     outputs whose sends are gated on `hasOutput`: a value minted by a write needs no wire.
   - **(b)** Move the spec.
   - **(c)** Run `node scripts/node-spec/golden.js --type <T>` and diff every trace against `git show HEAD:…/golden/<T>.json`
     (match scenarios by name, compare traces for equality; a renamed one shows as new). The rule is byte-identical or
     explain. A moved trace at the same version is red in `spec-golden:check` until a `changes` entry says why.
   - **(d)** Interpreter conformance with mutants at seeds 13 and 20728 (`runConformance(spec, interpreterAdapter(…),
     { sequences: 200, seed, mutants: true, equivalent: EQUIVALENT_MUTANTS[type] })` from a scratch `tsx` script).
   - **(e)** `NSP_ONLY=<type>` runtime conformance at 200.
   - **(f)** The oracle (a) row from owed to graded, with cases, plus a planted wrong field to prove the case grades.
   - **(g)** `graph.test.ts` in both packages: a graph scenario whose recording names a gated output needs
     `wiredOutputs` on that node (s83's t14).

   **What is already there:**
   - `record-base.ts` has `classPickerPort`, `backendPickerPort`, `recordWiredFieldNames` and `changedSignal`. The
     User family's `USER_FIELDS` is `RECORD_FIELDS`'s twin.
   - Show Popup's announcement reads the popup's Close Popups (showpopup.ts :341-416). `ComponentInterface` cannot carry
     that, and "a new field is a row": measure first.
   - Sign File URL and Upload File should spread `backendPickerPort` and drop their two BACKENDPICKER pins in the module
     table.
2. **L5.**
   - `portContextFor(project, nodeId)` in `@nodegx/project-contract`: `wired`, `wiredOutputs`, `backends` from
     `backendServices`, `schema`, and the rest.
   - The cache drive over the templates (§5).
   - AC3: the MCP's per-instance ports (`drawnPorts` draws the outcome ports now).
   - AC4: the ledger column from `portsDerivability`.

   Oracle (c) waits on P107-S79-ADAPTERLABEL.
3. ONE 10,000-sequence run on the primary, once L1 has landed.

**Human decisions:** NSP-019 AC3 and its three choices; C160; C161; C162. The Frappe note in NSP-010 §4 is owed to
Richard **before the first `changes` entry answers `project`**. None does yet: Script's v2 answers `none`. NSP-010's and
NSP-017's uncommitted notes (not this phase's sessions') were left out again.

**P109 holds:**
- D38, the Page Stack, the Router, LIBRARYDOCS and CHR007SNAPSHOT.
- **P107-S82-STATESVALUEPORT** (states.ts :534-541 — `hasOutput` before the flag). When it is fixed, drop
  `KNOWN_ROWS.States` in the runtime's `conformance.test.ts` and the `row` on the States scenario in the same commit.
- **P107-S82-STATESLOADGATE** (states.ts :1248 — drop the `states` guard at load). The two pins on the States row in
  `nsp-020-module-table.ts` then go stale and come out.

**Open, kit `project-contract`:** **P107-S83-SENDFORM**. The fix is a `.send()` signal pattern in `function-ports.ts` and
its byte-identical copy. The Function spec then goes to v3 with a `changes` entry naming the id, and its renamed
scenario 23 is the regression.

**P112 holds:** P107-SIZE (308.2 KB gzipped against 240).

## Gates (s83, this tree, on `ae7db7dff`)

- **Traces:** Function 32 / 32 byte-identical (+2 scenarios). Script 15 / 17 (2 moved, explained, v2). Logic Builder
  15 / 15 with no scenario touched. `spec-golden:check` 0 (108 specs, 9,211 scenarios, 2 with a history);
  `spec-ledger:check` 0.
- **Interpreter, seeds 13 and 20728, with mutants:** Function 214, Script 32, Logic Builder 118 — all CONFORM, 0
  survivors, 0 unreached. Three planted breaks are red: Function's `hasOutput` filter removed; Logic Builder's `as`
  ignored; a wrong `group` on Script's oracle row.
- **Runtime:** `NSP_ONLY=JavaScriptFunction,Javascript2,Logic Builder,States,DbModel2` at 200, seed 20737: all CONFORM.
  The three contract suites, `runtime-target` and parity all pass, with parity at 26 graded rows, 137 cases, 14 owed.
  `graph` 96 / 96 after t14's `wiredOutputs`; the node-spec graph 128 / 128.
- **Editor:** `tests-unit/nsp-020` 452 / 452; `typecheck:editor-tests` 0. node-spec `tsc --noEmit` 0.
- **Full node-spec suite (every file but the stranger rounds):** 33 suites, 1,895 / 1,895, 431 s, exit 0.
- **Stranger rounds** (graded on this tree, `spec.ts` hash refreshed): 46 / 46 (+18 deep skipped), 482 s, exit 0.
- **Not run:** the whole runtime batch, `test:main`, `test:ci`, and any 10,000 run.
