# P107 — next session

**Written 2026-10-11 (s80, Opus).** Read the [README](README.md) §2–§7 (R18 is the newest ruling), then
[NSP-020 §3.1, §6.1–§6.4](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md) — the design, the lanes, and what s80 did to them —
and [NSP-019 §5.1](NSP-019-RICHARD-READS-IT.md) (Richard's drive, still owed).

**Model.** s81 starts with a FORMAT decision (L1, §6.3). s79's split was Fable for the format, Opus for the lanes; L1
turned out not to be a lane. Say so at the start and offer Fable for step 1; L3 (step 2) is Opus work either way.

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
| NSP-006 the stranger | ✅ rounds 1–4 (hashes refreshed s80 — s79 had left three stale) | `649e6864d`, s70 … s80 |
| **NSP-020 ports without a viewer** | 🟡 s79 design + format; **s80: L2 ✅, L4 ✅, L1 measured (premise wrong, proposal §6.3), L3 and L5 not started** | s79, `00be10df0`, `f5fcd704a`, `84198b4bf` |
| NSP-021 the second editor | 📋 not started (depends on NSP-020) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

`spec-ledger --check` (s80, before the lanes): exit 0 — 125 of 147 on the runtime · 3 contract · 2 export · 2 exempt ·
17 owed, all NSP-022. s80 moved no spec's conformance.

## What s80 did (all committed and measured)

- **L2 ✅** (`00be10df0`): `when` on all 448 conditioned ports (439 sites, 21 files), generated from the catalog's
  conditions. Oracle (b) now falls back to the CATALOG's defaults (a drifted spec default is red, planted) and grades the
  nine `#js` conditions. `WHEN_FLOOR = 448`. Browser entry +6.2 KB gzipped (noted on P107-SIZE, P112's).
- **L4 ✅** (lane agent in a worktree, merged `84198b4bf`): oracle (a) over all **70** runtime hooks (the handoff said
  ~50). Census-checked; 21 graded (106 cases), 15 owed to L1, 4 to L3, 30 excluded with a reason. Spec fixes: Or /
  String Mapper / Color Blend count wires; Expression, Close Popup, Pop Component Stack, Navigate To Path labels and
  groups; Array Filter's value type; `narrow` on Dropdown `value` and Text Input `startValue`. Rows HTTPANNOUNCE,
  BACKENDPICKER. Five format gaps pinned (§6.4): no outcome ports in `drawnPorts`, no output `narrow`, `narrow` can't
  tell set-to-default from unset, no editor-only default, `dataAttributes` ungraded.
- **L1 measured, NOT built** (§6.3): the fixture constants (`RECORD_FIELDS`, `USER_FIELDS`, Show Popup's
  `RESULTS`/`ACTIONS`) are **the play's wires, not the project**. The runtime announces schema ∪ wires to the editor, but
  at play a `prop-`/`changed-`/`closeResult-` port exists only when a wire registered it, and every send is gated on
  `hasOutput` (cited lines in §6.3). A five-piece format proposal is written there.
- **P107-S80-DEADTARGET (high, fixed in `f5fcd704a`)**: the runtime target had not COMPILED since s79 (`9a786e0b2`) —
  every runtime conformance / graph / target suite "failed to run" with `Tests: 0`. The target now takes the scenario's
  `context` and folds `wired` the way the interpreter does.
- The first full runtime batch since s79 then showed **3 mutant survivors that only the rotated seed exposed** (pre-s79
  too, measured on a control worktree): closed with hand scenarios (a remount grid on Checkbox and Radio Button; two
  quiet frames after Close Popup's closes). A fourth, Radio Button's pick swap, is **P107-S80-PICKSWAP** (open; fails on
  20733 and 20738, green on 9 of 11 seeds incl. today's 20736).

**Where the s79 handoff was wrong:** the stranger hashes were stale at its HEAD (spec.ts, adapter.ts, and.ts); the runtime
target did not compile; "~50 setup callers" was 70; L1's "each fixture constant becomes `context`" contradicts the
runtime; Event Receiver and Cloud Function have no spec under the runtime's type names; Page Inputs reads only its own
params (graded, not owed).

## What s81 does

1. **Decide L1's format** (§6.3; offer Fable): `PortContext.wiredOutputs`, `derived.discoverOutput`, "at play: params and
   wires, never the project", `WorldView.hasOutput`, a spec-level default for a generated sequence's wires. Read §6.4's
   five format gaps and P107-S80-BACKENDPICKER first — decide them in the same change rather than in five. Then prove it on
   DbModel2: traces byte-identical (`spec-golden:check`), conformance at 200 on both targets, the needs gate, and its L4
   row turning from `owedBy: 'L1'` to graded. `spec.ts` is a FORMAT file: refresh hashes and re-grade every round in the
   same commit.
2. **L3** (independent of step 1): States, Function, Script, Logic Builder — `derived.outputs` pure (no fixture padding);
   the interpreter AND the runtime target re-derive and register after each param write (decision 4). Gate:
   `spec-golden:check` beside it (a moved trace is a row), conformance on the four, their L4 rows turned to graded. L4
   printed their field disagreements (Function's `intype-`/`outtype-` should be `enum`, `in-*` `string`, labels).
3. Then the rest of L1's 15 rows on the decided format, then **L5** (`portContextFor` in `@nodegx/project-contract`, the
   cache drive, AC3, AC4). Oracle (c) waits on P107-S79-ADAPTERLABEL.
4. ONE 10,000-sequence run on the primary when L1 and L3 have landed.

**Human decisions:** NSP-019 AC3 and its three choices; C160; C161; C162. The Frappe note in NSP-010 §4 is owed to
Richard **before the first `changes` entry answers `project`** — none does yet. NSP-010's and NSP-017's uncommitted
notes (not this phase's sessions') were left out of s80's commits again.
**P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT. **P112 holds:** P107-SIZE (now 308.2 KB
gzipped against 240).

## Gates (s80, on the merged tree `84198b4bf` unless said)

- `spec-golden:check` 0 (108 specs, 9,207 scenarios) and `spec-ledger:check` 0 (125/147, measured before the lanes).
- node-spec `tsc --noEmit` 0. node-spec jest at L2: `ports, catalog-parity, golden, types, batch-visual, page-model,
  page-model-plants, layout, layout-map, layout-check, rules-reader, schema` 1,341 / 1,341; `stranger.test.ts` all four
  rounds 46 / 46 (+18 deep skipped). After the merge: Dropdown's round (`NSP_ONLY=net.noodl.controls.options`) 12 / 12.
- runtime: the whole batch `conformance + graph + runtime-target` at seed 20736 BEFORE the survivor fixes and the merge
  — graph and runtime-target PASS, conformance 221 passed / 3 failed (the 3 survivors, closed since). After: the 3 specs
  at seeds 20730–20740 (Checkbox, Close Popup 11/11; Radio Button 9/11 = PICKSWAP); after the merge the 12 specs either
  side changed at 20736, 12 / 12. `nsp-020-ports-parity` 183 / 183.
- editor `tests-unit/nsp-020` 452 / 452; `typecheck:editor-tests` 0 (at L2).
- **Not run:** the whole runtime batch on the merged tree (the 12 changed specs were), `test:main`, `test:ci`, any 10,000
  run. `node scripts/bugs.js check`: 0 problems in P107's s80 rows; the ledger as a whole carries others' problems.
