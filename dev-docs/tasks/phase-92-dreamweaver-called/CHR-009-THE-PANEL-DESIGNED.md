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
