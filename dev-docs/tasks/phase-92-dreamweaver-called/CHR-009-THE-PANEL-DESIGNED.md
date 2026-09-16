# CHR-009 — The panel, designed

Only now is the panel a thing that can be designed: one tree, five sizes, one radius. This task
builds the audit's second mockup — the 328px column beside the shipped one in
[`audit/dreamweaver-called.html`](./audit/dreamweaver-called.html) — and asks Richard whether it
is worthy.

## 1. The person sentence

**Someone editing a Group reads its properties as one aligned column: labels in one place, units
inside the field, a filled dot where a wire arrives, paired values on one row, a chevron that is
a chevron — and nothing on the panel comes in more than five sizes.**

## 2. The spec

The mockup, element by element. Numbers are at the default 328px panel and are the proposal;
R6 and R7 are the two rulings it needs.

| region | shipped (0.2.4) | proposed |
|---|---|---|
| head | `Properties` title row, node name row with three icon buttons, a `GROUP · VISUAL` chip, a `COMMENT` label + box, `Properties \| Ports` tabs, `Add style variant`, `Neutral state`, filter — **seven zones** before the first property | title row; a node row (glyph in a `primary`-wash tile, name at `-lg`, `VISUAL · UI ELEMENTS` eyebrow in mono, `···` menu); a segmented `Properties \| Ports`; filter with a `/` key hint; the Comment as a dashed placeholder (R7); variant and state become **rows in General** |
| section header | `▾ GENERAL` text glyph, 11px | `<Icon chevron>` + mono uppercase `-xs` with `.08em`, 30px tall, a right-aligned count when filtered |
| row grid | label `37%` / `62px` / `160px` (duplicated in two packages), control heights 24–32 mixed | `grid-template-columns: 8px 116px 1fr` (R6); **one control height, 26px**; `gap 0 8px`; label `-sm` in `fg-muted`, ellipsised with a tooltip |
| connection state | a `●` after the label, same colour as text | a 6px dot in the 8px gutter: outlined when unconnected, filled `primary` with a 3px wash ring when a wire arrives |
| number + unit | number field, then a separate unit box, then `Fixed` + an unlabelled square | one field: mono value, unit as a suffix inside the field in `fg-muted`; the size mode as a 3-icon segmented control beside it |
| dimensions | four resizing icons + a stray dot, then Width, Height rows | Width and Height rows each with value+unit+mode; `Min · Max width` as a paired row |
| paired values | Vertical Gap, Horizontal Gap as two rows; padding as four | `Gap` ↕ ↔ on one row; `Padding` ↕ ↔ on one row with a `per-edge` expander; same for margin |
| gated group | six rows each followed by "X applies when Shadow Enabled is on. Show Shadow Enabled" | the group's rows dimmed to 45% and **one** line: "Offset, blur, spread, inset and colour apply once Shadow is on" + `Turn on` (CHR-008 R8) |
| colour | `#000000` text + a swatch box in a separate cell | one field: swatch, hex in mono, alpha as the unit suffix |
| Advanced CSS | a collapsed section with a text chevron | a footer row with a right chevron and a count of set properties |
| type sizes | 10 distinct (9–14) | **2**: `-sm 12` for labels and values, `-xs 11` mono for eyebrows/units |
| fills | 9 distinct backgrounds | 3: panel `bg-1`, field `bg-0`, segmented-selected `bg-3` |
| radii | 4, 6, 8, 50%, 9999 | 6 on fields and segments, `full` on toggles and dots |

## 3. Scope

1. Build the table above in `<PropertyPanel>`, `<PropertyGroup>`, `<PropertyRow>` and the 15 shared
   widgets under `noodl-core-ui/src/components/property-panel/`. The row grid is **one** rule in
   `PropertyRow.module.scss`; the `:global(.sidebar-property-editor)` hook is already gone (CHR-004).
2. The `NumberUnitInput` and `Dimension` widgets merge value, unit and mode into one control;
   `MarginPaddingInput` becomes the paired row with an expander.
3. The four-icon resizing segment (`ResizingType`) becomes the per-axis mode segment; its stray
   dot is the connection indicator, which now lives in the gutter.
4. The variant picker and visual-state picker become rows in General (`Variant`, `State`) with
   the same `Select`; `VariantsEditor` and `VisualStates` keep their editing UI behind those rows.
5. Both themes. Light is not an inversion: the field ground in light is `bg-0` at `#f6f8fa`-ish and
   the gutter dot ring must still read — measure with the CHR-004 gate.
6. A `verdicts/CHR-009/<date>/` set: Group, Text, Image, Function, Query Records, Columns, a
   States node, a node with a `PopoutGroup`, a node with a `TabGroup` (per-edge borders) — the
   nodes where the row types differ most — at 328px and at the widest `WIDE_MAX_WIDTH`.

Out: panel width, float/dock behaviour, the rail. `ComponentPortsView`. The Ports tab beyond
inheriting the row grid.

## 4. Acceptance criteria

1. **(person) — the close.** Richard puts `verdicts/CHR-001/…/props-group-top.png` beside
   `verdicts/CHR-009/…/props-group-top.png` and rules **WORTHY** or not. Not-WORTHY names the
   region from §2 that fails and the task stays open.
2. CHR-001's eval on the Group: **2 font sizes, ≤ 3 fills, ≤ 2 radii**, every label's left edge
   at the same x (assert `getBoundingClientRect().left` across all `label`s in the panel is one
   value), every control's height 26.
3. A wire into Width (drive it: connect from a Number node) flips the gutter dot from outlined to
   filled with the ring; disconnect flips it back. Measured on the rendered dot, not the model.
4. Per-edge padding: click the expander, four fields; type into `top`, collapse: the paired row
   shows the mixed state (`↕ 8 · 0` or a `mixed` marker — decide, record) and the model holds
   four values.
5. The CHR-004 contrast gate green on every screenshot in §3.6, both themes; the scale gate green;
   `test:ci` at the floor.

## 5. Traps

- 🔴 **`Transform Origin X/Y` and the corner-radius ports sit in collapsed groups and a `TabGroup`
  reporting 0×0** — filter the panel (`Filter properties`) to reach them in a drive, and read
  heights not text ([[a-collapsed-section-body-is-still-mounted]]).
- 🔴 **A unit inside the field changes what `cdp type` types into.** Drive every merged control
  with a real keystroke sequence including the unit (`50%`, `12px`) and read the model, not the
  field text.
- ⚠️ A label column at 116px fits `Horizontal Gap` and not `Multi Line Wrap` — the ellipsis and
  tooltip are load-bearing, and the mockup renames three labels (`Direction`, `Wrap off`). Renamed
  labels are display-only; port names do not change.
- ⚠️ The mockup renders the `Comment` as a dashed placeholder. P75 owns it; the placeholder's
  text is theirs to change, its position is R7.

## 6. Slice 1 — the row geometry (2026-09-16, s12)

Richard picked CHR-009 over continuing CHR-008 §3.1 and over CHR-004, because s9–s11 changed nothing visible.
This slice is the part every row draws, whichever widget sits inside it.

### 6.1 What §3 got wrong

- 🔴 **"the `:global(.sidebar-property-editor)` hook is already gone (CHR-004)" is false.** CHR-004 was never
  built. The hook is live at `PropertyPanelInput.module.scss`, and the 37% label rule is **duplicated** for
  legacy rows at `propertyeditor.css` `.property-row > .property-label`. Both have to change together.
- 🔴 **The row grid cannot be "one rule on `.property-panel-row`".** `PropertyRow` wraps ONE opaque control
  element, and the label is drawn *inside* it (`PropertyPanelInput` / `PropertyPanelRow` / a legacy row
  class). The column moves where the label is drawn, not on the row.
- `PropertyPanelBaseInput` declared `className`, destructured it, and **never applied it**. A caller's class
  arrived nowhere. Fixed (the only caller passing one is the new `NumberUnitInput`).

### 6.2 Built

| region (§2) | now |
|---|---|
| row grid (R6 **trial**) | label column a fixed **116px**, `nowrap` + ellipsis, `title` = the label; row `min-height: 30px`; legacy rows mirror it |
| section header | drawn SVG chevron (inline, so `tests-unit` can still render it), mono uppercase `-xs`, `.08em`, **30px** |
| number + unit | **one 26px field**: value left in mono, unit as a suffix inside it; `Fixed` is a 26px pressed/unpressed chip (`aria-pressed`, disabled unless %), no FontAwesome `fa-check` |

Files: `PropertyPanelInput.module.scss`, `PropertyPanelInput.tsx`, `PropertyPanelRow.tsx`, `PropertyPanelBaseInput.tsx`
(core-ui); `propertyeditor.css`, `components/PropertyGroups.tsx`, `components/NumberUnitInput.tsx` + new `.module.scss`.

### 6.3 Driven

Dev stack (`npm run dev:debug`, `NOODLPORT=8674`, `NOODL_REMOTE_DEBUG_PORT=9333`), a scratch **copy** of
`templates/story-engine`, Group `app_root`, recents seeded then restored **byte-identical** (sha `a1ea46f2…`).
Scripts: `verdicts/CHR-009/2026-09-16/drive.js` (measure + screenshot, both themes), `interact.js` (real input).

| reading (Group, visible part, both themes identical) | CHR-001 0.2.4 | after |
|---|---|---|
| font sizes on visible text | 10 | **2** (12, 11) |
| label left edges | not measured | **1** (x = 70, all 6 visible; the first build also had `Fixed` ×2 at x = 272) |
| Width value | `100` (installed build) | `100`, not clipped (first build: **`1(`** — see 6.4) |
| section header | text `▾`, 11px line | SVG chevron, 30px |
| labels cut by 116px (R6) | — | **4 / 59 drawn = 6.8%**: `Background Gradient`, `Scroll To Element - Duration`, `Scroll To Index - Index`, `Scroll To Index - Duration` |
| fills (distinct) | 9 | 5 |

Interaction (`after/interact-results.json`): a CDP click on `Fixed` is reachable (`elementFromPoint`) →
`width.isFixed: true`, undo → cleared in 111 ms; `Input.insertText "64"` + blur → `{value: 64, unit: "%"}`, undo →
model and field both back to `100`.

Gates: targeted `tests-unit` **20 suites / 332 tests** (EXIT 0), `tsc --noEmit` **0 errors**, `npm run type` and
`npm run colors` holding.

### 6.4 Traps met

- 🔴 **The first drive's numbers passed while the picture was broken.** "2 font sizes, one label x, 30px headers"
  and Width drew `1(`: the fixed column is ~9px wider than 37% was, and Width packed four boxes into the rest.
  `drive.js` now reads each Width/Height input's `scrollWidth > clientWidth`. Look at the PNG, every time.
- 🔴 The 2nd picture still centred the value: the `className` never reached the input (6.1). At equal
  specificity `.Root.is-numeric` won by load order ⇒ the class is doubled (`.Value.Value`).
- 🔴 A click on `Fixed` rebuilds the row, so a retry that reads `…find(label).parentElement` **throws** mid-rebuild.
  The retry has to swallow the throw, or it crashes after the undo has run and reads as "nothing happened".
- `Fixed` persists as `width.isFixed` (`Dimension.ts`), not as a port of its own.

### 6.5 Left (AC2's other clauses, then the rest of §2)

- **28px controls remain**: `Position`/`Layout` selects (`PropertyPanelSelectInput`) and legacy `.property-value`
  rows. AC2 wants every control at 26.
- The **head** (seven zones → title, node row, segmented tabs, filter, dashed comment; R7's comment tab).
- The gutter connection dot (AC3), paired rows (Gap/Padding), per-edge expander (AC4), the resizing segment,
  the colour field, the Advanced CSS footer row, variant/state as General rows.
- R6 stays a **trial** until Richard has looked at `after/props-group-top-{dark,light}.png` beside
  `verdicts/CHR-001/2026-09-15/editor-group-panel-top-{dark,light}.png`.

## 7. Slice 2 — the head (2026-09-16, s13)

Richard on slice 1: *"I literally don't see the difference"* — true: the rows changed by a chevron and one field,
and the top ~55% of the screen (the head) was untouched. This slice takes the largest area left.

### 7.1 Built

| region (§2) | before (slice 1, `01ac44c38`) | now |
|---|---|---|
| node row | name + 3 icon buttons, then a coloured `GROUP · VISUAL` chip on its own row, then a hairline | ONE row: 28px category glyph on its category wash, name at `-lg`, `TYPE · CATEGORY` as a mono `-xs` eyebrow under it, the 3 icon buttons (kept — the mockup's `···` menu would hide delete/docs; not built) |
| comment (**R7**) | `COMMENT` label + field between the header and the tabs | a **`Comment` tab beside `Ports`**, always present; a 6px `primary` dot on the tab once a comment exists (the *proposed, not ruled* marker detail — built so R7 never hides a note; `TabStripTab.hasMarker`) |
| tabs | full-bleed two-block `Sidebar` strip, 40px | `TabsVariant.Segmented` with equal segments, 24px segments in a 30px track on `bg-2`, selected `bg-3` |
| variant / state (§3.4 partly) | two 50px bars, "Add style variant ＋" (FontAwesome) and "Neutral state ⇕" | two 30px rows of the label column: `Variant` / `State`, 116px label, a 26px field (`bg-2`, `border-default`), `Edit` / `Transitions` as 26px buttons. **Not yet inside General** — they sit above the filter, because the filter is rendered by `Ports` and General is a `Ports` group |
| filter | `SearchInput`'s 45px bar, 14px text, 22px glyph | 30px, `-sm` text, 14px glyph; same `border-control` edge (NAT-001's pairing unchanged). **No `/` hint** — no `/` shortcut exists, and a hint for a key that does nothing is a lie |

Files: `noodl-core-ui` `Tabs.tsx` + `Tabs.module.scss` (marker); editor `propertyeditor/index.tsx` (tabs, `useHasComment`),
`NodeLabel.tsx`, `variantseditor.tsx`, `visualstates.tsx`, `propertyeditor.css`, `variantseditor.css`, `visualstates.css`;
`tests-unit/leg-005/nodeCommentRow.test.ts` (placement assertion rewritten to R7 — see 7.3).

### 7.2 Driven

Dev stack, scratch copy of `templates/story-engine`, Group `app_root`, recents seeded and restored byte-identical
(`a1ea46f2…`). Scripts in `verdicts/CHR-009/2026-09-16/head/`: `drive-head.js` (measure, screenshot, real input),
`extra-paths.js` (Comment tab content; a non-visual node). Results: `head-results.json`, `extra-paths-results.json`.

**The look, same crop:** `after/props-group-top-{dark,light}.png` (slice 1) beside `head/props-group-top-{dark,light}.png`.

| reading (Group, both themes identical) | slice 1 | slice 2 |
|---|---|---|
| first property row (`Mounted`) below the panel top | ≈467 px ‡ | **296 px** (−171) |
| head zones | node + chip ≈75, comment ≈80, tabs ≈40, variant 50, state 50, filter ≈59 ‡ | node row **55**, tabs **30**, variant **30**, state **30**, filter **40** |
| Variant/State label x vs property label x | — | **17 = 17** (one column) |
| head control heights | 45 (filter) | **26, 26, 30** |
| tab labels clipped at 296px | — | 0 of 3 |

‡ Read off slice 1's PNG (2× pixels ÷ 2, same crop, panel top at the same y) — slice 1's drive did not measure
the head. `variant`/`state` 50 are the CSS `min-height`.

Real input (CDP mouse at an `elementFromPoint`-verified point, `Input.insertText`), dark:

| act | result |
|---|---|
| open `Comment`, type, click `Properties` (blur commits) | model `getComment()` = the text; marker **on**; rows back on Properties |
| `__nodeGraphEditor.undo()` | model `null`; marker **off** |
| State field → pick `Hover` | list opened (`Neutral`, `Hover`), closed on pick, field reads `Hover`; picked back → `Neutral` |
| Variant field | picker popout opens; **Escape did not close it** (a blocker click did) — not compared against HEAD, may be pre-existing |
| a `CSS Definition` node (`javascript`) | pink `ƒ` tile, `CSS DEFINITION · FUNCT…` and a long name both ellipsised, actions stay in the row; no State row (the type has no visual states) |

### 7.3 Readings and gates

- `tsc --noEmit` (editor) **0 errors**. `npm run type` / `npm run colors` **holding**.
- Full editor `tests-unit` (`npx jest` in `packages/noodl-editor`, stack down): **468 suites / 7,650 tests, EXIT 0**.
- `leg-005` "sits above the tab strip and below the label" pinned the placement R7 ruled away; rewritten as "is a tab
  beside Ports, always present, marked once written". Red against HEAD's `index.tsx` (1 failed), green after.
- `test:ci` **not run**.

### 7.4 Traps met

- 🔴 **A stylesheet that loads later wins an equal-specificity override.** `.property-editor-visual-states`'s divider
  lived in `visualstates.css`, required by `visualstates.tsx` *after* `variantseditor.css`; my `border-bottom: 0` in
  the earlier file lost, and only the PNG showed the full-bleed line. Fixed at the source.
- The drive's popout dismiss clicked the node name and hit `popup-layer-blocker` — a popout covers the whole panel.
- The dev log's "two children with the same key" errors carry a UUID key (the launcher's recents), not a head key.

### 7.5 Rulings

**Richard's rulings on slice 2 (2026-09-16, after s13):** (1) direction — *"Yeah it looks nice"*; (2) the Comment-tab
marker — *"I like it"* (**ruled: keep**); (3) R6's 116px column — *"looks ok so far"* (**still a trial, trending keep**);
(4) the mockup's `···` menu — *"I'd leave them where they are actually"* (**ruled: the help / rename / delete buttons
stay in the node row; do not build the menu**).

### 7.6 Left

- §3.4 proper: `Variant`/`State` INSIDE General, below the filter (needs `Ports` to host them, or the filter to move
  into the head above the `ScrollArea`).
- The comment field's right edge overshoots the tab strip by ~4px inside the Comment tab.
- 28px `Position`/`Layout` selects → 26 (AC2), gutter dot (AC3), paired Gap/Padding (AC4), resizing segment, colour
  field, Advanced CSS footer.
- AC2's "2 font sizes" now reads **4** on the whole panel: `13px` is `BasePanel`'s `Properties` title (untouched) and
  `15px` the node name (the mockup's `-lg`). Slice 1's "2" was measured inside `.sidebar-property-editor` only.
  Fills over the visible panel: 8 distinct (toggle, dots, glyph wash included) against AC2's ≤ 3.

## 8. Slice 3 — Size Mode, the gutter, the section rhythm (2026-09-16, s14)

The handoff's first item was §3.4 (Variant/State into General), which moves two rows by one filter's height. s12's
lesson ranks slices by **screen area changed**, so this slice took the largest regions left in the top crop: the
four-icon size strip, the `●` after labels, and the air between groups.

### 8.1 Built

| region (§2) | before (slice 2, `87004451f`) | now |
|---|---|---|
| dimensions — size mode | four 30px icon boxes centred on an unlabelled 50px strip, reset dot at its right edge | **one 30px row of the label column**: `Size Mode`, then `W` [given \| fits] and `H` [given \| fits] as 26px segmented tracks of real `<button aria-pressed>`s. Still writes the one `sizeMode` enum (`model/sizeModeAxes.ts`). Each button's `title` is the mode that press produces, in the port's own tooltip words |
| connection state (AC3) | the reset `●` drawn *inside* the label box, after the text (R6's `overflow: hidden` could clip it) | `GutterDot` in the 16px left of the label column, centre x = 9 on every row: **connected** → filled `primary` 6px dot with a 3px `primary-bg` ring (not clickable; the chip beside it is the click); **changed** → the reset dot (same class, title, click); **neither → nothing** |
| section rhythm | `.property-group` padding 13 / 15 | 6 / 10 (the mockup's `section`) |

⚠️ **Deviation from the mockup, for Richard's look:** the mockup draws an *outlined* dot on every row, and AC3 says
"flips from outlined to filled". Not built: rows that do not draw through `PropertyPanelInput`/`PropertyPanelRow`
(legacy `.property-row`s, the align strips, the margin/padding box, `Variant`/`State`) would have no ring, and the
gutter would read as a pattern with holes. One CSS rule adds it back if he wants it.

⚠️ `W`/`H` are two independent axes by design. The rows they switch off are **not removed**: `addDimensions`
gates `width`/`height` on `sizeMode`, so FB-021/R8 keeps them drawn, dimmed, under one gate line. That line's
wording ("Width and Height apply when Size Mode is Explicit, or is not set") predates this slice.

### 8.2 🔴 The defect the drive found: a wire never reached an open panel

`Ports.bindModel` subscribed to `connectionAdded`/`connectionRemoved` through `model.owner && model.owner.on(…)`.
**`Ports.model` is a `ModelProxy`, and the proxy has no `owner`** — so that subscription, and FB-017's
`nodeAttached`/`nodeDetached` hint refresh beside it, **had never bound anything since the initial commit.** Even
bound, the connection handler called `renderGroups` without clearing `_portsHash`, whose inputs (ports, variant,
capabilities, schema, filter) do not include connections, so it would have returned early.

Measured on the dev build, same rig, the fix as the only varied thing:

| arm | wire `app_router.childIndex → app_root.width` with the Group's panel open | after selecting another node and back |
|---|---|---|
| before (`graphOf` absent) | reset dot, **no chip**, 1.5 s later still none | connected dot + chip |
| after | **connected dot + chip at 263 ms**; undo → reset dot, no chip, at 113 ms | — |

Fix: `graphOf(model)` / `nodeOf(model)` read through the proxy (a bare model is its own node — the project
settings tab passes one); a wire whose `toId`/`fromId` is this node clears the hash. A wire elsewhere in the
component still hits the hash and does not rebuild (a rebuild costs the caret — §3.5).

⚠️ Side effect, intended but **not separately driven**: FB-017's child attach/detach hint refresh now runs.

### 8.3 Driven

Dev stack, scratch copy of `templates/story-engine`, Group `app_root`, recents seeded and restored byte-identical
(`a1ea46f2…`). Script `verdicts/CHR-009/2026-09-16/rows/drive-rows.js`; results `rows/rows-results.json`.
**The look, same crop:** `head/props-group-top-{dark,light}.png` (slice 2) beside `rows/props-group-top-{dark,light}.png`;
also `rows/props-group-lower-*.png`, `props-group-fit-both-dark.png`, `props-group-width-connected-dark.png`.

| reading (Group, both themes identical) | slice 2 | slice 3 |
|---|---|---|
| size control | 50px strip, no label | 30px row, label `Size Mode`, 2 × 26px segments, no overflow |
| label left edges (top crop / scrolled crop) | 17 | **17 / 17** (one value, incl. Variant/State) |
| gutter marks | after the label text | centre x **9** on all 4 seen, vertically centred on the row (Δ 0), `elementFromPoint`-reachable |
| Dimensions header / Width row / Layout header (PNG px ÷ 2, same crop) | ≈395 / 477 / 570 | ≈376 / 440 / **521** |
| Alignment header | below the 900px crop | ≈846, in the crop |
| visible font sizes over `BasePanel` | 4 (13 title, 15 name, 12, 11) | 4, unchanged |
| distinct fills (visible) | 8 | 7 |

Real input (CDP mouse at an `elementFromPoint`-verified point), dark:

| act | result |
|---|---|
| click `W fits` | model `contentWidth`; pressed `width:fits, height:given`; Width row **gated** (drawn, dimmed), Height live |
| click `H fits` | model `contentSize`; both rows gated |
| undo × 2 | model `explicit`; both rows live; pressed `given, given` |
| Size Mode row focusables | 4 (was 0 — FB-021's `revealGateTarget` fell back to focusing the row) |
| wire into `width`, undo | see 8.2 |

### 8.4 Gates

- `tsc --noEmit` (editor) **0 errors**. `npm run type` / `npm run colors` **holding**.
- New `tests-unit/chr-009/sizeModeRow.test.tsx`, 18 tests: all four enum values read AND written against the
  runtime's own table (`Layout.size`), unknown value presses nothing, reset dot only off-default, gutter mark kinds,
  mark not inside the label. Mutant (swap `contentWidth`/`contentHeight` in the table) → **5 red**.
- Full editor `tests-unit` (stack down): **469 suites / 7,668 tests, EXIT 0** — s13's 468 / 7,650 plus exactly this suite.
- `test:ci` **not run**.
- The connection fix has **no unit test**: `Ports.ts` cannot load in plain jest without stubbing every import
  (s4). The drive's before/after arms are its grade.

### 8.5 Traps met

- 🔴 **`model.owner && …` on a proxy is a silent no-op.** A guard that reads "only if there is an owner" also reads
  "never", and nothing reports it. Check a guarded subscription binds at all before reasoning about what it does.
- 🔴 The `PropertyPanelInput` **index** pulls in `Icon`; a spec rendering anything that imports it fails TO RUN
  (`Tests: 0 total`). Import `PropertyPanelInput/PropertyPanelRow` directly.
- A read taken mid-rebuild finds **no row at all** for <113 ms after an undo. Retry on the END state, not on "not X".
- A gated row is drawn, not removed — "row drawn: true" after `W fits` looked like a failure until the drive read
  the three states (live / gated / absent).

### 8.6 Ruling

**Richard on slice 3 (2026-09-16, after s14): *"Looks good, I like it"*.** He approved the build as drawn, which has
**no outline** on unmarked rows. The outline question was not answered directly, so treat "no outline" as approved
by the look, not as a separate ruling. Don't add outlines unless he asks.

### 8.7 Left

- **By screen area, next:** the Margin & Padding box (~145px of the lower crop) → paired `Margin`/`Padding` rows with
  a per-edge expander (AC4); the Alignment / Align-and-Justify icon strips (unlabelled, off the label column).
- `Fixed` chip beside Width/Height (the mockup has no such chip; `isFixed` still needs a home).
- §3.4 proper (Variant/State inside General); 28px `Position`/`Layout` selects (AC2 — heights not yet measured on
  this build); colour field; Advanced CSS footer; the comment field's 4px overshoot; Escape on the Variant picker.

## 9. Slice 4 — Margin & Padding as paired rows (2026-09-16, s15)

The largest region left in the lower crop: the 150px box-model drawing (a dashed margin ring, a padding block,
eight 40px boxes, an inline edit box that opened over them, and POL-012's two lock buttons).

### 9.1 Built

| region (§2) | before (slice 3, `9960c4aea`) | now |
|---|---|---|
| paired values (AC4) | the 150px box, off the label column | **two 30px rows of the label column**: `Margin` and `Padding`, each `↕` (top + bottom) and `↔` (left + right) as 26px fields with a drawn glyph, and a 26px per-edge button |
| per-edge expander | — | pressed → the same row shows four fields, `↑ ↓` over `← →` (62px); pressed again → the pair |
| mixed display — **decided** | — | a pair whose two sides differ is an **empty field with a muted `mixed` placeholder**; its tooltip names both (`Top 8px · Bottom 0px`); typing sets both. `↕ 8 · 0` was the other candidate and does not fit a ~61px field |
| unit | a dropdown inside the edit box | **typed**: `50%` switches, `12px` switches back, a bare number keeps the field's unit. A non-px unit draws as a muted suffix; px draws none (the old box's rule) |
| undo | one step per side, or four via the lock | a pair = **one** step; a drag = one step; reset clears one group as one step |
| reset | one dot for all eight sides | the row's gutter dot, per group |

Files: `components/MarginPaddingInput.tsx` (rewritten) + new `.module.scss`, `components/marginPaddingEdit.ts`
(`axisComps`, `pairDisplayOf`, `commitMarginPaddingPairEdit`, `fieldTextOf`, `MARGIN_PADDING_UNITS`),
`DataTypes/MarginPaddingType.ts` (`updateComps`, `commitDrag`, `expanded`); `style.css` loses the 105-line
`marginpadding-*` block; `scripts/pol39-live/pol012-linked-sides.js` deleted (it drove the lock).

⚠️ **POL-012's "set all four together" lock is REMOVED — for Richard's look.** The mockup has no lock, and the
pair row covers the case in two entries (`↕` then `↔`) instead of one. But POL-012 was a *reported* request
(item 14: "set all values at once"), so this is a regression in keystrokes for that one case. If he wants it
back, the cheapest shape is a third collapsed field or "typing into a pair while Shift is held sets all four" —
not the old hidden lock mode.

### 9.2 Driven

Dev stack, scratch copy of `templates/story-engine`, Group `app_root`, recents seeded then restored byte-identical
(`a1ea46f2…`). Script `verdicts/CHR-009/2026-09-16/box/drive-box.js`; results `box/box-results.json`.
**The look, same crop:** `rows/props-group-lower-{dark,light}.png` (slice 3) beside `box/props-group-lower-{dark,light}.png`;
also `box/props-group-box-{dark,light,expanded-dark,mixed-dark,120-dark,percent-dark}.png`.

| reading (Group, both themes identical) | slice 3 | slice 4 |
|---|---|---|
| `Style` header in the lower crop | 661 px | **575** (−86) |
| Margin / Padding rows | 150px drawing | **32 / 32**, fields and expander 26 |
| label left edges | 17 | **17** (Margin, Padding included) |
| old box elements | present | **0** |
| `120` in a pair field | — | **not clipped** |
| `mixed` placeholder | — | 33 px text in 39 px of room |

Real input (CDP mouse at an `elementFromPoint`-verified point, `Input.insertText`, CDP Enter), dark:

| act | model | one undo |
|---|---|---|
| `↕` padding: `120` + Enter | top **and** bottom `120px`, left/right untouched | all four back to `0` |
| expand → 4 fields; `↑` top: `8` + Enter; collapse | `8 / 0 / 0 / 0`; `↕` empty, placeholder `mixed`, tooltip `Top 8px · Bottom 0px` | restored |
| `↔` padding: `50%` + Enter | left/right `50%`; field `50`, suffix `%` | restored |
| drag on `↔` margin (unset) | left/right `24px` | back to **unset** |

### 9.3 What the drives caught (six runs)

- 🔴 **Undo after a drag did nothing** (run 1: dragged unset → 24, undo, still 24). `setParameter`'s `oldValue`
  override is checked with `if (args.oldValue)`: an unset start reads as "not supplied" and the entry records
  the dragged value. FB-022's `scrubCommit.ts` already documented this and called it "unreachable from
  margin/padding" — true of the old single-side drag, false for a pair that starts unset. Fixed with
  `commitDrag` (the `commitScrub` construction, one group wide); unit test red on the bypass mutant (2 red).
- 🔴 **The numbers passed while the picture was broken, again.** Run 1's clip check read the input's value
  only; the PNG showed the placeholder as `m.. px`, and each field had ~16 px for its value (`120` → `1…`).
- 🔴 **My first fix made it worse:** a px ↔ % toggle drawn on hover took the click meant for the value —
  `120` + Enter stored **`0%`** (run 3). Replaced by typing the unit.
- 🔴 A text-slicing edit cut at the NESTED `.Expander {` inside `.Track` ⇒ `SassError`, "Reload prevented",
  and run 4 timed out on a blank page. Read `.logs`/`dev.log` for `SassError|ERROR in` before re-driving.
- A setup write straight to `NodeGraphNode.setParameter` is invisible to the panel (s10's trap): the rows
  showed a stale `24` while the model held unset. Setup only — the drive reads the model.

### 9.4 Gates

- `tsc --noEmit` (editor) **0 errors**. `npm run type` / `npm run colors` **holding**.
- New `tests-unit/chr-009/marginPaddingRows.test.ts`, **17 tests**: the axis table, pair display (same /
  mixed / inherited-0 / units), pair and per-edge commits, typed units, `fieldTextOf`, expander writes nothing,
  a pair is one undo group, drag-undo returns an unset side to unset, reset is one group. Axis-swap mutant →
  **7 red**; drag-commit bypass mutant → **2 red**.
- `rel-014/tokenFieldValueRemainingCopies` re-pointed from the lock to the pair (32 tests before and after):
  "four tokens agree ⇒ lock seeds on" → "four tokens read as one pair value"; "an emptied linked field clears
  all four" → one per-edge field clears one side, a pair clears its two.
- Full editor `tests-unit` (stack down): **470 suites / 7,685 tests, EXIT 0** — s14's 469 / 7,668 plus exactly
  this suite (17).
- `test:ci` **not run**.

### 9.5 Left

- **By screen area, next:** the two alignment icon strips (`Alignment`; `Align and justify content`) — ~160 px
  of the lower crop, unlabelled, off the label column.
- `Fixed` chip beside Width/Height; 28px `Position`/`Layout` selects (measure first); §3.4 proper; colour
  field; Advanced CSS footer; comment field 4px overshoot; Escape on the Variant picker.
- A token in a pair field ellipsises (`--sp…`) — every new Text Input carries `var(--space-2)` padding. The
  full token is in the tooltip; the old 40px boxes clipped it too. Worth Richard's eye on a Text Input.
