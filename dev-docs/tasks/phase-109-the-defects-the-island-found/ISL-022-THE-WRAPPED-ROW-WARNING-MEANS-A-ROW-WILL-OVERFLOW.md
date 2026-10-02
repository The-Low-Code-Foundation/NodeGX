# ISL-022 — The wrapped-row warning means a row will overflow

**Status: 🟢 s4 (2026-10-02): built on the ruling ("Yes, both") — AC2, AC3, AC4, AC5, AC7 met (§8 s4); arm B silent on items a phone holds, arm A silent on a wrapped row of clusters, and a new code `row-cannot-wrap` names `brTabs`. Census 22 → 14 + 7 new, every one read; landing-pages fixed at its source. ⬜ AC6 (Claude Code over the real door) owed. Scoped 2026-10-01 at `27d891bf3`.** **Source:** [AUDIT F29](AUDIT-2026-10-01.md) · P78
[D50](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) (✅ for pills, by GAM-022) · CG-003 AC1 and §7.2 ·
**Side:** product (validator, `uncollapsible-multi-column` and the layout-inert family)

`uncollapsible-multi-column` fires on every build of the garden, four components each time, and the generator pins the list
as expected noise. Three of the four are rows that wrap correctly on a phone. The fourth names the right component and the
wrong row: the garden's top bar really did overflow, 506 px wide in a 390 px viewport, but the overflow was a child row the
rule never looks at, and the advice it gives (become a `Columns`) would not have fixed it.

## 1. The person sentence

**An author whose row of fixed-size swatches, or whose bar of small clusters, wraps on a phone hears nothing; an author
whose row cannot wrap and is wider than a phone is told which row, and why.**

## 2. What was measured

All rows **re-read by me at HEAD `27d891bf3` on 2026-10-01**, from source and by reading the shipped garden's `nodes.json`
with `node`. The validator was not run; which arm fires where is derived from its source and the parameters below.

| reading | where |
|---|---|
| The garden's gate pins the warnings: codes exactly `['uncollapsible-multi-column']`, components exactly `Garden/Top bar`, `Robot/Card`, `Robot/Options`, `apply` (apply_plan's re-validation), with the comment "D50 (filed): a wrapped row of fixed-size items" | `packages/noodl-mcp/tests/cg003Template.test.ts:269-279` |
| CG-003 AC1 recorded ×6 on 2026-09-28 (`Garden/Top bar`, `Pages/Profiles`, `Robot/Options`, `apply`); s3 removed Profiles, IG-005 added `Robot/Card` | `phase-105…/CG-003-THE-PAGES.md:88`; the gate's comments `:274-275` |
| Arm B (a wrapped Group with a `columnGap` and a `For Each`): since GAM-022 it fires only when the item's visual root is **not** `contentSize`/`contentWidth` | `noodl-editor/src/editor/src/validation/responsiveArrangement.ts:188-218`, `:296-326` |
| `Robot/Card#rcColourRow` and `Robot/Options#opColourRow` are wrapped rows with a gap over a `For Each` of `/Robot/Swatch`, whose root `swDot` is `explicit` **44 × 44 px**: arm B fires. Their siblings over `/Robot/Chip`, `/Robot/Ability`, `/Robot/Sticker` (roots `contentSize`) are silent | `templates/bot-garden/components/Robot/{Card,Options,Swatch,Chip,Ability,Sticker}/nodes.json` |
| GAM-022 kept arm B firing on items **given** a width on purpose: Rocket School's `Hangar/Shelf` (132 px tiles) and `Pages/Profiles` (150 px cards) "are the calibration shape, so they keep firing" | `phase-88…/GAM-022-…md`, §8 s12 (lines 100-104) |
| Arm A (a band of tracks): a row Group, not inside a `Columns`, with ≥ 3 visual children each a subtree of ≥ 3 nodes, whose **own** `sizeMode` is not content-width. Component instances count as visual and as one node | `responsiveArrangement.ts:115`, `:122`, `:177-182`, `:327-345` |
| `Garden/Top bar#brBar` ("The bar"): `flexWrap: wrap`, `sizeMode: contentHeight`, five Group children of 3, 6, 3, 3, 3 nodes, **each `contentSize`**: arm A fires, with the wrapped-grid exit ("use a Columns autoFit"). The bar does wrap: CG-003's fix made it two rows at 390 | `templates/bot-garden/components/Garden/Top bar/nodes.json`; CG-003 §7.2 (`:145-155`) |
| The overflow was `brTabs` ("The five screens"), a child of the bar: `flexWrap: wrap`, **`sizeMode: contentSize`**, five `/Garden/Tab` instances. Arm A skips it twice (content-width container; instance tracks of 1 node). Its fix was CSS: under 600 px `.bg-tabs { width: 100% !important` | same file; `cg003Template.test.ts:421-423`; CG-003 §7.2 |
| A `contentSize` node gets no width at all, and every node gets `flexShrink: 0`. **Inferred, not measured:** inside a row parent such a Group is as wide as its unwrapped content, so its `flexWrap` can never take effect | `noodl-viewer-react/src/layout.ts:55-81` |
| The measured bite (CG-003 §7.2, 2026-09-28, not re-run): the page was 506 px wide at 390, mobile Chrome zoomed the whole page out (innerWidth 506), and every drive tap landed ~0.77× off | CG-003 `:145-150` |
| The layout-inert module exists for exactly this shape: "a declared parameter is silently inert, decidable from the graph alone" | `validation/layoutInertCombination.ts:1-8` |

## 3. Where it bites

- **The author of any wrapped row of fixed-size things** (swatches, avatars, colour dots, small tiles) is told to turn it
  into columns of 260-320 px. Obeying breaks it; ignoring it teaches them to ignore the code.
- **The author whose row really overflows** is either told nothing or told about the wrong row. On a phone the browser
  zooms the whole page out, so the overflow does not even look like an overflow: everything is just small.
- **Every template gate** pins this warning by component, so a real new one hides behind a known list.

## 4. Related work and collisions

- **P88 [GAM-022](../phase-88-the-defects-the-games-found/GAM-022-A-WRAPPED-ROW-OF-PILLS-IS-NOT-TOLD-TO-BECOME-COLUMNS.md)**
  (✅): judged the item for arm B; this task changes which sized items it judges. Its decision to keep 132 px and 150 px items
  firing is ruling 1 below. Its AC5 census (16 → 13) is the baseline to re-run.
- **P54 DSG-004** and its calibration (`responsiveArrangement.ts:31-80`): arm A's zero-false-positive claim was measured on
  authored output in 2026-08; the garden's bar is a false positive it did not have.
- **P88 GAM-020** (`text-cannot-wrap`, in `layoutInertCombination.ts`): the nearest precedent for a new inert-combination
  code, and for a threshold ruled by Richard (R18).
- **P77 SBR-004** dropped a `columnGap` to escape arm B; re-check it after ruling 1.
- Gates that pin this code: `cg003Template.test.ts:269-279`, `tpl006Template.test.ts`, `tpl007Template.test.ts`,
  `sb006PublicSite.test.ts` (`grep -l`, this session). Each changes in the same commit as the rule.
- Owner grep: `grep -rlai "uncollapsible-multi-column" dev-docs/tasks --include='*.md'` → P54 NOTES-DSG-004, P77 SBR-004,
  P78 README, NEXT-SESSION-PROMPT and register, P88 GAM-020/021/022, P105 CG-003 and CG-005. **No open owner.**

## 5. Design — 🔒 rulings first

README §4 marks this task "—". It needs one ruling, because it reverses part of a ruled task:

1. 🔒 **What does arm B claim about an item given a pixel width?** (a) As now: any wrapped grid of sized items is told to
   become a `Columns`, because it will not reflow to fill (GAM-022 kept 132 px and 150 px firing). (b) It fires only when
   the item can overflow or freeze a desktop proportion: a **percentage** width, or a pixel width wider than a phone's
   content box (390 px less the row's own padding). A 44 px swatch and a 150 px card wrap and are silent. **Recommendation:
   (b)**, because the message's own sentence is about a grid "frozen at the proportions authored for a desktop", which a
   44 px dot is not, and because a warning a template has to pin is a warning nobody reads.
2. **Not a ruling: arm A judges the tracks, not only the container.** A wrapped row whose tracks are each `contentSize`
   (a cluster each) wraps as clusters and is silent. An unwrapped row of such tracks still fires.
3. **Not a ruling: name the real overflow.** A new code in the layout-inert family, `wrap-on-content-sized-row` (name to
   be settled with the code list): a Group with `flexWrap: wrap` whose own `sizeMode` is `contentSize`/`contentWidth`,
   inside a row parent, has a wrap that can never take effect. Message: the row is as wide as all its children in a line;
   on a phone the page widens and the browser zooms it out. Suggestion: `sizeMode: "contentHeight"` with `width: 100%`.
   This is first measured (AC1), then built: if a `contentSize` Group in a row parent **does** wrap in the runtime, the code
   is not built and §2's inferred row is struck.

Constraints:

- Warnings only, not blocking, as every rule in both modules shipped (`layoutInertCombination.ts:71-78`).
- Unknowable abstains (a wired `sizeMode` or `width`, an instance root, a token width), as everywhere in both modules.
- **No MCP surface cost.** A diagnostic code changes no tool schema; the budget (`SURFACE_TOKEN_BUDGET = 8280`, last
  recorded 8,275) is untouched. The new code needs a `diagnosticExamples.ts` entry like its neighbours.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec runs the validator over the garden's `Garden/Top bar`, `Robot/Card` and `Robot/Options`: `uncollapsible-multi-column` on `brBar`, `rcColourRow`, `opColourRow`, and **nothing on `brTabs`**. A render at 390 × 844 of a minimal row (`contentSize` Group, `flexWrap: wrap`, five 110 px children, in a row parent) reads its width and `document.documentElement.scrollWidth`: the inferred non-wrap is confirmed or struck. **Known-firing control beside it:** the same spec's 32%-wide card grid fires arm B. |
| AC2 | After: the three wrapped rows are silent, `brTabs` gets the new code by node id, and the 32% grid and a 600 px-item grid still fire. |
| AC3 | 🔴 **Reverted arms:** (i) drop the per-track content-size read from arm A, and `brBar` fires again; (ii) remove the new code's row-parent condition, and a `contentSize` wrapped Group in a **column** parent (which can wrap) is falsely flagged. Each reddens exactly its own row. |
| AC4 | **Census, before and after:** firings over `templates/`, `library/prefabs` and GAM-022's calibration projects, recorded by component and node. Every removed firing is named with its item width; every calibration true positive still fires or is named under ruling 1. |
| AC5 | **The pins move in the same change:** the four gates in §4 pin the new lists. Each is run once against the reverted rule and goes red. |
| AC6 | **The person's door, over the real protocol.** Claude Code (stdio server from `dist/noodl-mcp.cjs` under a project-local `--mcp-config`) is asked to build a top bar of five tab buttons on a copy of a test project. If it writes the `brTabs` shape, the write's diagnostics name that row, and its next write fixes it; a render at 390 then reads `scrollWidth` ≤ 390. |
| AC7 | **The generator drops its workaround, byte-identical.** The garden's generator writes nothing raw for this; its workaround is the pinned warning list. The three false alarms leave the pin in `cg003Template.test.ts:269-279`, and it now names exactly the new code on `Garden/Top bar#brTabs` (plus its `apply` re-validation): true, because the graph still says `contentSize` + wrap and only the template's `!important` CSS hides it. `CG-003 AC2`'s byte gate (`:281-294`) still passes, **0 files differ**: the rule changed, the artefact did not. Fixing the graph itself (`contentHeight`, `width: 100%`, the CSS rule deleted) is ISL-025's row, and then the pin is `[]`. |

## 7. Traps

- 🔴 **The warning named the right component and the wrong row.** A fix that silences `brBar` and adds nothing would make
  the garden's list empty and leave the real overflow unnamed. AC2 requires both halves in the same run.
- 🔴 **The overflow hid from the drive.** Mobile Chrome zooms a too-wide page out, so nothing scrolls sideways and the page
  "fits". Read `scrollWidth` and `innerWidth`, never a screenshot alone (CG-003 §7.2).
- ⚠️ Component instances count as one node in arm A (`subtreeSize` does not open them), so a row of five instance tabs is
  invisible to arm A by construction. The new code reads the container, not the tracks, for that reason.
- ⚠️ `apply` in the pinned list is `apply_plan`'s re-validation of the same nodes, not a fifth component. A census that
  counts diagnostics rather than nodes counts each row twice.

## 8. Record

### Session 3 — 2026-10-02, P109 s3: AC1, the validator half

`packages/noodl-mcp/tests/isl022WrappedRow.test.ts` binds the door read-only to a copy of the shipped
`templates/bot-garden` and runs `validate_component` over the three components (3 / 3 green, pinning today's reading):

| component | `uncollapsible-multi-column` fires on | arm |
|---|---|---|
| `Garden/Top bar` | **`brBar`** only — **nothing on `brTabs`** (the row that overflowed the phone) | A (five content-sized tracks) |
| `Robot/Card` | **`rcColourRow`** | B (a wrapped Repeater of 44 px swatches) |
| `Robot/Options` | **`opColourRow`** | B |

§2 derived these from the rule's source without running it; they are now measured, by node id. The absence on `brTabs`
is read in the same run as the known-firing `brBar` beside it.

🔴 **Met on the way:** the editor's `npm run validate:project` reports **0 warnings** over the same template (1,101 nodes,
5,284 endpoints) — its rule set does not run the responsive-arrangement rules the door runs. Not a defect of this task;
a reader who validates a template with the CLI does not see what the door's gate pins.

### Session 3 — AC1, the render half

`isl022-wrapped-row/` in this folder (hand-written, `validate:project` 0 errors after it caught my `"4px"` gaps —
a string value with a unit is dropped silently; the gaps are `var(--space-1)` as on the island): `rowA` is `brTabs`'
shape (`contentSize`, `flexWrap: wrap`, five 110 px items, gap `--space-1`, inside a full-width wrapping row parent);
`rowB` beside it is the control, the same row given the page's width (`contentHeight`, 100 %). Deployed with
`nodegx deploy` (exit 0), rendered at **390 × 844, mobile** by `scripts/devtools/drive-isl022-wrapped-row.js`:

| project setting | `innerWidth` | `scrollWidth` | `rowA` (brTabs' shape) | `rowB` (control) |
|---|---|---|---|---|
| as written (no `bodyScroll`) | 390 | 390 | **566 px, 1 line**, computed `flexShrink: 0` — 4th item cut at the edge, 5th not on screen (screenshot) | 390 px, **2 lines** |
| `bodyScroll: true` (as the island has it; scratch copy) | **566** | **566** | 566 px, 1 line | 390 px, 2 lines |

**§2's inference is confirmed:** a `contentSize` Group is as wide as its unwrapped content, so its `flexWrap` never takes
effect inside a row parent. **And what it does to a person depends on `bodyScroll`:** without it the row is clipped
silently; with it, mobile Chrome zooms the whole page out to the row's width — the island's 506 px page and its
0.77×-off taps (CG-003 §7.2), reproduced here as 566. The warning that would have caught it is the one that is silent
on `brTabs` (the validator half above).

AC2 changes the rule (it reverses GAM-022's choice for items with a pixel width), so it waits on §5's ruling.

### Session 4 — 2026-10-02, P109 s4: AC2–AC5 and AC7, on the ruling ("Yes, both")

**The rule** (`responsiveArrangement.ts`, `layoutInertCombination.ts`, `diagnostics.ts`, `diagnosticExamples.ts`):

- **Arm B** reads the item's width, not only its sizing: `frozen` (a percentage — the unset default is `100%` — or a pixel
  width wider than `PHONE_WIDTH_PX` 390 less the row's own px padding) fires; `fixed-fits` (a pixel width a phone holds)
  is silent; a token or `vw` width abstains. A token padding counts as 0, the quiet direction.
- **Arm A**: a WRAPPED row whose every visual track is content-sized (its own `sizeMode`, or the catalog default) is a row
  of clusters and is silent. A wired track `sizeMode` is not known to be content-sized. (An instance track was going to
  be excluded too; it is a one-node track, which arm A's floor already skips, so the guard and its arm were dead — cut.)
- **New code `row-cannot-wrap`** (layout-inert family): a row Group, `flexWrap` wrap, own `sizeMode`
  `contentSize`/`contentWidth`, whose parent lays out as a row (`parentAxis`: a row Group or a Button). Abstains on: no
  parent in this graph (a component root), a column parent, out of flow (`absolute`/`fixed`), any wired
  `flexDirection`/`flexWrap`/`sizeMode`/`position`/`maxWidth` or wired parent `flexDirection`, an authored `maxWidth`,
  sizing `styleCss` (`max-width`/`width`/`flex…`), and fewer than `MIN_WRAPPING_ITEMS` (= arm A's `MIN_TRACKS`, 3)
  visual children unless one is a `For Each`. 🔴 A `cssClassName` is NOT an abstention (see the census).
  Suggestion `maxWidth: 100%`; cites `layout-wrap-a-row-of-content-width-items`. No MCP schema change.

**Two first versions this session corrected, each by a measurement:**

1. 🔴 **The first `row-cannot-wrap` fired 16 times**, not once: on `brTabs` and on every pair in the bar (`brBrand` logo +
   name, `brWho`, both two-segment switches), and on pairs elsewhere. Rendered on a probe page (a scratch copy whose start
   page places the component, a `cssClassName` stamped on each flagged node): the pairs are **38–118 px** wide at 390.
   True that their wrap is inert, false that they overflow. Hence the floor of three, arm A's own "a pair is a pair".
2. 🔴 **Two of the rows it named DID wrap on the probe page** — planning `abRight` (3 lines) and todo-list `hdNav`
   (2 lines) — which looked like a contradiction of s3's render. It is not: each carries hand-written CSS
   (`.planner-shrink-wrap { max-width: 100% }`; inline `styleCss: "max-width: 100%;"`). With the garden's
   `.bg-tabs { width: 100% !important }` that is **three templates that met this exact shape and patched it in CSS**.
   It also gave a better exit than §5's: the fixture grew two rows, measured at 390 × 844 (mobile, `bodyScroll` off):

| row | shape | width | lines |
|---|---|---|---|
| `rowA` | brTabs' shape (control, unchanged) | 566 | **1** |
| `rowB` | contentHeight + 100 % | 390 | 2 |
| `rowC` | `rowA` + the Group's own **`maxWidth` 100 %** | 390 | **2** |
| `rowD` | `rowA` in a **column** parent | 390 | **2** |

   `rowC` stays as narrow as its items until it meets the edge, which is what a cluster at the end of a
   `space-between` header needs (contentHeight + 100 % would stretch it across the bar). `rowD` measures AC3(ii)'s claim,
   which §5 had only argued. Drive: `scripts/devtools/drive-isl022-template-rows.js` (any class list; the s3 drive still
   reads rows A and B).

**AC2 ✅** — `tests-unit/validation/isl-022-the-wrapped-row-warning.test.ts` (28 arms) and the door's
`isl022WrappedRow.test.ts` (flipped from AC1's readings): `brBar`, `rcColourRow`, `opColourRow` silent; `brTabs` named by
`row-cannot-wrap` on `sizeMode`; the 32 % grid, the default-100 % item and a 600 px item fire beside every silence.

**AC3 ✅** — reverted arms, each over the spec: (i) the per-track read off (`false && wraps`) → **1 red / 28**, exactly
"the garden's bar … is silent"; (ii) the row-parent condition off → **1 red / 28**, exactly the column-parent arm. Both
files restored and `cmp`-identical.

**AC4 ✅ — census through the door** (`validate_project` on a copy of each of the 12 V2 templates and the 4 calibration
projects; the 46 legacy prefabs are refused by the MCP server as GAM-022 found, and arm B's structural scan there found 0
gapped rows). `uncollapsible-multi-column` **22 → 14**; `row-cannot-wrap` **0 → 7**.

| removed (`uncollapsible-multi-column`) | why |
|---|---|
| bot-garden `Garden/Top bar#brBar` | arm A, five content-sized clusters, wraps (CG-003 §7.2: two rows at 390) |
| bot-garden `Robot/Card#rcColourRow`, `Robot/Options#opColourRow` | arm B, 44 px swatches |
| rocket-school `Hangar/Shelf#hsGrid` | arm B, 132 px tiles — GAM-022's calibration true positive, **reversed by the ruling** |
| rocket-school `Pages/Profiles#pfList` | arm B, 150 px cards — the same |
| Puppy test 3 `Pages/Landing#grid` | arm B, 340 px card (DSG-004's calibration grid) — **reversed by the ruling**: one per line on a phone |
| nightbook `Keep/Section#ksGrid`, `Pages/Tonight#tnMineGrid` | arm B, 168 px things |

Still firing, every one a percentage or a band: ecommerce-example ×5 and its probe ×2 (32 % cards and four arm A bands),
phase55-replay-sonnet ×3 (31 %), nightbook `Help/Lines#hsRoot` (items at 100 % — see the question below), `Pages/Book#bkGrid`
(13 %), `Pages/Me#meDesk` and `Pages/Setup#suS3Cards` (arm A).

| new (`row-cannot-wrap`) | rescued? | rendered at 390 |
|---|---|---|
| bot-garden `Garden/Top bar#brTabs` | CSS class `.bg-tabs` (`!important`) | 362 px (the CSS) — the graph alone: CG-003's 506 px page |
| planning, planning-demo `Week/App bar#abRight` | CSS class `.planner-shrink-wrap` | 3 lines (the CSS) |
| landing-pages `Site/Header#hdNav` (3 links) | none | 185 px, fits today; a 4th–5th link overflows — **fixed in the template** (below) |
| nightbook `Pages/Tonight#tnFonts` (6), `#tnEffects` (5), `#tnColours` (8) | none | not rendered (mounted only when a text is picked, behind the unlock) |

Filed: `dev-docs/bugs/p109-s4-rowwrap-…` (the unrescued rows).

**❓ Not ruled, recorded:** arm B still fires on a wrapped row of **100 %-wide** items (nightbook `hsRoot`): each item is
a full line, so nothing is frozen at a desktop proportion. The ruling's sentence says "a percentage" fires, so it does.

**AC5 ✅ — the pins moved in the same change, and each is red against HEAD's rule** (HEAD's four validation files
copied in, the suites run, mine copied back, `cmp`-identical):

| gate | before | after | under HEAD's rule |
|---|---|---|---|
| `cg003Template.test.ts` AC1 (garden) | `['uncollapsible-multi-column']` on Top bar, Card, Options, apply | `['row-cannot-wrap']` on `Garden/Top bar`, `apply` | red (HEAD gives the old list) |
| `tpl007Template.test.ts` (Rocket School) | `['uncollapsible-multi-column']` on Shelf, Profiles, apply | `[]` (title no longer says "except …") | **red** |
| `tpl010Template.test.ts` §1 (planning) | `['wired-dimension-becomes-grow']` | `+ 'row-cannot-wrap'`, on `Week/App bar` and `apply` (CSS-rescued; the exit is written beside the pin) | **red** |
| `tpl003Template.test.ts` (landing-pages) | `[]` | `[]` — **the template was fixed instead**: `maxWidth: pct(100)` on `hdNav` in `tpl003Components.ts`, `npm run template:landing` (+4 lines in `Site/Header/nodes.json` and the embedded `landing-pages.content.json`). Rendered before/after: 185 px, 1 line, same position at 390 and at 1280 | n/a (the gate is about the template) |
| `isl022WrappedRow.test.ts` | AC1's readings | AC2's | **3 red** |
| `isl025Census.test.ts` W21 | `present` | **`removed`** (the noise pin is gone) | — |
| `tpl006Template.test.ts`, `sb006PublicSite.test.ts` | unchanged | unchanged, green | — |

GAM-022's own spec moved three arms (300 px, Puppy's 340 px, the 150 px content-sized container → 600 px items; its
abstention arms → 600 px, since a 300 px item is now silent for its width and would grade nothing): 16 / 16.

**AC7 ✅** — the garden's generator is untouched and `CG-003 AC2`'s byte gate passed in the same run (0 files differ):
the rule changed, the artefact did not. The pin names exactly `row-cannot-wrap` on `Garden/Top bar` (+ `apply`).

**Gates, with this change in (2026-10-02, over `835a965f9`):** the whole `noodl-mcp` suite, 164 suites: 3,534 passed,
23 failed in 15 suites. Each failure re-run under HEAD's rule: **15 stay red without this change** — `cn004` (1),
`nodeIdAllocation` (1), `d54ThemePresetIdentity` (1), `cmp004Parts` (2), `cmp004RoundTrip` (2), `cmp001InterfaceDoctrine`
(1, a corpus count 39 for 33), `fld013ExportReach` (1), `provision` (2, a real backend), tpl007's byte gate (the
`node-kit.d.ts` copies in a peer-dirty rocket-school), and `def038SettledTemplates` (6: format-4 templates holding
unsettled `runOnChange-*` — nightbook, planning, planning-demo are untracked peer templates, rocket-school is peer-dirty,
digital-bricks-training(-demo) committed 32 h earlier; s3's format step only stopped the migration re-running at format
5, and every template is at 4) — plus `iw008Crew`'s p95 tick timing (6.5 ms for 5, load). **The rest were this task's,
and are green after:** the 4 pins above, tpl003 (regenerated), and the moved suites re-run: 698 passed, 8 failed, the 8
being exactly the HEAD-red `def038` ×6, tpl007's byte gate, and the tpl010 `apply` label (pinned, then 1 / 1).

**⬜ AC6 (the person's door over the real protocol) is owed.** It needs `dist/noodl-mcp.cjs` rebuilt with this rule and a
Claude Code run under a project-local `--mcp-config`.
