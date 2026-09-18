# CHR-010 — The last icon font

Font Awesome 4.7 is linked on every window for 32 uses, 22 of them in the property panel. It is
the one place two icon systems share a column, and the reason a 32 KB stylesheet loads before the
launcher paints.

## 1. The person sentence

**Every glyph in the property panel is drawn from the same set, at the same stroke, in the same
colour as its text — and the editor loads one icon system.**

## 2. What the code says (audit, re-read at HEAD)

- `editor/index.html:6` links `assets/lib/fontawesome/css/font-awesome.min.css`.
- **32 `fa fa-*` uses in 16 files editor-wide.** Property panel: **22 in 12 files** —
  `iconpicker.jsx`, `avatarpicker.tsx`, `PropListInput.tsx`, `StringListInput.tsx`,
  `NumberUnitInput.tsx`, `colorstylepicker.jsx`, `variantseditor.tsx`, `PickVariantPopup.tsx`,
  `PickVariantItem.tsx`, `QuerySortingEditor.tsx`, `RuleDropdown.tsx`, `Pages.tsx`. Glyphs:
  `fa-plus` ×6, `fa-trash-o` ×2, `fa-trash` ×2, `fa-search` ×2, `fa-pencil-square-o` ×2,
  `fa-edit` ×2, `fa-code` ×2, `fa-ellipsis-h`, `fa-close`, `fa-check`, `fa-caret-down`.
  Elsewhere: `componentports/ComponentPortsView.tsx`, `TextStylePicker.jsx`,
  `popuplayer.ts:338,1240-1241`, `ConnectionPopup/PortGroup.tsx`.
- `variantseditor.css` styles `.variants-header .fa` — a stylesheet coupled to the font's class.
- `Icon` (`noodl-core-ui/src/components/common/Icon/Icon.tsx`): 172 `IconName`s over 170 SVGs,
  `currentColor`, sizes `tiny 12 / small 14 / default 16 / large 20`. Every glyph FA provides
  here has an `IconName` equivalent or a trivial one to add under `ICONOGRAPHY.md`'s rules
  (16 grid, 1.5 stroke, round caps).
- The hex ratchet permanently exempts the FA directory; `css-icon-url-ratchet.js` gates `url()`
  icons at zero and does not see font glyphs.

## 3. Scope

1. Convert the 22 panel uses to `<Icon name=… size=…>`; then the 10 others. `popuplayer.ts` is
   imperative — it gets the SVG string the way `CanvasIcons.ts` already does, or a tiny helper
   that renders an `Icon` into a detached root, whichever the file already has a pattern for.
2. Add the missing `IconName`s (expect ≤ 4: `trash`, `pencil`, `code`, `caret-down` likely exist —
   check the enum first) drawn to the house style; `LICENSES.md` updated.
3. Delete `.variants-header .fa` and any `.fa`-keyed rule; delete `assets/lib/fontawesome/`;
   remove the `<link>` from `index.html`; remove the FA exemption from `.hex-color-baseline.json`.
4. A gate: `scripts/icon-font-gate.js` (or a clause in `css-icon-url-ratchet.js`) that fails on
   any `fa fa-`, `class="fa`, or `font-awesome` string under `packages/*/src`. Zero, not a ratchet.

Out: redrawing the ~98 legacy filled glyphs (P23 UIX-010) and node-type icon coverage (UIX-014).
The user-app Lucide webfont (`starter-project/noodl_modules/lucide-icons/`) — a different
system, correctly separate.

## 4. Acceptance criteria

1. **(person)** Open a node with a `proplist` (the `+` and trash glyphs), a variants editor and
   the icon picker: every glyph is the same stroke weight as the chevrons and recolours with the
   theme (flip theme; nothing stays black). Screenshots into `verdicts/CHR-010/<date>/`.
2. `grep -rn "fa fa-\|font-awesome\|\.fa\b" packages/noodl-editor/src packages/noodl-core-ui/src`
   is empty; the renderer's boot network log shows no `font-awesome` request; the gate from §3.4
   is green and **reverted arm**: add one `<i class="fa fa-plus">` and it is red naming the file.
3. `Icon`'s `IconName` count and the SVG file count still agree (there is a spec; keep it green).
4. `test:ci` at the floor; `npm run colors` green with the FA exemption removed from the baseline
   file (its count should not change — FA's CSS was excluded, not counted).

## 5. Traps

- 🔴 **`Icon` is `require.context`-coupled and breaks `tests-unit`.** CHR-008 adds the jest
  `moduleNameMapper` stub; this task depends on it. Without it, converting `PropListInput` makes
  `fb-018/bindingChipRows.test.tsx` fail **to run**, which reads as a pass in some runners
  ([[this-jest-can-grade-a-react-component]] — "drew nothing" ≠ "never ran").
- ⚠️ **`IconSize` was inert at 441 call sites until POL-013.** Check that the size you pass is
  the size that renders — measure one, do not trust the prop.
- ⚠️ `popuplayer.ts:1240-1241` draws a glyph into a string template. A `currentColor` SVG in a
  string needs the surrounding element to set `color`; the FA glyph inherited it for free.

## 7. The drive (s32, 2026-09-18) — `verdicts/CHR-010/2026-09-18/`

Dev build at HEAD `382b716f`, a **scratch copy** of `templates/rocket-school` opened in
`/private/tmp/…/chr010-proj` (the repo template is clean afterwards — `git status` empty).

⚠️ **The build I shot was NOT only my commit.** P93's TVW-001 changes were sitting uncommitted in
the shared working tree when my webpack compiled, and were committed as `d541b6442` only after my
stack was up. It does not move these findings — every AC2 reading is an *absence* of Font Awesome,
and none of their files (`benchWords`, `componentUsage`, `RowMetaLabel`, `RouterAdapter`,
`authoredPageUrl`, two `.scss`) references a font, an icon or an `fa-` class — but the isolation
claim is theirs to make, not mine to assume. 🔴 **I asserted "nothing of theirs was in the tree"
from the absence of their COMMIT; on a shared checkout that needs a `git status` taken at launch
time.** Their peer caught it, the second such correction in one session
([[a-peer-all-clear-is-about-that-peer]]).

**AC2, the absence — CLOSED.** Four readings, and the last one is the one that counts:

| reading | value |
|---|---|
| `<link rel=stylesheet>` hrefs | `["../assets/css/style.css"]` — the FA link is gone |
| `@font-face` families (`document.fonts`) | `["Bricolage Grotesque"]` only |
| stylesheets whose rule text mentions FontAwesome | **0 of 284** |
| elements matching `i.fa, .fa, [class*="fa-"]` | **0** |

🔴 **My own drive script's AC2 arm was VACUOUS and the drive found it.** It read
`performance.getEntriesByType('resource')` for `font-awesome` and got `[]` — but the same call
returns `[]` for **every** font and **every** stylesheet in this renderer, so it could not have
reported a Font Awesome request had one existed. The absence only became evidence next to a signal
that fires: `document.fonts` lists Bricolage, so it *would* have listed FontAwesome had the
stylesheet still been linked ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
✅ **The script is fixed** — it reads `document.fonts` + the link list + a rule-text scan that
reports how many rules it scanned, so "0 hits" can be told apart from "nothing was read".

🔴 **A second fault in the same script, found by s33 re-running it: the stale-bundle arm read
PROSE.** It tested `src.includes('fa-share')` against the `popuplayer` module and reported a
correctly-rebuilt dev bundle as stale, because a dev build keeps comments and the CHR-010 comment in
`indicateDropType` names `fa-share` to say what it replaced. Same shape as the icon-font gate's own
comment-stripping rule — a gate that reddens on the note describing the fix. Now strips comments
and keys on the old runtime construct (`popup-layer-drop-type-indicator fa`) rather than the glyph
name, plus `iconHost` as the new code's own symbol.

**AC1, the presence — the mechanism is verified, the surface list is not.** Graded on the glyph
BOX, not the element count, on two panels in both themes:

| surface | icons drawn | empty hosts | collapsed (0-wide svg) |
|---|---|---|---|
| Router panel, dark | 47 | **0** | **0** |
| Router panel, light | 54 | **0** | **0** |
| Group properties, dark | 42 | **0** | **0** |

Boxes land on `IconSize`'s ramp (12/14/16/20; one stray **18** exists and is not mine — no call of
mine passes a size off the ramp). Both `Pages.tsx` conversions measured individually: the
`Add new page` **+** and the row **⋯** each draw 14×14 with a real SVG, and both **recolour with the
theme** — `rgb(221,228,236)`/`rgb(196,206,219)` dark → `rgb(74,86,99)`/`rgb(89,98,110)` light.
PNGs read, not just the numbers.

🔴 **I wrote "nothing is black in either theme, which is AC1's actual sentence" here, and s33 proved
it false.** Two errors in one sentence, both worth keeping:

1. **The population was two panels; the claim was the whole conversion.** AC1 names a proplist, a
   variants editor and the icon picker — and I had said in the same breath that I could not reach
   any of them. A sentence about "either theme" over a set that excludes three quarters of the
   surfaces is not a weaker claim, it is a different one.
2. **I answered a CONTRAST question with a colour-equality test.** I scanned the colour list for
   literal black and found none. "Nothing stays black" means *nothing is unreadable against its own
   ground*, which needs each glyph measured against the thing behind it — and this phase built the
   instrument that does exactly that two sessions earlier (CHR-004's look gate). I did not point it
   at the glyphs I had just changed. My own dark readout even carried `rgb(7,22,39)` in its colour
   list, which I passed over.

What it cost: the icon picker's magnifier rendered **black on the dark ground**, because
`.search-icon { color: var(--theme-color-fg-default) }` (`style.css:727`) and core-ui's
`.Root { color: inherit }` (`Icon.module.scss:58`) have the **same specificity**, and core-ui is
injected later — so the conversion silently dropped the colour the Font Awesome `<i>` had inherited
for free. ⚠️ **I had grepped `.search-icon` and concluded it had no rule at all**; I searched
`editor/src/styles/` and the rule was in `assets/css/style.css`. A grep's population is what it
searches ([[ugrep-silently-skips-a-source-file-as-binary]] in its other form).
✅ Fixed in s33 with `variant={TextType.Default}` at both sites and the orphaned rule deleted.
That fix is robust rather than a source-order accident: `&.is-variant-default` nests inside `.Root`,
so it compiles to `.Root.is-variant-default` — specificity (0,2,0) against (0,1,0), which wins
however the sheets are ordered. Verified by reading the compiled selector, not by re-driving.

⇒ **The general rule this leaves:** converting a glyph from a font to an `<Icon>` moves it from
`color`-inheriting TEXT to an element with its own `color` rule at `.Root`'s specificity. Any host
rule that coloured the old `<i>` at a single class **loses**, silently, and the glyph falls back to
whatever `inherit` reaches. Grep for a colour rule on the host class across **all** stylesheets
before converting, and pass `variant` where one exists.

⬜ **Still owed on AC1:** it names *"a node with a `proplist`, a variants editor and the icon
picker"*. None of those three was reached — `rocket-school` has no colour styles and no variants, so
the variant popout opens straight into its create-mode branch and never draws the
`.variants-add-header` **+**; `ComponentPortsView` needs a component with its own ports (and
[[only-two-projects-have-a-component-with-input-ports]]); the icon picker needs an `Icon` node.
**Those six conversions are argued statically, not seen.** Pick a project that has all three, or add
the nodes with `NodeGraphNode.fromJSON` the way `CHR-009/2026-09-17/set/drive-set.js` does.
And AC1 closes on **Richard's look**, which has not happened.

## 9. CLOSED — Richard's look (2026-09-18, s33)

✅ **CHR-010 is closed.** Shown the six surfaces (https://claude.ai/artifact/UgyGxHTS9A1vp9ozw7E4cz),
Richard: *"Let's close CHR 010."* AC1 is met on the look, AC2–AC4 on the readings in §7.

He looked past the glyphs while he was in there, and named two things that are **not** this task's
and are now P94's opening defects (`dev-docs/tasks/phase-94-one-styles-panel/`):

1. *"When you add a new colour to the colour style picker, no matter what colour you choose it adds
   it transparent and you have to set it again once it's in the list."* — the create path reads the
   **port's** committed value (`<CreateNewStyle color={props.inputValue}>`), not the colour in the
   wheel.
2. *"Also how TF do you delete colours?"* — delete and rename exist on every style row and are
   `visibility: hidden` until the row is hovered.

And the variant/save defect §8 records: *"I reckon this will be part of the new phase I asked to
have made."* ⇒ P94 STY-005.

⬜ **One reading is still owed and was NOT taken:** CHR-004's look gate over these surfaces
(`node scripts/look-gate/run.js --surface=property-panel --theme=both`). The box went to a peer
before I could run it, and it is the instrument that measures "nothing stays black" as CONTRAST
rather than by eye — which is how the magnifier got past s32. Take it the next time the box is free;
it grades the surface, not this task's verdict, which Richard has given.

## 8. The surfaces AC1 names (s33, 2026-09-18) — `verdicts/CHR-010/2026-09-18-surfaces/`

Dev build at HEAD `382b716f` + `725a0b2b`, a **scratch copy** of `templates/rocket-school` in the
session scratchpad (`git status templates/rocket-school` empty afterwards). s32 left three of AC1's
named surfaces unreached because that project has no variants, no colour styles, no `Icon` node and
no component with ports. **Every one of them is now reached by adding the nodes it needs** — a
`JavaScriptFunction`, a `net.noodl.visual.icon`, a `Component Inputs`, a `Group` and a
`DbCollection2`, placed with `NodeGraphNode.fromJSON` + `graph.addRoot` — and then driven through
the real UI: a port typed into the proplist, a variant created in the popup, two ports added from
the Ports panel's own `+ Port`, one dragged over the other.

Armed first: the renderer's `ComponentPortsView` module carries `IconName` and no `fa fa-`, so the
bundle under the camera is the converted one.

| surface | reached by | drawn | empty | collapsed | box | dark → light |
|---|---|---|---|---|---|---|
| **proplist** (`Script Inputs`, pencil + trash + `+` + `<>`) | `JavaScriptFunction`, one entry named `speed` | **6** | 0 | 0 | 12×12 | `rgb(221,228,236)` → `rgb(74,86,99)` |
| **variants editor** (`Create new variant` **+**, `Remove variant` **×**) | a variant created on the `Icon` node, popup reopened | **2** of 4 (2 hover-only) | 0 | 0 | 14×14 | `rgb(221,228,236)`/`rgb(238,242,246)` → `rgb(74,86,99)`/`rgb(46,57,69)` |
| **icon picker** (the magnifier) | the `Icon` node's `Icon Source` field | **1** | 0 | 0 | 14×14 | see the defect below |
| **Component Ports panel** (pencil, trash, `+ Port`, `+ Group`) | `Component Inputs` selected, ports `title` + `subtitle` added | **4** | 0 | 0 | 14×14 | `rgb(221,228,236)`/`rgb(196,206,219)` → `rgb(74,86,99)`/`rgb(89,98,110)` |
| **drag overlay drop indicator** (`iconHost`) | a port row dragged over its neighbour | **1** | 0 | 0 | 14×14 | `rgb(24,33,43)` on the dragger's own pale ground |
| **colour style picker** (`Create new color style` **+**) | a `Group`'s `Background Color` field | **1** | 0 | 0 | 14×14 | `rgb(221,228,236)` → `rgb(74,86,99)` |

`faLeft` (`i.fa, .fa, [class*="fa-"]`) is **0** inside every one of those scopes. The drag overlay is
the one that could not be argued from a number: its label and glyph share a line
(`→ title` in `drag-overlay-move.png`), which is what the `inline-flex` host in §6 was for.

🔴 **The drive found a defect, and it is AC1's own sentence.** The icon picker's magnifier rendered
**`rgb(0,0,0)` — black — on the dark popout ground** (`icon-picker-dark.png`), about **1.8:1**
against the header's `bg-4`. Cause, measured rather than guessed: an `<i class="fa fa-search
search-icon">` took its colour from `style.css:727` `.search-icon { color:
var(--theme-color-fg-default) }`, but a core-ui `<Icon UNSAFE_className="search-icon">` carries
`.Root { color: inherit }` (`Icon.module.scss:58`) — **the same specificity, injected after that
stylesheet, so `inherit` wins** and nothing up the popout chain sets a colour. A probe `<i
class="search-icon">` appended beside the glyph computed the token (`rgb(74,86,99)`) while the glyph
itself computed black, in the same eval, which is what made the cause certain.

**Fixed** by asking for the token the house way — `variant={TextType.Default}` at both sites
(`iconpicker.jsx`, `avatarpicker.tsx`, which had the identical line) — and deleting the rule, whose
only two consumers those were. Re-driven on the rebuilt renderer: `rgb(221,228,236)` dark,
`rgb(74,86,99)` light (**5.6:1** against the header), `icon-picker-fixed-{dark,light}.png`.
⚠️ `avatarpicker`'s copy is the same one-line change but its surface was not reached — argued, not seen.

⬜ **Still unseen:** `.queryeditor-caret-icon`. The visual query editor needs a `DbCollection2` with
a **class**, and a project with no backend schema has none — the `Filter` row renders as a bare
select and the editor never mounts. It is a CSS-only change (`padding-left: 15px` → `margin-right`)
argued in §6.

**Instrument corrections, all of which would have moved a reading:**

- 🔴 **`drive-icons.js`'s `hasOldFaShare` arm reads TRUE on a dev build and means nothing.** The only
  `fa-share` left in `popuplayer.ts` is inside the CHR-010 comment that documents its removal, and a
  dev bundle keeps comments. The arm that decides "is this the new module?" was keyed on a string
  its own changelog contains. Read `dropTypeIcons` / `classList.add('fa` instead — both were checked
  here and say new / absent. Same shape as §6.5's gate lesson, one layer up.
- 🔴 **`offsetParent` is `null` for essentially every element in this renderer** (they sit under
  transformed ancestors), so "visible" filters written with it silently drop the whole surface. Use
  the rect.
- 🔴 **`document.querySelector('.sidebar-panel')` returns a hidden 0×16 shell before it returns the
  panel a person is looking at** — this editor keeps every visited panel mounted. The first census of
  the Ports panel read **0 drawn**, which is exactly what a surface whose glyphs all failed reads
  like. `census.js` now reports the scope's own box so the two cannot be confused.
- The panel scroller matters: a control at `y=1316` in a 784px viewport is not clickable, and
  `scrollIntoView({behavior:'instant'})` + an `elementFromPoint` check is what makes the click land.

🔴 **One thing found on the way, NOT this task's and NOT fixed:** creating a variant through the
panel leaves the project **unable to save**. After `Create new variant`, `ProjectModel.instance
.variants[0]` is a **plain object** with the serialised shape (`typename, name, parameters,
stateParamaters, stateTransitions`), not a `VariantModel`, so every `doWriteProjectToDisk` throws
`TypeError: v.toJSON is not a function` at `projectmodel.ts` `toJSON()` (`variants.map(v =>
v.toJSON())`) — twice in `.logs/dev.log`. The model-level path is innocent: calling
`ProjectModel.createNewVariant(...)` directly stored a real `VariantModel` in the same session.
A lead, not a diagnosis: `services/ProjectStructure/projectLevel.ts:179` does
`target.variants = slice.variants ?? []` on the styles slice. **Richard's call whether this becomes a
task** (P75/P85 territory); it is recorded here because this drive is where it was measured.

## 6. What §2–§5 got wrong, re-derived at HEAD (s32, 2026-09-18)

Measured before building, not read. Six premises were stale or false.

1. **The census was 32 uses in 16 files; it is 23 in 13.** CHR-009's slices retired nine on their
   way past. The glyph list was stale in both directions: `fa-code` and `fa-check` are gone from
   source entirely (they survive only in the gitignored `index.bundle.js`, which a repo-wide grep
   counts — the same miscount CHR-003 §2 made), while `fa-exclamation-triangle` was never listed.
2. **§3.2 is unnecessary work.** "Expect ≤ 4 missing `IconName`s" — there are **none**. All ten
   glyphs the 23 sites need already exist, with SVGs on disk: `Pencil`, `Trash`, `Plus`, `Search`,
   `CaretDown`, `CaretUp`, `Close`, `DotsThreeHorizontal`, `WarningTriangle`, `ArrowRight`. No new
   art, no `LICENSES.md` change.
3. **§2 names one `<link>`; there are two.** `frames/viewer-frame/index.html:6` links Font Awesome
   as well, and the viewer frame uses **no** FA glyph at all — it was pure boot cost on the surface
   that renders the user's app.
4. **AC3's spec does not exist.** "there is a spec; keep it green" — nothing outside `Icon.tsx`
   referenced the icon directory. The invariant held (168 `IconName`s, 170 SVGs, **0** names without
   a file; 2 orphan SVGs), but nothing guarded it. Written now as
   `tests-unit/chr-010/iconInventory.test.ts`, 3 tests, 3 mutants red. It matters more than a tidy
   count: a name with no file makes `Icon` render an **empty span**, silently — CHR-008 §10.4's
   "drew nothing ≠ never ran" in a second place.
5. **AC2's three strings would have missed the two hardest dependencies**, both found by widening
   the gate's population rather than by the grep:
   - `popuplayer.ts` held FA through `classList.add('fa-share')` — a quoted glyph token, never
     adjacent to the word `fa`. It had **three** FA dependencies, not the one `fa fa-` finds: a bare
     `fa` class on the drop indicator and two glyph classes toggled at runtime.
   - `PortGroup.tsx` wrote ``className={`fa ${x ? 'fa-caret-up' : 'fa-caret-down'}`}`` — the pair
     split by an interpolation. §2 listed the file; a `fa fa-` recount dropped it.
   ⇒ the gate matches four shapes, not three. **A gate's population is exactly what its regex
   matches** ([[a-gate-can-have-a-hole-shaped-like-the-defect]], third time in this phase).
6. **§5's first trap is inverted.** There is no jest `moduleNameMapper` stub for `Icon` — CHR-008
   never added one, and 23 specs carry a per-file `jest.mock` instead. It did not bite: none of the
   13 converted files is imported by a spec that renders it. The new spec reads `Icon.tsx` as
   **text** for exactly this reason — importing it needs the stub, and the stub is what would hide
   the defect the spec exists to catch.

**Two layout facts the conversion turned up**, both invisible to a passing number:

- `Icon` is `display: block`. Four containers relied on inline flow (`sidebar-panel-edit-button`,
  `sidebar-panel-footer-button`, `queryeditor-add-filter-group-inner`, and the drag overlay's
  inline `<i>`). Each is now explicitly centred, with the hardcoded `marginRight: '5px'`/`'10px'`
  at the call sites replaced by a token `gap`. The drag overlay keeps inline flow via an
  `inline-flex` host, because blockifying it would have dropped the drag label onto its own line.
- 🔴 **A fixed-size `Icon` inside a padded box loses the padding to `border-box`.**
  `.queryeditor-caret-icon` had `padding-left: 15px`; with the global `box-sizing: border-box`
  (`style.css:26`) and `Icon`'s 12px width, the whole box would have gone to padding and the glyph
  would have rendered **zero wide**. Now a margin. Nothing would have reported this but the picture.
