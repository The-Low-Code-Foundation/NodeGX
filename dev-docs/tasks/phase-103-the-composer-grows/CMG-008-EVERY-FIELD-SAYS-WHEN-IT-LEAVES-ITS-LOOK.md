# CMG-008 — Every field says when it leaves its Look

**Opened 2026-09-24** from Richard's drive of P102 (README §2, finding 9).
**Status: ✅ built 2026-09-24 (s1)** — 11 specs green, 18/18 drive arms green on a fresh copy, runtime census
1442/1442. §6 has what was built, the census, and what each AC measured.

## 1. The person sentence

> **Someone changes any field on a node that wears a Look, whether alignment, padding, a corner or
> a border, and the field says it now differs from the Look and offers to put it back. A field
> the Look sets shows the Look's value, not a default.**

## 2. What is wrong, measured

*"I changed the 'alignment' of a group node that I'd saved a Look for, and it doesn't say the look
has a different alignment, there's no alert at all. Same for most of the node props, very few of
them actually complain about being out of line with the look."*

**How drift is shown today.**
- `readField` ([`models/Looks/fieldState.ts:85-104`](../../../packages/noodl-editor/src/editor/src/models/Looks/fieldState.ts#L85-L104))
  classifies a key by ownership: `overridden` (Look and node both hold it), `linked` (only the
  Look holds it), `own`, or `default`.
- `rowLook(portName)` ([`Ports.ts:671-698`](../../../packages/noodl-editor/src/editor/src/views/panels/propertyeditor/DataTypes/Ports.ts#L671-L698))
  feeds `PropertyRow` (`:616`), which draws *"Card says 8px"* / *"Overrides Card"* and a revert
  button (`PropertyRow.tsx:252-304`).
- 🔴 `rowLook(undefined)` returns `undefined` (`:672`): **a view with no `name` never asks.**

**The views with no name**, so they never show drift:

| control | ports | why nameless |
|---|---|---|
| `alignTools` | `alignItems`, `justifyContent`, `alignContent`, `alignX`, `alignY` | `AlignToolsType.fromPort` (`AlignToolsType.ts:23-48`) merges them into one view per group via `_toolsType` |
| `marginPadding` | every margin and padding port | `MarginPaddingType.ts:42-57`, same merge |
| tab groups | corner radius (`corners`, `node-shared-port-definitions.ts:1506`), border styles (`border-styles`, `:1597`), slider tabs (`slider.ts:309, 402`) | the `TabGroup` is nameless (`Ports.ts:1358-1370`; acknowledged at `:899`) |
| child views | e.g. script inputs/outputs | `addChildTypeView`, `Ports.ts:1353-1357` |

The Look **does** store alignment: `VariantModel.updateFromNode` (`VariantModel.ts:40-41`)
merges every parameter. The gap is only in the display.

**A second defect.** `AlignToolsType` reads `this.parent.model.parameters[…]` (`:68`, `:140`), the
node's **own** values. A Group whose alignment comes from its Look shows the port **default** in
the buttons. `isVertical()` (`:51`) reads `flexDirection` the same way. So the alignment buttons
can be wrong as well as silent.

**Out of scope, written down:** drift in a non-neutral visual state (hover, pressed).
`lookProvenance` is `undefined` there (`modelProxy.ts:71`). Put it in the README §5 candidates if
the drive shows it matters.

## 3. What to build

1. **Drift per field inside a merged control.** A merged view knows which ports it stands for.
   For each one, ask `readField`, and show the answer **on that part of the control**: the
   padding side, the align button group, the corner. Use the same marker the named rows use (the
   `data-look-treatment` look), plus one line under the control naming what differs: *"Left
   padding and Align differ from Card"*, with a revert per field or *Put back all*. Reuse
   `PropertyRow`'s line and revert rather than drawing a second kind.
2. **Merged controls read the resolved value** (node, else Look, else default) through the model
   proxy, as named rows do. `AlignToolsType` and `isVertical()` first; check `MarginPaddingType`
   and the tab groups for the same raw `parameters[…]` read.
3. **A census, as a spec**, so the next merged control can't slip through. For every node type
   with `useVariants`, for every port the property panel shows: can the drift marker reach it?
   (Named row → yes; merged view → only if its view declares its port list and the row asks
   `readField` for each.) The spec lists the exceptions by name, each with a reason, and fails on
   a new unlisted one. Write the before and after counts here.

## 4. Acceptance criteria

1. **Richard's drive:** a Group wearing a Look; change Align. The Align control shows that it
   differs, names the Look, and *Put back* restores the Look's value. The same for one padding
   side, one corner radius and one border side.
2. A Group whose Look sets `alignItems: center`, with nothing on the node: the Align buttons show
   **center** selected, not the default.
3. The census spec: before/after counts in this file. After = every visible port except the named
   exceptions (visual states, child views if they're kept out, each with its reason).
4. The named rows' drift display is unchanged (the existing Look specs pass, and one named row is
   driven).
5. 🔴 A merged control on a node **without** a Look shows no marker, and a Look editing session
   (CMG-006) shows none either, as named rows behave today.

## 5. Watch for

- 🔴 [[a-whitelist-gate-is-blind-to-a-later-node-class]]: grade the census by *can the marker reach
  it*, never by a list of controls that are known to work.
- 🔴 [[verify-the-consequence-not-just-the-mechanism]]: AC1 is a drive. A spec that `readField` is
  called is not the finding.

## 6. Built (s1, 2026-09-24)

**Four nameless containers, not three.** §2 named the alignment control, the margin/padding box
and the tab groups. The census found a fourth: the **popout group** (`PopoutGroup`, the *Edit*
button that opens a second `Ports` view in a popout) — every kit control keeps its whole label
text style behind one (button, checkbox, radio, options: **129 ports**), and the drift line could
not reach any of them either.

**Drift per field inside a merged control** (`Ports.mergedLook`). A view with no `name` now
answers for every port it stands for: `portsForView` (`utils/portHint.ts`, the same list the
structural hint reads) returns a `TabGroup`'s member views, an `AlignToolsType` /
`MarginPaddingType`'s merged `ports`, and a `PopoutGroup`'s ports (it now collects them,
`addPort`). `readFields` (`models/Looks/fieldState.ts`, pure) classifies each on ownership —
`readField`'s decision, never a value comparison — and the row gets the same
`data-look-treatment` the named rows draw, plus, when any field is overridden, the line
*"Pad Left and Align X differ from Card"* with **Put back <field>** per field and **Put back all**
(one `UndoActionGroup`). Labels come from the port (`editorName` first, so a corner says which
corner). Reverting is the same write a named row's *Revert* makes: the node's own key is cleared
and the Look's value renders again.

**Merged controls read the resolved value** (§3.2). `AlignToolsInput` presses the value in effect
— the node's own, else the Look's (`inherited`, read off `lookProvenance`), else the port default
— and `isVertical()` reads the resolved `flexDirection` through the proxy. The reset dot still
means *this node holds its own value*; it is a different fact and stays own-based. The
margin/padding box already read resolved defaults (`refreshDefault` → `getParameter`).

**The census** (§3.3). Every row with a Look answer carries `data-look-ports`. The drive builds a
`Ports` view for every Look-taking node type on a detached node wearing a synthetic Look that
sets every input, waits for React, and reads which of the panel's style ports some row's answer
covers. The catalog spec (`cmg-008/merged-look.test.ts`) grades the shapes statically and fails on
a port with none of them.

| | count |
|---|---|
| Look-taking node types (runtime library) | **33** (23 in the shipped catalog) |
| style ports the panel draws a row for | **1442** |
| **before** — ports in a nameless container, unreachable by the marker: alignment 49 + margin/padding 136 + corner radii 50 + border-style sides 50 (catalog, 23 types) + popout-group ports 129 (runtime) | **≈414** |
| **after** — reachable | **1442 / 1442** |
| named exceptions, by reason | **73**: the Look row itself ×33, signal inputs ×31, ports with no row (`*` / `mediastream` types) ×9 |

Child ports (`parent`) are drawn inside their parent's row; the runtime census found none on a
Look-taking type. Non-neutral visual states stay out of scope as §2 wrote down.

**§4 measured** (`scripts/devtools/drive-cmg008-drift.js` on a fresh copy of *CMP-001 Composer
Drive*; the census in `cmg008-census.json`):

| AC | reading |
|---|---|
| 1 | a Group given `alignX`, `alignItems`, `paddingLeft`, `borderTopLeftRadius`, `borderLeftStyle`, `opacity`, saved as the Look *Card*; then each changed on the node. The Align row: `data-look-treatment="overridden"`, `data-look-name="Card"`, line *Align X differs from Card*, button `look-revert-alignX`. The same for *Pad Left*, *Corner Radius (TopLeft)* (a tab group) and *Border Style (Left)* (a tab group). *Put back* on each: the node's own key gone, the Look's value resolved (`center`, `16px`, `8px`, `solid`), one undo step each; every row then reads `linked`. Shot `shots/cmg008-ac1-overrides.png` |
| 2 | a second Group wearing *Card* with nothing of its own: the Align Items row's pressed segment is `center`, no reset dot; its alignment, padding, corner and border rows read `linked` from Card with no line. Shot `shots/cmg008-ac2-linked-wearer.png` |
| 3 | above; before ≈414, after 1442/1442 |
| 4 | the named `opacity` row still reads *Card says 0.9* with its `look-revert` button; the existing Look specs (`sty-003`) pass |
| 5 | a Group with no Look: 0 rows with a treatment; the Look editor (CMG-006) on *Card*: 0 rows with a treatment |

**Seen on the way:** a template literal handed to CDP with a backtick in a comment evaluates to a
number, and `Runtime.evaluate` answers *Invalid parameters* — the drive's census failed twice on
that before the expression was checked with `new Function`.
