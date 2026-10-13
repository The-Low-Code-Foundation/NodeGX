# P107 — next session

**Written 2026-10-13 (s101, Opus).** Read the [README](README.md) §2–§7, then
[NSP-020 §6.13](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md) (what s101 built, measured and drove).

**Model: Opus.**

**Richard's priority (s96):** *"start focussing asap on the remaining node to spec … so the npm package stuff can be finished, and
the backend specs."* Every picker node is graded (ledger 142 of 147, 3 contracts, 2 exempt, 0 owed). What is left is ports,
words and the fixes the specs found.

**s101 in one paragraph.** R37 is built: the editor draws a cloud node's settings from its spec. Oracle (a) reads
`noodl-viewer-cloud` now (Aggregate, Request and Response graded; 14 empty hooks excluded) and grades what a panel draws: a derived
port's enums and the panel's fields (labels, edit-only, connections-only, code editor, a filter's prefix and whether it is told
its backend), on all 43 rows. The ~15 spec sources that disagreed are fixed. `cloudSpecPorts.ts` + `CloudSpecPortsAdapter` (merged
with SB-017's three) draw 24 cloud types; a SAVED wired port is kept, because one real project would otherwise have lost a wire at
deploy. Driven in the dev editor: a new Aggregate's panel shows Class, Filter, Property and Operation; a new Query Records equals the
front-end control, 13 inputs. P107-S100-CLOUDSETUPPORTS fixed.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | ✅ s95 | s77 … s95 |
| NSP-009 the ratchet | ✅ s64; floor.runtime **142**, floor.ports **133** (s101), `owed` empty | `6a1ed0084` … s101 |
| NSP-010 a change is a version | ✅ s78 (Aggregate v2 is its 11th history) | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (re-graded s101, hashes refreshed) | `649e6864d`, s70 … s101 |
| **NSP-020 ports without a viewer** | 🟡 **R37 ✅ (s101)**; left: Router's labels (ADAPTERLABEL), the REST backend kind (RESTCOLTYPES), the Javascript filter's ports (JSFILTERVALUES) | s79 … s101 |
| NSP-021 the second editor | 🟡 Left in §3.2: which runtimes. Round trip (§3.3) = P112 OWN-006 | s87 … s93 |
| NSP-022 the cloud-only nodes | ✅ 17 of 17; Aggregate v2 (R36) | s96 … s100 |
| R35 (the settings say when they make no sense) | ✅ Counter (s95); the other nodes owed | `0d81cd398` |

## What s102 does (in order)

1. **The census** (`node scripts/node-spec/census.js`), once the peer edits in `nodegx-export` have landed. Still uncommitted at
   s101's close (`plan.ts`, `component.ts`, `cryptoLib.ts`, `emitApp.ts`, `coverage-ledger.json`, ~20 tests). Check `git status`
   first. (Carried from s100.)
2. **P107-S85-RESTCOLTYPES, now with two more lines** (s101). On a REST backend the runtime's Class picker has no `_User` / `_Role`
   and a select column is a dropdown of its choices; the spec prepends the system classes and has no choices. One format fix
   serves all six pinned lines: `PortContext` says which kind of backend a class lives on, plus a column's choices.
   `classPicker` and `recordFieldType` read them. Since R37 the editor draws cloud Record nodes from these specs, so on a REST
   backend a cloud Record node now offers `_User`. Measure first how many of Richard's projects bind a cloud function to a REST
   backend.
3. **P107-S101-JSFILTERVALUES** (low). Draw `storageFilterValue-<name>` from a Javascript filter (`$name`, `Inputs.name`) in Query
   Records and Aggregate, draw-only, graded by a new oracle (a) case. A new node in a cloud function has no variable ports today.
4. R35's other nodes, the rules column, the static reading (s95's handoff steps 2–4).
5. P107-S95-SEED20738: the conformance run is red on most days from mutants that survive one seed. s101 saw the same survivors
   s100 did on 20739 (Dropdown `person.blur`, Delete Record `afterInputs` ×2, JavaScriptFunction `afterInputs`), and on 20740
   Delete Record ×2, DbModel2 `modelId`, JavaScriptFunction. A hand scenario per survivor ends it.

**The recipe for a spec change** (unchanged): measure through a probe first; `:line` citations; `NSP_ONLY=<type> npx jest
test/node-spec/conformance.test.ts` in noodl-runtime with two `NSP_SEED`s; print the runtime's traces; `golden.js --type`,
`--check`, `--diff`; `spec-ledger:check`; `catalog:check`; `spec-disagreements.js`. **New with s101:** a change to a spec's
drawn ports runs `nsp-020-ports-parity.test.ts` AND `nsp-020-port-context.test.ts` (both use `compareWithSpec`). A change to
`spec.ts` or a stranger's spec file re-grades the stranger rounds (40 min) and then refreshes `stranger-suite-hashes.json`.

## Traps s101 hit

- **An editor import can bring the whole runtime with it.** `record-ports.ts` → `resolveBackend.ts`, whose lazy
  `require('../../../noodl-runtime')` webpack follows statically: 223 TS errors on the runtime's CommonJS files, then out of heap,
  while the editor's own `tsc --noEmit` PASSED. Fixed by importing `resolveBackend.pure.ts`. Before an editor module imports
  runtime code, list that file's value imports, `require`s included.
- **A widened comparator turns its sibling suite red.** `compareWithSpec` serves oracle (a) AND the saved-project drive. The table
  went green while the drive found 55 new lines: page labels, `_User` labels, the REST rows.
- **A redraw from the spec can delete a wired port.** 1 of 113 cloud nodes in lepetitpicnic had a wired port its spec does not draw
  (the Javascript filter). Hence `keepWiredSavedPorts`. Measure saved against drawn on a real project before trusting a redraw.
- **`| head -N` on a jest run truncates the readout.** The stranger rounds 3–4 were invisible on the first run. Write to a file.

## Human decisions

- None open from s101. Still Richard's from before: P107-S89-NIGHTBOOK (P78's); 14 deprecated types have no `replacedBy`.

**Open, filed this phase:** P107-S101-JSFILTERVALUES (low), P107-S101-VERBSPECCED (low, P116's table: project-contract's verbs suite
red since NSP-022 specced the 17); P107-S85-RESTCOLTYPES (low, widened s101); P107-S97-NULLBODY, P107-S97-USERIDBOOLEAN (low);
P107-S95-MINABOVEMAX (Counter fixed; the others owed), P107-S95-SEED20738, P107-S94-DEVHEAP (medium), P107-S93-NOTANAME (low),
P107-S92-VIDEOEMBEDSEED (low), P107-S89-NIGHTBOOK (medium), P107-S89-CFEXAMPLES (low), P107-S89-XMLEXAMPLE (low);
P107-S86-STOREDWIRE (medium); P107-S83-SENDFORM; P107-S79-ADAPTERLABEL (low). **Fixed s101:** P107-S100-CLOUDSETUPPORTS.

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 (R26). **P109 holds:** D38, the Page Stack, the
Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s101, 2026-10-13)

- **Oracle (a) + the saved-project drive** (`nsp-020-ports-parity` + `nsp-020-port-context`): 357 / 357; 43 graded rows, 9 format gaps
  pinned; planted mutants red (Aggregate labels, Aggregate outputs, Filter Collection Op, Navigate labels).
- **Editor** `tests-unit/nsp-020` + `sb-017`: 504 / 504 (`cloud-spec-ports.test.ts` 17 / 17). Typecheck `tsc --noEmit` 0; webpack
  dev build 0 errors (after the `.pure` import).
- **Conformance on the 26 touched types**, seed 20739: 23 CONFORM, 3 red, all on s100's pre-edit survivor list. Seed 20740: 23
  CONFORM, 3 red (survivors only). 200 / 200 generated, 0 divergences on every type, both seeds.
- **Stranger rounds 1–4** (40 min): every node conforms except Dropdown's seed survivor (the same `person.blur`, interpreter-only);
  hashes refreshed (`spec.ts`, `dropdown.ts`).
- node-spec package (no stranger) 1,954 / 1,954; `golden --check` 125 fresh, version rule held; `spec-ledger --check` 142 / 133;
  `catalog:check` up to date; typecheck node-spec / runtime / mcp / project-contract 0.
- **MCP** 3,963 / 3,977: 14 red in 10 files. The same 14 with s101's `DRAWN_PORT_TYPES` additions taken out (control), so none is
  s101's (template, export, layout drives; Nightbook's known Function ports).
- **project-contract** 352 / 353: the 1 is P107-S101-VERBSPECCED (pre-existing, filed).
- runtime record-ports / resolveBackend tests: 7 of 8 files green; the 8th was the port-context drive, now green.
- **`test:ci`: Jasmine 3,015 specs, 0 failures**, seed 13173, fresh `test-results.json` (finished 13:46:55Z), HEAD `88151624` +
  the working tree (peers' open edits included). Run alone on the checkout, `.webpack-cache` cleared. The floor of 8 (SUB-006 /
  SUB-011 / NDA-017) did not appear.
