# P107 — closed (after s105)

**P107 is CLOSED** — Richard's ruling on the [board](../../BOARD.md), 2026-10-14 (`e170c0b10`), on R38 + R40 landing in s105.
Read [CLOSING.md](CLOSING.md) first: the number it was judged on, and where every leftover went. **There is no s106 of this
phase.** "Continue phase 107" now means: a node's behaviour question is a ledger row with `kit: node-spec`
(`node scripts/bugs.js`), and a spec is touched when a node changes, which the ratchet (NSP-009) enforces in CI. No new NSP
rulings.

This file stays as s105's record: what landed, the traps, and the gates. Read [NSP-019 §5.8](NSP-019-RICHARD-READS-IT.md)
for the build and the drive.

**Model: Opus.**

**Richard's priority (s96):** *"start focussing asap on the remaining node to spec … so the npm package stuff can be finished, and
the backend specs."* Every picker node is graded (ledger 142 of 147, 3 contracts, 2 exempt, 0 owed). What is left is ports,
words and the fixes the specs found.

**s105 in one paragraph.** R38 and R40 are built, in one format edit and one stranger re-grade, as s104 planned. **R38:** a
scenario names how the node's parent stacks it (`parent: 'row' | 'column'`, a column by default, so no earlier trace moved),
the runtime target's holder follows it, and a spec reads it as `WorldView.parent()`. Probed on the runtime first: 9 of the
plan's 11 nodes warn (`dimensions/wired-dimension-becomes-grow`). The Checkbox's and Radio Button's sizes are px / vw / vh
only and never warn. `src/nodes/wired-grow.ts` is the one model the nine share. **R40:** a diagnostic names the inputs its
sentence follows from (`settings: ['limitsMin', 'limitsMax']`, six keys), a gate holds the mark to that, `settingsDiagnostics`
reads them, and the validator's new `settings-diagnostic` rule (a callback, as `drawnPorts`) shows them in the Problems panel
and the MCP's `validate_*`. Over 285 of Richard's projects it raises 0 false alarms; two plants fire. The rules column was
driven in the editor (Counter, Slider, Repeater), and so were the Problems panel's three R40 rows. The Dropdown's
`person.blur` survivor (SEED20738) is pinned.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-000 the census | ✅ regenerated s104 from HEAD (test counts only; s105 added tests and did not regenerate it) | `7450a121e` |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | ✅ s95; R35's sentences s102–s105; the rules column lists warnings (s104), **driven s105** | s77 … s105 |
| NSP-009 the ratchet | ✅ s64; floor.runtime **142**, floor.ports **133**, `owed` empty | `6a1ed0084` … s101 |
| NSP-010 a change is a version | ✅ s78 (25 histories now) | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4, **re-graded s105** (the format changed); AC2 now plays each scenario's `wired` and context | `649e6864d`, s70 … s105 |
| NSP-020 ports without a viewer | 🟡 left: Router's labels (ADAPTERLABEL) | s79 … s102 |
| NSP-021 the second editor | 🟡 Left in §3.2: which runtimes. Round trip (§3.3) = P112 OWN-006 | s87 … s93 |
| NSP-022 the cloud-only nodes | ✅ 17 of 17; Aggregate v2 (R36) | s96 … s100 |
| **R35 (the settings say when they make no sense)** | ✅ **half 1: 9 of 9 sites** (layout = R38, s105). Half 2: the Slider (R39, s104). The wider census was not asked for | `0d81cd398` … s105 |
| **R38 a spec knows which way its parent stacks** | ✅ s105, 9 specs (Group v9, Text v10, Image v6, Video v7, Button v5, Text Input v8, Dropdown v10, Slider v8, Radio Button Group v3) | s105 |
| **R40 warnings read from saved settings** | ✅ s105: 6 keys marked, `settings-diagnostic` in the Problems panel and the MCP | s105 |

## The ledger rows a P107 question lands on now

These were s106's plan before the phase closed; each is a ledger row, picked up wherever the board puts it:

- **P107-S92-VIDEOEMBEDSEED** (low): Video's runtime run is red on most days. An action on a YouTube or Vimeo embed gets Done
  on the interpreter and nothing on the runtime when it is near the trace's end (20739: 2 Restart; 20740: 1 Play; steady).
  The bug's recipe tells "held past the end" from "never sent".
- **P107-S95-SEED20738** (low): Delete Record and DbModel2 have not been re-measured since s102; C96 does not fire. A hand
  scenario per survivor (s104 Slider, s105 Dropdown). The full `npx jest -w 2 test/node-spec` in noodl-runtime was NOT run in
  s105 (only the 13 specs it touched), so the day's full list of reds is unmeasured.
- **NSP-000's census** was last regenerated in s104. s105 added tests, so it is stale on test counts only.

## Traps s105 hit

- **Probe the runtime before trusting a plan's list.** R38's plan said 11 specs, and 2 of them can never say it.
- **A runtime sentence computed in RENDER is a memo.** Spec it as a state key written at the paint, at EVERY paint: off the
  page it writes the sentence it found. Written only on the page, it split each frame-end branch in two, and the twins
  survived as swap mutants (Text Input, s105).
- **A declared equivalent matches a branch's key list as a substring.** A new key that every paint writes broke Video's
  `VIDEO_PAINT` placing row, and its mutant reappeared as a survivor. Search `equivalent-mutants.ts` for rows that spell out a
  key list when you add a state key a paint writes.
- **`catalog:generate` reads every reducer's `says` from source**, following calls into helpers (`scripts/node-spec/rules.js`).
  A template literal throws. `catalog:merge` then merges the OLD catalog without complaint. Check that generate's last line
  is "Wrote …node-catalog.json".
- **A validator rule must not import `@nodegx/node-spec`.** Pass it in as a `ValidatorOptions` callback, from a module
  imported by path (`drawnPortLookup.ts`, `settingsDiagnosticLookup.ts`). The CLIs under scripts/ load the rules index
  without the alias.
- **The stranger AC2 suite dropped each scenario's `wired`**, so a mutant only an editor can see was a survivor. Fixed in
  `tests/stranger.test.ts`, which is not guarded.
- **Driving:** after `nodeGraph.selectNode` through the API, the property panel stayed on the previous node, and *How this
  node works* opened the wrong dialog. Click the node's row in the Layers tree. The toolbar's ⚠ popup is the live preview's
  warnings. The Problems panel (the left rail's ⚠) is the validator.

## Human decisions

- None open from s105; the phase is closed. Still Richard's from before: P107-S89-NIGHTBOOK (P78's); 14 deprecated types have no `replacedBy`.
  P107-S102-SIGNUPBACKEND has a product question inside it: should Sign Up get a Backend picker?

**Open, filed this phase:** P107-S102-SIGNUPBACKEND (low, the runtime's), P107-S101-VERBSPECCED (low, P116's table),
P107-S97-NULLBODY, P107-S97-USERIDBOOLEAN (low); P107-S95-SEED20738 (Delete Record, DbModel2, Video/C96 left),
P107-S94-DEVHEAP (medium), P107-S93-NOTANAME (low), P107-S92-VIDEOEMBEDSEED (low), P107-S89-NIGHTBOOK (medium),
P107-S89-CFEXAMPLES (low), P107-S89-XMLEXAMPLE (low); P107-S86-STOREDWIRE (medium); P107-S83-SENDFORM; P107-S79-ADAPTERLABEL
(low). P107-S95-MINABOVEMAX is `fixed`, and with R38 every site it named is now declared.

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 (R26). **P109 holds:** D38, the Page Stack, the
Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s105, 2026-10-14)

- **Runtime conformance, the 13 specs s105 touched:**
  - Seed 20739: all conform except Video. Button, Text Input, Dropdown (the blur survivor killed), Slider, Text, Group,
    Image and Radio Button Group: every scenario and sequence, and every mutant killed or declared. Video: every mutant
    killed or declared after its placing row was fixed; 2 generated divergences, the VIDEOEMBEDSEED family.
  - Seed 20740: the 9, plus Counter, Date Add, Date Difference and For Each, all conform except Video (1 divergence, the same
    family).
- **Stranger rounds 1–4, re-graded:** 46 / 46 (round 4's Dropdown: 1,122 / 1,126 mutants caught, 4 seen only by an editor),
  hashes refreshed (40 files).
- **node-spec package** (no stranger): **1,975 / 1,975**. `golden --check`: 125 specs, 9,584 scenarios fresh, 25 histories,
  version rule held against HEAD. `spec-ledger --check` 142 / 133. `catalog:check` and `merge.js --check` up to date.
  `spec-disagreements --check` up to date.
- **Runtime:** typecheck 0 errors; graph, nsp-019 diagnostics, nsp-020 port context and parity, runtime-target,
  editor-suite-graph, nsp-010: **483 / 483**.
- **Editor** `tests-unit/nsp-019`, `nsp-020`, `nsp-021`, `sb-017`: **583 / 583** (9 new). **MCP**: typecheck 0;
  nsp018, nsp019 (new), nsp020 ×2: **16 / 16**.
- **R40 over Richard's projects:** 285 projects, 2,228 nodes of the five marked types, 3,876 readings, 113 skipped, 0 warnings;
  two plants fire.
- **`test:ci`: Jasmine 3,015 specs, 0 failures**, seed 39466, exit 0, fresh `test-results.json` (12:50:23 CEST, 2026-10-14),
  HEAD `41b41bc2` plus the working tree (peers' open edits included). Run alone, with `.webpack-cache` cleared.
