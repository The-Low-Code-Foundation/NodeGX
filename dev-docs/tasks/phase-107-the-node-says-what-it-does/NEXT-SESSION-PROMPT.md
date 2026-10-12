# P107 — next session

**Written 2026-10-12 (s92, Opus).** Read the [README](README.md) §2–§7 (**R26–R32 are the newest rulings; R26–R29 are now
built**). Then [NSP-019 §5.3](NSP-019-RICHARD-READS-IT.md) (Richard's verdict on the panel) and
[NSP-021 §6.4](NSP-021-THE-SECOND-EDITOR.md) (what s90 measured and built).

**Model: Opus.**

**s92 in one paragraph.** The four small runtime rulings from s91 are built, each alone with its regression scenario, a
control that goes red without the fix, and a spec version with its `changes` entry. **R26 / C160** (`a94119947`): a Drag's
Enabled is off on `false`, `0`, empty and the text "false"; nothing yet (`undefined`, `null`) stays on, a choice the ruling
did not name. Drag v4. **R27 / C161** (`b8090d121`): a Video's Restart and Reset seek to the Start Time it was last drawn
with (`media-fragment.ts` `startSeconds`), or 0 when there is none. Video v6 (`elStart`). **R28 / C162** (`dccaa77e0`): the
parsers' cap is "Max Characters", and so is the xml/too-large Error that named it, in the runtime, the spec and the export's
copy. Parse XML v3, Parse Feed v5. **R29 / USERACL** (`1c3166c57`): the User family hides the accounts class's ACL on every
wire. User v5, Set User Properties v3, Sign Up v2. Also: the cloud node library was stale on s88's and s90's changes
(`899220377`), and a new finding was filed: **P107-S92-VIDEOEMBEDSEED**.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | 🟡 s77: AC1, AC2, the §2 table; s91: driven by Richard, "Needs changes" (R30): **a pop-out modal, §5.3. Mockup first** | s77, s91 |
| NSP-009 the ratchet | ✅ s64; s65 `contract`; s85 `ports` (`floor.ports` **132** since s87) | `6a1ed0084`, s65, s85, s87 |
| NSP-010 a change is a version | ✅ s78. s92: 5 more specs carry a `changes` history (10 in all) | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d`, s70 … s84 |
| NSP-020 ports without a viewer | 🟡 L1–L5 ✅, AC4 ✅, R19 ✅, oracle (c) ✅, R20 ✅ and driven (s89). Left: Router's labels (ADAPTERLABEL) | s79 … s87 |
| **NSP-021 the second editor** | 🟡 AC1 ✅ (s87); §3.2: Navigate, Cloud Function (s87), `typecasts` ✅ s88, `allowAsChild` ✅ s89 (R23), kit mirror retired, card title ✅ (R24), deprecation ✅ (R25) s90. Left in §3.2: singleton, units, enum labels, which runtimes (NSP-022). Round trip (§3.3) = P112 OWN-006 | s87 … s90 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |
| R26–R29 (the s91 rulings) | ✅ s92 | `a94119947`, `b8090d121`, `dccaa77e0`, `1c3166c57` |

## What s93 does (in order)

1. **See R24 and R25 where a person and the agent see them** (s91's step 1, still owed). Neither has been driven. (a) The
   agent: rebuild `packages/noodl-mcp` (`dist/` is stale until then; memory: a stale dist hides a merged field), then call
   `get_component` on a COPY of a project with unlabelled Variables (Erleah-2-react19 has `screenWidth`, `viewport`) and
   read `Variable "screenWidth" [id].value` plus `title` on the rows. (b) The editor (run-editor skill, one launch, a copy
   with a REST2: 34 such nodes in the census, find one by grep on `"REST2"`): the Problems panel lists `deprecated-node`
   naming HTTP Request; the canvas card titles are unchanged (R24 moved the editor's rule into the contract package and
   must not move a pixel). Keep a control beside the zero.
2. **Run `deprecated-node` over the projects** (s91's step 2). s90 counted 52 by the export's flag and did not run the
   rule. Count the rule's warnings over the same 357 (both formats) and compare.
3. **The next §3.2 rows** (census §5): `singleton` (the editor's warning cannot fire, §3), units, enum labels. Measure the
   editor's answer against the agent's before designing, as s88–s90 did.
4. **The R30 modal: a mockup to Richard** (NSP-019 §5.3, five points). A wireframe is not the mockup
   ([[a-working-wireframe-is-not-the-mockup]]): show it on a page and ask before building.
5. Cheap alongside, if a session has room: **P107-S92-VIDEOEMBEDSEED**. Video's runtime conformance is red on the
   2026-10-11 and 2026-10-12 seeds: on a YouTube or Vimeo embed, an action's Done is missing from the runtime's trace (3 and
   2 generated sequences). It is identical at v5, so C161 did not cause it. A candidate, not checked: `42699d261` (P109
   ISL-045). The bug file has the recipe. It owes a hand scenario that does not depend on the day's seed.

**The census recipe (s89/s90):** bundle a scratch entry with `require('./scripts/node-catalog/lib/bundle').bundleEntry`
that imports `scripts/node-catalog/dom-shim` by absolute path, registers the browser and cloud runtimes (as
`extractor-entry.js` does) and writes `generateNodeLibrary(...).nodetypes` to JSON. Population: `find vscode_projects
-maxdepth 4` for `nodegx.project.json` / `project.json` (OpenNoodl excluded), the launcher's
`recently_opened_project.json`, the committed `nodegx.project.json` files under `packages/` and `dev-docs/`, by realpath
(357 on 2026-10-12), plus a synthetic control project. Read both formats: v2 `components/**/nodes.json`, legacy
`project.json` graph roots. Kits: `node packages/noodl-mcp/dist/kit-extract.cjs <dir>` is the agent's real extractor.

**How a ruled fix shipped in s92 (the recipe that worked):** runtime + spec reducer + port description in both, `version`
up with one `changes` entry (`row`, `migration: { none: why }`), the regression scenario, `node scripts/node-spec/golden.js
--type <type>`, `catalog:generate` + `catalog:merge` (+ `cloud-library:generate` for a cloud node), then
`NSP_ONLY=<type> npx jest test/node-spec/conformance.test.ts -t <type>` in `packages/noodl-runtime`, and a control: the old
line put back, red on exactly the new scenario. Regenerated files carry every fix's lines: split them per commit with
`partial.py`-style block selection (HEAD + only the blocks matching the fix) through a temporary index. **zsh does not split
`$FILES`**: use an array, `"${FILES[@]}"` (s92 committed a catalog-only commit by this, rebuilt before anything moved).

## Human decisions

- **Still Richard's:** P107-S89-NIGHTBOOK is the template owner's (P78). 14 deprecated types have no `replacedBy`; ask only
  if a person hits one.
- **A choice s92 made that the ruling did not name (R26):** a Drag's Enabled with nothing yet (`undefined`, or `null` from an
  Expression that has not answered) leaves dragging ON, as the default and as Mounted reads an unanswered wire. Say it to
  Richard in one line if the drive or a person hits it; it is in Drag v4's `changes` entry.
- **The R30 modal** needs Richard's look at a mockup before it is built.
- **The Frappe note** (R32): a named list, built when the first `changes` entry answers `project`. None does yet: the five
  s92 entries all answer `none`.

**Open, filed this phase:** P107-S92-VIDEOEMBEDSEED (low, new), P107-S89-NIGHTBOOK (medium), P107-S89-CFEXAMPLES (low),
P107-S89-XMLEXAMPLE (low); P107-S86-STOREDWIRE (medium); P107-S85-RESTCOLTYPES (low); P107-S83-SENDFORM;
P107-S79-ADAPTERLABEL (low). **Fixed s92:** C160, C161, C162, S84-USERACL.

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 still disables dragging only on `=== false`
(R26). Not touched: a peer's open edit sits in that package's `drag.test.ts`.

**P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and
P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s92, 2026-10-12, read on the tree at each fix's commit; seed 20738 unless said)

- **Drag v4** on the runtime: 24 / 24 scenarios, 200 / 200, 167 / 168 mutants (1 declared equivalent). Control (`=== false`)
  red on exactly the C160 scenario. Package `batch-visual` (the interpreter, every visual spec) PASS, 1,144 s; `golden`,
  `catalog-parity`, `rules-reader`, `spec-ledger` PASS.
- **Video v6**: every scenario passes (377 / 1,601, the rest counted as known rows C96–C100), 0 survivors once the six
  declared equivalents named `elStart`. Red on 3 generated divergences = P107-S92-VIDEOEMBEDSEED, **identical at HEAD's
  v5** (a control with the four Video files swapped back), and red at seed 20737 too (2). Control (`currentTime = 0`) red on
  exactly the two C161 scenarios. A first version of the second scenario graded nothing (the frame's reload overwrites the
  seek before the settle) and was rewritten.
- **Parse XML v3 / Parse Feed v5**: 14 / 14 each, 200 / 200, 15 / 16 and 12 / 13 (declared equivalents). Control (HEAD's
  message in `xml.ts`) red on both cap scenarios. Export `the-parsers.test.ts` 25 / 25.
- **User v5, Set User Properties v3, Sign Up v2**: 30 / 30, 13 / 13, 11 / 11; mutants 76 / 76, 25 / 25, 17 / 17.
  `user-ports.test.ts` + `nsp-020-ports-parity` + `nsp-020-port-context` 348 / 348. Control (the spec's ACL filter off) red
  on 5 cases, s84's five.
- `typecheck:viewer`, `:runtime`, `:node-spec` all 0. `catalog:check`, `catalog:merge:check`, `cloud-library:check`,
  `spec-ledger:check` 0; `golden.js --check` 108 specs, 9,228 scenarios, 10 with a history. MCP `nodeDocBudget` 15 / 15
  (the descriptions grew; still inside the s90 ratchet).
- **`spec-census:check` is red on the working tree**, from a peer's open P18 edit (`plan.ts`: translated 121 → 122) and line
  drift. Restored from HEAD, not committed (s30's lesson).
- **Not run:** `stranger.test.ts` (stopped at the background time limit; no guarded file was touched), any drive,
  `test:main`, `test:ci`, the deep run for the five changed specs, the MCP and editor suites beyond `nodeDocBudget` (no test source there names the
  text or ports that moved; grepped for all four).
