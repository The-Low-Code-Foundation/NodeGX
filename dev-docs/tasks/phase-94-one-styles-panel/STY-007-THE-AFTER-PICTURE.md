# STY-007 — The after picture

**Phase:** 94 — one styles panel. **Prefix:** `STY`. **State:** 🟢 **CLOSED — AC1–AC4 GREEN and DRIVEN, AC5 RULED WORTHY BY RICHARD (s10, 2026-09-19/20). This closes the phase.**
**Depends on:** STY-003 AC8, STY-005 AC8, STY-006 AC8 — 🟢 **all three ruled WORTHY by Richard on
2026-09-19 (s10)**, which is what unblocked this task; and STY-002 AC1 — 🟢 **ruled the same
session: the concept stays called a LOOK**, so this task may bake the word in.

> The phase started because managing styles through the nodes was *"a nightmare"*. STY-001
> photographed that nightmare. This task photographs what a person meets now, **in the same frames**,
> and asks the only question the phase has ever closed on: is it better?

**Close condition: Richard's look** (AC5). Nothing here closes on a passing test.

---

## 1. Why this is not "three more screenshots"

The three pairs he ruled at s10 are **crops of single controls** — a gutter, a panel, a list. Each
answered *does this control read right?* and each got a yes.

🔴 **None of them answers the phase's question**, which is about the whole surface a person lands
on: open a project, select a text node, try to change how it looks. STY-001's before-pictures are
**full editor windows** for exactly that reason. So the after-pictures must be full editor windows
too, on **the same project**, or the pair is not a pair —
[[a-control-pair-proves-what-you-varied-only]].

---

## 2. The surfaces, and what already exists

Every before-picture below is already in `shots/`, taken by STY-001 on **`Todo list`**.

| # | surface | before | after |
|---|---|---|---|
| 1 | **The property panel's style rows** — what a node's look is made of | `12-picker-DARK.png`, `13-picker-LIGHT.png` (the `TEXT STYLE` group: bare `var(--text-sm)`, `Auto`, `Normal`, nothing saying where any of it came from) | ⬜ **this task** |
| 2 | **The colour picker popout** — how you change one | `12-picker-DARK.png` (`Colors in project`: `#000000`, `#00000033`, `transparent`, then 20 `var(--…)` rows behind checkerboard swatches), `04-stylepicker.png` | ⬜ **this task** |
| 3 | **The list of named looks** — how you manage them | `06-row-at-rest.png` / `07-row-hovered.png` (the variants list: delete and rename **hover-only**, 8 of 11 rows showing nothing at rest) | ⬜ **this task** — now the Styles panel's **Looks** section, with R6's always-visible `⋯` |
| 4 | **Reaching a text style at all** | `10-textstyle-attempt.png` (README §2's route did not exist) | ⬜ **this task** |
| 5 | The gutter — linked vs overridden | *(nothing: it did not exist)* | 🟢 `sty003-gutter-{dark,light}.png` — **ruled WORTHY s10** |
| 6 | The Styles panel itself | *(nothing: it did not exist)* | 🟢 `sty005-panel-{dark,light}.png` — **ruled WORTHY s10** |
| 7 | Where a style is used | *(nothing: it did not exist)* | 🟢 `sty006-used-by-{dark,light}.png` — **ruled WORTHY s10** |

Rows 5–7 are **already closed** and are carried into this task's document as-is. Rows 1–4 are what
this task shoots.

---

## 3. What this task deliberately does not do

- **No new product code — with one exception, and it was taken.** A defect an after-picture merely
  *shows* is **filed**, not fixed: whether to fix it before Richard looks is his call, not this
  task's ([[build-the-tasks-do-not-farm-the-defects]]). A defect that makes an after-picture
  **impossible to take** is a different thing — it blocks AC1, and by the phase's own rule a
  blocking defect is the first job. Exactly one qualified: the Look menu never opened on a list, so
  §2 rows 3–4's after could not exist. See §6. Nothing else found by this drive was touched.
- **No re-shoot of rows 5–7.** They are ruled. Re-shooting them would re-open a settled question.
- **No states, no Look-extends-Look, no MCP Look authoring** — [[STY-DESIGN §9]].

---

## 4. The trap this task is walking into

🔴 **A before and an after taken on two different projects are not a pair.** The before-pictures are
`Todo list`. The gutter shots are `members area Richard test`; the panel and used-by shots are a
drive fixture with a Look the drive itself made. Those three are fine *as controls of their own
surface* — they were ruled as such — but rows 1–4 must be shot on **a copy of `Todo list`**, or the
comparison silently varies the project as well as the product.

🔴 **And the after must not be staged better than the before.** The before shots are a real project
opened and clicked. The after must be the same: no Look invented to flatter the frame beyond what
`Todo list` would actually show a person who used the feature once.

---

## 5. Acceptance criteria

| # | criterion | how it is graded |
|---|---|---|
| **AC1** | Rows 1–4 of §2 have an after-picture **in both themes**, taken on a **copy of `Todo list`** — the project the before-pictures were taken on | the drive reports the project it opened, and the shots exist |
| **AC2** | Each after-picture is a **full editor window**, framed like its before | the drive shoots without a clip rect and records the viewport |
| **AC3** | The after-pictures are **read off the rendered elements**, not merely captured: the drive asserts the surface it is photographing is actually on screen before it shoots | per-shot assertions, as STY-003 AC5 and STY-005 AC7 were driven. 🔴 [[a-rect-is-not-visibility]] |
| **AC4** | One document lays **before beside after, per surface**, with one plain sentence per pair saying what changed | this file's §7 |
| **AC5** | 🔴 **Richard has looked at the pairs and ruled the phase WORTHY** | 🟢 **RULED WORTHY, s10.** He was shown all four pairs in both themes. ⚠️ **He did not rule on the first ask — he asked a question of the picture**, and it was a defect nobody had seen: *"Why do all the colour squares next to the list of 'Colors in project' look transparent??"* See §9. Measured, fixed, re-shot, re-driven, and ruled on the second ask |

---

## 6. The drive

`scripts/devtools/drive-sty007-after-picture.js` — written this session.

**Reading, s10, 2026-09-19, at `3c4cedd34` + this session's fix: 19/19 graded arms, exit 0**, one
arm ungraded and named (the shipped Look was already worn from a prior run, so nothing was staged
twice). Project: a copy of `Todo list` at
`NodeGX test projects/STY-007 After Drive`. Viewport **1368×784 @2x**, both themes.

Every frame is preceded by a hit test (AC3), and four of them caught something real:

| what the hit test caught | what it would have photographed |
|---|---|
| the Look row at **y = −872** — drawn, correct, 900px above the viewport | an empty panel, read as "the Look row is gone" |
| `group-look-source` **zero-area** in the light pass — the Styles panel had replaced Properties **in the same slot** | a missing heading, read as "the theme broke the panel" |
| five `popup-layer-popout`s alive at once — `document.body.click()` does not close a popout, it clicks the body | every later surface behind a `popup-layer-blocker` |
| `button[class*="Value"]` matching **nothing** — the colour value is an `<input>`, and the swatch beside it opens a different popout (the wheel) | the wrong picker, or none |

🔴 **All four are instrument faults that would have read as product defects**
([[a-new-instruments-first-drive-finds-instrument-faults]]). None of them was one.

### 🔴 The defect the drive found, and why it was fixed rather than filed

On a copy of `Todo list` the Look menu **did not open on a list at all** — it opened straight into
*"Save this text's styles as a new Look…"* with a name box, and the twelve shipped Looks could not
be reached from the property panel.

`variantseditor.onPickVariant` asks for create-mode whenever the **project** holds no Look for this
node type (`variantseditor.tsx:243`, a line from the **initial commit**). That was right when a
project's own Looks were the only thing the menu could offer. STY-003 added the shipped library and
did not change the question — so the shortcut fired on **exactly the projects the library exists
for**, and *every* project is one of those until someone hand-makes a Look, which is the one thing
the library is meant to save them from. Same shape as
[[a-whitelist-gate-is-blind-to-a-later-node-class]]: a condition that stayed still while the set it
decides about grew.

🔴 **It was fixed, not filed, because it blocks this task's own AC1.** The pair for §2 rows 3–4 is
*"the old variants list → the new Look menu"*, and on `Todo list` the new Look menu **could not be
photographed**, because it never appeared. A defect that makes the after-picture impossible is not
a defect this task can carry.

**The fix:** `shouldOpenInCreateMode(menu, callerWantsCreate)` in `models/Looks/fieldState.ts` —
the caller's ask is kept, and vetoed unless the menu would genuinely have nothing to offer. It
reads the **same `LookMenu` the popup renders**, so the decision cannot disagree with the list it is
about. `PickVariantPopup`'s constructor calls it.

**Gate:** `tests-unit/sty-007/openInCreateMode.test.ts`, 6 tests. 🔴 **Armed:** restoring the old
behaviour (`return callerWantsCreate`) turns **3 of the 6 red by name**; restored, 6/6 pass. The
sharp arm is the one a lazy gate would omit — *caller asks, and there IS something to pick* — since
a test written on a project that already has a Look grades nothing: the caller would never have
asked.

---

## 7. The pairs

All before-pictures are STY-001's, on `Todo list`. All after-pictures are this drive's, on a copy of
the same project, same framing, both themes.

| surface | before | after | what changed |
|---|---|---|---|
| **1. A node's style rows** | `12-picker-DARK.png` / `13-picker-LIGHT.png` | `sty007-property-{dark,light}.png` | The group heading now reads **`TEXT STYLE — from Heading 1`**; every row that takes its value from the Look wears a bar in the gutter; the four rows this node overrides each say **`Heading 1 says var(--text-4xl)`** with a **Revert**. Before: bare `var(--text-sm)` / `Auto` / `Normal`, with nothing saying where any of it came from |
| **2. Choosing a Look** | `04-stylepicker.png`, `06-row-at-rest.png`, `07-row-hovered.png` (the variants list: rename and delete **hover-only**, 8 of 11 rows showing nothing at rest) | `sty007-lookmenu-{dark,light}.png` | **`None — styles are its own`**, then `IN THIS PROJECT` with a wearer count and one always-visible `⋯`, then **`START FROM A NODEGX LOOK`** — twelve of them — under the sentence *"Picking one adds it to your project so you can edit it. It won't change under you later."*, then **`Save this text's styles as a new Look…`** last. 🔴 **This frame did not exist before today's fix** |
| **3. Managing them** | *(the same variants list — there was no panel)* | `sty007-panel-{dark,light}.png` | A **Styles** panel in the rail: Colours, Design tokens (88), Text styles, Looks — each row with its layer badge, its usage count, and a `⋯` that is always visible |
| **4. Changing a colour** | `12-picker-DARK.png` (right half) | `sty007-picker-{dark,light}.png` (right half) | 🔴 **NOTHING. This surface is untouched** — last changed in P92, three phases ago. Same `Create new color style`, same `Colors in project`, same `#00000033` and twenty `var(--…)` rows behind checkerboard swatches. What changed is that the *panel* now manages colour styles, so this list is no longer the only door — but the door itself is exactly as it was |

🔴 **Row 4 is the honest gap in this phase**, and it is put in front of Richard as one, not smoothed
over: `sty007-picker-{dark,light}.png` carries the new property panel on the left and the unchanged
picker on the right, in one frame.

**Also ruled WORTHY at s10 and carried in as-is** (no re-shoot — re-shooting would re-open a settled
question): `sty003-gutter-{dark,light}.png`, `sty005-panel-{dark,light}.png`,
`sty006-used-by-{dark,light}.png`.

---

## 8. Gate readings — s10, 2026-09-19

| gate | reading |
|---|---|
| `tests-unit/sty-007` | **6/6**, and **armed**: the pre-fix behaviour turns 3 red by name |
| `tests-unit/sty-003` | **30/30**, unchanged by the `fieldState` addition |
| `tsc -p tsconfig.json --noEmit` (noodl-editor) | **exit 0, zero output** |
| `npm run test:ci` | **3012 specs, 8 failures, seed 00079, HEAD `3c4cedd34`** — the floor, by name (3× SUB-006, 3× SUB-011, 2× NDA-017). Fresh readout, `elapsedSeconds` 71 |
| `npm run test:main` | **519 of 520 suites pass, 8290 of 8291 tests.** ⚠️ The one failure is **`tests-unit/tvw-007/instanceHoverCard.test.tsx`**, a **peer's untracked P93 work written 22:49–23:15 while this run was in flight** — not this session's, and not on the committed tree ([[a-commit-is-not-what-the-compiler-read]]) |
| `drive-sty007-after-picture.js` | **19/19 graded arms, exit 0**, both themes, 1 ungraded and named |

---

## 9. 🔴 The second defect — and it was RICHARD who found it, in the after-picture

The pairs went to him with §7 row 4 stated as an honest gap: *the colour picker is untouched by this
phase*. He did not rule on it. He asked:

> **"Why do all the colour squares next to the list of 'Colors in project' look transparent??"**

**Because they were transparent.** Measured in the running editor before touching anything
(`resolveColor` read in the same expression, so the true colour and the painted colour come from
one reading):

| row | what the swatch was told to paint | what it computed | what the colour actually is |
|---|---|---|---|
| `#000000` | `rgb(0, 0, 0)` | `rgb(0, 0, 0)` ✅ | — |
| `#00000033` | `rgba(0, 0, 0, 0.2)` | `rgba(0, 0, 0, 0.2)` ✅ | — |
| `transparent` | `transparent` | `rgba(0, 0, 0, 0)` ✅ **correct** | — |
| `var(--background)` | `var(--background)` | 🔴 `rgba(0, 0, 0, 0)` | `#f5f5f3` |
| `var(--primary)` | `var(--primary)` | 🔴 `rgba(0, 0, 0, 0)` | `#2f5bc8` |
| `var(--destructive)` | `var(--destructive)` | 🔴 `rgba(0, 0, 0, 0)` | `#b3261e` |
| `var(--surface)` | `var(--surface)` | 🔴 `rgba(0, 0, 0, 0)` | `#ffffff` |

🔴 **An editor surface cannot paint a PROJECT's design token by naming it.** `colorstylepicker.jsx`
set `backgroundColor` to the raw stored string. `var(--primary)` is declared in the *project's*
stylesheet; the editor's own chrome never declares it, so the declaration is invalid in that DOM,
the element paints nothing, and the checkerboard behind it shows through — on **17 of the 20 rows**.

**It had been like that since the initial commit, in front of everyone, for the whole phase** —
three drives, three ruled screenshots and two sessions of reading this surface did not see it. It
took a person looking at the picture. **This is what the close condition is for**
([[correct-and-usable-were-never-the-same-criterion]]).

**The fix:** `swatchColor()` in `colorstylepicker.jsx` — resolve through
`ProjectModel.resolveColor` before painting. Applied at the **three** swatch sites that were
painting raw values (two in `ColorStyleItem`, one in `ColorItem`); the fourth, in `CreateNewStyle`,
had resolved all along, which is how the file itself showed the answer. `resolveColor` returns its
input unchanged when it cannot resolve, so the fallback *is* the old behaviour and no row can be
made worse.

**Gate:** two arms in the drive, per theme, read off `getComputedStyle` of every rendered swatch:
- **`every named colour's swatch paints that colour`** — zero `var(--…)` rows computing
  `rgba(0,0,0,0)`. **12 swatches, 0 clear**, both themes.
- 🔴 **the control, in the same read** — a hex row must still paint its own hex, and `transparent`
  must still read transparent. Without it, a picker that painted everything black would pass
  ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).

⚠️ **How far the arming goes, stated exactly:** the detector's predicate was proven on the real
element — a swatch handed `var(--background)` accepts the value and computes `rgba(0, 0, 0, 0)`,
which is precisely what the arm filters on. It was **not** run against a rebuilt unfixed bundle; a
DOM-level sabotage did not survive the popup's next React render. The pre-fix reading in the table
above was taken with the same expression on the unfixed build, which is the stronger evidence.

**Drive after the fix: 23/23 graded arms, exit 0**, both themes, 1 ungraded and named.
