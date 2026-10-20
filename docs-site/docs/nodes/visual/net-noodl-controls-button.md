---
title: "Button"
---
The standard clickable button control, with label, optional icon, and hover/pressed/focus states.

The Button control renders a styled, accessible button with a text `label` and optional icon. Its main product is the `onClick` signal; it also exposes its interaction state as boolean levels (`hoverState`, `pressedState`, `focusState`) for styling reactions, and an `enabled` input to disable it. Visual-state variants let hover/pressed/disabled styling be defined per state.

## When to use it

Any tap/click affordance with a caption. For a custom-drawn clickable area, a Group's `onClick` works; prefer the Button control when you want built-in states, label/icon layout and accessibility. The legacy `Button` type is superseded by this control.

## At a glance

| | |
|---|---|
| Category | Visual |
| Type name | `net.noodl.controls.button` |
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
| `backgroundColor` | Color | `#000000` | Fill colour behind the label and icon |
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
| `borderRadius` | Number | `0` | Rounds all four corners, except any corner that sets its own radius |
| `borderRightColor` | Color | — | Colour of the right edge only, overriding Border Color |
| `borderRightStyle` | Enum (`none`, `solid`, `dotted`, `dashed`) | — | Line style for the right edge only, overriding Border Style; None hides that edge |
| `borderRightWidth` | Number | — | Thickness of the right edge in pixels, and it adds to the element's size |
| `borderStyle` | Enum (`none`, `solid`, `dotted`, `dashed`) | `none` | Line style for all four edges; None hides the border and leaves Border Width and Color inactive |
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
| `clickBubbling` | Enum (`auto`, `always`, `never`) | `auto` | Whether a click on this control also fires Click on the nodes it sits inside. Automatic keeps it here as soon as this control's own Click is connected, so a Favourite button inside a clickable card runs Favourite and not the card; Always is the older behaviour where both run; Never keeps every click here, wired or not |
| `color` | Color | — | Colour of the text itself, not of the element behind it |
| `cssClassName` | String | `` | Extra CSS class names to put on this element, for styling from a stylesheet you supply |
| `dataAttributes` | Stringlist | — | data-* names (data-testid) for tests and scripts to find this element by; each gets a value input |
| `enabled` | Boolean | `true` | Lets the user interact with this control; when off it still renders and occupies its space but ignores clicks, touches and typing |
| `fontFamily` | Font | — | Typeface to render the text in, either a web-safe family name or a font file added to the project |
| `fontSize` | Number | — | Height of the text, in pixels |
| `fontStyle` | Enum (`normal`, `italic`) | `normal` | Renders the text upright or italic |
| `fontVariantNumeric` | Enum (`normal`, `tabular-nums`) | `normal` | Tabular draws every digit at the same width so columns of numbers align; Normal follows the font |
| `fontWeight` | Number | `Auto` | How heavy the text is drawn, from 100 (thin) to 900 (black); leave as Auto to use the weight the font family sets |
| `height` | Dimension | `100` | Height of the element; how the value is read depends on Size Mode |
| `iconColor` | Color | — | Colour of the icon |
| `iconIconSource` | Icon | — | Which glyph to show, picked from an installed icon set |
| `iconImageSource` | Image | — | Image file to show instead of an icon-set glyph |
| `iconPlacement` | Enum (`left`, `right`) | `left` | Which side of the label the icon sits on, with Icon Spacing as the gap between them |
| `iconSize` | Number | `16` | Height of the icon |
| `iconSourceType` | Enum (`image`, `icon`) | `icon` | Whether the icon comes from an installed icon set or from an image file, which decides the source port below |
| `iconSpacing` | Number | `10` | Gap between the icon and the text beside it |
| `keepsFocus` | Boolean | `false` | Leaves the keyboard where it was when this button is clicked, instead of taking it — what a key on an on-screen keypad needs, so the cursor stays in the field being typed into |
| `label` | String | `Label` | Text shown on this element |
| `letterSpacing` | Number | `Auto` | Extra space added between characters; leave as Auto to use the spacing built into the font |
| `lineHeight` | Number | `Auto` | Vertical space each line of text occupies; leave as Auto to follow the font |
| `marginBottom` | Number | — | Space outside the element's bottom edge, between it and its neighbours |
| `marginLeft` | Number | — | Space outside the element's left edge, between it and its neighbours |
| `marginRight` | Number | — | Space outside the element's right edge, between it and its neighbours |
| `marginTop` | Number | — | Space outside the element's top edge, between it and its neighbours |
| `maxHeight` | Number | — | Largest height the element may grow to, taking priority over Height |
| `maxWidth` | Number | — | Largest width the element may grow to, taking priority over Width |
| `minHeight` | Number | — | Smallest height the element may shrink to, taking priority over Height |
| `minWidth` | Number | — | Smallest width the element may shrink to, taking priority over Width |
| `mixBlendMode` | Enum (`normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`) | `normal` | How this element's colours blend with whatever is painted behind it |
| `mounted` | Boolean | `true` | Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen) |
| `opacity` | Number | `1` | How opaque this element is, from 0 for invisible to 1 for solid |
| `paddingBottom` | Number | `0` | Space inside the element's bottom edge, between it and its content |
| `paddingLeft` | Number | `0` | Space inside the element's left edge, between it and its content |
| `paddingRight` | Number | `0` | Space inside the element's right edge, between it and its content |
| `paddingTop` | Number | `0` | Space inside the element's top edge, between it and its content |
| `position` | Enum (`relative`, `absolute`, `sticky`, `fixed`) | `relative` | How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space |
| `scrollIntoViewAlign` | Enum (`nearest`, `start`, `center`, `end`) | `nearest` | Where Scroll Into View leaves the element: Nearest edge moves only as far as needed |
| `sizeMode` | Enum (`explicit`, `contentWidth`, `contentHeight`, `contentSize`) | `contentSize` | Whether Width and Height are used as given, or the element sizes itself to fit its contents |
| `styleCss` | String | `/* background-color: red; */` | Raw CSS declarations applied to this element, overriding the styling ports above |
| `textStyle` | TextStyle | `None` | Applies one of the project's saved text styles; the individual font ports below override whatever it sets |
| `textTransform` | Enum (`none`, `uppercase`, `lowercase`, `capitalize`) | `none` | Forces the text to upper case, lower case or capitalised without changing the underlying value |
| `transformOriginX` | Number | `50` | Horizontal point the element rotates and scales around, as a fraction of its width |
| `transformOriginY` | Number | `50` | Vertical point the element rotates and scales around, as a fraction of its height |
| `transformRotation` | Number | `0` | Rotates the element clockwise in degrees, without affecting the layout |
| `transformScale` | Number | `1` | Scales the element about its transform origin; 1 leaves it unscaled |
| `transformX` | Number | `0` | Moves the element right after layout, without moving its siblings |
| `transformY` | Number | `0` | Moves the element down after layout, without moving its siblings |
| `useIcon` | Boolean | `false` | Shows an icon on this element |
| `useLabel` | Boolean | `true` | Shows a text label on this element |
| `variant` | String | — | Name of a saved variant of this node type to apply, replacing the styling set here |
| `visible` | Boolean | `true` | Hides the element while keeping the space it occupies in the layout |
| `width` | Dimension | `100` | Width of the element; how the value is read depends on Size Mode |
| `zIndex` | Number | — | Paint order among overlapping siblings; higher numbers paint on top |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `blur` | Signal | — | Takes the keyboard away from this button, which is what fires Blurred |
| `focus` | Signal | — | Puts the keyboard on this button, so Enter, Space and the arrow keys go to it |
| `scrollIntoView` | Signal | — | Scrolls the page, or the scrolling Group holding this element, until the element can be seen |

### What each input does

**Enabled** (`enabled`)

- the value it already holds: nothing
- a change: Enabled follows; disabled, it takes no click, no mouse press and no keyboard, but still hovers and still feels a finger

**Mounted** (`mounted`)

- always: the element is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint

**Focus** (`focus`)

- not on the page: nothing to focus, the Focus is not kept, and the editor is told → Unchanged; Focused stays silent
- it holds the keyboard already, or is disabled or hidden: nothing changes → Done; Focused stays silent
- otherwise the keyboard is put on it, and the Focused state goes true → Focused, Done

**Blur** (`blur`)

- it does not hold the keyboard (or is disabled, and gives it up to nobody): nothing changes → Done; Blurred stays silent
- it holds the keyboard: it is taken off it, and the Focused state goes false → Blurred, Done

**Scroll Into View** (`scrollIntoView`)

- always: the page, or the scrolling Group holding it, scrolls until the button can be seen

**Width** (`width`)

- always: the size it holds now, a bare number read in the unit it held; drawn at the next paint

**Height** (`height`)

- always: the size it holds now, a bare number read in the unit it held; drawn at the next paint

**Visible** (`visible`)

- always: shown or hidden at the next paint, its space kept; hidden, a Focus does not reach it

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `boundingHeight` | Number | — | Height this element actually ended up with after layout, in pixels |
| `boundingWidth` | Number | — | Width this element actually ended up with after layout, in pixels |
| `childIndex` | Number | — | This element's position among its parent's children, counting from 0 |
| `childrenCount` | Number | — | How many child elements are currently mounted inside this one |
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
| `done` | Signal | — | Fires when Focus put the keyboard on this button, or Blur took it away |
| `hoverEnd` | Signal | — | Fires when the pointer leaves this control, including when it leaves while a button is still held, or when the control leaves the page under it |
| `hoverStart` | Signal | — | Fires when the pointer moves onto this control |
| `onBlur` | Signal | — | Fires when keyboard focus leaves this control, or the control leaves the page while holding it, which is the usual place to validate what was entered |
| `onClick` | Signal | — | Fires when the button is clicked or tapped, and on Enter or Space while it has keyboard focus |
| `onFocus` | Signal | — | Fires the moment this control takes keyboard focus, whether from a click, a tab or a Focus action |
| `pointerDown` | Signal | — | Fires as a mouse button or finger goes down on this control, before any click has completed |
| `pointerUp` | Signal | — | Fires when the mouse button or finger is lifted, and also when a touch is cancelled by the system |
| `unchanged` | Signal | — | Fires when Focus arrived while this button was not on the page, so nothing was focused |
| `willUnmount` | Signal | — | Fires just before this element is removed from the page, while it still exists |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups); the tables above may be incomplete for a given instance._

Declares conditional/expandable port groups whose visibility depends on parameter values (see declaredPortGroups).

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| sizeMode = explicit OR sizeMode = contentHeight | `width` | — |
| sizeMode = explicit OR sizeMode = contentWidth | `height` | — |
| useLabel = true OR useLabel NOT SET | `label`, `textStyle`, `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `color`, `letterSpacing`, `lineHeight`, `textTransform`, `fontVariantNumeric` | — |
| useIcon = true | `iconSourceType`, `iconSize`, `iconPlacement`, `iconSpacing` | — |
| useIcon = true AND iconSourceType = image | `iconImageSource` | — |
| useIcon = true AND iconSourceType = icon | `iconIconSource`, `iconColor` | — |
| borderStyle = solid OR borderStyle = dashed OR borderStyle = dotted  | `borderWidth`, `borderColor` | — |
| borderLeftStyle = solid OR borderLeftStyle = dashed OR borderLeftStyle = dotted OR borderStyle = solid OR borderStyle = dashed OR borderStyle = dotted  | `borderLeftWidth`, `borderLeftColor` | — |
| borderTopStyle = solid OR borderTopStyle = dashed OR borderTopStyle = dotted OR borderStyle = solid OR borderStyle = dashed OR borderStyle = dotted  | `borderTopWidth`, `borderTopColor` | — |
| borderRightStyle = solid OR borderRightStyle = dashed OR borderRightStyle = dotted OR borderStyle = solid OR borderStyle = dashed OR borderStyle = dotted  | `borderRightWidth`, `borderRightColor` | — |
| borderBottomStyle = solid OR borderBottomStyle = dashed OR borderBottomStyle = dotted OR borderStyle = solid OR borderStyle = dashed OR borderStyle = dotted  | `borderBottomWidth`, `borderBottomColor` | — |
| boxShadowEnabled = true | `boxShadowSource` | — |
| boxShadowEnabled = true AND boxShadowSource = token | `boxShadowToken` | — |
| boxShadowEnabled = true AND boxShadowSource != token | `boxShadowOffsetX`, `boxShadowOffsetY`, `boxShadowInset`, `boxShadowBlurRadius`, `boxShadowSpreadRadius`, `boxShadowColor` | — |
| — | — | — |

## Ports at runtime

Declared-port-groups: icon ports appear when an icon source is chosen, and each visual state (hover, pressed, disabled, focused) contributes state-scoped styling ports. The catalog list is the superset; the editor shows the subset matching current parameters.

## Patterns

- onClick → Condition `eval`: validate before acting.
- onClick → RouterNavigate `navigate`: page navigation.
- A boolean derived from form state → `enabled`: prevent invalid submits at the source.

## Watch out for

- Simulating disabled state by hiding the button; drive `enabled` instead so layout and accessibility stay intact.

## Examples

**Validate an input before acting on a click**

The idiomatic gate shape: a Button click does not act directly — it evaluates a Condition. The Condition's boolean comes from an Expression that checks the text input's current value, so the same click either proceeds (ontrue) or reveals an error message (isfalse drives the error Text's visibility as a level, not a pulse). Note the two kinds of flow: text/booleans are values, onClick/eval/ontrue are momentary signals.

**Router page navigation from a button**

URL-style navigation: a Router hosts the app's pages (each page is a component, configured in the Router's `pages` parameter), and a Navigate node (RouterNavigate) switches it. The Button's `onClick` signal triggers `navigate`; which page to go to, and any path parameters, are set on the Navigate node's parameters — those ports are created from the Router's page configuration at edit time, which is why they are runtime-determined in the catalog.

**Split hero: copy column and image, with a display headline that looks set rather than typed**

Two columns inside the shell, each width 100% so an UNWRAPPED row shrinks them to half each — this is why a plain row works where a wrapped grid does not. The copy column carries the page's one display headline (--display-lg — a fluid clamp() that is 44px on a phone and 96px on a wide desktop — with --font-bold, --leading-none and --tracking-tighter; tight tracking is what makes a large heading look set), an eyebrow above it, a lead paragraph capped at ~520px, and two buttons whose concrete parameters are copied from the style vocabulary because `variant` is a connection-only port. The image gets sizeMode "explicit" plus a width, a height and objectFit "cover" — without explicit sizing those three ports are inert and the photo renders at its natural size.

**Empty state: what a list shows when it has no rows**

A list with nothing in it should say what it is and what to do, not render nothing. The designed version is small and centred inside a dashed card: an icon in a muted disc, one heading, one line of explanation capped at ~380px, and exactly one action. The switch is one wire: the query's `isEmpty` boolean into the empty state's `mounted` input. Use `mounted`, not `visible` — `mounted` takes the element out of the layout, while `visible` only hides it and keeps the space it occupies, which leaves a page-height hole above your empty state. The list needs no gate at all: a `For Each` over an empty array renders no rows and occupies no height, so nothing has to be inverted and no logic node is involved. Skipping the empty state is the difference between an app that looks unfinished on first run and one that does not, and first run is when it is always seen.

## Related nodes

[Group](./group.md), [Text Input](./net-noodl-controls-textinput.md), [Condition](../logic/condition.md), [Navigate](../navigation/router-navigate.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

This node is in the worked example on [How export works](../../how-export-works.md): see [what it became](../../how-export-works.md#what-each-node-became) in the generated React.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 5. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a person's pointer and keyboard (`person`)

### Starting state

```json
{
  "sizes": {
    "width": {
      "held": {
        "value": 100,
        "unit": "%"
      },
      "prop": "100%"
    },
    "height": {
      "held": {
        "value": 100,
        "unit": "%"
      },
      "prop": "100%"
    }
  },
  "grow": null,
  "enabled": true,
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

Each time Focus or Blur is triggered, the node reports exactly one of **Done** or **Unchanged**.

### Warnings it shows in the editor

| Warning | Settings it points at | Id |
|---|---|---|
| the last Focus arrived while it was not on the page | — | `focus/not-mounted` |
| Icon Source holds something that is not an icon | — | `visual/icon-source-not-an-icon/iconIconSource` |
| a wired Width in a row, or a wired Height in a column, is a percent, so it shares out the space instead of setting a size | — | `dimensions/wired-dimension-becomes-grow` |

### What a person can do to it

The conformance tests play these acts against it:

- `hover`: the pointer moves onto the button
- `leave`: the pointer moves off the button
- `press`: a mouse button goes down on it
- `release`: the mouse button comes up on it
- `click`: a press and a release on it, and the click that follows
- `touch`: a finger goes down on it
- `lift`: the finger comes up
- `focus`: the keyboard is put on it (a Tab reaching it)
- `blur`: the keyboard is taken off it (a Tab leaving it)

### Version history

- **Version 4**: Two warnings the runtime has always shown are now in this spec: a Focus that arrives while the node is not on the page (until a Focus reaches it), and an Icon Source that is not an icon (until an icon or nothing arrives). Existing projects are not migrated: only the editor is told, and the runtime already told it. Nothing a wire carries changes.
- **Version 5**: A wired Width in a row, or a wired Height in a column, that is a percent now shows as its warning in this spec: it became a share of the room, not a size. The runtime has always shown it. Existing projects are not migrated: only the editor is told, and the runtime already told it. Nothing a wire carries changes.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/button.ts"
/**
 * Button (`net.noodl.controls.button`) — read from
 * `packages/noodl-viewer-react/src/nodes/controls/button.ts`, `controls/utils.ts` (the control
 * events and states, the Focus / Blur actions), `components/controls/Button/Button.tsx` (the
 * component), `react-component-node.ts` (what every visual node shares: Mounted, Did Mount, Will
 * Unmount, the Advanced and Bounding Box outputs) and `focus-tracker.ts` on 2026-10-03 (NSP-016 s37).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations. A Button is a `<button>` on the page (Button.tsx :141-151) that a
 * PERSON acts on (spec.ts THE PERSON); its logic is what those acts and three inputs do to nine
 * outputs. Its look and layout — 81 of its 92 inputs — are stored, written to its style, and read
 * by no output: each is declared with its portability class (R10) and has no reducer.
 *
 *   - **Enabled** (utils.ts :75-89): `!!value`; a change sends the `enabled` output. The component
 *     renders `disabled={!props.enabled}` (Button.tsx :145). A disabled `<button>` takes no click
 *     (HTML: a disabled form control gets no click), no mouse press and no release (browsers have
 *     differed on these two; here none reaches it), and cannot be focused (a disabled form control is
 *     not a focusable area) — but the pointer still moves over it (Hover Start and Hover End still
 *     fire) and a finger still lands on it (a touch still fires Pointer Down and Pointer Up).
 *   - **the pointer** (utils.ts :204-283): onto the button — `hoverState` true, `hoverStart`
 *     (:216-234); off it — `hoverState` false, `hoverEnd`, and `pressedState` false (:224-227,
 *     :235-243, :276-280: a release off the button is a release); a mouse button down — `pressedState`
 *     true, `pointerDown` (:255-259, :285-293); up — `pressedState` false, `pointerUp` (:265-269,
 *     :299-311); a finger down / up — the same two pairs (:260-264, :270-275, :294-297, :305-311).
 *     The handlers are composed in declaration order (react-component-node.ts :545-563), so a
 *     release sends its state before its pulse, and leaving sends hover before it ends the press.
 *   - **a click** (Button.tsx :141-151, utils.ts `controlEvents`): a press, a release, then `onClick`
 *     (button.ts :79-85). Pressing a `<button>` is what gives it the keyboard — the browser's default
 *     action of `mousedown` — unless **Keeps Focus** is on, which cancels that default (Button.tsx
 *     :117-129, R26): then the keyboard stays where it was. So a click on an unfocused, enabled button
 *     without Keeps Focus is `pointerDown`, `onFocus` (with `focusState` true), `pointerUp`, `onClick`.
 *   - **the keyboard** (utils.ts :157-195): on — `focusState` true, `onFocus`; off — `focusState`
 *     false, `onBlur`. **Focus** (utils.ts :340-355, focus-tracker.ts :57-78): a button on the page
 *     can always be asked (`_canFocus` is "has an element", :402-405) — the keyboard is put on it if
 *     it is not there already (a disabled button takes it silently: nothing fires) and the action is
 *     Done; one not on the page (Mounted off) is Unchanged, and the Focus is not kept (R13). **Blur**
 *     (:356-364): the keyboard is taken off it (nothing fires if it was not on it) and Done.
 *   - **Mounted** (react-component-node.ts :2302-2321): off takes the element off the page —
 *     `willUnmount` (NoodlReactComponent :993-1003) — and on puts it back — `didMount` (:982-990),
 *     which also fires once at the first paint. Off the page a person finds nothing to act on, and
 *     the hover, pressed and focused states keep what they held (nothing resets them, :1000-1003
 *     resets only the VISUAL states).
 *   - **Child Index** and **Children Count** read 0 for a button nobody placed children in
 *     (react-component-node.ts :1262, :1253); **This** is the node itself (:1437-1444), recorded as
 *     the self reference; the four **Bounding Box** outputs read the measured rect, which nothing has
 *     measured until an observer is attached (:1263, :1446-1500) — never sent here.
 *   - **Scroll Into View** (:1380-1395) scrolls the page; nothing a wire can see. **Label**, **Enable
 *     Label**, **Block Pointer Events** and **Click Bubbling** change what the element draws and what
 *     reaches the nodes AROUND it — nothing this node's own outputs show (a graph scenario's matter).
 */

import { defineNode, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';
import { controlFocusNotMounted, focusDiagnostics, focusMissed } from './focus-not-mounted';
import { focusAndIconSourceChange, iconSourceDiagnostics } from './icon-source';
import { growChange, sizeAtDefault, sizeReducer, wiredGrowDiagnostic, withGrow, type Sizes } from './wired-grow';

type State = {
  /** utils.ts :75-89 `_internal.enabled` (true at :377) */
  enabled: boolean;
  /** utils.ts :378 `outputPropValues.hoverState` */
  hover: boolean;
  /** `outputPropValues.pressedState` */
  pressed: boolean;
  /** `outputPropValues.focusState` */
  focused: boolean;
  /** react-component-node.ts :1267 `wantsToBeMounted` — what the node WANTS */
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
  /** the element is on the page — what the node HAS. Follows `mounted` at each paint (the frame's end, or the page a person acts on). */
  onPage: boolean;
  /** v4 — the last Focus found the node off the page: the editor is told (focus-not-mounted.ts) */
  focusMissed: boolean;
  /** NSP-019 R38 — what the size ports hold, and what the last render on the page said of them (wired-grow.ts) */
  sizes: Sizes;
  grow: string | null;
}

type O = typeof Button extends { outputs: infer X } ? X : never;
type Send = Patch<State, O>;

const NOTHING: Send = { send: [] };
/** An act that meets nothing it can move (a disabled button pressed, a Tab onto a focused one). */
const NONE: Act = { send: [] };

export const Button = defineNode({
  type: 'net.noodl.controls.button',
  // v2 (P109 ISL-031, P107-C64 ruled "Ignore touches, keep hover"): a finger on a disabled control reports nothing — no Pressed, no Pointer Down or Up — as Enabled promises; the pointer's hover still reports
  // v3 (P109 ISL-031, P107-D30 ruled "Reset and announce"): a control leaving the page (Mounted off) takes Focused, Hover and Pressed with it — each goes false, sent if it was true, with Blurred and Hover End for the ones that were on
  // v4 (NSP-019 R35): a Focus that finds the node off the page shows as its warning until a Focus reaches it, and an Icon Source that is not an icon shows as one until an icon or nothing arrives (`diagnostics`)
  // v5 (NSP-019 R38): a wired Width in a row, or a wired Height in a column, that is a percent shows as its warning (wired-grow.ts)
  version: 5,
  changes: [focusAndIconSourceChange(4), growChange(5)],
  diagnostics: { ...focusDiagnostics(controlFocusNotMounted('button')), ...iconSourceDiagnostics(), ...wiredGrowDiagnostic },
  source: 'packages/noodl-viewer-react/src/nodes/controls/button.ts',
  needs: ['person'],
  // the page's syncs (spec.ts `synced`): not branches
  synced: ['pageEnabled', 'pageVisible'],

  state: { sizes: { width: sizeAtDefault(), height: sizeAtDefault() }, grow: null, enabled: true, hover: false, pressed: false, focused: false, mounted: true, pageEnabled: true, visible: true, pageVisible: true, elementFocused: false, onPage: false, focusMissed: false } as State,
  // utils.ts :366-376 `outcomeOutputs({ done, unchanged })`
  outcomes: ['done', 'unchanged'],

  // what a person can do to a button (spec.ts THE PERSON); none carries a value
  acts: {
    hover: { description: 'the pointer moves onto the button' },
    leave: { description: 'the pointer moves off the button' },
    press: { description: 'a mouse button goes down on it' },
    release: { description: 'the mouse button comes up on it' },
    click: { description: 'a press and a release on it, and the click that follows' },
    touch: { description: 'a finger goes down on it' },
    lift: { description: 'the finger comes up' },
    focus: { description: 'the keyboard is put on it (a Tab reaching it)' },
    blur: { description: 'the keyboard is taken off it (a Tab leaving it)' }
  },

  inputs: {
    // ---- logic ----
    // utils.ts :75-89
    enabled: { type: 'boolean', default: true, coerce: 'none', displayName: 'Enabled', group: 'General', description: 'Lets the user interact with this control; when off it still renders and occupies its space but ignores clicks, touches and typing', portability: 'logic' },
    // button.ts :58-66 — read by the component at each press (Button.tsx :122)
    keepsFocus: { type: 'boolean', default: false, coerce: 'none', displayName: 'Keeps Focus', group: 'General', description: 'Leaves the keyboard where it was when this button is clicked, instead of taking it — what a key on an on-screen keypad needs, so the cursor stays in the field being typed into', portability: 'logic' },
    // react-component-node.ts :2302-2321
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen)', portability: 'logic', layout: 'present' },
    // utils.ts :340-355
    focus: { type: 'signal', outcome: true, displayName: 'Focus', group: 'Actions', description: 'Puts the keyboard on this button, so Enter, Space and the arrow keys go to it', portability: 'logic' },
    // utils.ts :356-364
    blur: { type: 'signal', outcome: true, displayName: 'Blur', group: 'Actions', description: 'Takes the keyboard away from this button, which is what fires Blurred', portability: 'logic' },
    // react-component-node.ts :1380-1395 — scrolls the page; nothing a wire sees
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },
    // node-shared-port-definitions.ts `addLabelInputs` — what the element draws
    label: { when: (p) => p.useLabel === true || p.useLabel === undefined, type: 'string', default: 'Label', coerce: 'none', displayName: 'Label', group: 'Label', description: 'Text shown on this element', portability: 'logic' },
    useLabel: { type: 'boolean', default: true, coerce: 'none', displayName: 'Enable Label', group: 'Label', description: 'Shows a text label on this element', portability: 'logic' },
    // utils.ts :93-120 — what reaches the nodes around it (pointerlisteners.ts); a graph scenario's matter
    blockTouch: { type: 'boolean', coerce: 'none', displayName: 'Block Pointer Events', group: 'Pointer Events', description: 'Stops every pointer event that lands on this control from reaching the nodes it sits inside. Blunt: it takes hover and pointer-down with it, so reach for Click Bubbling first if it is only clicks you want to keep in', portability: 'logic' },
    clickBubbling: { type: 'enum', enums: ['auto', 'always', 'never'], default: 'auto', coerce: 'none', displayName: 'Click Bubbling', group: 'Pointer Events', description: "Whether a click on this control also fires Click on the nodes it sits inside. Automatic keeps it here as soon as this control's own Click is connected, so a Favourite button inside a clickable card runs Favourite and not the card; Always is the older behaviour where both run; Never keeps every click here, wired or not", portability: 'logic' },

    // ---- look and layout (R10): stored, written to the style, read by no output; each with its class (visual-params.json) ----
    alignX: { type: 'enum', enums: ['left', 'center', 'right'], coerce: 'none', displayName: 'Align X', group: 'Alignment', description: 'Horizontal alignment of this element within the space its parent gives it', portability: 'layout-shared', layout: 'align-x' },
    alignY: { type: 'enum', enums: ['top', 'center', 'bottom'], coerce: 'none', displayName: 'Align Y', group: 'Alignment', description: 'Vertical alignment of this element within the space its parent gives it', portability: 'layout-shared', layout: 'align-y' },
    backgroundColor: { type: 'color', default: '#000000', coerce: 'none', displayName: 'Background Color', group: 'Style', description: 'Fill colour behind the label and icon', portability: 'look-shared' },
    borderBottomColor: { when: (p) => p.borderBottomStyle === 'solid' || p.borderBottomStyle === 'dashed' || p.borderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: 'color', coerce: 'none', displayName: 'Border Color', group: 'Border Style', description: 'Colour of the bottom edge only, overriding Border Color', portability: 'look-shared' },
    borderBottomLeftRadius: { type: 'number', coerce: 'none', displayName: 'Corner Radius', group: 'Corner Radius', description: 'Rounds the bottom-left corner only, overriding Corner Radius', portability: 'look-shared' },
    borderBottomRightRadius: { type: 'number', coerce: 'none', displayName: 'Corner Radius', group: 'Corner Radius', description: 'Rounds the bottom-right corner only, overriding Corner Radius', portability: 'look-shared' },
    borderBottomStyle: { type: 'enum', enums: ['none', 'solid', 'dotted', 'dashed'], coerce: 'none', displayName: 'Border Style', group: 'Border Style', description: 'Line style for the bottom edge only, overriding Border Style; None hides that edge', portability: 'look-expressible', layout: 'border-bottom-style' },
    borderBottomWidth: { when: (p) => p.borderBottomStyle === 'solid' || p.borderBottomStyle === 'dashed' || p.borderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: 'number', coerce: 'none', displayName: 'Border Width', group: 'Border Style', description: "Thickness of the bottom edge in pixels, and it adds to the element's size", portability: 'look-shared', layout: 'border-bottom-width' },
    borderColor: { when: (p) => p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: 'color', default: '#000000', coerce: 'none', displayName: 'Border Color', group: 'Border Style', description: 'Colour of the border, which has no effect while Border Style is None', portability: 'look-shared' },
    borderLeftColor: { when: (p) => p.borderLeftStyle === 'solid' || p.borderLeftStyle === 'dashed' || p.borderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: 'color', coerce: 'none', displayName: 'Border Color', group: 'Border Style', description: 'Colour of the left edge only, overriding Border Color', portability: 'look-shared' },
    borderLeftStyle: { type: 'enum', enums: ['none', 'solid', 'dotted', 'dashed'], coerce: 'none', displayName: 'Border Style', group: 'Border Style', description: 'Line style for the left edge only, overriding Border Style; None hides that edge', portability: 'look-expressible', layout: 'border-left-style' },
    borderLeftWidth: { when: (p) => p.borderLeftStyle === 'solid' || p.borderLeftStyle === 'dashed' || p.borderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: 'number', coerce: 'none', displayName: 'Border Width', group: 'Border Style', description: "Thickness of the left edge in pixels, and it adds to the element's size", portability: 'look-shared', layout: 'border-left-width' },
    borderRadius: { type: 'number', default: 0, coerce: 'none', displayName: 'Corner Radius', group: 'Corner Radius', description: 'Rounds all four corners, except any corner that sets its own radius', portability: 'look-shared' },
    borderRightColor: { when: (p) => p.borderRightStyle === 'solid' || p.borderRightStyle === 'dashed' || p.borderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: 'color', coerce: 'none', displayName: 'Border Color', group: 'Border Style', description: 'Colour of the right edge only, overriding Border Color', portability: 'look-shared' },
    borderRightStyle: { type: 'enum', enums: ['none', 'solid', 'dotted', 'dashed'], coerce: 'none', displayName: 'Border Style', group: 'Border Style', description: 'Line style for the right edge only, overriding Border Style; None hides that edge', portability: 'look-expressible', layout: 'border-right-style' },
    borderRightWidth: { when: (p) => p.borderRightStyle === 'solid' || p.borderRightStyle === 'dashed' || p.borderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: 'number', coerce: 'none', displayName: 'Border Width', group: 'Border Style', description: "Thickness of the right edge in pixels, and it adds to the element's size", portability: 'look-shared', layout: 'border-right-width' },
    borderStyle: { type: 'enum', enums: ['none', 'solid', 'dotted', 'dashed'], default: 'none', coerce: 'none', displayName: 'Border Style', group: 'Border Style', description: 'Line style for all four edges; None hides the border and leaves Border Width and Color inactive', portability: 'look-expressible', layout: 'border-style' },
    borderTopColor: { when: (p) => p.borderTopStyle === 'solid' || p.borderTopStyle === 'dashed' || p.borderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: 'color', coerce: 'none', displayName: 'Border Color', group: 'Border Style', description: 'Colour of the top edge only, overriding Border Color', portability: 'look-shared' },
    borderTopLeftRadius: { type: 'number', coerce: 'none', displayName: 'Corner Radius', group: 'Corner Radius', description: 'Rounds the top-left corner only, overriding Corner Radius', portability: 'look-shared' },
    borderTopRightRadius: { type: 'number', coerce: 'none', displayName: 'Corner Radius', group: 'Corner Radius', description: 'Rounds the top-right corner only, overriding Corner Radius', portability: 'look-shared' },
    borderTopStyle: { type: 'enum', enums: ['none', 'solid', 'dotted', 'dashed'], coerce: 'none', displayName: 'Border Style', group: 'Border Style', description: 'Line style for the top edge only, overriding Border Style; None hides that edge', portability: 'look-expressible', layout: 'border-top-style' },
    borderTopWidth: { when: (p) => p.borderTopStyle === 'solid' || p.borderTopStyle === 'dashed' || p.borderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: 'number', coerce: 'none', displayName: 'Border Width', group: 'Border Style', description: "Thickness of the top edge in pixels, and it adds to the element's size", portability: 'look-shared', layout: 'border-top-width' },
    borderWidth: { when: (p) => p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: 'number', default: 2, coerce: 'none', displayName: 'Border Width', group: 'Border Style', description: "Thickness of the border in pixels, which adds to the element's size unless Box Sizing accounts for it", portability: 'look-shared', layout: 'border-width' },
    boxShadowBlurRadius: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: 'number', default: 5, coerce: 'none', displayName: 'Blur Radius', group: 'Box Shadow', description: 'How soft the shadow edge is; 0 gives a hard edge', portability: 'look-expressible' },
    boxShadowColor: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: 'color', default: '#00000033', coerce: 'none', displayName: 'Shadow Color', group: 'Box Shadow', description: 'Colour of the shadow, including how transparent it is', portability: 'look-expressible' },
    boxShadowEnabled: { type: 'boolean', default: false, coerce: 'none', displayName: 'Shadow Enabled', group: 'Box Shadow', description: 'Turns the drop shadow on', portability: 'look-expressible' },
    boxShadowInset: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: 'boolean', default: false, coerce: 'none', displayName: 'Inset', group: 'Box Shadow', description: 'Draws the shadow inside the element instead of behind it', portability: 'web-only' },
    boxShadowOffsetX: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: 'number', default: 0, coerce: 'none', displayName: 'Offset X', group: 'Box Shadow', description: 'How far to the right the shadow is cast from the element', portability: 'look-expressible' },
    boxShadowOffsetY: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: 'number', default: 0, coerce: 'none', displayName: 'Offset Y', group: 'Box Shadow', description: 'How far down the shadow is cast from the element', portability: 'look-expressible' },
    boxShadowSource: { when: (p) => p.boxShadowEnabled === true, type: 'enum', enums: ['custom', 'token'], default: 'custom', coerce: 'none', displayName: 'Shadow Source', group: 'Box Shadow', description: 'Where the shadow comes from: Custom builds it from the six fields below; From a style token wears one of the project’s shadow tokens, so every element sharing that token changes together', portability: 'look-shared' },
    boxShadowSpreadRadius: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: 'number', default: 2, coerce: 'none', displayName: 'Spread Radius', group: 'Box Shadow', description: 'How much larger than the element the shadow is drawn', portability: 'look-expressible' },
    boxShadowToken: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource === 'token', type: 'string', default: 'var(--shadow-md)', coerce: 'none', displayName: 'Shadow Token', group: 'Box Shadow', description: 'The project shadow this element wears, as var(--shadow-md). Pick one from the list; compose new ones in the Styles panel', portability: 'look-shared' },
    boxSizing: { type: 'enum', enums: ['border-box', 'content-box'], default: 'border-box', coerce: 'none', displayName: 'Box Sizing', group: 'Margin and padding', description: "Whether Width and Height include this element's padding and border, or only its content", portability: 'web-only' },
    color: { when: (p) => p.useLabel === true || p.useLabel === undefined, type: 'color', coerce: 'none', displayName: 'Color', group: 'Label Text Style', description: 'Colour of the text itself, not of the element behind it', portability: 'look-shared' },
    cssClassName: { type: 'string', default: '', coerce: 'none', displayName: 'CSS Class', group: 'Advanced HTML', description: 'Extra CSS class names to put on this element, for styling from a stylesheet you supply', portability: 'web-only' },
    dataAttributes: { type: 'stringlist', coerce: 'none', editOnly: true, displayName: 'Data Attributes', group: 'Data Attributes', description: 'data-* names (data-testid) for tests and scripts to find this element by; each gets a value input', portability: 'web-only' },
    fontFamily: { when: (p) => p.useLabel === true || p.useLabel === undefined, type: 'font', coerce: 'none', displayName: 'Font Family', group: 'Label Text Style', description: 'Typeface to render the text in, either a web-safe family name or a font file added to the project', portability: 'look-shared' },
    fontSize: { when: (p) => p.useLabel === true || p.useLabel === undefined, type: 'number', coerce: 'none', displayName: 'Font Size', group: 'Label Text Style', description: 'Height of the text, in pixels', portability: 'look-shared' },
    fontStyle: { when: (p) => p.useLabel === true || p.useLabel === undefined, type: 'enum', enums: ['normal', 'italic'], default: 'normal', coerce: 'none', displayName: 'Font Style', group: 'Label Text Style', description: 'Renders the text upright or italic', portability: 'look-shared' },
    fontVariantNumeric: { when: (p) => p.useLabel === true || p.useLabel === undefined, type: 'enum', enums: ['normal', 'tabular-nums'], default: 'normal', coerce: 'none', displayName: 'Numerals', group: 'Label Text Style', description: 'Tabular draws every digit at the same width so columns of numbers align; Normal follows the font', portability: 'look-expressible' },
    fontWeight: { when: (p) => p.useLabel === true || p.useLabel === undefined, type: 'number', default: 'Auto', coerce: 'none', displayName: 'Font Weight', group: 'Label Text Style', description: 'How heavy the text is drawn, from 100 (thin) to 900 (black); leave as Auto to use the weight the font family sets', portability: 'look-shared' },
    height: { when: (p) => p.sizeMode === 'explicit' || p.sizeMode === 'contentWidth', type: 'dimension', default: 100, coerce: 'none', displayName: 'Height', group: 'Dimensions', description: 'Height of the element; how the value is read depends on Size Mode', portability: 'layout-shared', layout: 'height' },
    iconColor: { when: (p) => p.useIcon === true && p.iconSourceType === 'icon', type: 'color', coerce: 'none', displayName: 'Color', group: 'Icon', description: 'Colour of the icon', portability: 'look-shared' },
    iconIconSource: { when: (p) => p.useIcon === true && p.iconSourceType === 'icon', type: 'icon', coerce: 'none', displayName: 'Icon Source', group: 'Icon', description: 'Which glyph to show, picked from an installed icon set', portability: 'look-shared' },
    iconImageSource: { when: (p) => p.useIcon === true && p.iconSourceType === 'image', type: 'image', coerce: 'none', displayName: 'Image Source', group: 'Icon', description: 'Image file to show instead of an icon-set glyph', portability: 'look-shared' },
    iconPlacement: { when: (p) => p.useIcon === true, type: 'enum', enums: ['left', 'right'], default: 'left', coerce: 'none', displayName: 'Placement', group: 'Icon', description: 'Which side of the label the icon sits on, with Icon Spacing as the gap between them', portability: 'layout-shared', layout: 'content' },
    iconSize: { when: (p) => p.useIcon === true, type: 'number', default: 16, coerce: 'none', displayName: 'Size', group: 'Icon', description: 'Height of the icon', portability: 'look-shared' },
    iconSourceType: { when: (p) => p.useIcon === true, type: 'enum', enums: ['image', 'icon'], default: 'icon', coerce: 'none', displayName: 'Type', group: 'Icon', description: 'Whether the icon comes from an installed icon set or from an image file, which decides the source port below', portability: 'look-shared' },
    iconSpacing: { when: (p) => p.useIcon === true, type: 'number', default: 10, coerce: 'none', displayName: 'Spacing', group: 'Icon', description: 'Gap between the icon and the text beside it', portability: 'layout-shared', layout: 'content' },
    letterSpacing: { when: (p) => p.useLabel === true || p.useLabel === undefined, type: 'number', default: 'Auto', coerce: 'none', displayName: 'Letter Spacing', group: 'Label Text Style', description: 'Extra space added between characters; leave as Auto to use the spacing built into the font', portability: 'look-shared' },
    lineHeight: { when: (p) => p.useLabel === true || p.useLabel === undefined, type: 'number', default: 'Auto', coerce: 'none', displayName: 'Line Height', group: 'Label Text Style', description: 'Vertical space each line of text occupies; leave as Auto to follow the font', portability: 'look-shared' },
    marginBottom: { type: 'number', coerce: 'none', displayName: 'Margin Bottom', group: 'Margin and padding', description: "Space outside the element's bottom edge, between it and its neighbours", portability: 'layout-expressible', layout: 'margin-bottom' },
    marginLeft: { type: 'number', coerce: 'none', displayName: 'Margin Left', group: 'Margin and padding', description: "Space outside the element's left edge, between it and its neighbours", portability: 'layout-expressible', layout: 'margin-left' },
    marginRight: { type: 'number', coerce: 'none', displayName: 'Margin Right', group: 'Margin and padding', description: "Space outside the element's right edge, between it and its neighbours", portability: 'layout-expressible', layout: 'margin-right' },
    marginTop: { type: 'number', coerce: 'none', displayName: 'Margin Top', group: 'Margin and padding', description: "Space outside the element's top edge, between it and its neighbours", portability: 'layout-expressible', layout: 'margin-top' },
    maxHeight: { type: 'number', coerce: 'none', displayName: 'Max Height', group: 'Dimension Constraints', description: 'Largest height the element may grow to, taking priority over Height', portability: 'layout-shared', layout: 'max-height' },
    maxWidth: { type: 'number', coerce: 'none', displayName: 'Max Width', group: 'Dimension Constraints', description: 'Largest width the element may grow to, taking priority over Width', portability: 'layout-shared', layout: 'max-width' },
    minHeight: { type: 'number', coerce: 'none', displayName: 'Min Height', group: 'Dimension Constraints', description: 'Smallest height the element may shrink to, taking priority over Height', portability: 'layout-shared', layout: 'min-height' },
    minWidth: { type: 'number', coerce: 'none', displayName: 'Min Width', group: 'Dimension Constraints', description: 'Smallest width the element may shrink to, taking priority over Width', portability: 'layout-shared', layout: 'min-width' },
    mixBlendMode: { type: 'enum', enums: ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'], default: 'normal', coerce: 'none', displayName: 'Blend Mode', group: 'Style', description: "How this element's colours blend with whatever is painted behind it", portability: 'look-expressible' },
    opacity: { type: 'number', default: 1, coerce: 'none', displayName: 'Opacity', group: 'Style', description: 'How opaque this element is, from 0 for invisible to 1 for solid', portability: 'look-shared' },
    paddingBottom: { type: 'number', default: 0, coerce: 'none', displayName: 'Pad Bottom', group: 'Margin and padding', description: "Space inside the element's bottom edge, between it and its content", portability: 'layout-shared', layout: 'padding-bottom' },
    paddingLeft: { type: 'number', default: 0, coerce: 'none', displayName: 'Pad Left', group: 'Margin and padding', description: "Space inside the element's left edge, between it and its content", portability: 'layout-shared', layout: 'padding-left' },
    paddingRight: { type: 'number', default: 0, coerce: 'none', displayName: 'Pad Right', group: 'Margin and padding', description: "Space inside the element's right edge, between it and its content", portability: 'layout-shared', layout: 'padding-right' },
    paddingTop: { type: 'number', default: 0, coerce: 'none', displayName: 'Pad Top', group: 'Margin and padding', description: "Space inside the element's top edge, between it and its content", portability: 'layout-shared', layout: 'padding-top' },
    position: { type: 'enum', enums: ['relative', 'absolute', 'sticky', 'fixed'], default: 'relative', coerce: 'none', displayName: 'Position', group: 'Layout', description: 'How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space', portability: 'layout-expressible', layout: 'place' },
    sizeMode: { type: 'enum', enums: ['explicit', 'contentWidth', 'contentHeight', 'contentSize'], default: 'contentSize', coerce: 'none', editOnly: true, displayName: 'Size Mode', group: 'Dimensions', description: 'Whether Width and Height are used as given, or the element sizes itself to fit its contents', portability: 'layout-shared', layout: 'size-mode' },
    styleCss: { type: 'string', default: '/* background-color: red; */', coerce: 'none', editOnly: true, displayName: 'CSS Style', group: 'Advanced HTML', description: 'Raw CSS declarations applied to this element, overriding the styling ports above', portability: 'web-only' },
    textStyle: { when: (p) => p.useLabel === true || p.useLabel === undefined, type: 'textStyle', default: 'None', coerce: 'none', displayName: 'Text Style', group: 'Label Text Style', description: "Applies one of the project's saved text styles; the individual font ports below override whatever it sets", portability: 'look-shared' },
    textTransform: { when: (p) => p.useLabel === true || p.useLabel === undefined, type: 'enum', enums: ['none', 'uppercase', 'lowercase', 'capitalize'], default: 'none', coerce: 'none', displayName: 'Case', group: 'Label Text Style', description: 'Forces the text to upper case, lower case or capitalised without changing the underlying value', portability: 'look-shared' },
    transformOriginX: { type: 'number', default: '50', coerce: 'none', displayName: 'Transform Origin X', group: 'Placement', description: 'Horizontal point the element rotates and scales around, as a fraction of its width', portability: 'layout-shared', layout: 'origin-x' },
    transformOriginY: { type: 'number', default: '50', coerce: 'none', displayName: 'Transform Origin Y', group: 'Placement', description: 'Vertical point the element rotates and scales around, as a fraction of its height', portability: 'layout-shared', layout: 'origin-y' },
    transformRotation: { type: 'number', default: 0, coerce: 'none', displayName: 'Rotation', group: 'Placement', description: 'Rotates the element clockwise in degrees, without affecting the layout', portability: 'layout-shared', layout: 'rotation' },
    transformScale: { type: 'number', default: 1, coerce: 'none', displayName: 'Scale', group: 'Placement', description: 'Scales the element about its transform origin; 1 leaves it unscaled', portability: 'layout-shared', layout: 'scale' },
    transformX: { type: 'number', default: 0, coerce: 'none', displayName: 'Pos X', group: 'Placement', description: 'Moves the element right after layout, without moving its siblings', portability: 'layout-shared', layout: 'translate-x' },
    transformY: { type: 'number', default: 0, coerce: 'none', displayName: 'Pos Y', group: 'Placement', description: 'Moves the element down after layout, without moving its siblings', portability: 'layout-shared', layout: 'translate-y' },
    useIcon: { type: 'boolean', default: false, coerce: 'none', displayName: 'Enable Icon', group: 'Icon', description: 'Shows an icon on this element', portability: 'look-shared' },
    variant: { type: 'string', coerce: 'none', displayName: 'Variant', group: 'General', description: 'Name of a saved variant of this node type to apply, replacing the styling set here', portability: 'look-shared' },
    visible: { type: 'boolean', default: true, coerce: 'none', displayName: 'Visible', group: 'Style', description: 'Hides the element while keeping the space it occupies in the layout', portability: 'look-shared' },
    width: { when: (p) => p.sizeMode === 'explicit' || p.sizeMode === 'contentHeight', type: 'dimension', default: 100, coerce: 'none', displayName: 'Width', group: 'Dimensions', description: 'Width of the element; how the value is read depends on Size Mode', portability: 'layout-shared', layout: 'width' },
    zIndex: { type: 'number', coerce: 'none', displayName: 'zIndex', group: 'Style', description: 'Paint order among overlapping siblings; higher numbers paint on top', portability: 'look-shared' }
  },

  outputs: {
    // button.ts :79-85
    onClick: { type: 'signal', displayName: 'Click', group: 'Events', description: 'Fires when the button is clicked or tapped, and on Enter or Space while it has keyboard focus' },
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
    // react-component-node.ts :1428-1444 — a lone button has no siblings and no children placed in it
    childIndex: { type: 'number', from: () => 0, displayName: 'Child Index', group: 'Advanced', description: "This element's position among its parent's children, counting from 0" },
    childrenCount: { type: 'number', from: () => 0, displayName: 'Children Count', group: 'Advanced', description: 'How many child elements are currently mounted inside this one' },
    this: { type: 'reference', from: () => SELF_REFERENCE, displayName: 'This', group: 'Advanced', description: 'A reference to this node itself, for ports that take a node rather than a value' },
    // react-component-node.ts :1446-1500 — measured by an observer nothing here attaches: never defined
    screenPositionX: { type: 'number', from: () => undefined, displayName: 'Screen Position X', group: 'Bounding Box', description: "Distance in pixels from the left edge of the window to this element's left edge" },
    screenPositionY: { type: 'number', from: () => undefined, displayName: 'Screen Position Y', group: 'Bounding Box', description: "Distance in pixels from the top edge of the window to this element's top edge" },
    boundingWidth: { type: 'number', from: () => undefined, displayName: 'Width', group: 'Bounding Box', description: 'Width this element actually ended up with after layout, in pixels' },
    boundingHeight: { type: 'number', from: () => undefined, displayName: 'Height', group: 'Bounding Box', description: 'Height this element actually ended up with after layout, in pixels' }
  }
}).on(
  {
    // utils.ts :82-89 — `!!value`; only a change is told
    enabled: (s, v) => {
      const enabled = !!v;
      if (enabled === s.enabled) return { says: 'the value it already holds: nothing', send: [] };
      return { says: 'a change: Enabled follows; disabled, it takes no click, no mouse press and no keyboard, but still hovers and still feels a finger', set: { enabled }, send: ['enabled'] };
    },
    // react-component-node.ts :2310-2320 — what the node wants; the page follows at the next paint (`painted`)
    mounted: (_s, v) => ({ says: 'always: the element is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint', set: { mounted: !!v }, send: [] }),
    // utils.ts :340-355 → focus-tracker.ts :57-78: an element on the page is asked (a disabled one takes nothing, silently); none, Unchanged.
    // The ELEMENT, not the want: a Mounted written off in the same frame has not left the page yet (:1675-1689, the frame's end)
    focus: (s) => {
      if (!s.onPage) return { says: 'not on the page: nothing to focus, the Focus is not kept, and the editor is told', set: focusMissed(s, true), send: [], outcome: 'unchanged' };
      if (s.elementFocused || !s.pageEnabled || !s.pageVisible) return { says: 'it holds the keyboard already, or is disabled or hidden: nothing changes', set: focusMissed(s, false), send: [], outcome: 'done' };
      return { says: 'otherwise the keyboard is put on it, and the Focused state goes true', set: { focused: true, elementFocused: true, ...focusMissed(s, false) }, send: ['focusState'], emit: ['onFocus'], outcome: 'done' };
    },
    // utils.ts :356-364 → focus-tracker.ts :88-90: the keyboard is taken off it; Done either way
    // a disabled element gives the keyboard up to nobody: `blur()` on one does nothing (the focusing steps), Done regardless
    blur: (s) => {
      if (!s.onPage || !s.elementFocused || !s.pageEnabled) return { says: 'it does not hold the keyboard (or is disabled, and gives it up to nobody): nothing changes', send: [], outcome: 'done' };
      return { says: 'it holds the keyboard: it is taken off it, and the Focused state goes false', set: { focused: false, elementFocused: false }, send: ['focusState'], emit: ['onBlur'], outcome: 'done' };
    },
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the button can be seen', send: [] }),
    // NSP-019 R38 — node.ts :446-458, react-component-node.ts :706-753 (wired-grow.ts)
    width: sizeReducer('width'),
    height: sizeReducer('height'),
    // node-shared-port-definitions.ts :366-375 — the page follows at the next paint
    visible: (_s, v) => ({ says: 'always: shown or hidden at the next paint, its space kept; hidden, a Focus does not reach it', set: { visible: !!v }, send: [] })
  },
  {
    // placed on the page with its params set — the first paint (react-component-node.ts :1740-1743 reads `wantsToBeMounted`):
    // Did Mount, unless a Mounted parameter said no
    world: { place: (s, i, w) => withGrow(s, painted(s), i.sizeMode, i.position, w) },
    // and every frame's end is a paint: the page follows what the node wants (react-component-node.ts :1675-1689, :2310-2320
    // → the element added or removed, NoodlReactComponent :982-990 / :993-1003)
    afterInputs: (s, i, w) => withGrow(s, painted(s), i.sizeMode, i.position, w),
    // a person acts on a PAINTED page (adapter.ts `act`): the page follows first, then the act meets what is there
    person: {
      // utils.ts :216-234 — not dropped on a disabled control
      hover: (s) => onPainted(s, (p) => (p.pageVisible ? { set: { hover: true }, send: ['hoverState'], emit: ['hoverStart'] } : NONE)),
      // utils.ts :224-227, :235-243, :276-280 — hover before the press it ends
      leave: (s) => onPainted(s, (p) => (p.pageVisible ? { set: { hover: false, pressed: false }, send: ['hoverState', 'pressedState'], emit: ['hoverEnd'] } : NONE)),
      press: (s, i) => onPainted(s, (p) => (p.enabled && p.pageVisible ? pressed(p, i) : NONE)),
      release: (s) => onPainted(s, (p) => (p.enabled && p.pageVisible ? { set: { pressed: false }, send: ['pressedState'], emit: ['pointerUp'] } : NONE)),
      // Button.tsx :141-151, button.ts :79-85: the press, the release, then Click
      click: (s, i) =>
        onPainted(s, (p) => {
          if (!p.enabled || !p.pageVisible) return NONE;
          const d = pressed(p, i);
          return { set: { ...d.set, pressed: false }, send: ['pressedState', 'focusState'], emit: [...d.emit, 'pointerUp', 'onClick'] };
        }),
      // utils.ts — a finger on a disabled control reports nothing (v2, C64), as a mouse press on one does
      touch: (s) => onPainted(s, (p) => (p.enabled && p.pageVisible ? { set: { pressed: true }, send: ['pressedState'], emit: ['pointerDown'] } : NONE)),
      lift: (s) => onPainted(s, (p) => (p.enabled && p.pageVisible ? { set: { pressed: false }, send: ['pressedState'], emit: ['pointerUp'] } : NONE)),
      // utils.ts :157-195 — a disabled button is not a focusable area
      focus: (s) => onPainted(s, (p) => (p.enabled && p.pageVisible && !p.elementFocused ? { set: { focused: true, elementFocused: true }, send: ['focusState'], emit: ['onFocus'] } : NONE)),
      blur: (s) => onPainted(s, (p) => (p.elementFocused && p.enabled ? { set: { focused: false, elementFocused: false }, send: ['focusState'], emit: ['onBlur'] } : NONE))
    }
  }
);

type Pulse = 'didMount' | 'willUnmount' | 'pointerDown' | 'pointerUp' | 'onClick' | 'onFocus' | 'onBlur' | 'hoverStart' | 'hoverEnd';
type Act = { set?: Partial<State>; send: Array<'pressedState' | 'focusState' | 'hoverState'>; emit?: Pulse[] };

/**
 * A paint: the page follows what the node wants. An element wanted and not there is added — Did Mount
 * (NoodlReactComponent :982-990); one there and not wanted leaves — Will Unmount (:993-1003), its hover,
 * pressed and focused states keeping what they held (:1000-1003 resets only the visual states).
 */
function painted(s: Readonly<State>): Act & { set: Partial<State>; emit: Pulse[] } {
  const set: Partial<State> = { ...(s.pageEnabled === s.enabled ? {} : { pageEnabled: s.enabled }), ...(s.pageVisible === s.visible ? {} : { pageVisible: s.visible }) };
  if (s.mounted && !s.onPage) return { set: { ...set, onPage: true }, send: [], emit: ['didMount'] };
  // the element leaves with the keyboard it held, and the states go with it (v3, D30)
  if (!s.mounted && s.onPage) {
    const l = leftPage(s);
    return { set: { ...set, onPage: false, elementFocused: false, ...l.set }, send: l.send, emit: ['willUnmount', ...l.emit] };
  }
  return { set, send: [], emit: [] };
}

/** The act on the painted page: nothing to act on when the element is not there; else `then` on the painted state, after the paint's own pulses. */
function onPainted(s: Readonly<State>, then: (painted: Readonly<State>) => Act): Act {
  const p = painted(s);
  const after: State = { ...s, ...p.set };
  const a = after.onPage ? then(after) : NONE;
  return { set: { ...p.set, ...a.set }, send: [...p.send, ...a.send], emit: [...p.emit, ...(a.emit ?? [])] };
}

/**
 * A mouse button going down on an enabled button on the page (utils.ts :255-259, :285-293), then the
 * browser's default action of `mousedown` — the keyboard goes onto the `<button>` — unless Keeps
 * Focus cancelled it (Button.tsx :122-127) or it is there already.
 */
function pressed(s: Readonly<State>, i: { keepsFocus: boolean }): { set: Partial<State>; send: Array<'pressedState' | 'focusState'>; emit: Pulse[] } {
  const takes = !i.keepsFocus && !s.elementFocused;
  return takes
    ? { set: { pressed: true, focused: true, elementFocused: true }, send: ['pressedState', 'focusState'], emit: ['pointerDown', 'onFocus'] }
    : { set: { pressed: true }, send: ['pressedState'], emit: ['pointerDown'] };
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
