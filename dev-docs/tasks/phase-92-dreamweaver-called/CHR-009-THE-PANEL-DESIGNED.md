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

### 7.5 Left

- §3.4 proper: `Variant`/`State` INSIDE General, below the filter (needs `Ports` to host them, or the filter to move
  into the head above the `ScrollArea`).
- The comment field's right edge overshoots the tab strip by ~4px inside the Comment tab.
- 28px `Position`/`Layout` selects → 26 (AC2), gutter dot (AC3), paired Gap/Padding (AC4), resizing segment, colour
  field, Advanced CSS footer.
- AC2's "2 font sizes" now reads **4** on the whole panel: `13px` is `BasePanel`'s `Properties` title (untouched) and
  `15px` the node name (the mockup's `-lg`). Slice 1's "2" was measured inside `.sidebar-property-editor` only.
  Fills over the visible panel: 8 distinct (toggle, dots, glyph wash included) against AC2's ≤ 3.
