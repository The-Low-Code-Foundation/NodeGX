# CMG-008 — Every field says when it leaves its Look

**Opened 2026-09-24** from Richard's drive of P102 (README §2, finding 9).
**Status: 📋 ready.**

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
