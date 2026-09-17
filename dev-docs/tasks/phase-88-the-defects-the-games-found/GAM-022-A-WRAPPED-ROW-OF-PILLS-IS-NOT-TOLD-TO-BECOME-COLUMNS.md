# GAM-022 — A wrapped row of pills is not told to become columns

**Status: ✅ 2026-09-17 (session 23): AC7's render met, 8 pills wrap in 5 rows at 390×844 (§8 s23).** *(s12: 🟢 built over `e740727f8`.)* Arm B judges the `For Each` item's visual root, and abstains on an unknowable one. The first read found all three calibration grids resolvable with a width, so R19 is not needed. AC1 RED at HEAD (9), the reverted arm 9 red, the wrong fix 10 red. Census 16 → 13. TPL-006's pin is `[]`; TPL-007's names `Hangar/Shelf` and `Pages/Profiles`, which still fire (§2 missed them).  **Source:** [P78 D50](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-006 `Story/Sidebar`, 2026-09-12, and pinned again by TPL-007 `Game/Choice row` · **Side:** product (validator, `uncollapsible-multi-column` arm B)

On every build the door says that a wrapped row of two-word tags "cannot collapse at any width" and suggests a `Columns`
autoFit at 260-320px. The tags wrap correctly at 390px. Following the advice would give every tag a 300px column.

## 1. The person sentence

**A row of content-sized pills that wraps with a gap gets no warning, and a grid of items that were given a width still
does.**

## 2. What was measured

Re-read at HEAD `eb12ebe99` on 2026-09-14 unless marked otherwise.

| reading | where |
|---|---|
| Arm B fires on: `flexDirection: row`, `flexWrap: wrap`, a `For Each` child, and a non-empty `columnGap`. That is the whole predicate. Nothing is read about the items | `validation/responsiveArrangement.ts:234-255` |
| The message's own mechanism is *"a wrapped flex row does not shrink its children, so each item keeps the width it was given"* | `:247-250` |
| Arm A excludes a **container** that is content-width (`CONTENT_WIDTH_MODES.has(parameters.sizeMode)`), *"the exclusion that took the authored false-positive rate to zero"* | `:259-261` |
| 🔴 **The register's reading is wrong on one point.** D50 says *"Arm A has exactly the exclusion Arm B is missing"*. Arm A's exclusion reads the container, and **both D50 containers are full-width**: `Story/Sidebar#sbList` is `sizeMode: contentHeight, width: 100%`, and so is `Game/Choice row#crRow`. The **items** are what is content-sized: `/Story/Carried` and `/Game/Choice` each have a `Group` root at `contentSize`. **Copying Arm A's exclusion into Arm B silences neither template** | `templates/story-engine/components/Story/Sidebar/nodes.json`, `templates/rocket-school/components/Game/Choice row/nodes.json` and their `For Each.template` components, read with `node` |
| Arm B receives only the component's own nodes and a catalog: `checkResponsiveArrangement(nodes, { component, catalog })`. It cannot see the `For Each` template's root | `validation/authoredCandidate.ts` (the `checkResponsiveArrangement` call); signature at `responsiveArrangement.ts:132-139` |
| The views that could resolve the item already exist in the same layer: `ComponentNodesView { name, nodes: { type, parameters, ports }[] }` | `authoredCandidate.ts:176-183` |
| The library's pill rows: `/Tags` has no gap and its item root is `net.noodl.ParentComponentObject`; `/Multi Select/Pills` has no gap, a `contentSize` container and `contentWidth` items; `/Multi Select/Dropdown` has no gap and `contentWidth` items. **All three avoid the warning only by setting no gap** | `library/prefabs/{tags,multi-select}/project/project.json`, read with `node` |
| Calibration at shipping time: of 45 row Groups parenting a `For Each`, 36 were legacy chip/pill/carousel lists with no gap, and 3 had a `columnGap`, all of them the defect (`Puppy test 3`'s puppy grid, the reference build's featured grid, sonnet's product grid) | as recorded 2026-08-11, `responsiveArrangement.ts:72-79`, [NOTES-DSG-004](../phase-54-design-groundwork/NOTES-DSG-004.md) lines 61-64; not re-run |
| Two template gates pin this warning: TPL-006 asserts exactly `['Story/Sidebar uncollapsible-multi-column']`, and TPL-007 asserts the code set `['page-cannot-scroll', 'uncollapsible-multi-column']`, with the comment *"a wrapped row of content-sized pills"* | `noodl-mcp/tests/tpl006Template.test.ts:772-776`, `tpl007Template.test.ts:108-115` |

## 3. Where it bites a person

An author who follows the design doctrine (*"use the gap ports, never margins on the children"*) on a tag list, a filter
bar, a segmented control or a choice row. The door gives them a warning and wrong advice. Obey the advice and the page
breaks. Obey the doctrine and the warning stays. The library itself chose the third way: drop the gap.

## 4. Related work and collisions

- P77 [SBR-004](../phase-77-the-site-builder-rescue/SBR-004-THE-PUBLIC-SITE-WEARS-THE-THEME.md) lines 99-104 read Arm B at
  `responsiveArrangement.ts:238-256`, took its refusal as correct for a nav bar, and **dropped `columnGap`** to escape it.
  Before landing, check whether SBR-004's nav links are content-width items. If they are, SBR-004's workaround is this
  defect too, and its gap can come back.
- P54 [DSG-004](../phase-54-design-groundwork/DSG-004-THE-GATES-BEHIND-THE-DOCTRINE.md) §2.1 and NOTES-DSG-004: the rule's
  origin and its calibration corpus.
- P88 [GAM-021](GAM-021-A-PLAN-IS-NOT-WARNED-ABOUT-THE-SCROLL-SETTING-IT-IS-ABOUT-TO-APPLY.md): changes the other half of
  TPL-007's pinned pair. Whichever lands second writes the final pin.
- Grep run: `grep -rlan "uncollapsible-multi-column" dev-docs/tasks` found SBR-004, P78 README and NEXT-SESSION-PROMPT,
  NOTES-DSG-004, and this phase's README. **No owner.**

## 5. Design

- **Judge the item, not the container.** Pass Arm B the component views. It resolves `For Each.template` to that
  component's visual root and abstains when the root's resolved `sizeMode` is `contentSize` or `contentWidth`.
- **Unknowable abstains, but look at the 3 true positives first.** A template that does not resolve, is wired, or has an
  instance or `ParentComponentObject` root is unknowable. The module's rule is that unknowable abstains. **But if any of the
  three calibration grids has an unknowable item root, abstaining silences a true positive.** Read their item roots before
  choosing, and record them in §8.
- 🔒 **Ruling for Richard, only if that read finds an unknowable true positive:** keep firing on unknowable item roots (the
  pill false positive survives when the pill is a component instance), or abstain (a real grid built from instance roots
  goes unreported).
- A container that is itself content-width could also be excluded, as in Arm A, but it is not D50's case and has no measured
  instance. Add it only with its own arm.
- **Do not** drop the `columnGap` discriminator. It is what separated 3 from 45.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8:** a spec with a full-width wrapped row, `columnGap`, and a `For Each` whose template root is `contentSize` gets `uncollapsible-multi-column`. |
| AC2 | After the fix the AC1 shape is silent. **The same row with the template root at `explicit` and width 300px still fires**, in the same spec. |
| AC3 | 🔴 **Reverted arm:** remove the item-root read, and AC2's silent arm goes red while its firing arm stays green. |
| AC4 | 🔴 **The wrong fix goes red too:** an arm that ports Arm A's container exclusion instead leaves AC1's shape firing. The spec shows it, so the register's reading cannot be built by mistake. |
| AC5 | **Census before landing:** firings over `library/prefabs` and `templates/` before and after. Before (predicted): `Story/Sidebar` and `Game/Choice row`. After: neither. Re-run the calibration corpus's three true positives and record that each still fires, or apply the ruling. |
| AC6 | **Pins updated in the same change:** TPL-006's assertion becomes `[]`. TPL-007's code set loses `uncollapsible-multi-column`. Each gate is run once against the reverted fix and goes red. |
| AC7 | **The person's door:** TPL-006's generator output (`validate_component` on `Story/Sidebar`) carries no warning, and the sidebar at 390×844 still wraps its tags (a render reading, not only the diagnostic). |

## 7. Traps

- 🔴 **Arm A's exclusion is about a different node.** It would read as a fix and change nothing on either template.
- ⚠️ A `For Each` renders its items into its parent. The wrapped row's children are the items, not the `For Each`.
  Resolve the item from `parameters.template`.
- ⚠️ Two gates pin this warning, so an unrelated change that breaks the check also turns them red. Read the diff of codes,
  not only the count.

## 8. Record

### Session 12 (2026-09-15, HEAD `e740727f8`)

**The first read (§5): the three calibration grids' item roots, off disk.** A scanner over every wrapped row Group with a
`For Each` child resolved each `template` to its component's roots (`scratchpad/gam022/item-roots.js`, V2 folders and legacy
`project.json`):

| grid | container | item root |
|---|---|---|
| `Puppy test 3` `/Pages/Landing#grid` | contentHeight, 100% | `/Components/PuppyCard`: one Group, **contentHeight, 340px** (+ Component Inputs) |
| `ecommerce-example` `/Pages/Home#group_65` | unset, 100% | `/Components/ProductCard`: one Group, **sizeMode unset (explicit), 32%** |
| `phase55-replay-sonnet` `/Sections/FeaturedProducts#fp_grid` | unset, 100% | `/Cards/Product Card`: one Group, **31%** (+ Component Inputs, RouterNavigate) |

**None is unknowable.** Each resolves to exactly one visual root with a width, so abstaining on unknowable roots silences no
true positive, and **R19 is not needed.** The same scan found 12 wrapped rows with a `For Each`: 8 gapped, 4 not (the
library's pill rows, which have no gap).

🔴 **§2 and AC6 were wrong about Rocket School.** It has **four** gapped wrapped rows, not one: `Game/Choice row` (pills,
contentSize), `Game/Question box` (`Option button`, a Button at contentSize), `Hangar/Shelf` (tiles, **132px**) and
`Pages/Profiles` (cards, **150px**). The last two are the calibration shape, so they keep firing, and TPL-007's code set
keeps `uncollapsible-multi-column`. A code-set pin cannot grade this task, so the pin now names components (AC6).

**What was built.** `noodl-editor/src/editor/src/validation/responsiveArrangement.ts`:
- `repeatedItemWidth(repeater, views, connectedInputs, catalog)` returns `content`, `sized` or `unknown`. It resolves
  `template` to a view, and takes the roots (nodes no other node lists as a child, and with no `parent`). It then needs exactly
  one visual root, and reads its `sizeMode` or the catalog default (`inputDefaults`: a Group is `explicit`, a Button `contentSize`).
- `unknown` covers a wired `template`, a template no view names, a `ParentComponentObject` root, a component-instance root, and
  zero or several visual roots.
- Arm B fires only when the item is `sized`, or when the caller passes **no views**: then the item cannot be read, and the row is
  judged alone, as before. That keeps the existing spec's view-less Puppy grid arm, and any caller without views, unchanged.
- New options `views` (`ItemComponentView`, which `ComponentNodesView` satisfies) and `connectedInputs`.
- `authoredCandidate.ts` passes both, so the MCP doors and the editor's authoring gate get it from one call site.
- No container exclusion was added (§5).

**AC1: RED at HEAD.** `noodl-editor/tests-unit/validation/gam-022-a-wrapped-row-of-pills.test.ts`, 16 arms. Its options are
cast so the file compiles against HEAD's signature. **9 failed, 7 passed**, exactly the 9 arms that supply views and expect
silence:
- the item shapes: `Story/Carried`, `Game/Choice`, contentWidth, and a Button with sizeMode unset
- the five unknowables

The firing arms were green at HEAD: 300px, the three calibration roots, a content-sized container of 150px cards, and no views.

**AC2: after.** 16/16, and the existing `responsiveArrangement.test.ts` 13/13 (29 total). `tsc --noEmit -p packages/noodl-mcp`
exit 0 (it compiles the editor's validation files).

**AC3: reverted arm S1** (the item read replaced by `true`, one site asserted): **9 red**, the same 9. Every firing arm stayed green.

**AC4: the wrong fix, S2** (Arm A's container exclusion in place of the item read): **10 red**. It is the 9, minus the no-views
arm (its container is not content-width, so it still fires), plus the content-sized-container arm, which the wrong fix
silences. The fixture-precondition arm pins that the D50 container is `contentHeight` at 100%. Restored `cmp`-identical, 29/29.

**AC5: census through the real check.** A copy of each project, validated as `validate_project` does. 12 V2 projects: the
templates, the four calibration projects, and the MCP demo fixture (the known-firing `page-cannot-scroll` row). The 46 prefabs
are refused by the MCP server as legacy, so the structural scan above covers them (0 gapped rows).
- **Before, 16:** Rocket School ×4 (`Choice row`, `Question box`, `Shelf`, `Profiles`), `Story/Sidebar`, Puppy grid,
  `ecommerce-example` ×5, `ecom-responsive-probe` ×2, `phase55-replay-sonnet` ×3.
- **After, 13:** `Choice row`, `Question box` and `Story/Sidebar` gone. All three calibration grids still fire, and so does
  every Arm A hit.
- Totals reconcile: 204 over 11 projects before; 205 over 12 after, which is 204 − 3 + 4 (the fixture's own findings).

**AC6: the pins.**
- `tpl006Template.test.ts`: the warning list is now `[]`, and the comment is rewritten.
- `tpl007Template.test.ts`: keeps GAM-021's code set, and adds the components that carry the code: `['Hangar/Shelf',
  'Pages/Profiles', 'apply']`. `apply` is the builder's label for `apply_plan`'s re-validation (`tpl007Template.ts:220`).
  🔴 The first version of that pin left out `apply` and was red with the fix in. S1's first TPL-007 reading was therefore not
  attributable, and was re-run after the correction.
- Under S1, TPL-006: **1 red** (`Story/Sidebar uncollapsible-multi-column` returns). TPL-007, re-run: **1 red**, and the diff
  is exactly `Game/Choice row` and `Game/Question box`.
- Restored: TPL-006 62/62 and TPL-007 93/93.

**AC7: the person's door.** Graded in the door's own output: TPL-006's generator (`validate_component` through the build)
carries no warning, as the gate above shows. ⬜ **The render half is owed.** This task changes no runtime or layout code, but
AC7 asks for the sidebar at 390×844, and that was not run.

**Gates, with GAM-021 and GAM-022 both in.**
- The whole `noodl-mcp` suite: 126 suites, 2,142 passed, **8 failed in 7 suites**. These are the same 8 by name as GAM-021's
  run, which came before this task, and all of them also failed with HEAD's GAM-021 files (GAM-021 §8).
- Editor `test:main`: **459 suites, 7,538 / 7,538**, exit 0. That is session 11's 458 / 7,522 plus this spec's suite and 16 tests.

**§4, SBR-004, checked.** Its nav link (`sb006Components.ts:495-519`) is a `Text` at `contentSize` under `Site/Nav`'s wrapped
row, so the `columnGap` SBR-004 dropped was this false positive. The gap can come back. That is P77's template, so it is
recorded here and not edited. Its `Gallery grid` (tiles at 48%) is a true grid and still fires.

**Traps.**
- 🔴 A V2 component's `component.json` `name` is only the leaf. The legacy name is the folder path. The first scan resolved
  nothing because it used the leaf.
- 🔴 A template gate's `diagnostics` carry the builder's step label (`apply`) as `component`. A per-component pin must include it.
- 🔴 The MCP server refuses legacy `project.json`, so a `validate_project` census cannot see `library/prefabs`. Cover them another way.

### Session 23 (2026-09-17, over `08b338d6d`) — AC7's render, the last clause

The sidebar at 390×844, rendered from a copy of `templates/story-engine` (`render-report.js` `withRenderedPage`, Read page). The story
ships **one** carryable thing ("what Aldis wrote"), and one pill cannot show a wrap, so eight things of mixed length were put into the
page's own `storyCarrying` variable, in the `{ id, thing }` shape `rdCarry` writes (a first try with bare strings drew **0 pills**:
the known-firing count caught it, so the reading below is not an empty pass).

| reading | result |
|---|---|
| before the write | 0 pills ("Nothing yet") |
| after, 8 things | **8 pills in 5 rows** inside `sbList` (300px, `flex-wrap: wrap`); 0 pills past the list's content box; 0 texts wider than their pill; no sideways scroll; 0 console errors |
| screenshot (`scratchpad/g22/sidebar-390.png`, looked at) | two, one, two, one, two pills per row; the longest ("the harbour chart with the wreck marked", 295px) fits |

**AC7 met.** Not measured: a single thing longer than the list is wide (a pill is content-sized, so it would not wrap inside
itself; GAM-020's static rule abstains on the wired text). Story Engine's own story has no such thing.
