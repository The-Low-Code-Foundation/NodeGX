---
title: "Checkbox"
---
Checkbox control: a styled boolean toggle exposing checked as a level and onChange as an edge.

The Checkbox control renders a toggle with full style/state theming. `checked` is both an input (set programmatically) and an output level holding the current value; `onChange` fires on each user toggle. Interaction state (`hoverState`, `pressedState`, `focusState`) and `enabled` behave as on the other controls, with per-visual-state styling ports.

## When to use it

Boolean choices the user flips directly: settings, consent, done flags. For one-of-many choices use Radio Buttons in a Radio Button Group; for an on/off in logic without UI, use a Switch node.

## At a glance

| | |
|---|---|
| Category | Visual |
| Type name | `net.noodl.controls.checkbox` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 5 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `alignX` | Enum (`left`, `center`, `right`) | — | Horizontal alignment of this element within the space its parent gives it |
| `alignY` | Enum (`top`, `center`, `bottom`) | — | Vertical alignment of this element within the space its parent gives it |
| `backgroundColor` | Color | `transparent` | Fill colour of the box itself, behind the tick |
| `blockTouch` | Boolean | — | Stops every pointer event that lands on this control from reaching the nodes it sits inside. Blunt: it takes hover and pointer-down with it, so reach for Click Bubbling first if it is only clicks you want to keep in |
| `borderBottomColor` | Color | — | Colour of the bottom edge only, overriding Border Color |
| `borderBottomLeftRadius` | Number | — | Rounds the bottom-left corner only, overriding Corner Radius |
| `borderBottomRightRadius` | Number | — | Rounds the bottom-right corner only, overriding Corner Radius |
| `borderBottomStyle` | Enum (`none`, `solid`, `dotted`, `dashed`) | — | Line style for the bottom edge only, overriding Border Style; None hides that edge |
| `borderBottomWidth` | Number | — | Thickness of the bottom edge in pixels, and it adds to the element's size |
| `borderColor` | Color | `#000000` | Colour of the border, which has no effect while Border Style is None |
| `borderLeftColor` | Color | — | Colour of the left edge only, overriding Border Color |
| `borderLeftStyle` | Enum (`none`, `solid`, `dotted`, `dashed`) | — | Line style for the left edge only, overriding Border Style; None hides that edge |
| `borderLeftWidth` | Number | — | Thickness of the left edge in pixels, and it adds to the element's size |
| `borderRadius` | Number | `3` | Rounds all four corners, except any corner that sets its own radius |
| `borderRightColor` | Color | — | Colour of the right edge only, overriding Border Color |
| `borderRightStyle` | Enum (`none`, `solid`, `dotted`, `dashed`) | — | Line style for the right edge only, overriding Border Style; None hides that edge |
| `borderRightWidth` | Number | — | Thickness of the right edge in pixels, and it adds to the element's size |
| `borderStyle` | Enum (`none`, `solid`, `dotted`, `dashed`) | `solid` | Line style for all four edges; None hides the border and leaves Border Width and Color inactive |
| `borderTopColor` | Color | — | Colour of the top edge only, overriding Border Color |
| `borderTopLeftRadius` | Number | — | Rounds the top-left corner only, overriding Corner Radius |
| `borderTopRightRadius` | Number | — | Rounds the top-right corner only, overriding Corner Radius |
| `borderTopStyle` | Enum (`none`, `solid`, `dotted`, `dashed`) | — | Line style for the top edge only, overriding Border Style; None hides that edge |
| `borderTopWidth` | Number | — | Thickness of the top edge in pixels, and it adds to the element's size |
| `borderWidth` | Number | `2` | Thickness of the border in pixels, which adds to the element's size unless Box Sizing accounts for it |
| `boxShadowBlurRadius` | Number | `5` | How soft the shadow edge is; 0 gives a hard edge |
| `boxShadowColor` | Color | `#00000033` | Colour of the shadow, including how transparent it is |
| `boxShadowEnabled` | Boolean | `false` | Turns the drop shadow on |
| `boxShadowInset` | Boolean | `false` | Draws the shadow inside the element instead of behind it |
| `boxShadowOffsetX` | Number | `0` | How far to the right the shadow is cast from the element |
| `boxShadowOffsetY` | Number | `0` | How far down the shadow is cast from the element |
| `boxShadowSource` | Enum (`custom`, `token`) | `custom` | Where the shadow comes from: Custom builds it from the six fields below; From a style token wears one of the project’s shadow tokens, so every element sharing that token changes together |
| `boxShadowSpreadRadius` | Number | `2` | How much larger than the element the shadow is drawn |
| `boxShadowToken` | String | `var(--shadow-md)` | The project shadow this element wears, as var(--shadow-md). Pick one from the list; compose new ones in the Styles panel |
| `boxSizing` | Enum (`border-box`, `content-box`) | `border-box` | Whether Width and Height include this element's padding and border, or only its content |
| `checked` | Boolean | `false` | Sets whether the box is ticked; setting it from the graph does not fire Changed |
| `clickBubbling` | Enum (`auto`, `always`, `never`) | `auto` | Whether a click on this control also fires Click on the nodes it sits inside. Automatic keeps it here as soon as this control's own Click is connected, so a Favourite button inside a clickable card runs Favourite and not the card; Always is the older behaviour where both run; Never keeps every click here, wired or not |
| `cssClassName` | String | `` | Extra CSS class names to put on this element, for styling from a stylesheet you supply |
| `dataAttributes` | Stringlist | — | data-* names (data-testid) for tests and scripts to find this element by; each gets a value input |
| `enabled` | Boolean | `true` | Lets the user interact with this control; when off it still renders and occupies its space but ignores clicks, touches and typing |
| `height` | Number | `32` | Height of the box |
| `iconColor` | Color | `#000000` | Colour of the icon |
| `iconIconSource` | Icon | — | Which glyph to show, picked from an installed icon set |
| `iconImageSource` | Image | — | Image file to show instead of an icon-set glyph |
| `iconSize` | Number | `16` | Height of the icon |
| `iconSourceType` | Enum (`image`, `icon`) | `icon` | Whether the icon comes from an installed icon set or from an image file, which decides the source port below |
| `label` | String | `Label` | Text shown on this element |
| `labelSpacing` | Number | `10` | Gap between the label and the edges around it |
| `labelcolor` | Color | — | Colour of the text itself, not of the element behind it |
| `labelfontFamily` | Font | — | Typeface to render the text in, either a web-safe family name or a font file added to the project |
| `labelfontSize` | Number | — | Height of the text, in pixels |
| `labelfontStyle` | Enum (`normal`, `italic`) | `normal` | Renders the text upright or italic |
| `labelfontVariantNumeric` | Enum (`normal`, `tabular-nums`) | `normal` | Tabular draws every digit at the same width so columns of numbers align; Normal follows the font |
| `labelfontWeight` | Number | `Auto` | How heavy the text is drawn, from 100 (thin) to 900 (black); leave as Auto to use the weight the font family sets |
| `labelletterSpacing` | Number | `Auto` | Extra space added between characters; leave as Auto to use the spacing built into the font |
| `labellineHeight` | Number | `Auto` | Vertical space each line of text occupies; leave as Auto to follow the font |
| `labeltextStyle` | TextStyle | `None` | Applies one of the project's saved text styles; the individual font ports below override whatever it sets |
| `labeltextTransform` | Enum (`none`, `uppercase`, `lowercase`, `capitalize`) | `none` | Forces the text to upper case, lower case or capitalised without changing the underlying value |
| `marginBottom` | Number | — | Space outside the element's bottom edge, between it and its neighbours |
| `marginLeft` | Number | — | Space outside the element's left edge, between it and its neighbours |
| `marginRight` | Number | — | Space outside the element's right edge, between it and its neighbours |
| `marginTop` | Number | — | Space outside the element's top edge, between it and its neighbours |
| `mixBlendMode` | Enum (`normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`) | `normal` | How this element's colours blend with whatever is painted behind it |
| `mounted` | Boolean | `true` | Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen) |
| `opacity` | Number | `1` | How opaque this element is, from 0 for invisible to 1 for solid |
| `paddingBottom` | Number | `0` | Space inside the element's bottom edge, between it and its content |
| `paddingLeft` | Number | `0` | Space inside the element's left edge, between it and its content |
| `paddingRight` | Number | `0` | Space inside the element's right edge, between it and its content |
| `paddingTop` | Number | `0` | Space inside the element's top edge, between it and its content |
| `position` | Enum (`relative`, `absolute`, `sticky`, `fixed`) | `relative` | How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space |
| `scrollIntoViewAlign` | Enum (`nearest`, `start`, `center`, `end`) | `nearest` | Where Scroll Into View leaves the element: Nearest edge moves only as far as needed |
| `styleCss` | String | `/* background-color: red; */` | Raw CSS declarations applied to this element, overriding the styling ports above |
| `transformOriginX` | Number | `50` | Horizontal point the element rotates and scales around, as a fraction of its width |
| `transformOriginY` | Number | `50` | Vertical point the element rotates and scales around, as a fraction of its height |
| `transformRotation` | Number | `0` | Rotates the element clockwise in degrees, without affecting the layout |
| `transformScale` | Number | `1` | Scales the element about its transform origin; 1 leaves it unscaled |
| `transformX` | Number | `0` | Moves the element right after layout, without moving its siblings |
| `transformY` | Number | `0` | Moves the element down after layout, without moving its siblings |
| `useIcon` | Boolean | `true` | Shows an icon on this element |
| `useLabel` | Boolean | `false` | Shows a text label on this element |
| `variant` | String | — | Name of a saved variant of this node type to apply, replacing the styling set here |
| `visible` | Boolean | `true` | Hides the element while keeping the space it occupies in the layout |
| `width` | Number | `32` | Width of the box; the label sits beside it and is sized separately |
| `zIndex` | Number | — | Paint order among overlapping siblings; higher numbers paint on top |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `blur` | Signal | — | Takes the keyboard away from this checkbox, which is what fires Blurred |
| `check` | Signal | — | Ticks the box if it is not already ticked, then fires Done — or Unchanged if it already was. Does not fire Changed |
| `focus` | Signal | — | Puts the keyboard on this checkbox, so Enter, Space and the arrow keys go to it |
| `scrollIntoView` | Signal | — | Scrolls the page, or the scrolling Group holding this element, until the element can be seen |
| `uncheck` | Signal | — | Unticks the box if it is ticked, then fires Done — or Unchanged if it already was. Does not fire Changed |

### What each input does

**Enabled** (`enabled`)

- the value it already holds: nothing
- a change: Enabled follows; disabled, the box takes no click and no focus

**Checked** (`checked`)

- the value it already holds: nothing
- a change: the box shows it, and Checked follows — Changed does not fire (only a person's click fires it)

**Check** (`check`)

- already checked → Unchanged
- unchecked: it is checked, and Checked goes true — never Changed → Done

**Uncheck** (`uncheck`)

- checked: it is unchecked, and Checked goes false — never Changed → Done
- already unchecked → Unchanged

**Mounted** (`mounted`)

- always: the box is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint

**Enable Label** (`useLabel`)

- always: a label is drawn beside the box, or not; the box and its keyboard stay

**Focus** (`focus`)

- not on the page: nothing to focus, the Focus is not kept, and the editor is told → Unchanged; Focused stays silent
- it holds the keyboard already, or is disabled or hidden: nothing changes → Done; Focused stays silent
- otherwise the keyboard is put on it, and the Focused state goes true → Focused, Done

**Blur** (`blur`)

- it does not hold the keyboard (or is disabled, and gives it up to nobody): nothing changes → Done; Blurred stays silent
- it holds the keyboard: it is taken off it, and the Focused state goes false → Blurred, Done

**Scroll Into View** (`scrollIntoView`)

- always: the page, or the scrolling Group holding it, scrolls until the box can be seen

**Visible** (`visible`)

- always: shown or hidden at the next paint, its space kept; hidden, a Focus does not reach it

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `boundingHeight` | Number | — | Height this element actually ended up with after layout, in pixels |
| `boundingWidth` | Number | — | Width this element actually ended up with after layout, in pixels |
| `checked` | Boolean | — | Whether the box is currently ticked |
| `childIndex` | Number | — | This element's position among its parent's children, counting from 0 |
| `enabled` | Boolean | — | Reports back whether this control is currently accepting interaction, following the Enabled input |
| `focusState` | Boolean | — | True while this control holds keyboard focus, so typing and Enter go to it |
| `hoverState` | Boolean | — | True while the pointer is over this control; stays false on touch devices with no pointer |
| `pressedState` | Boolean | — | True while a mouse button or finger is held down on this control, and false again the moment it is released or slides off |
| `screenPositionX` | Number | — | Distance in pixels from the left edge of the window to this element's left edge |
| `screenPositionY` | Number | — | Distance in pixels from the top edge of the window to this element's top edge |
| `this` | Reference | — | A reference to this node itself, for ports that take a node rather than a value |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `didMount` | Signal | — | Fires once this element has been added to the page and can be measured |
| `done` | Signal | — | Fires when Check or Uncheck actually flipped the box, when Focus put the keyboard on it, or when Blur took it away |
| `hoverEnd` | Signal | — | Fires when the pointer leaves this control, including when it leaves while a button is still held, or when the control leaves the page under it |
| `hoverStart` | Signal | — | Fires when the pointer moves onto this control |
| `onBlur` | Signal | — | Fires when keyboard focus leaves this control, or the control leaves the page while holding it, which is the usual place to validate what was entered |
| `onChange` | Signal | — | Fires when the user ticks or unticks the box; the Checked input and the Check/Uncheck actions do not fire it |
| `onFocus` | Signal | — | Fires the moment this control takes keyboard focus, whether from a click, a tab or a Focus action |
| `pointerDown` | Signal | — | Fires as a mouse button or finger goes down on this control, before any click has completed |
| `pointerUp` | Signal | — | Fires when the mouse button or finger is lifted, and also when a touch is cancelled by the system |
| `unchanged` | Signal | — | Fires when the box was already in that state, so nothing was flipped and Changed did not fire, or when a Focus arrived while the box was not on the page |
| `willUnmount` | Signal | — | Fires just before this element is removed from the page, while it still exists |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups); the tables above may be incomplete for a given instance._

Declares conditional/expandable port groups whose visibility depends on parameter values (see declaredPortGroups).

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| useIcon = true OR useIcon NOT SET | `iconSourceType`, `iconSize` | — |
| #js (params.useIcon===true \|\| params.useIcon===undefined) && params.iconSourceType === 'image' | `iconImageSource` | — |
| #js (params.useIcon===true \|\| params.useIcon===undefined) && params.iconSourceType === 'icon' | `iconIconSource`, `iconColor` | — |
| useLabel = true | `label`, `labeltextStyle`, `labelfontFamily`, `labelfontSize`, `labelfontWeight`, `labelfontStyle`, `labelcolor`, `labelletterSpacing`, `labellineHeight`, `labeltextTransform`, `labelfontVariantNumeric`, `labelSpacing` | — |
| borderStyle = solid OR borderStyle = dashed OR borderStyle = dotted OR borderStyle NOT SET | `borderWidth`, `borderColor` | — |
| borderLeftStyle = solid OR borderLeftStyle = dashed OR borderLeftStyle = dotted OR borderStyle = solid OR borderStyle = dashed OR borderStyle = dotted OR borderStyle NOT SET | `borderLeftWidth`, `borderLeftColor` | — |
| borderTopStyle = solid OR borderTopStyle = dashed OR borderTopStyle = dotted OR borderStyle = solid OR borderStyle = dashed OR borderStyle = dotted OR borderStyle NOT SET | `borderTopWidth`, `borderTopColor` | — |
| borderRightStyle = solid OR borderRightStyle = dashed OR borderRightStyle = dotted OR borderStyle = solid OR borderStyle = dashed OR borderStyle = dotted OR borderStyle NOT SET | `borderRightWidth`, `borderRightColor` | — |
| borderBottomStyle = solid OR borderBottomStyle = dashed OR borderBottomStyle = dotted OR borderStyle = solid OR borderStyle = dashed OR borderStyle = dotted OR borderStyle NOT SET | `borderBottomWidth`, `borderBottomColor` | — |
| boxShadowEnabled = true | `boxShadowSource` | — |
| boxShadowEnabled = true AND boxShadowSource = token | `boxShadowToken` | — |
| boxShadowEnabled = true AND boxShadowSource != token | `boxShadowOffsetX`, `boxShadowOffsetY`, `boxShadowInset`, `boxShadowBlurRadius`, `boxShadowSpreadRadius`, `boxShadowColor` | — |
| — | — | — |

## Ports at runtime

Declared-port-groups: label ports appear when the label is enabled, and each visual state (hover, pressed, disabled, focused) adds state-scoped styling ports. The catalog list is the superset the editor filters by current parameters.

## Patterns

- `checked` → Set Object Properties value + `onChange` → its `store`: level carries the data, edge commits it.

## Examples

**Repeater item writes back to its own record object**

Inside a Repeater item component, Repeater Item (For Each Actions) exposes `itemId` — the id of this row's object. Wiring it into Set Object Properties (SetModelProperties) `modelId` makes the write target exactly this row: toggling the checkbox stores `done` on the row's object, and every other node bound to that object updates. The row never needs to know which list it belongs to. The title rides the checkbox's own `label` port (`useLabel` on) rather than a sibling Text, so the words are a real click target that toggles the box.

**Settings form: the standard input controls bound to values**

One of each core control: Text Input's live string comes out of `onTextChanged`, Checkbox exposes `checked` (level) plus `onChange` (edge), Dropdown (net.noodl.controls.options) takes an items list and emits the selected `value`, Slider (net.noodl.controls.range) emits a numeric `value` between `min`/`max`, and a Radio Button Group reports the `value` of whichever child Radio Button is selected. Values flow into a live summary — no submit step needed for value binding.

## Related nodes

[Radio Button](./net-noodl-controls-radiobutton.md), [Switch](../logic/switch.md), [Button](./net-noodl-controls-button.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 5. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a person's pointer and keyboard (`person`)

### Starting state

```json
{
  "enabled": true,
  "checked": false,
  "hover": false,
  "pressed": false,
  "focused": false,
  "mounted": true,
  "pageEnabled": true,
  "visible": true,
  "pageVisible": true,
  "elementFocused": false,
  "onPage": false,
  "focusMissed": false
}
```

### How actions report back

Each time Check, Uncheck, Focus or Blur is triggered, the node reports exactly one of **Done** or **Unchanged**.

### Warnings it shows in the editor

| Warning | Settings it points at | Id |
|---|---|---|
| the last Focus arrived while it was not on the page | — | `focus/not-mounted` |
| Icon Source holds something that is not an icon | — | `visual/icon-source-not-an-icon/iconIconSource` |

### What a person can do to it

The conformance tests play these acts against it:

- `hover`: the pointer moves onto the box
- `leave`: the pointer moves off the box
- `press`: a mouse button goes down on it
- `release`: the mouse button comes up on it
- `click`: a press and a release on the box, and the click that follows — which ticks or unticks it
- `touch`: a finger goes down on it
- `lift`: the finger comes up
- `focus`: the keyboard is put on it (a Tab reaching it)
- `blur`: the keyboard is taken off it (a Tab leaving it)

### Version history

- **Version 5**: Two warnings the runtime has always shown are now in this spec: a Focus that arrives while the node is not on the page (until a Focus reaches it), and an Icon Source that is not an icon (until an icon or nothing arrives). Existing projects are not migrated: only the editor is told, and the runtime already told it. Nothing a wire carries changes.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/checkbox.ts"
/**
 * Checkbox (`net.noodl.controls.checkbox`) — read from
 * `packages/noodl-viewer-react/src/nodes/controls/checkbox.ts`, `controls/utils.ts` (the control
 * events and states, the Focus / Blur actions), `components/controls/Checkbox/Checkbox.tsx` (the
 * component) and `react-component-node.ts` on 2026-10-03 (NSP-016 s37). Its person face, page model
 * and the shared ports are the Button's (button.ts): what differs is the tick.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations. A Checkbox is an `<input type="checkbox">` in a box (Checkbox.tsx
 * :167-184), with a `<label>` beside it when Enable Label is on (:186-210); a PERSON ticks it.
 *   - **the tick** (checkbox.ts :34-52 `checkedChanged`): a click on an enabled box toggles the input
 *     — the browser's activation behaviour of a checkbox — and the component reports the new state:
 *     when it differs from what the node holds, `checked` is sent and `onChange` fires. **Checked**
 *     (:56-72) sets it from the graph: `!!value`, `checked` sent on a change, no `onChange`. **Check**
 *     / **Uncheck** (:73-96, :160-178): Unchanged when the box is already so; else `checked` sent,
 *     then Done — never `onChange` (the description: Changed means the person did it).
 *   - **Enabled** (utils.ts :75-89): as the Button's. A disabled input takes no click (HTML: a disabled
 *     form control gets none, so the box does not toggle), no press, no release and no focus; the
 *     pointer still hovers and a finger still lands.
 *   - **the pointer, the keyboard, a click's focus** (utils.ts :157-311; Checkbox.tsx :66-69, :202):
 *     the Button's rules, on the `<input>` when there is no label and on the wrapper when there is
 *     (a click on the input bubbles to it either way). **Enable Label** shows the label and leaves the box,
 *     and the keyboard on it, where they are (ruled 2026-10-05; the runtime built a new input when the
 *     label changed and the keyboard left with the old one, silently — row C80, fixed in P109 ISL-031). A press puts the keyboard on the input (the
 *     browser's `mousedown` default; there is no Keeps Focus here), so a click on an unfocused box is
 *     `pointerDown`, `onFocus`, `pointerUp`, then the tick: `checked`, `onChange`.
 *   - **Focus** / **Blur** (utils.ts :340-364): the Button's — the target is the input (:402-405).
 *   - **Mounted**, **Did Mount**, **Will Unmount**, **Child Index** (0) — no Children Count (`allowChildren` false, :2299),
 *     **This**, the **Bounding Box** outputs, **Scroll Into View**, **Label** and the pointer-event
 *     inputs: the Button's.
 */

import { defineNode, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';
import { controlFocusNotMounted, focusDiagnostics, focusMissed } from './focus-not-mounted';
import { focusAndIconSourceChange, iconSourceDiagnostics } from './icon-source';

type State = {
  /** utils.ts :75-89 `_internal.enabled` */
  enabled: boolean;
  /** checkbox.ts :31 `_internal.checked` */
  checked: boolean;
  hover: boolean;
  pressed: boolean;
  focused: boolean;
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** the element's `disabled` attribute follows Enabled at each paint (Button.tsx :145 / Checkbox.tsx :57 render it; react-component-node.ts :1675-1689 at the frame's end) — what the Focus and Blur actions meet */
  pageEnabled: boolean;
  /** NSP-016 s43 — Visible as written (node-shared-port-definitions.ts :366-375 `visibility: hidden`) */
  visible: boolean;
  /**
   * NSP-016 s43 — the element's `visibility` follows Visible at each paint: a hidden element is never under the pointer (the
   * browser's hit test) and takes no keyboard (`focus()` refuses it — Chromium `IsFocusableStyle`); `blur()` still works on one
   */
  pageVisible: boolean;
  /**
   * the element holds the keyboard — what the PAGE knows. `focused` is what the node REPORTS: the browser fires no blur for a
   * removed element (the focus fixup rule), so an element leaving the page (Mounted off) took the keyboard with it while
   * Focused stayed true — row D30, fixed in P109 ISL-031: the node resets its states as the element leaves (utils.ts `_leftPage`).
   */
  elementFocused: boolean;
  /** the element is on the page (button.ts `painted`) */
  onPage: boolean;
  /** v5 — the last Focus found the node off the page: the editor is told (focus-not-mounted.ts) */
  focusMissed: boolean;
}

type O = typeof Checkbox extends { outputs: infer X } ? X : never;
type Send = Patch<State, O>;
type Pulse = 'didMount' | 'willUnmount' | 'pointerDown' | 'pointerUp' | 'onChange' | 'onFocus' | 'onBlur' | 'hoverStart' | 'hoverEnd';
type Act = { set?: Partial<State>; send: Array<'pressedState' | 'focusState' | 'hoverState' | 'checked'>; emit?: Pulse[] };

const NOTHING: Send = { send: [] };
const NONE: Act = { send: [] };

export const Checkbox = defineNode({
  type: 'net.noodl.controls.checkbox',
  // v2 (NSP-023, 2026-10-05): Enable Label shows a label and leaves the box and the keyboard on it where they are (Richard ruled the
  // Text Input's C80 for all three controls); v1 rebuilt the box when the label changed, as the runtime did — row C80, fixed in P109 ISL-031.
  // v3 (P109 ISL-031, P107-C64 ruled "Ignore touches, keep hover"): a finger on a disabled control reports nothing — no Pressed, no Pointer Down or Up — as Enabled promises; the pointer's hover still reports
  // v4 (P109 ISL-031, P107-D30 ruled "Reset and announce"): a control leaving the page (Mounted off) takes Focused, Hover and Pressed with it — each goes false, sent if it was true, with Blurred and Hover End for the ones that were on
  // v5 (NSP-019 R35): a Focus that finds the node off the page shows as its warning until a Focus reaches it, and an Icon Source that is not an icon shows as one until an icon or nothing arrives (`diagnostics`)
  version: 5,
  changes: [focusAndIconSourceChange(5)],
  diagnostics: { ...focusDiagnostics(controlFocusNotMounted('checkbox')), ...iconSourceDiagnostics() },
  source: 'packages/noodl-viewer-react/src/nodes/controls/checkbox.ts',
  needs: ['person'],
  // the page's syncs (spec.ts `synced`): not branches
  synced: ['pageEnabled', 'pageVisible'],

  state: { enabled: true, checked: false, hover: false, pressed: false, focused: false, mounted: true, pageEnabled: true, visible: true, pageVisible: true, elementFocused: false, onPage: false, focusMissed: false } as State,
  // checkbox.ts :132-137 `outcomeOutputs({ done, unchanged })`
  outcomes: ['done', 'unchanged'],

  acts: {
    hover: { description: 'the pointer moves onto the box' },
    leave: { description: 'the pointer moves off the box' },
    press: { description: 'a mouse button goes down on it' },
    release: { description: 'the mouse button comes up on it' },
    click: { description: 'a press and a release on the box, and the click that follows — which ticks or unticks it' },
    touch: { description: 'a finger goes down on it' },
    lift: { description: 'the finger comes up' },
    focus: { description: 'the keyboard is put on it (a Tab reaching it)' },
    blur: { description: 'the keyboard is taken off it (a Tab leaving it)' }
  },

  inputs: {
    // ---- logic ----
    // utils.ts :75-89
    enabled: { type: 'boolean', default: true, coerce: 'none', displayName: 'Enabled', group: 'General', description: 'Lets the user interact with this control; when off it still renders and occupies its space but ignores clicks, touches and typing', portability: 'logic' },
    // checkbox.ts :56-72
    checked: { type: 'boolean', default: false, coerce: 'none', displayName: 'Checked', group: 'General', description: 'Sets whether the box is ticked; setting it from the graph does not fire Changed', portability: 'logic' },
    // checkbox.ts :73-96
    check: { type: 'signal', outcome: true, displayName: 'Check', group: 'Actions', description: 'Ticks the box if it is not already ticked, then fires Done — or Unchanged if it already was. Does not fire Changed', portability: 'logic' },
    uncheck: { type: 'signal', outcome: true, displayName: 'Uncheck', group: 'Actions', description: 'Unticks the box if it is ticked, then fires Done — or Unchanged if it already was. Does not fire Changed', portability: 'logic' },
    // react-component-node.ts :2302-2321
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen)', portability: 'logic', layout: 'present' },
    // utils.ts :340-364
    focus: { type: 'signal', outcome: true, displayName: 'Focus', group: 'Actions', description: 'Puts the keyboard on this checkbox, so Enter, Space and the arrow keys go to it', portability: 'logic' },
    blur: { type: 'signal', outcome: true, displayName: 'Blur', group: 'Actions', description: 'Takes the keyboard away from this checkbox, which is what fires Blurred', portability: 'logic' },
    // react-component-node.ts :1380-1395
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },
    // node-shared-port-definitions.ts `addLabelInputs` (enableSpacing)
    label: { when: (p) => p.useLabel === true, type: 'string', default: 'Label', coerce: 'none', displayName: 'Label', group: 'Label', description: 'Text shown on this element', portability: 'logic' },
    useLabel: { type: 'boolean', default: false, coerce: 'none', displayName: 'Enable Label', group: 'Label', description: 'Shows a text label on this element', portability: 'logic' },
    labelSpacing: { when: (p) => p.useLabel === true, type: 'number', default: 10, coerce: 'none', displayName: 'Spacing', group: 'Label', description: 'Gap between the label and the edges around it', portability: 'logic', layout: 'content' },
    // utils.ts :93-120 — what reaches the nodes around it; a graph scenario's matter
    blockTouch: { type: 'boolean', coerce: 'none', displayName: 'Block Pointer Events', group: 'Pointer Events', description: 'Stops every pointer event that lands on this control from reaching the nodes it sits inside. Blunt: it takes hover and pointer-down with it, so reach for Click Bubbling first if it is only clicks you want to keep in', portability: 'logic' },
    clickBubbling: { type: 'enum', enums: ['auto', 'always', 'never'], default: 'auto', coerce: 'none', displayName: 'Click Bubbling', group: 'Pointer Events', description: "Whether a click on this control also fires Click on the nodes it sits inside. Automatic keeps it here as soon as this control's own Click is connected, so a Favourite button inside a clickable card runs Favourite and not the card; Always is the older behaviour where both run; Never keeps every click here, wired or not", portability: 'logic' },

    // ---- look and layout (R10): stored, written to the style, read by no output; each with its class (visual-params.json) ----
  alignX: { type: 'enum', enums: ["left", "center", "right"], coerce: 'none', displayName: "Align X", group: "Alignment", description: "Horizontal alignment of this element within the space its parent gives it", portability: 'layout-shared', layout: 'align-x' },
  alignY: { type: 'enum', enums: ["top", "center", "bottom"], coerce: 'none', displayName: "Align Y", group: "Alignment", description: "Vertical alignment of this element within the space its parent gives it", portability: 'layout-shared', layout: 'align-y' },
  backgroundColor: { type: 'color', default: "transparent", coerce: 'none', displayName: "Background Color", group: "Style", description: "Fill colour of the box itself, behind the tick", portability: 'look-shared' },
  borderBottomColor: { when: (p) => p.borderBottomStyle === 'solid' || p.borderBottomStyle === 'dashed' || p.borderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: 'color', coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the bottom edge only, overriding Border Color", portability: 'look-shared' },
  borderBottomLeftRadius: { type: 'number', coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the bottom-left corner only, overriding Corner Radius", portability: 'look-shared' },
  borderBottomRightRadius: { type: 'number', coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the bottom-right corner only, overriding Corner Radius", portability: 'look-shared' },
  borderBottomStyle: { type: 'enum', enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the bottom edge only, overriding Border Style; None hides that edge", portability: 'look-expressible', layout: 'border-bottom-style' },
  borderBottomWidth: { when: (p) => p.borderBottomStyle === 'solid' || p.borderBottomStyle === 'dashed' || p.borderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: 'number', coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the bottom edge in pixels, and it adds to the element's size", portability: 'look-shared', layout: 'border-bottom-width' },
  borderColor: { when: (p) => p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: 'color', default: "#000000", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the border, which has no effect while Border Style is None", portability: 'look-shared' },
  borderLeftColor: { when: (p) => p.borderLeftStyle === 'solid' || p.borderLeftStyle === 'dashed' || p.borderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: 'color', coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the left edge only, overriding Border Color", portability: 'look-shared' },
  borderLeftStyle: { type: 'enum', enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the left edge only, overriding Border Style; None hides that edge", portability: 'look-expressible', layout: 'border-left-style' },
  borderLeftWidth: { when: (p) => p.borderLeftStyle === 'solid' || p.borderLeftStyle === 'dashed' || p.borderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: 'number', coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the left edge in pixels, and it adds to the element's size", portability: 'look-shared', layout: 'border-left-width' },
  borderRadius: { type: 'number', default: 3, coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds all four corners, except any corner that sets its own radius", portability: 'look-shared' },
  borderRightColor: { when: (p) => p.borderRightStyle === 'solid' || p.borderRightStyle === 'dashed' || p.borderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: 'color', coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the right edge only, overriding Border Color", portability: 'look-shared' },
  borderRightStyle: { type: 'enum', enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the right edge only, overriding Border Style; None hides that edge", portability: 'look-expressible', layout: 'border-right-style' },
  borderRightWidth: { when: (p) => p.borderRightStyle === 'solid' || p.borderRightStyle === 'dashed' || p.borderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: 'number', coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the right edge in pixels, and it adds to the element's size", portability: 'look-shared', layout: 'border-right-width' },
  borderStyle: { type: 'enum', enums: ["none", "solid", "dotted", "dashed"], default: "solid", coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for all four edges; None hides the border and leaves Border Width and Color inactive", portability: 'look-expressible', layout: 'border-style' },
  borderTopColor: { when: (p) => p.borderTopStyle === 'solid' || p.borderTopStyle === 'dashed' || p.borderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: 'color', coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the top edge only, overriding Border Color", portability: 'look-shared' },
  borderTopLeftRadius: { type: 'number', coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the top-left corner only, overriding Corner Radius", portability: 'look-shared' },
  borderTopRightRadius: { type: 'number', coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the top-right corner only, overriding Corner Radius", portability: 'look-shared' },
  borderTopStyle: { type: 'enum', enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the top edge only, overriding Border Style; None hides that edge", portability: 'look-expressible', layout: 'border-top-style' },
  borderTopWidth: { when: (p) => p.borderTopStyle === 'solid' || p.borderTopStyle === 'dashed' || p.borderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: 'number', coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the top edge in pixels, and it adds to the element's size", portability: 'look-shared', layout: 'border-top-width' },
  borderWidth: { when: (p) => p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: 'number', default: 2, coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the border in pixels, which adds to the element's size unless Box Sizing accounts for it", portability: 'look-shared', layout: 'border-width' },
  boxShadowBlurRadius: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: 'number', default: 5, coerce: 'none', displayName: "Blur Radius", group: "Box Shadow", description: "How soft the shadow edge is; 0 gives a hard edge", portability: 'look-expressible' },
  boxShadowColor: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: 'color', default: "#00000033", coerce: 'none', displayName: "Shadow Color", group: "Box Shadow", description: "Colour of the shadow, including how transparent it is", portability: 'look-expressible' },
  boxShadowEnabled: { type: 'boolean', default: false, coerce: 'none', displayName: "Shadow Enabled", group: "Box Shadow", description: "Turns the drop shadow on", portability: 'look-expressible' },
  boxShadowInset: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: 'boolean', default: false, coerce: 'none', displayName: "Inset", group: "Box Shadow", description: "Draws the shadow inside the element instead of behind it", portability: 'web-only' },
  boxShadowOffsetX: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: 'number', default: 0, coerce: 'none', displayName: "Offset X", group: "Box Shadow", description: "How far to the right the shadow is cast from the element", portability: 'look-expressible' },
  boxShadowOffsetY: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: 'number', default: 0, coerce: 'none', displayName: "Offset Y", group: "Box Shadow", description: "How far down the shadow is cast from the element", portability: 'look-expressible' },
  boxShadowSource: { when: (p) => p.boxShadowEnabled === true, type: 'enum', enums: ["custom", "token"], default: "custom", coerce: 'none', displayName: "Shadow Source", group: "Box Shadow", description: "Where the shadow comes from: Custom builds it from the six fields below; From a style token wears one of the project’s shadow tokens, so every element sharing that token changes together", portability: 'look-shared' },
  boxShadowSpreadRadius: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: 'number', default: 2, coerce: 'none', displayName: "Spread Radius", group: "Box Shadow", description: "How much larger than the element the shadow is drawn", portability: 'look-expressible' },
  boxShadowToken: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource === 'token', type: 'string', default: "var(--shadow-md)", coerce: 'none', displayName: "Shadow Token", group: "Box Shadow", description: "The project shadow this element wears, as var(--shadow-md). Pick one from the list; compose new ones in the Styles panel", portability: 'look-shared' },
  boxSizing: { type: 'enum', enums: ["border-box", "content-box"], default: "border-box", coerce: 'none', displayName: "Box Sizing", group: "Margin and padding", description: "Whether Width and Height include this element's padding and border, or only its content", portability: 'web-only' },
  cssClassName: { type: 'string', default: "", coerce: 'none', displayName: "CSS Class", group: "Advanced HTML", description: "Extra CSS class names to put on this element, for styling from a stylesheet you supply", portability: 'web-only' },
  dataAttributes: { type: 'stringlist', coerce: 'none', editOnly: true, displayName: "Data Attributes", group: "Data Attributes", description: "data-* names (data-testid) for tests and scripts to find this element by; each gets a value input", portability: 'web-only' },
  height: { type: 'number', default: 32, coerce: 'none', displayName: "Height", group: "Dimensions", description: "Height of the box", portability: 'layout-shared', layout: 'height' },
  iconColor: { when: (p) => (p.useIcon===true || p.useIcon===undefined) && p.iconSourceType === 'icon', type: 'color', default: "#000000", coerce: 'none', displayName: "Color", group: "Icon", description: "Colour of the icon", portability: 'look-shared' },
  iconIconSource: { when: (p) => (p.useIcon===true || p.useIcon===undefined) && p.iconSourceType === 'icon', type: 'icon', coerce: 'none', displayName: "Icon Source", group: "Icon", description: "Which glyph to show, picked from an installed icon set", portability: 'look-shared' },
  iconImageSource: { when: (p) => (p.useIcon===true || p.useIcon===undefined) && p.iconSourceType === 'image', type: 'image', coerce: 'none', displayName: "Image Source", group: "Icon", description: "Image file to show instead of an icon-set glyph", portability: 'look-shared' },
  iconSize: { when: (p) => p.useIcon === true || p.useIcon === undefined, type: 'number', default: 16, coerce: 'none', displayName: "Size", group: "Icon", description: "Height of the icon", portability: 'look-shared' },
  iconSourceType: { when: (p) => p.useIcon === true || p.useIcon === undefined, type: 'enum', enums: ["image", "icon"], default: "icon", coerce: 'none', displayName: "Type", group: "Icon", description: "Whether the icon comes from an installed icon set or from an image file, which decides the source port below", portability: 'look-shared' },
  labelcolor: { when: (p) => p.useLabel === true, type: 'color', coerce: 'none', displayName: "Color", group: "Label Text Style", description: "Colour of the text itself, not of the element behind it", portability: 'look-shared' },
  labelfontFamily: { when: (p) => p.useLabel === true, type: 'font', coerce: 'none', displayName: "Font Family", group: "Label Text Style", description: "Typeface to render the text in, either a web-safe family name or a font file added to the project", portability: 'look-shared' },
  labelfontSize: { when: (p) => p.useLabel === true, type: 'number', coerce: 'none', displayName: "Font Size", group: "Label Text Style", description: "Height of the text, in pixels", portability: 'look-shared' },
  labelfontStyle: { when: (p) => p.useLabel === true, type: 'enum', enums: ["normal", "italic"], default: "normal", coerce: 'none', displayName: "Font Style", group: "Label Text Style", description: "Renders the text upright or italic", portability: 'look-shared' },
  labelfontVariantNumeric: { when: (p) => p.useLabel === true, type: 'enum', enums: ["normal", "tabular-nums"], default: "normal", coerce: 'none', displayName: "Numerals", group: "Label Text Style", description: "Tabular draws every digit at the same width so columns of numbers align; Normal follows the font", portability: 'look-expressible' },
  labelfontWeight: { when: (p) => p.useLabel === true, type: 'number', default: "Auto", coerce: 'none', displayName: "Font Weight", group: "Label Text Style", description: "How heavy the text is drawn, from 100 (thin) to 900 (black); leave as Auto to use the weight the font family sets", portability: 'look-shared' },
  labelletterSpacing: { when: (p) => p.useLabel === true, type: 'number', default: "Auto", coerce: 'none', displayName: "Letter Spacing", group: "Label Text Style", description: "Extra space added between characters; leave as Auto to use the spacing built into the font", portability: 'look-shared' },
  labellineHeight: { when: (p) => p.useLabel === true, type: 'number', default: "Auto", coerce: 'none', displayName: "Line Height", group: "Label Text Style", description: "Vertical space each line of text occupies; leave as Auto to follow the font", portability: 'look-shared' },
  labeltextStyle: { when: (p) => p.useLabel === true, type: 'textStyle', default: "None", coerce: 'none', displayName: "Text Style", group: "Label Text Style", description: "Applies one of the project's saved text styles; the individual font ports below override whatever it sets", portability: 'look-shared' },
  labeltextTransform: { when: (p) => p.useLabel === true, type: 'enum', enums: ["none", "uppercase", "lowercase", "capitalize"], default: "none", coerce: 'none', displayName: "Case", group: "Label Text Style", description: "Forces the text to upper case, lower case or capitalised without changing the underlying value", portability: 'look-shared' },
  marginBottom: { type: 'number', coerce: 'none', displayName: "Margin Bottom", group: "Margin and padding", description: "Space outside the element's bottom edge, between it and its neighbours", portability: 'layout-expressible', layout: 'margin-bottom' },
  marginLeft: { type: 'number', coerce: 'none', displayName: "Margin Left", group: "Margin and padding", description: "Space outside the element's left edge, between it and its neighbours", portability: 'layout-expressible', layout: 'margin-left' },
  marginRight: { type: 'number', coerce: 'none', displayName: "Margin Right", group: "Margin and padding", description: "Space outside the element's right edge, between it and its neighbours", portability: 'layout-expressible', layout: 'margin-right' },
  marginTop: { type: 'number', coerce: 'none', displayName: "Margin Top", group: "Margin and padding", description: "Space outside the element's top edge, between it and its neighbours", portability: 'layout-expressible', layout: 'margin-top' },
  mixBlendMode: { type: 'enum', enums: ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], default: "normal", coerce: 'none', displayName: "Blend Mode", group: "Style", description: "How this element's colours blend with whatever is painted behind it", portability: 'look-expressible' },
  opacity: { type: 'number', default: 1, coerce: 'none', displayName: "Opacity", group: "Style", description: "How opaque this element is, from 0 for invisible to 1 for solid", portability: 'look-shared' },
  paddingBottom: { type: 'number', default: 0, coerce: 'none', displayName: "Pad Bottom", group: "Margin and padding", description: "Space inside the element's bottom edge, between it and its content", portability: 'layout-shared', layout: 'padding-bottom' },
  paddingLeft: { type: 'number', default: 0, coerce: 'none', displayName: "Pad Left", group: "Margin and padding", description: "Space inside the element's left edge, between it and its content", portability: 'layout-shared', layout: 'padding-left' },
  paddingRight: { type: 'number', default: 0, coerce: 'none', displayName: "Pad Right", group: "Margin and padding", description: "Space inside the element's right edge, between it and its content", portability: 'layout-shared', layout: 'padding-right' },
  paddingTop: { type: 'number', default: 0, coerce: 'none', displayName: "Pad Top", group: "Margin and padding", description: "Space inside the element's top edge, between it and its content", portability: 'layout-shared', layout: 'padding-top' },
  position: { type: 'enum', enums: ["relative", "absolute", "sticky", "fixed"], default: "relative", coerce: 'none', displayName: "Position", group: "Layout", description: "How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space", portability: 'layout-expressible', layout: 'place' },
  styleCss: { type: 'string', default: "/* background-color: red; */", coerce: 'none', editOnly: true, displayName: "CSS Style", group: "Advanced HTML", description: "Raw CSS declarations applied to this element, overriding the styling ports above", portability: 'web-only' },
  transformOriginX: { type: 'number', default: "50", coerce: 'none', displayName: "Transform Origin X", group: "Placement", description: "Horizontal point the element rotates and scales around, as a fraction of its width", portability: 'layout-shared', layout: 'origin-x' },
  transformOriginY: { type: 'number', default: "50", coerce: 'none', displayName: "Transform Origin Y", group: "Placement", description: "Vertical point the element rotates and scales around, as a fraction of its height", portability: 'layout-shared', layout: 'origin-y' },
  transformRotation: { type: 'number', default: 0, coerce: 'none', displayName: "Rotation", group: "Placement", description: "Rotates the element clockwise in degrees, without affecting the layout", portability: 'layout-shared', layout: 'rotation' },
  transformScale: { type: 'number', default: 1, coerce: 'none', displayName: "Scale", group: "Placement", description: "Scales the element about its transform origin; 1 leaves it unscaled", portability: 'layout-shared', layout: 'scale' },
  transformX: { type: 'number', default: 0, coerce: 'none', displayName: "Pos X", group: "Placement", description: "Moves the element right after layout, without moving its siblings", portability: 'layout-shared', layout: 'translate-x' },
  transformY: { type: 'number', default: 0, coerce: 'none', displayName: "Pos Y", group: "Placement", description: "Moves the element down after layout, without moving its siblings", portability: 'layout-shared', layout: 'translate-y' },
  useIcon: { type: 'boolean', default: true, coerce: 'none', displayName: "Enable Icon", group: "Icon", description: "Shows an icon on this element", portability: 'look-shared' },
  variant: { type: 'string', coerce: 'none', displayName: "Variant", group: "General", description: "Name of a saved variant of this node type to apply, replacing the styling set here", portability: 'look-shared' },
  visible: { type: 'boolean', default: true, coerce: 'none', displayName: "Visible", group: "Style", description: "Hides the element while keeping the space it occupies in the layout", portability: 'look-shared' },
  width: { type: 'number', default: 32, coerce: 'none', displayName: "Width", group: "Dimensions", description: "Width of the box; the label sits beside it and is sized separately", portability: 'layout-shared', layout: 'width' },
  zIndex: { type: 'number', coerce: 'none', displayName: "zIndex", group: "Style", description: "Paint order among overlapping siblings; higher numbers paint on top", portability: 'look-shared' }

  },

  outputs: {
    // checkbox.ts :99-107
    checked: { type: 'boolean', from: (s) => s.checked, displayName: 'Checked', group: 'States', description: 'Whether the box is currently ticked' },
    // checkbox.ts :108-113
    onChange: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires when the user ticks or unticks the box; the Checked input and the Check/Uncheck actions do not fire it' },
    // utils.ts :157-195
    focusState: { type: 'boolean', from: (s) => s.focused, displayName: 'Focused', group: 'States', description: 'True while this control holds keyboard focus, so typing and Enter go to it' },
    onFocus: { type: 'signal', displayName: 'Focused', group: 'Focus Events', description: 'Fires the moment this control takes keyboard focus, whether from a click, a tab or a Focus action' },
    onBlur: { type: 'signal', displayName: 'Blurred', group: 'Focus Events', description: 'Fires when keyboard focus leaves this control, or the control leaves the page while holding it, which is the usual place to validate what was entered' },
    // utils.ts :204-243
    hoverState: { type: 'boolean', from: (s) => s.hover, displayName: 'Hover', group: 'States', description: 'True while the pointer is over this control; stays false on touch devices with no pointer' },
    hoverStart: { type: 'signal', displayName: 'Hover Start', group: 'Pointer Events', description: 'Fires when the pointer moves onto this control' },
    hoverEnd: { type: 'signal', displayName: 'Hover End', group: 'Pointer Events', description: 'Fires when the pointer leaves this control, including when it leaves while a button is still held, or when the control leaves the page under it' },
    // utils.ts :246-311
    pressedState: { type: 'boolean', from: (s) => s.pressed, displayName: 'Pressed', group: 'States', description: 'True while a mouse button or finger is held down on this control, and false again the moment it is released or slides off' },
    pointerDown: { type: 'signal', displayName: 'Pointer Down', group: 'Pointer Events', description: 'Fires as a mouse button or finger goes down on this control, before any click has completed' },
    pointerUp: { type: 'signal', displayName: 'Pointer Up', group: 'Pointer Events', description: 'Fires when the mouse button or finger is lifted, and also when a touch is cancelled by the system' },
    // utils.ts :314-325
    enabled: { type: 'boolean', from: (s) => s.enabled, displayName: 'Enabled', group: 'States', description: 'Reports back whether this control is currently accepting interaction, following the Enabled input' },
    // react-component-node.ts :982-990, :993-1003
    didMount: { type: 'signal', displayName: 'Did Mount', group: 'Mounted', description: 'Fires once this element has been added to the page and can be measured' },
    willUnmount: { type: 'signal', displayName: 'Will Unmount', group: 'Mounted', description: 'Fires just before this element is removed from the page, while it still exists' },
    // react-component-node.ts :1428-1444 — no Children Count: `allowChildren` is false (checkbox.ts :12) and :2299 declares none
    childIndex: { type: 'number', from: () => 0, displayName: 'Child Index', group: 'Advanced', description: "This element's position among its parent's children, counting from 0" },
    this: { type: 'reference', from: () => SELF_REFERENCE, displayName: 'This', group: 'Advanced', description: 'A reference to this node itself, for ports that take a node rather than a value' },
    // react-component-node.ts :1446-1500 — never measured here
    screenPositionX: { type: 'number', from: () => undefined, displayName: 'Screen Position X', group: 'Bounding Box', description: "Distance in pixels from the left edge of the window to this element's left edge" },
    screenPositionY: { type: 'number', from: () => undefined, displayName: 'Screen Position Y', group: 'Bounding Box', description: "Distance in pixels from the top edge of the window to this element's top edge" },
    boundingWidth: { type: 'number', from: () => undefined, displayName: 'Width', group: 'Bounding Box', description: 'Width this element actually ended up with after layout, in pixels' },
    boundingHeight: { type: 'number', from: () => undefined, displayName: 'Height', group: 'Bounding Box', description: 'Height this element actually ended up with after layout, in pixels' }
  }
}).on(
  {
    // utils.ts :82-89
    enabled: (s, v) => {
      const enabled = !!v;
      if (enabled === s.enabled) return { says: 'the value it already holds: nothing', send: [] };
      return { says: 'a change: Enabled follows; disabled, the box takes no click and no focus', set: { enabled }, send: ['enabled'] };
    },
    // checkbox.ts :63-71 — `!!value`; a change sends Checked and nothing else
    checked: (s, v) => {
      const checked = !!v;
      if (checked === s.checked) return { says: 'the value it already holds: nothing', send: [] };
      return { says: 'a change: the box shows it, and Checked follows — Changed does not fire (only a person\'s click fires it)', set: { checked }, send: ['checked'] };
    },
    // checkbox.ts :160-178 `setCheckedByAction`
    check: (s) => (s.checked ? { says: 'already checked', send: [], outcome: 'unchanged' } : { says: 'unchecked: it is checked, and Checked goes true — never Changed', set: { checked: true }, send: ['checked'], outcome: 'done' }),
    uncheck: (s) => (s.checked ? { says: 'checked: it is unchecked, and Checked goes false — never Changed', set: { checked: false }, send: ['checked'], outcome: 'done' } : { says: 'already unchecked', send: [], outcome: 'unchanged' }),
    // react-component-node.ts :2310-2320
    mounted: (_s, v) => ({ says: 'always: the box is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint', set: { mounted: !!v }, send: [] }),
    // node-shared-port-definitions.ts `addLabelInputs` — a label beside the box; the box and its keyboard stay (v2, row C80)
    useLabel: () => ({ says: 'always: a label is drawn beside the box, or not; the box and its keyboard stay', send: [] }),
    // utils.ts :340-364 — on the element, as the Button's
    focus: (s) => {
      if (!s.onPage) return { says: 'not on the page: nothing to focus, the Focus is not kept, and the editor is told', set: focusMissed(s, true), send: [], outcome: 'unchanged' };
      if (s.elementFocused || !s.pageEnabled || !s.pageVisible) return { says: 'it holds the keyboard already, or is disabled or hidden: nothing changes', set: focusMissed(s, false), send: [], outcome: 'done' };
      return { says: 'otherwise the keyboard is put on it, and the Focused state goes true', set: { focused: true, elementFocused: true, ...focusMissed(s, false) }, send: ['focusState'], emit: ['onFocus'], outcome: 'done' };
    },
    // a disabled element gives the keyboard up to nobody: `blur()` on one does nothing (the focusing steps), Done regardless
    blur: (s) => {
      if (!s.onPage || !s.elementFocused || !s.pageEnabled) return { says: 'it does not hold the keyboard (or is disabled, and gives it up to nobody): nothing changes', send: [], outcome: 'done' };
      return { says: 'it holds the keyboard: it is taken off it, and the Focused state goes false', set: { focused: false, elementFocused: false }, send: ['focusState'], emit: ['onBlur'], outcome: 'done' };
    },
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the box can be seen', send: [] }),
    // node-shared-port-definitions.ts :366-375 — the page follows at the next paint
    visible: (_s, v) => ({ says: 'always: shown or hidden at the next paint, its space kept; hidden, a Focus does not reach it', set: { visible: !!v }, send: [] })
  },
  {
    world: { place: (s) => painted(s) },
    afterInputs: (s) => painted(s),
    person: {
      hover: (s) => onPainted(s, () => ({ set: { hover: true }, send: ['hoverState'], emit: ['hoverStart'] })),
      leave: (s) => onPainted(s, () => ({ set: { hover: false, pressed: false }, send: ['hoverState', 'pressedState'], emit: ['hoverEnd'] })),
      press: (s) => onPainted(s, (p) => (p.enabled ? pressed(p) : NONE)),
      release: (s) => onPainted(s, (p) => (p.enabled ? { set: { pressed: false }, send: ['pressedState'], emit: ['pointerUp'] } : NONE)),
      // Checkbox.tsx :173-180 — the press, the release, the click that toggles the input, and `checkedChanged` (checkbox.ts :34-52)
      click: (s) =>
        onPainted(s, (p) => {
          if (!p.enabled) return NONE;
          const d = pressed(p);
          return { set: { ...d.set, pressed: false, checked: !p.checked }, send: ['pressedState', 'focusState', 'checked'], emit: [...d.emit, 'pointerUp', 'onChange'] };
        }),
      touch: (s) => onPainted(s, (p) => (p.enabled ? { set: { pressed: true }, send: ['pressedState'], emit: ['pointerDown'] } : NONE)),
      lift: (s) => onPainted(s, (p) => (p.enabled ? { set: { pressed: false }, send: ['pressedState'], emit: ['pointerUp'] } : NONE)),
      focus: (s) => onPainted(s, (p) => (p.enabled && !p.elementFocused ? { set: { focused: true, elementFocused: true }, send: ['focusState'], emit: ['onFocus'] } : NONE)),
      blur: (s) => onPainted(s, (p) => (p.elementFocused && p.enabled ? { set: { focused: false, elementFocused: false }, send: ['focusState'], emit: ['onBlur'] } : NONE), true)
    }
  }
);

/** The page follows what the node wants (button.ts `painted`). */
function painted(s: Readonly<State>): Act & { set: Partial<State>; emit: Pulse[] } {
  const set: Partial<State> = { ...(s.pageEnabled === s.enabled ? {} : { pageEnabled: s.enabled }), ...(s.pageVisible === s.visible ? {} : { pageVisible: s.visible }) };
  if (s.mounted && !s.onPage) return { set: { ...set, onPage: true }, send: [], emit: ['didMount'] };
  // the element leaves with the keyboard it held, and the states go with it (v4, D30)
  if (!s.mounted && s.onPage) {
    const l = leftPage(s);
    return { set: { ...set, onPage: false, elementFocused: false, ...l.set }, send: l.send, emit: ['willUnmount', ...l.emit] };
  }
  return { set, send: [], emit: [] };
}

/** The act on the painted page (button.ts `onPainted`). */
function onPainted(s: Readonly<State>, then: (painted: Readonly<State>) => Act, evenHidden = false): Act {
  const p = painted(s);
  const after: State = { ...s, ...p.set };
  // NSP-016 s43 — a hidden element is under no pointer and takes no keyboard; a blur still reaches one
  const a = after.onPage && (after.pageVisible || evenHidden) ? then(after) : NONE;
  return { set: { ...p.set, ...a.set }, send: [...p.send, ...a.send], emit: [...p.emit, ...(a.emit ?? [])] };
}

/** A mouse button down on an enabled box (utils.ts :255-259, :285-293), then the keyboard onto the input — the browser's `mousedown` default — if it is not there already. */
function pressed(s: Readonly<State>): { set: Partial<State>; send: Array<'pressedState' | 'focusState'>; emit: Pulse[] } {
  return s.elementFocused
    ? { set: { pressed: true }, send: ['pressedState'], emit: ['pointerDown'] }
    : { set: { pressed: true, focused: true, elementFocused: true }, send: ['pressedState', 'focusState'], emit: ['pointerDown', 'onFocus'] };
}

/**
 * P109 ISL-031 (P107-D30, ruled "Reset and announce") — the element leaves the page: what the states said of it goes with it.
 * Focused, Hover and Pressed go false (sent when they were true), and Blurred and Hover End fire for the ones that were on
 * (utils.ts `_leftPage`, called from react-component-node.ts `componentWillUnmount`). Pressed has no signal of its own here.
 */
function leftPage(s: Readonly<State>): { set: Partial<State>; send: Array<'focusState' | 'hoverState' | 'pressedState'>; emit: Array<'onBlur' | 'hoverEnd'> } {
  const set: Partial<State> = {};
  const send: Array<'focusState' | 'hoverState' | 'pressedState'> = [];
  const emit: Array<'onBlur' | 'hoverEnd'> = [];
  if (s.focused) {
    set.focused = false;
    send.push('focusState');
    emit.push('onBlur');
  }
  if (s.hover) {
    set.hover = false;
    send.push('hoverState');
    emit.push('hoverEnd');
  }
  if (s.pressed) {
    set.pressed = false;
    send.push('pressedState');
  }
  return { set, send, emit };
}
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
