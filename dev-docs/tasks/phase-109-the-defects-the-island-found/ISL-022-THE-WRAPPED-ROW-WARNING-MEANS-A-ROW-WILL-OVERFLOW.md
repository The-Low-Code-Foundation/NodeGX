# ISL-022 — The wrapped-row warning means a row will overflow

**Status: 🟡 s3 (2026-10-02): AC1's validator half measured (the door fires on `brBar`, `rcColourRow`, `opColourRow`, nothing on `brTabs` — §2's derivation confirmed); the render half below. Scoped 2026-10-01 at `27d891bf3`.** **Source:** [AUDIT F29](AUDIT-2026-10-01.md) · P78
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
