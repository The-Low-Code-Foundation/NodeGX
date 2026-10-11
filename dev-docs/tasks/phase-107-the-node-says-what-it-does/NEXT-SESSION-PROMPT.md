# P107 — next session

**Written 2026-10-11 (s81, Opus; s80's handoff carried forward below with s81's correction).** Read the [README](README.md)
§2–§7 (R18 is the newest ruling), then [NSP-020 §3.1, §6.1–§6.5](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md) — the design,
the lanes, what s80 did, and what s81 measured — and [NSP-019 §5.1](NSP-019-RICHARD-READS-IT.md) (Richard's drive, still owed).

**Model: Fable for step 1 (Richard's choice, s81).** s81 (Opus) found that L3 is NOT independent of L1. Asked whether
Opus should take the format decision, Richard said hand it to Fable. Step 1 is now ONE format decision covering L1 and
L3. The lanes after it are Opus work.

**s81 in one paragraph.** No code changed. L3 was measured before it was built (§6.5). s79's decision 4 ("re-derive
after each param write") describes only States' value outputs. States' `at-`/`reached-` and Function's signals exist
only when WIRED (`nodescope.ts` :150). Function's and Logic Builder's values exist when the CODE WRITES them
(`simplejavascript.ts` :298, `logic-builder.ts` :488, :601). Script's ports are the project's SAVED ports
(`javascript.ts` :433, fed by `editormodeleventshandler.ts` :120/:250). The runtime target's mount registers the padding
"as a wire would" and as "saved `dynamicports`" (`node-spec-target.ts` :1877-1888). So the fixture lists in those four
specs are what `RECORD_FIELDS` is in L1.

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
| **NSP-020 ports without a viewer** | 🟡 s79 design + format; **s80: L2 ✅, L4 ✅, L1 measured (premise wrong, proposal §6.3); s81: L3 measured (premise wrong for 3 of 4 and for half of States, §6.5) — L1+L3 are one format decision; L5 not started** | s79, `00be10df0`, `f5fcd704a`, `84198b4bf` |
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

## What s82 does

1. **Decide the format for L1 AND L3 together** (Fable): §6.3's five pieces (`PortContext.wiredOutputs`,
   `derived.discoverOutput`, "at play: params and wires, never the project", `WorldView.hasOutput`, a spec-level default
   for a generated sequence's wires), plus §6.5's three: an output the node makes by its own WRITE (Function, Logic
   Builder — `discoverOutput` called on a write too?), the node's SAVED ports (Script; Function's signal types — a
   `PortContext` field, or one default shared with §6.3 piece 5), and States' values keeping decision 4. Read §6.4's
   five format gaps and P107-S80-BACKENDPICKER first and settle them in the same change. Prove it on DbModel2 AND
   States: traces byte-identical (`spec-golden:check`), conformance at 200 on both targets, the needs gate, and both L4
   rows turning from `owedBy` to graded. `spec.ts` is a FORMAT file: refresh the stranger hashes and re-grade every
   round in the same commit.
2. **Independent of step 1, small (Opus can take it any time):** L4's printed field disagreements on Function —
   `intype-`/`outtype-` should be `enum`, `in-*` `string`, labels and groups — with `spec-golden:check` and oracle (a)
   beside it.
3. Then the rest of L1's 15 rows and L3's 4 on the decided format, then **L5** (`portContextFor` in
   `@nodegx/project-contract`, the cache drive, AC3, AC4). Oracle (c) waits on P107-S79-ADAPTERLABEL.
4. ONE 10,000-sequence run on the primary when L1 and L3 have landed.

**Human decisions:** NSP-019 AC3 and its three choices; C160; C161; C162. The Frappe note in NSP-010 §4 is owed to
Richard **before the first `changes` entry answers `project`** — none does yet. NSP-010's and NSP-017's uncommitted
notes (not this phase's sessions') were left out of s80's commits again.
**P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT. **P112 holds:** P107-SIZE (now 308.2 KB
gzipped against 240).

## Gates (s80, on the merged tree `84198b4bf` unless said; s81 ran none — it changed no code)

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
