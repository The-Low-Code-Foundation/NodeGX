---
title: "Text Input"
---
Single-line or multi-line text entry control with label, icon, placeholder and focus handling; outputs the text as the user types.

The Text Input control renders an editable text field (or text area, or email/number/password/URL input, chosen by the `type` enum). Its main product is `onTextChanged` (display name 'Text'), a string output that updates continuously as the user types; the `textChanged` signal fires on every such change and `onEnter` fires when the user presses Enter. Text can also be written programmatically: the `startValue` (Text) input holds the field text, and the `set` signal applies it on demand. Optional label and icon sections, per-state styling and focus control (`focus`/`blur` signals, `focusState` output) are built in.

## When to use it

Any free-text entry. Use `type` instead of separate nodes for email/number/password fields. For multi-line text set `type` to textArea. For choosing among fixed options use a Dropdown (net.noodl.controls.options) or Radio Button Group instead. The legacy `Text Input` type is superseded by this control.

## At a glance

| | |
|---|---|
| Category | Visual |
| Type name | `net.noodl.controls.textinput` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 8 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `alignX` | Enum (`left`, `center`, `right`) | — | Horizontal alignment of this element within the space its parent gives it |
| `alignY` | Enum (`top`, `center`, `bottom`) | — | Vertical alignment of this element within the space its parent gives it |
| `backgroundColor` | Color | `transparent` | Fill colour of the field |
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
| `enterKeyHint` | Enum (`enter`, `done`, `go`, `next`, `previous`, `search`, `send`) | — | The word on the Enter key of a phone or tablet keyboard, such as Next, Go or Send |
| `fontFamily` | Font | — | Typeface to render the text in, either a web-safe family name or a font file added to the project |
| `fontSize` | Number | — | Height of the text, in pixels |
| `fontStyle` | Enum (`normal`, `italic`) | `normal` | Renders the text upright or italic |
| `fontVariantNumeric` | Enum (`normal`, `tabular-nums`) | `normal` | Tabular draws every digit at the same width so columns of numbers align; Normal follows the font |
| `fontWeight` | Number | `Auto` | How heavy the text is drawn, from 100 (thin) to 900 (black); leave as Auto to use the weight the font family sets |
| `height` | Dimension | `100` | Height of the element; how the value is read depends on Size Mode |
| `iconColor` | Color | `#000000` | Colour of the icon |
| `iconIconSource` | Icon | — | Which glyph to show, picked from an installed icon set |
| `iconImageSource` | Image | — | Image file to show instead of an icon-set glyph |
| `iconPlacement` | Enum (`left`, `right`) | `left` | Which side of the label the icon sits on, with Icon Spacing as the gap between them |
| `iconSize` | Number | `16` | Height of the icon |
| `iconSourceType` | Enum (`image`, `icon`) | `icon` | Whether the icon comes from an installed icon set or from an image file, which decides the source port below |
| `iconSpacing` | Number | `10` | Gap between the icon and the text beside it |
| `inputMode` | Enum (`text`, `numeric`, `decimal`, `tel`, `email`, `url`, `search`, `none`) | — | Which on-screen keyboard a phone or tablet opens: Decimal for numbers with a decimal key, Telephone for digits, None for no keyboard when the page has its own keypad |
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
| `letterSpacing` | Number | `Auto` | Extra space added between characters; leave as Auto to use the spacing built into the font |
| `lineHeight` | Number | `Auto` | Vertical space each line of text occupies; leave as Auto to follow the font |
| `marginBottom` | Number | — | Space outside the element's bottom edge, between it and its neighbours |
| `marginLeft` | Number | — | Space outside the element's left edge, between it and its neighbours |
| `marginRight` | Number | — | Space outside the element's right edge, between it and its neighbours |
| `marginTop` | Number | — | Space outside the element's top edge, between it and its neighbours |
| `maxHeight` | Number | — | Largest height the element may grow to, taking priority over Height |
| `maxLength` | Number | — | Largest number of characters the user can type; it does not truncate a value arriving on Text |
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
| `placeHolderOpacity` | Number | `0.5` | How faded the placeholder text is, from 0 to 1 |
| `placeholder` | String | `` | Greyed-out hint shown while the field is empty |
| `position` | Enum (`relative`, `absolute`, `sticky`, `fixed`) | `relative` | How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space |
| `runOnChange-startValue` | Boolean | `true` | Whether a new value on Value re-runs this node. On by default; untick to make this input passive so only the control signal runs it |
| `scrollIntoViewAlign` | Enum (`nearest`, `start`, `center`, `end`) | `nearest` | Where Scroll Into View leaves the element: Nearest edge moves only as far as needed |
| `sizeMode` | Enum (`explicit`, `contentWidth`, `contentHeight`, `contentSize`) | `contentSize` | Whether Width and Height are used as given, or the element sizes itself to fit its contents |
| `startValue` | * | — | The value to put in the field. Applied as it arrives, unless you untick it under Run On Value Change, in which case it waits for a Set pulse |
| `styleCss` | String | `/* background-color: red; */` | Raw CSS declarations applied to this element, overriding the styling ports above |
| `textAlignX` | Enum (`left`, `center`, `right`) | `left` | Aligns the typed text within the field |
| `textStyle` | TextStyle | `None` | Applies one of the project's saved text styles; the individual font ports below override whatever it sets |
| `textToInsert` | String | — | What Insert Text writes, for example the digit on a keypad button |
| `textTransform` | Enum (`none`, `uppercase`, `lowercase`, `capitalize`) | `none` | Forces the text to upper case, lower case or capitalised without changing the underlying value |
| `transformOriginX` | Number | `50` | Horizontal point the element rotates and scales around, as a fraction of its width |
| `transformOriginY` | Number | `50` | Vertical point the element rotates and scales around, as a fraction of its height |
| `transformRotation` | Number | `0` | Rotates the element clockwise in degrees, without affecting the layout |
| `transformScale` | Number | `1` | Scales the element about its transform origin; 1 leaves it unscaled |
| `transformX` | Number | `0` | Moves the element right after layout, without moving its siblings |
| `transformY` | Number | `0` | Moves the element down after layout, without moving its siblings |
| `type` | Enum (`text`, `textArea`, `email`, `number`, `password`, `url`) | `text` | What kind of value the field accepts, which also changes the on-screen keyboard on touch devices |
| `useIcon` | Boolean | `false` | Shows an icon on this element |
| `useLabel` | Boolean | `false` | Shows a text label on this element |
| `variant` | String | — | Name of a saved variant of this node type to apply, replacing the styling set here |
| `visible` | Boolean | `true` | Hides the element while keeping the space it occupies in the layout |
| `width` | Dimension | `100` | Width of the element; how the value is read depends on Size Mode |
| `zIndex` | Number | — | Paint order among overlapping siblings; higher numbers paint on top |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `backspace` | Signal | — | Deletes the selection, or the character before the caret, as the Backspace key does — even while the field has focus |
| `blur` | Signal | — | Takes keyboard focus away from this field, which is what fires Blurred |
| `clear` | Signal | — | Empties the field |
| `focus` | Signal | — | Puts the keyboard cursor in this field |
| `insert` | Signal | — | Writes Text To Insert at the caret, replacing any selection, as if it had been typed — even while the field has focus. Max length still applies |
| `scrollIntoView` | Signal | — | Scrolls the page, or the scrolling Group holding this element, until the element can be seen |
| `set` | Signal | — | Writes the current Value into the field now. This is additional to Value applying as it arrives; untick Value under Run On Value Change to stop that |

### What each input does

**Enabled** (`enabled`)

- the value it already holds: nothing
- a change: Enabled follows; disabled, the field takes no typing, no key and no focus

**Type** (`type`)

- always: read at the next paint and the next write — what the field accepts, and whether Value hands on a number or text

**Value** (`startValue`)

- undefined: ignored
- the value it already holds (null as empty): nothing
- a new value, with Run On Value Change unticked: held for the next Set
- a new value, with Run On Value Change ticked: written now — on the page the field takes it (Value, Value Changed) unless it holds the keyboard; off the page Value alone, when it differs

**Value** (`runOnChange-startValue`)

- always: whether a new Value is written at once, or waits for Set

**Set** (`set`)

- always: at the end of the frame (or a pointer act's drain before it) the Value as it stands is written, as a ticked Value writes it — Done if it wrote, else Unchanged

**Text To Insert** (`textToInsert`)

- always: read by the next Insert Text, as text (nothing as empty)

**Insert Text** (`insert`)

- always: at the end of the frame Text To Insert goes in at the caret (at the end, off the page), within Max length — Value, Value Changed on the page, and Done; Unchanged when nothing fits

**Backspace** (`backspace`)

- always, at once: the character before the caret goes (the last one, off the page) — Value, Value Changed on the page, and Done; Unchanged when there is none

**Clear** (`clear`)

- always, at once: the field and Value are emptied (Value Changed on the page, focused or not) — Done; Unchanged when they were empty already

**Max length** (`maxLength`)

- always: read at the next keystroke and Insert Text — above 0, no more characters than this

**Mounted** (`mounted`)

- always: the field is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint

**Enable Label** (`useLabel`)

- always: a label is drawn above the field, or not; the field and its keyboard stay

**Focus** (`focus`)

- not on the page: nothing to focus, the Focus is not kept, and the editor is told → Unchanged; Focused stays silent
- it holds the keyboard already, or is disabled or hidden: nothing changes → Done; Focused stays silent
- otherwise the keyboard is put on it, and the Focused state goes true → Focused, Done

**Blur** (`blur`)

- it does not hold the keyboard (or is disabled, and gives it up to nobody): nothing changes → Done; Blurred stays silent
- it holds the keyboard: it is taken off it, and the Focused state goes false → Blurred, Done

**Scroll Into View** (`scrollIntoView`)

- always: the page, or the scrolling Group holding it, scrolls until the field can be seen

**Block Pointer Events** (`blockTouch`)

- always: on, a pointer act that lands here goes no further — the nodes it sits inside do not hear it

**Width** (`width`)

- always: the size it holds now, a bare number read in the unit it held; drawn at the next paint

**Height** (`height`)

- always: the size it holds now, a bare number read in the unit it held; drawn at the next paint

**Visible** (`visible`)

- always: shown or hidden at the next paint, its space kept; hidden, a Focus does not reach it

**Opacity** (`opacity`)

- always: how see-through it is; at exactly 0 it takes no pointer, and an act goes to what is behind it

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `boundingHeight` | Number | — | Height this element actually ended up with after layout, in pixels |
| `boundingWidth` | Number | — | Width this element actually ended up with after layout, in pixels |
| `childIndex` | Number | — | This element's position among its parent's children, counting from 0 |
| `enabled` | Boolean | — | Reports back whether this control is currently accepting interaction, following the Enabled input |
| `focusState` | Boolean | — | True while this control holds keyboard focus, so typing and Enter go to it |
| `hoverState` | Boolean | — | True while the pointer is over this control; stays false on touch devices with no pointer |
| `onTextChanged` | * | — | What the field currently contains, updated as the user types. A number when Type is Number, otherwise text |
| `pressedState` | Boolean | — | True while a mouse button or finger is held down on this control, and false again the moment it is released or slides off |
| `screenPositionX` | Number | — | Distance in pixels from the left edge of the window to this element's left edge |
| `screenPositionY` | Number | — | Distance in pixels from the top edge of the window to this element's top edge |
| `this` | Reference | — | A reference to this node itself, for ports that take a node rather than a value |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `didMount` | Signal | — | Fires once this element has been added to the page and can be measured |
| `done` | Signal | — | Fires when Set, Clear, Insert Text, Backspace, Focus or Blur did something |
| `hoverEnd` | Signal | — | Fires when the pointer leaves this control, including when it leaves while a button is still held, or when the control leaves the page under it |
| `hoverStart` | Signal | — | Fires when the pointer moves onto this control |
| `onBlur` | Signal | — | Fires when keyboard focus leaves this control, or the control leaves the page while holding it, which is the usual place to validate what was entered |
| `onEnter` | Signal | — | Fires when the user presses Enter in the field, which is the usual place to submit |
| `onFocus` | Signal | — | Fires the moment this control takes keyboard focus, whether from a click, a tab or a Focus action |
| `pointerDown` | Signal | — | Fires as a mouse button or finger goes down on this control, before any click has completed |
| `pointerUp` | Signal | — | Fires when the mouse button or finger is lifted, and also when a touch is cancelled by the system |
| `textChanged` | Signal | — | Fires each time a value is written into the field (Set, Value, Insert Text, Backspace, Clear or the person typing), whether or not it changed. A write made while the field is off the page is announced when the field comes back |
| `unchanged` | Signal | — | Fires when a Set or Clear left the field as it was — most often a Set while the field has focus, which is deliberately absorbed so it cannot overwrite what is being typed — when Insert Text or Backspace had nothing to write (a full Max length, or an empty field), or when a Focus arrived while the field was not on the page |
| `willUnmount` | Signal | — | Fires just before this element is removed from the page, while it still exists |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups, runtime-narrowed); the tables above may be incomplete for a given instance._

The port list above is complete — this node mints no ports. It republishes its own two value ports (`startValue`, `onTextChanged`) per instance with a narrowed type: `number` when the `type` parameter is `number`, `string` for every other Type. They are declared `*` statically because nothing outside a connected editor can narrow them.

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| sizeMode = explicit OR sizeMode = contentHeight | `width` | — |
| sizeMode = explicit OR sizeMode = contentWidth | `height` | — |
| useIcon = true | `iconSourceType`, `iconSize`, `iconPlacement`, `iconSpacing` | — |
| useIcon = true AND iconSourceType = image | `iconImageSource` | — |
| useIcon = true AND iconSourceType = icon | `iconIconSource`, `iconColor` | — |
| useLabel = true | `label`, `labeltextStyle`, `labelfontFamily`, `labelfontSize`, `labelfontWeight`, `labelfontStyle`, `labelcolor`, `labelletterSpacing`, `labellineHeight`, `labeltextTransform`, `labelfontVariantNumeric`, `labelSpacing` | — |
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

Declared-port-groups: `width`/`height` appear per `sizeMode`, icon ports per `useIcon`/`iconSourceType`, label styling ports when `useLabel` is true, and border/shadow ports per border-style and `boxShadowEnabled` settings. The catalog list is the superset; the editor shows the subset matching current parameters.

## Patterns

- `onTextChanged` → an Expression or Condition: validate as the user types.
- `onEnter` → the same action as the submit button's `onClick`: keyboard-friendly forms.
- A stored value → `startValue` with a load signal → `set`: prefill a form when data arrives.

## Watch out for

- Polling the text with a timer — `onTextChanged` is already live; wire it directly.
- Wiring `textChanged` (signal) where the text string is wanted; use `onTextChanged`.

## Examples

**Settings form: the standard input controls bound to values**

One of each core control: Text Input's live string comes out of `onTextChanged`, Checkbox exposes `checked` (level) plus `onChange` (edge), Dropdown (net.noodl.controls.options) takes an items list and emits the selected `value`, Slider (net.noodl.controls.range) emits a numeric `value` between `min`/`max`, and a Radio Button Group reports the `value` of whichever child Radio Button is selected. Values flow into a live summary — no submit step needed for value binding.

**Check an email is well-formed and not already taken**

Sign-up validation as a chain of small truths rather than one function: an `Expression` says the field is non-empty, a `JavaScriptFunction` says it looks like an address, and a `DbCollection2` query says nobody has it yet — and an `And` node combines them into the one boolean the button enables on. The `Timer` in front of the query is the detail worth copying: it debounces, so the database is asked once the typing stops instead of once per keystroke. ⚠️ The two `Inverter` nodes read as clutter until you notice what they buy — 'no user came back' is the success case here, and inverting it keeps every input to the `And` meaning 'this is fine', which is what makes the combination readable at all.

## Related nodes

[Button](./net-noodl-controls-button.md), [Dropdown](./net-noodl-controls-options.md), [Condition](../logic/condition.md), [Expression](../custom-code/expression.md), [Text](./text.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 8. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

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
  "fieldType": "text",
  "runOnChange": true,
  "textToInsert": "",
  "startValue": "",
  "field": "",
  "hasAnnounced": false,
  "queue": [],
  "enabled": true,
  "hover": false,
  "pressed": false,
  "focused": false,
  "mounted": true,
  "pageType": "text",
  "blocksPointer": false,
  "caret": 0,
  "hadCaret": false,
  "pageEnabled": true,
  "visible": true,
  "pageVisible": true,
  "opacityZero": false,
  "pageOpacityZero": false,
  "elementFocused": false,
  "onPage": false,
  "focusMissed": false
}
```

### How actions report back

Each time Set, Insert Text, Backspace, Clear, Focus or Blur is triggered, the node reports exactly one of **Done** or **Unchanged**.

### Warnings it shows in the editor

| Warning | Settings it points at | Id |
|---|---|---|
| the last Focus arrived while it was not on the page | — | `focus/not-mounted` |
| Icon Source holds something that is not an icon | — | `visual/icon-source-not-an-icon/iconIconSource` |
| a wired Width in a row, or a wired Height in a column, is a percent, so it shares out the space instead of setting a size | — | `dimensions/wired-dimension-becomes-grow` |

### What a person can do to it

The conformance tests play these acts against it:

- `hover`: the pointer moves onto the field
- `leave`: the pointer moves off the field
- `press`: a mouse button goes down on it
- `release`: the mouse button comes up on it
- `click`: a press and a release on the field, and the click that follows
- `touch`: a finger goes down on it
- `lift`: the finger comes up
- `focus`: the keyboard is put on it (a Tab reaching it)
- `blur`: the keyboard is taken off it (a Tab leaving it)
- `type`: the person types the text into the field, one key at a time, putting the keyboard on it first if it is not there
- `key`: the person presses a key in the field (the keyboard put on it first if it is not there): Enter fires On Enter, and writes a newline into a Text Area

### Version history

- **Version 7**: Two warnings the runtime has always shown are now in this spec: a Focus that arrives while the node is not on the page (until a Focus reaches it), and an Icon Source that is not an icon (until an icon or nothing arrives). Existing projects are not migrated: only the editor is told, and the runtime already told it. Nothing a wire carries changes.
- **Version 8**: A wired Width in a row, or a wired Height in a column, that is a percent now shows as its warning in this spec: it became a share of the room, not a size. The runtime has always shown it. Existing projects are not migrated: only the editor is told, and the runtime already told it. Nothing a wire carries changes.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/text-input.ts"
/**
 * Text Input (`net.noodl.controls.textinput`) — read from
 * `packages/noodl-viewer-react/src/nodes/controls/text-input.ts`, `controls/textInputValue.ts` (what a
 * field's Type does to its value), `components/controls/TextInput/TextInput.tsx` (the component),
 * `controls/utils.ts` (the control events and states), `react-component-node.ts`, `focus-tracker.ts`
 * and `noodl-runtime/src/run-on-value-change.ts` on 2026-10-04 (NSP-016 s38). Its person face, page
 * model and the shared ports are the Button's (button.ts): what differs is the text.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations. A Text Input is an `<input>` — a `<textarea>` when Type is Text
 * Area — in a wrapper, with a `<label>` above it when Enable Label is on (TextInput.tsx :192-281);
 * a PERSON types into it. Three things hold the text, and the spec keeps all three apart because
 * the runtime does:
 *
 *   - **the author's Value** (`_internal.text`, text-input.ts :228): what the last **Value** input
 *     wrote — `null` reads as the field's EMPTY value (`''`, or `null` on a Number field, :225),
 *     `undefined` is ignored (:222), a repeat is ignored (:226). While **Run On Value Change** is on
 *     (the default, run-on-value-change.ts :137 `value !== false`) it is put in the field as it
 *     arrives (:237-239); off, it waits for **Set** (:179-197, at the frame's end: Done when it
 *     reached the field, Unchanged when the field had the keyboard — `setText` never fights the
 *     typist, :521-529 — or when, off the page, the output already read it, :530-539).
 *   - **the start value** (`props.startValue`): what the field STARTS from when it is put on the
 *     page (TextInput.tsx :78, :106) — written by every Value, Set, Clear, Insert Text and Backspace,
 *     and by every keystroke (`_typed`, text-input.ts :445-447), so a field that leaves the page and
 *     comes back starts from what the person typed (GAM-009).
 *   - **the field** (the component's `state.value`, TextInput.tsx :75-79) and the **Value output**
 *     (`outputPropValues.onTextChanged`): the field holds raw text; what leaves is
 *     `outwardValueForFieldType` (textInputValue.ts :49-55) — the text itself, or on a Number field
 *     the number it parses to and `null` when it does not. Every write through the component
 *     (`setText`, :89-95) sends the output AND fires **Value Changed** (text-input.ts :374-378 — on
 *     every call, changed or not); a write while the field is off the page sets the output alone
 *     (:505-509, :530-537, :479-481) and Value Changed waits for the next mount, which announces a
 *     value the output has not announced (TextInput.tsx :101-110 `_announcedValueIs`, :449-455).
 *     Off the page the value is made text first, as the component makes it on the page (:92), so
 *     the output has one type whatever the field's visibility (v3, row D32 ruled "Always text";
 *     v1–v2 kept the raw value's type off the page).
 *   - **typing** (THE PERSON): a person types into the field the keyboard is on — the act puts it
 *     there first if it is not (a Tab's focusing steps: Focused, `focusState`) — one character at a
 *     time; the browser refuses a key past **Max length** (the element's `maxlength`, read back as a
 *     non-negative integer or none; never on a Number field) and refuses every key but a digit on a
 *     Number field (a sign, a point or an exponent typed mid-entry is a state a browser and jsdom
 *     disagree on — the browser keeps the characters on screen while its value reads empty, jsdom
 *     drops them — so the face types only digits into one; not graded); each accepted key raises
 *     `input` → `onChange` (TextInput.tsx :290-297): `_typed`, then `setText` — the output and
 *     Value Changed per keystroke. A disabled field takes no typing and no key. **Enter** (`key`
 *     `Enter`, :284-288) fires **On Enter**; in a Text Area the browser's default action of Enter
 *     also writes a newline into the field, as a typed character would. The element's value is the
 *     field SANITISED by its type (HTML's value sanitization algorithm, the one jsdom runs: a Number
 *     field shows `''` for text that is not a number; Email and URL trim the ends) — typing appends
 *     to what the element shows, not to what the component holds.
 *   - **Clear** (:485-512): the empty value into the author's Value, the start value and the field
 *     (through the component when on the page, focused or not; the output alone when off it);
 *     Unchanged when both the author's Value and the output already read empty. **Insert Text**
 *     (:255-267, at the frame's end) and **Backspace** (:268-277, at once): on the page the
 *     component edits at the CARET (TextInput.tsx :330-371) — the element's selection once the
 *     field has held focus (`hadCaret`, :319) and the type has one (not Email, not Number), else
 *     the end — within `Number(Max length)` when it is above 0 (:346-350, code points kept while
 *     they fit); off the page the start value is appended to or trimmed (:463-483). Done when the
 *     text changed, Unchanged when not; both write the start value as typing does (`_typed`,
 *     :358). Insert Text writes while the field has the keyboard (that is what it is for, GAM-011).
 *     Where the caret IS (State `caret`): a field nobody has placed a caret in has it at the END of
 *     its text, a one-line field and a Text Area alike (ruled 2026-10-05 — the runtime's Text Area
 *     rested it at the START, row D35, fixed in P109 ISL-031); a field whose Type moved from Email or
 *     Number to Text has it at the start (HTML's type change steps).
 *   - **one write after another** (ruled 2026-10-05, R12): every write from the graph acts on the
 *     field as the write before it left it — a Backspace after a Clear in the same frame finds the
 *     field empty, an Insert Text at the frame's end finds the Value written earlier in it — and
 *     converts with the Type, and measures an Insert Text's room with the Max length, as they stand
 *     when it runs. The runtime's component read its text and those two inputs as it last DREW
 *     them, so a write in the frame of another write, or of a Type or Max length change, worked on
 *     what was there before: rows C69 and C72, fixed in P109 ISL-031 (TextInput.text and the
 *     cursor kept at each write, the node's Type and Max length read as they stand).
 *   - **Type** (`props.type`, TextInput.tsx :201): converts every write at once (above); the element
 *     follows it at the next paint — what the element shows, whether it has a cursor to read — and a
 *     change between Text Area and the rest replaces the element (`<textarea>` ↔ `<input>`,
 *     :192-223), whose keyboard leaves with the old one, silently. The field's text is not
 *     re-converted by a Type change until the next write.
 *   - **Enabled**, **the pointer**, **a click's focus**, **the keyboard**, **Focus** / **Blur**
 *     (text-input.ts :288-320 — its own, predating `addFocusActions`: Done when the component is
 *     on the page, Unchanged when not, R13; Blur always Done), **Mounted**, **Did Mount**, **Will
 *     Unmount**, **Child Index** (0), **This**, the **Bounding Box** outputs, **Scroll Into View**,
 *     the label and pointer-event inputs: the Button's. A mouse button down on the field fires
 *     **Pointer Down** and sets **Pressed**, as a finger does (ruled 2026-10-05, from the output's
 *     description; the runtime's one-line field fired neither — its component's own `onMouseDown`
 *     replaced the control's — row C68, fixed in P109 ISL-031: both run); the
 *     browser's `mousedown` default then puts the keyboard on the field. **Enable Label** shows a
 *     label above the field and leaves the field, and the keyboard on it, where they are (ruled
 *     2026-10-05; the runtime built a new element under the label and the keyboard left with the
 *     old one, silently — row C80, fixed in P109 ISL-031: one tree either way).
 *   - **a pointer act drains the frame** (pointerlisteners.ts :173-186): every pointer handler the control
 *     installs runs the graph's dirty nodes after its own work, so a Set or Insert Text queued for the frame's
 *     end runs AT a hover, leave, press, release, click, touch or lift, in the order pressed; a write pulsed
 *     after the act still waits for the frame's end. With **Block Pointer Events** on, the drain of a press, release, click,
 *     touch or lift runs BEFORE the act's own work (the blocker on the `pointerdown` / `pointerup` the browser raises first),
 *     and on a disabled field too. An Insert Text, a touch, then a Clear
 *     leaves the field empty; the same without the touch leaves the inserted text (measured s38).
 *   - **Placeholder**, **Input Mode**, **Enter Key Hint**, **Placeholder opacity**, **Text
 *     Horizontal Align** change what the element draws and which keyboard a phone opens — nothing
 *     this node's outputs show.
 */

import { defineNode, said, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';
import { FIELD_FOCUS_NOT_MOUNTED, focusDiagnostics, focusMissed } from './focus-not-mounted';
import { focusAndIconSourceChange, iconSourceDiagnostics } from './icon-source';
import { dataAttributeInput, dataAttributeNames } from './data-attributes';
import { growChange, sizeAtDefault, sizeReducer, wiredGrowDiagnostic, withGrow, type Sizes } from './wired-grow';

type State = {
  /** text-input.ts :74-91 `props.type` — read at each render and each write; `'text'` by default */
  fieldType: unknown;
  /** run-on-value-change.ts :137 — `value !== false` */
  runOnChange: boolean;
  /** text-input.ts :158-164 `props.maxLength`, as written */
  maxLength: unknown;
  /** text-input.ts :251-253 — `''` for null / undefined, else `String(value)` */
  textToInsert: string;
  /** text-input.ts :228 `_internal.text` — the author's last Value; unset until one arrives */
  text: unknown;
  /** text-input.ts :55 `props.startValue` — `''` at creation; what the next mount starts from */
  startValue: unknown;
  /** TextInput.tsx :75-79 — the field's raw text, as the last write left it (one write after another: docblock) */
  field: string;
  /** `outputPropValues.onTextChanged` — the Value output's GETTER; unset until the first write */
  out: unknown;
  /**
   * What the WIRE holds: the last DEFINED value sent on Value. node.ts sends at every flag and never sends `undefined`
   * ([[last-sent-value]]), so a Set with no Value ever written (`setText(undefined)`, off the page) empties the getter and
   * leaves the wire where it was — an Insert Text in the same frame had put `'0'` there (s40, deep run).
   */
  wire: unknown;
  /** text-input.ts :376 `_internal.announced.value` — what the component last reported (meaningful once `hasAnnounced`) */
  announced: unknown;
  /** text-input.ts :454 — the component has reported at least once */
  hasAnnounced: boolean;
  /** text-input.ts :190, :263 — the frame-end callbacks, in the order scheduled (node.ts :1276-1279 runs them so) */
  queue: Array<'set' | 'insert'>;
  /** utils.ts :75-89 `_internal.enabled` */
  enabled: boolean;
  hover: boolean;
  pressed: boolean;
  focused: boolean;
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /**
   * The element's type as on the page (TextInput.tsx :201): it follows Type at each paint, like the disabled attribute. What the
   * element shows (HTML's value sanitization by type), whether it has a cursor to read, and whether it is a `<textarea>`; a change
   * between Text Area and the rest replaces the element at that paint.
   */
  pageType: unknown;
  /**
   * The element's TEXT ENTRY CURSOR (HTML), in code units — meaningful on a type the selection API applies to (text, url,
   * password, a textarea; HTML's "selection API applies" list — not email, not number). Where it is: a field nobody has placed
   * a caret in has it at the END of its text (ruled 2026-10-05, both kinds of field — the runtime's Text Area until P109 ISL-031: row D35); a type
   * change from a type without the API to one with it puts it at the start (HTML's type change steps); a keystroke leaves it
   * after the key; a write from the graph that changes what the element shows moves it to the end (HTML's value setter), and an
   * Insert Text or Backspace then puts it after what it wrote if the field has the keyboard (:359-369). A press is a focus here
   * (the face has no geometry for a click's point): the cursor stays.
   */
  caret: number;
  /** TextInput.tsx :319 `hadCaret` — the field has taken the keyboard since it was put on the page (:177-180): an edit reads the cursor only then (:306) */
  hadCaret: boolean;
  /** Block Pointer Events as written (truthiness; pointerlisteners.ts :113): the act's paint renders the element's handlers with it */
  blocksPointer: boolean;
  /** the element's `disabled` attribute follows Enabled at each paint (TextInput.tsx :181) — what the Focus and Blur actions meet */
  pageEnabled: boolean;
  /** NSP-016 s43 — Visible as written (node-shared-port-definitions.ts :366-375 `visibility: hidden`) and as painted */
  visible: boolean;
  pageVisible: boolean;
  /** NSP-016 s43 — Opacity written as exactly the number 0 (TextInput.tsx :118-120 then sets `pointer-events: none`), and as painted */
  opacityZero: boolean;
  pageOpacityZero: boolean;
  /** the element holds the keyboard — what the PAGE knows; `focused` is what the node REPORTS (button.ts) */
  elementFocused: boolean;
  /** the component is on the page (`innerReactComponentRef`, text-input.ts :423, :431): follows `mounted` at each paint */
  onPage: boolean;
  /** v7 — the last Focus found the node off the page: the editor is told (focus-not-mounted.ts) */
  focusMissed: boolean;
  /** NSP-019 R38 — what the size ports hold, and what the last render on the page said of them (wired-grow.ts) */
  sizes: Sizes;
  grow: string | null;
};

type O = typeof TextInput extends { outputs: infer X } ? X : never;
type Send = Patch<State, O>;
type Pulse = 'didMount' | 'willUnmount' | 'pointerDown' | 'pointerUp' | 'onFocus' | 'onBlur' | 'hoverStart' | 'hoverEnd' | 'textChanged' | 'onEnter';
type ValueOut = 'pressedState' | 'focusState' | 'hoverState' | 'onTextChanged';
type Resolved = { port: 'set' | 'insert'; outcome: 'done' | 'unchanged' };
type Act = { set?: Partial<State>; send: ValueOut[]; emit?: Pulse[]; outcomes?: Resolved[] };
/** What a write to the text did: the keys it WROTE (the runtime's writes, whether or not the value moved), what it sent and fired, and whether it reached the field (Done / Unchanged). */
type Write = { set: Partial<State>; send: ValueOut[]; emit: Pulse[]; landed: boolean };
/** The state after a write — for the next effect in the same reducer. */
const after = (s: Readonly<State>, w: { set: Partial<State> }): State => ({ ...s, ...w.set });

const NOTHING: Send = { send: [] };
const NONE: Act = { send: [] };

const FIELD_TYPES = ['text', 'textArea', 'email', 'number', 'password', 'url'] as const;
/** HTML: a `type` attribute that names no state is the Text state — what `<input type={value}>` becomes for a value outside the enum. */
const elementType = (t: unknown): (typeof FIELD_TYPES)[number] => (FIELD_TYPES.includes(t as never) ? (t as (typeof FIELD_TYPES)[number]) : 'text');
/** TextInput.tsx :78, :92, :106 — the one conversion to text the component makes */
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
/** textInputValue.ts :38-40 */
const emptyFor = (t: unknown): '' | null => (t === 'number' ? null : '');
/** textInputValue.ts :49-55 */
function outward(t: unknown, text: unknown): unknown {
  if (t !== 'number') return text;
  if (text === '' || text === null || text === undefined) return null;
  if (typeof text === 'number') return Number.isNaN(text) ? null : text;
  const parsed = Number(text);
  return Number.isNaN(parsed) ? null : parsed;
}
/** HTML's valid floating-point number (what jsdom tests, strings.js :100) */
const FLOAT = /^-?(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?$/;
/** HTML's value sanitization algorithm, by the element's type (jsdom form-controls.js :182-274; a textarea's API value normalises newlines) */
function sanitize(t: unknown, v: string): string {
  switch (elementType(t)) {
    case 'textArea':
      return v.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    case 'email':
    case 'url':
      return v.replace(/[\n\r]+/g, '').replace(/^[ \t\n\f\r]+/, '').replace(/[ \t\n\f\r]+$/, '');
    case 'number':
      return FLOAT.test(v) && Number.isFinite(parseFloat(v)) ? v : '';
    default:
      return v.replace(/[\n\r]+/g, '');
  }
}
/**
 * The element's `maxlength`, read back: the attribute carries the Max Length as text (`'' + value`) and is absent for null,
 * undefined or a boolean (the runtime's renderer: react-dom `setValueForAttribute`); HTML reads it with the rules for parsing non-negative integers (ASCII
 * whitespace, an optional `+`, the leading digits) — `-1` when absent or not a number (a long limited to non-negative
 * numbers). The browser refuses a key once the value's length (code units) is at it; a Number field has no maxlength.
 */
function maxLengthAttribute(v: unknown): number {
  if (v === null || v === undefined || typeof v === 'boolean') return -1;
  // HTML's rules for parsing integers: a sign, then the leading digits; a negative result is an error for a non-negative
  // integer — and `-0` is not negative, so `maxlength="-0.5"` IS a limit of 0 (s40: the deep run's `-0.5` typed nothing on the
  // runtime, as a browser types nothing; the first parse here refused the sign and read "no limit")
  const m = /^[ \t\n\f\r]*([-+]?)(\d+)/.exec(String(v));
  if (!m) return -1;
  const n = Number(m[2]);
  if (m[1] === '-' && n !== 0) return -1;
  return n > 2147483647 ? -1 : n;
}
/** HTML: the types the selection API applies to (`selectionStart` is a number, `setSelectionRange` works) — text, url, password and a textarea here; email and number have none */
const selectable = (t: unknown): boolean => ['text', 'url', 'password', 'textArea'].includes(elementType(t));
/** What the wire holds after a write of `out`: the last DEFINED value (node.ts never sends `undefined` — [[last-sent-value]]) */
const sent = (s: Readonly<State>, out: unknown): Pick<State, 'out' | 'wire'> => ({ out, wire: out === undefined ? s.wire : out });
/** TextInput.tsx :349, text-input.ts :475 — code points kept while they fit the room */
const fit = (text: string, room: number): string => Array.from(text).reduce((kept, ch) => (kept.length + ch.length <= room ? kept + ch : kept), '');

export const TextInput = defineNode({
  type: 'net.noodl.controls.textinput',
  // v2 (NSP-023, R12, 2026-10-05): the intent Richard ruled where v1 copied how React draws — each write sees the one before it
  // (v1 `field` / `pending`, the props as last rendered: rows C69, C72), a mouse press fires Pointer Down (C68), Enable Label
  // keeps the keyboard (C80), a field's resting cursor is at the end (D35); v1's `turn` handler is gone. Every row is known on
  // the runtime target (conformance.test.ts), never in this spec — C69 and C72 until P109 ISL-031 fixed the runtime.
  // v3 (P109 ISL-031, P107-D32 "Always text"): off the page the value is made text before it is published.
  // v4 (P109 ISL-031, P107-D33 "Check the field's text"): Clear is Unchanged only when the field's text was empty too.
  // v5 (P109 ISL-031, P107-C64 ruled "Ignore touches, keep hover"): a finger on a disabled control reports nothing — no Pressed, no Pointer Down or Up — as Enabled promises; the pointer's hover still reports
  // v6 (P109 ISL-031, P107-D30 ruled "Reset and announce"): a control leaving the page (Mounted off) takes Focused, Hover and Pressed with it — each goes false, sent if it was true, with Blurred and Hover End for the ones that were on
  // v7 (NSP-019 R35): a Focus that finds the node off the page shows as its warning until a Focus reaches it, and an Icon Source that is not an icon shows as one until an icon or nothing arrives (`diagnostics`)
  // v8 (NSP-019 R38): a wired Width in a row, or a wired Height in a column, that is a percent shows as its warning (wired-grow.ts)
  version: 8,
  changes: [focusAndIconSourceChange(7), growChange(8)],
  diagnostics: { ...focusDiagnostics(FIELD_FOCUS_NOT_MOUNTED), ...iconSourceDiagnostics(), ...wiredGrowDiagnostic },
  source: 'packages/noodl-viewer-react/src/nodes/controls/text-input.ts',
  needs: ['person'],
  // the page's syncs (spec.ts `synced`): not branches — the page following the node at each paint, like the disabled
  // attribute; `caret` too, the element's cursor as each write and paint leaves it
  synced: ['pageEnabled', 'pageVisible', 'pageOpacityZero', 'pageType', 'caret'],

  state: {
    sizes: { width: sizeAtDefault(), height: sizeAtDefault() },
    grow: null,
    fieldType: 'text',
    runOnChange: true,
    maxLength: undefined,
    textToInsert: '',
    text: undefined,
    startValue: '',
    field: '',
    out: undefined,
    wire: undefined,
    announced: undefined,
    hasAnnounced: false,
    queue: [],
    enabled: true,
    hover: false,
    pressed: false,
    focused: false,
    mounted: true,
    pageType: 'text',
    blocksPointer: false,
    caret: 0,
    hadCaret: false,
    pageEnabled: true,
    visible: true,
    pageVisible: true,
    opacityZero: false,
    pageOpacityZero: false,
    elementFocused: false,
    onPage: false,
    focusMissed: false
  } as State,
  // text-input.ts :412-419 `outcomeOutputs({ done, unchanged })`
  outcomes: ['done', 'unchanged'],

  acts: {
    hover: { description: 'the pointer moves onto the field' },
    leave: { description: 'the pointer moves off the field' },
    press: { description: 'a mouse button goes down on it' },
    release: { description: 'the mouse button comes up on it' },
    click: { description: 'a press and a release on the field, and the click that follows' },
    touch: { description: 'a finger goes down on it' },
    lift: { description: 'the finger comes up' },
    focus: { description: 'the keyboard is put on it (a Tab reaching it)' },
    blur: { description: 'the keyboard is taken off it (a Tab leaving it)' },
    type: { description: 'the person types the text into the field, one key at a time, putting the keyboard on it first if it is not there', values: ['a', 'hi', '42', '7', 'x y'] },
    key: { description: 'the person presses a key in the field (the keyboard put on it first if it is not there): Enter fires On Enter, and writes a newline into a Text Area', values: ['Enter'] }
  },

  inputs: {
    // ---- logic ----
    // utils.ts :75-89
    enabled: { type: 'boolean', default: true, coerce: 'none', displayName: 'Enabled', group: 'General', description: 'Lets the user interact with this control; when off it still renders and occupies its space but ignores clicks, touches and typing', portability: 'logic' },
    // text-input.ts :74-91 — read by the component and by every write to the text
    type: { type: 'enum', enums: ['text', 'textArea', 'email', 'number', 'password', 'url'], default: 'text', coerce: 'none', displayName: 'Type', group: 'Text', description: 'What kind of value the field accepts, which also changes the on-screen keyboard on touch devices', portability: 'logic' },
    // text-input.ts :199-241
    startValue: {
      type: '*', coerce: 'none', displayName: 'Value', group: 'Text', description: 'The value to put in the field. Applied as it arrives, unless you untick it under Run On Value Change, in which case it waits for a Set pulse', portability: 'logic',
      // NSP-020 (s80) — the catalog's `runtime-narrowed`: with an editor connected, text-input.ts :616-637 `updatePorts`
      // republishes this port (and the Value OUTPUT, which the format cannot narrow — NSP-020 §6.3) typed by Type:
      // `number` for a Number field, `string` for every other (textInputValue.ts :27-29 `portTypeForFieldType`). It reads
      // `parameters.type` as stored; an unset Type is the declared default `text` here, and `string` there either way.
      narrow: (p) => ({ type: p.type === 'number' ? 'number' : 'string' })
    },
    // run-on-value-change.ts :126-140
    'runOnChange-startValue': { type: 'boolean', default: true, coerce: 'none', displayName: 'Value', group: 'Run On Value Change', description: 'Whether a new value on Value re-runs this node. On by default; untick to make this input passive so only the control signal runs it', portability: 'logic' },
    // text-input.ts :179-197
    set: { type: 'signal', outcome: true, displayName: 'Set', group: 'Actions', description: 'Writes the current Value into the field now. This is additional to Value applying as it arrives; untick Value under Run On Value Change to stop that', portability: 'logic' },
    // text-input.ts :245-254
    textToInsert: { type: 'string', coerce: 'none', displayName: 'Text To Insert', group: 'Text', description: 'What Insert Text writes, for example the digit on a keypad button', portability: 'logic', examples: ['ab', '5', '😀'] },
    // text-input.ts :255-267
    insert: { type: 'signal', outcome: true, displayName: 'Insert Text', group: 'Actions', description: 'Writes Text To Insert at the caret, replacing any selection, as if it had been typed — even while the field has focus. Max length still applies', portability: 'logic' },
    // text-input.ts :268-277
    backspace: { type: 'signal', outcome: true, displayName: 'Backspace', group: 'Actions', description: 'Deletes the selection, or the character before the caret, as the Backspace key does — even while the field has focus', portability: 'logic' },
    // text-input.ts :278-287
    clear: { type: 'signal', outcome: true, displayName: 'Clear', group: 'Actions', description: 'Empties the field', portability: 'logic' },
    // text-input.ts :158-164 — the element's `maxlength` (TextInput.tsx :185) and the room an Insert Text has (:346-350)
    maxLength: { type: 'number', coerce: 'none', displayName: 'Max length', group: 'Text', description: 'Largest number of characters the user can type; it does not truncate a value arriving on Text', portability: 'logic', examples: [3, 5] },
    // text-input.ts :288-309
    focus: { type: 'signal', outcome: true, displayName: 'Focus', group: 'Actions', description: 'Puts the keyboard cursor in this field', portability: 'logic' },
    // text-input.ts :310-320
    blur: { type: 'signal', outcome: true, displayName: 'Blur', group: 'Actions', description: 'Takes keyboard focus away from this field, which is what fires Blurred', portability: 'logic' },
    // react-component-node.ts :2302-2321
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen)', portability: 'logic', layout: 'present' },
    // react-component-node.ts :1380-1395 — scrolls; nothing a wire sees
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },
    // text-input.ts :92-164 — what the element draws and which keyboard a phone opens; nothing on the wire
    placeholder: { type: 'string', default: '', coerce: 'none', displayName: 'Placeholder', group: 'Text', description: 'Greyed-out hint shown while the field is empty', portability: 'logic' },
    inputMode: { type: 'enum', enums: ['text', 'numeric', 'decimal', 'tel', 'email', 'url', 'search', 'none'], coerce: 'none', displayName: 'Input Mode', group: 'Text', description: 'Which on-screen keyboard a phone or tablet opens: Decimal for numbers with a decimal key, Telephone for digits, None for no keyboard when the page has its own keypad', portability: 'logic' },
    enterKeyHint: { type: 'enum', enums: ['enter', 'done', 'go', 'next', 'previous', 'search', 'send'], coerce: 'none', displayName: 'Enter Key Hint', group: 'Text', description: 'The word on the Enter key of a phone or tablet keyboard, such as Next, Go or Send', portability: 'logic' },
    // node-shared-port-definitions.ts `addLabelInputs` — TextInput.tsx :259-281 decides the tree by `useLabel`
    label: { when: (p) => p.useLabel === true, type: 'string', default: 'Label', coerce: 'none', displayName: 'Label', group: 'Label', description: 'Text shown on this element', portability: 'logic' },
    useLabel: { type: 'boolean', default: false, coerce: 'none', displayName: 'Enable Label', group: 'Label', description: 'Shows a text label on this element', portability: 'logic' },
    // utils.ts :93-120 — what reaches the nodes around it; a graph scenario's matter
    blockTouch: { type: 'boolean', coerce: 'none', displayName: 'Block Pointer Events', group: 'Pointer Events', description: 'Stops every pointer event that lands on this control from reaching the nodes it sits inside. Blunt: it takes hover and pointer-down with it, so reach for Click Bubbling first if it is only clicks you want to keep in', portability: 'logic' },
    clickBubbling: { type: 'enum', enums: ['auto', 'always', 'never'], default: 'auto', coerce: 'none', displayName: 'Click Bubbling', group: 'Pointer Events', description: "Whether a click on this control also fires Click on the nodes it sits inside. Automatic keeps it here as soon as this control's own Click is connected, so a Favourite button inside a clickable card runs Favourite and not the card; Always is the older behaviour where both run; Never keeps every click here, wired or not", portability: 'logic' },

    // ---- look and layout (R10): stored, written to the style, read by no output; each with its class (visual-params.json; scripts/node-spec/gen-ports.js) ----
    alignX: { type: 'enum', enums: ['left', 'center', 'right'], coerce: 'none', displayName: 'Align X', group: 'Alignment', description: 'Horizontal alignment of this element within the space its parent gives it', portability: 'layout-shared', layout: 'align-x' },
    alignY: { type: 'enum', enums: ['top', 'center', 'bottom'], coerce: 'none', displayName: 'Align Y', group: 'Alignment', description: 'Vertical alignment of this element within the space its parent gives it', portability: 'layout-shared', layout: 'align-y' },
    backgroundColor: { type: 'color', default: 'transparent', coerce: 'none', displayName: 'Background Color', group: 'Style', description: 'Fill colour of the field', portability: 'look-shared' },
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
    color: { type: 'color', coerce: 'none', displayName: 'Color', group: 'Text Style', description: 'Colour of the text itself, not of the element behind it', portability: 'look-shared' },
    cssClassName: { type: 'string', default: '', coerce: 'none', displayName: 'CSS Class', group: 'Advanced HTML', description: 'Extra CSS class names to put on this element, for styling from a stylesheet you supply', portability: 'web-only' },
    dataAttributes: { type: 'stringlist', coerce: 'none', editOnly: true, displayName: 'Data Attributes', group: 'Data Attributes', description: 'data-* names (data-testid) for tests and scripts to find this element by; each gets a value input', portability: 'web-only' },
    fontFamily: { type: 'font', coerce: 'none', displayName: 'Font Family', group: 'Text Style', description: 'Typeface to render the text in, either a web-safe family name or a font file added to the project', portability: 'look-shared' },
    fontSize: { type: 'number', coerce: 'none', displayName: 'Font Size', group: 'Text Style', description: 'Height of the text, in pixels', portability: 'look-shared' },
    fontStyle: { type: 'enum', enums: ['normal', 'italic'], default: 'normal', coerce: 'none', displayName: 'Font Style', group: 'Text Style', description: 'Renders the text upright or italic', portability: 'look-shared' },
    fontVariantNumeric: { type: 'enum', enums: ['normal', 'tabular-nums'], default: 'normal', coerce: 'none', displayName: 'Numerals', group: 'Text Style', description: 'Tabular draws every digit at the same width so columns of numbers align; Normal follows the font', portability: 'look-expressible' },
    fontWeight: { type: 'number', default: 'Auto', coerce: 'none', displayName: 'Font Weight', group: 'Text Style', description: 'How heavy the text is drawn, from 100 (thin) to 900 (black); leave as Auto to use the weight the font family sets', portability: 'look-shared' },
    height: { when: (p) => p.sizeMode === 'explicit' || p.sizeMode === 'contentWidth', type: 'dimension', default: 100, coerce: 'none', displayName: 'Height', group: 'Dimensions', description: 'Height of the element; how the value is read depends on Size Mode', portability: 'layout-shared', layout: 'height' },
    iconColor: { when: (p) => p.useIcon === true && p.iconSourceType === 'icon', type: 'color', default: '#000000', coerce: 'none', displayName: 'Color', group: 'Icon', description: 'Colour of the icon', portability: 'look-shared' },
    iconIconSource: { when: (p) => p.useIcon === true && p.iconSourceType === 'icon', type: 'icon', coerce: 'none', displayName: 'Icon Source', group: 'Icon', description: 'Which glyph to show, picked from an installed icon set', portability: 'look-shared' },
    iconImageSource: { when: (p) => p.useIcon === true && p.iconSourceType === 'image', type: 'image', coerce: 'none', displayName: 'Image Source', group: 'Icon', description: 'Image file to show instead of an icon-set glyph', portability: 'look-shared' },
    iconPlacement: { when: (p) => p.useIcon === true, type: 'enum', enums: ['left', 'right'], default: 'left', coerce: 'none', displayName: 'Placement', group: 'Icon', description: 'Which side of the label the icon sits on, with Icon Spacing as the gap between them', portability: 'layout-shared', layout: 'content' },
    iconSize: { when: (p) => p.useIcon === true, type: 'number', default: 16, coerce: 'none', displayName: 'Size', group: 'Icon', description: 'Height of the icon', portability: 'look-shared' },
    iconSourceType: { when: (p) => p.useIcon === true, type: 'enum', enums: ['image', 'icon'], default: 'icon', coerce: 'none', displayName: 'Type', group: 'Icon', description: 'Whether the icon comes from an installed icon set or from an image file, which decides the source port below', portability: 'look-shared' },
    iconSpacing: { when: (p) => p.useIcon === true, type: 'number', default: 10, coerce: 'none', displayName: 'Spacing', group: 'Icon', description: 'Gap between the icon and the text beside it', portability: 'layout-shared', layout: 'content' },
    labelSpacing: { when: (p) => p.useLabel === true, type: 'number', default: 10, coerce: 'none', displayName: 'Spacing', group: 'Label', description: 'Gap between the label and the edges around it', portability: 'layout-shared', layout: 'content' },
    labelcolor: { when: (p) => p.useLabel === true, type: 'color', coerce: 'none', displayName: 'Color', group: 'Label Text Style', description: 'Colour of the text itself, not of the element behind it', portability: 'look-shared' },
    labelfontFamily: { when: (p) => p.useLabel === true, type: 'font', coerce: 'none', displayName: 'Font Family', group: 'Label Text Style', description: 'Typeface to render the text in, either a web-safe family name or a font file added to the project', portability: 'look-shared' },
    labelfontSize: { when: (p) => p.useLabel === true, type: 'number', coerce: 'none', displayName: 'Font Size', group: 'Label Text Style', description: 'Height of the text, in pixels', portability: 'look-shared' },
    labelfontStyle: { when: (p) => p.useLabel === true, type: 'enum', enums: ['normal', 'italic'], default: 'normal', coerce: 'none', displayName: 'Font Style', group: 'Label Text Style', description: 'Renders the text upright or italic', portability: 'look-shared' },
    labelfontVariantNumeric: { when: (p) => p.useLabel === true, type: 'enum', enums: ['normal', 'tabular-nums'], default: 'normal', coerce: 'none', displayName: 'Numerals', group: 'Label Text Style', description: 'Tabular draws every digit at the same width so columns of numbers align; Normal follows the font', portability: 'look-expressible' },
    labelfontWeight: { when: (p) => p.useLabel === true, type: 'number', default: 'Auto', coerce: 'none', displayName: 'Font Weight', group: 'Label Text Style', description: 'How heavy the text is drawn, from 100 (thin) to 900 (black); leave as Auto to use the weight the font family sets', portability: 'look-shared' },
    labelletterSpacing: { when: (p) => p.useLabel === true, type: 'number', default: 'Auto', coerce: 'none', displayName: 'Letter Spacing', group: 'Label Text Style', description: 'Extra space added between characters; leave as Auto to use the spacing built into the font', portability: 'look-shared' },
    labellineHeight: { when: (p) => p.useLabel === true, type: 'number', default: 'Auto', coerce: 'none', displayName: 'Line Height', group: 'Label Text Style', description: 'Vertical space each line of text occupies; leave as Auto to follow the font', portability: 'look-shared' },
    labeltextStyle: { when: (p) => p.useLabel === true, type: 'textStyle', default: 'None', coerce: 'none', displayName: 'Text Style', group: 'Label Text Style', description: "Applies one of the project's saved text styles; the individual font ports below override whatever it sets", portability: 'look-shared' },
    labeltextTransform: { when: (p) => p.useLabel === true, type: 'enum', enums: ['none', 'uppercase', 'lowercase', 'capitalize'], default: 'none', coerce: 'none', displayName: 'Case', group: 'Label Text Style', description: 'Forces the text to upper case, lower case or capitalised without changing the underlying value', portability: 'look-shared' },
    letterSpacing: { type: 'number', default: 'Auto', coerce: 'none', displayName: 'Letter Spacing', group: 'Text Style', description: 'Extra space added between characters; leave as Auto to use the spacing built into the font', portability: 'look-shared' },
    lineHeight: { type: 'number', default: 'Auto', coerce: 'none', displayName: 'Line Height', group: 'Text Style', description: 'Vertical space each line of text occupies; leave as Auto to follow the font', portability: 'look-shared' },
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
    placeHolderOpacity: { type: 'number', default: 0.5, coerce: 'none', displayName: 'Placeholder opacity', group: 'Text', description: 'How faded the placeholder text is, from 0 to 1', portability: 'look-shared' },
    position: { type: 'enum', enums: ['relative', 'absolute', 'sticky', 'fixed'], default: 'relative', coerce: 'none', displayName: 'Position', group: 'Layout', description: 'How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space', portability: 'layout-expressible', layout: 'place' },
    sizeMode: { type: 'enum', enums: ['explicit', 'contentWidth', 'contentHeight', 'contentSize'], default: 'contentSize', coerce: 'none', editOnly: true, displayName: 'Size Mode', group: 'Dimensions', description: 'Whether Width and Height are used as given, or the element sizes itself to fit its contents', portability: 'layout-shared', layout: 'size-mode' },
    styleCss: { type: 'string', default: '/* background-color: red; */', coerce: 'none', editOnly: true, displayName: 'CSS Style', group: 'Advanced HTML', description: 'Raw CSS declarations applied to this element, overriding the styling ports above', portability: 'web-only' },
    textAlignX: { type: 'enum', enums: ['left', 'center', 'right'], default: 'left', coerce: 'none', displayName: 'Text Horizontal Align', group: 'Text Alignment', description: 'Aligns the typed text within the field', portability: 'layout-shared', layout: 'content' },
    textStyle: { type: 'textStyle', default: 'None', coerce: 'none', displayName: 'Text Style', group: 'Text Style', description: "Applies one of the project's saved text styles; the individual font ports below override whatever it sets", portability: 'look-shared' },
    textTransform: { type: 'enum', enums: ['none', 'uppercase', 'lowercase', 'capitalize'], default: 'none', coerce: 'none', displayName: 'Case', group: 'Text Style', description: 'Forces the text to upper case, lower case or capitalised without changing the underlying value', portability: 'look-shared' },
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
    // text-input.ts :365-379
    onTextChanged: { type: '*', from: (s) => s.wire, displayName: 'Value', group: 'General', description: 'What the field currently contains, updated as the user types. A number when Type is Number, otherwise text' },
    // text-input.ts :390-397 — fired by every write through the component (:377), changed or not
    textChanged: { type: 'signal', displayName: 'Value Changed', group: 'General', description: 'Fires each time a value is written into the field (Set, Value, Insert Text, Backspace, Clear or the person typing), whether or not it changed. A write made while the field is off the page is announced when the field comes back' },
    // text-input.ts :382-387; TextInput.tsx :284-288
    onEnter: { type: 'signal', displayName: 'On Enter', group: 'Events', description: 'Fires when the user presses Enter in the field, which is the usual place to submit' },
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
    // react-component-node.ts :1428-1444 — no Children Count: `allowChildren` is false (text-input.ts :23)
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
      return { says: 'a change: Enabled follows; disabled, the field takes no typing, no key and no focus', set: { enabled }, send: ['enabled'] };
    },
    // text-input.ts :74-91 — a prop the component reads at each render (TextInput.tsx :192, :201) and each write (textInputValue.ts)
    type: (_s, v) => ({ says: 'always: read at the next paint and the next write — what the field accepts, and whether Value hands on a number or text', set: { fieldType: v }, send: [] }),
    // text-input.ts :212-240
    startValue: (s, v) => {
      if (v === undefined) return { says: 'undefined: ignored', send: [] }; // :222
      const text = v === null ? emptyFor(s.fieldType) : v; // :225
      if (s.text === text) return { says: 'the value it already holds (null as empty): nothing', send: [] }; // :226
      if (!s.runOnChange) return { says: 'a new value, with Run On Value Change unticked: held for the next Set', set: { text }, send: [] }; // :237 — waits for Set
      const w = setText({ ...s, text }, text); // :238
      // s74 (NSP-018): the write's wire is `setText`'s, computed — said
      return said(
        'a new value, with Run On Value Change ticked: written now — on the page the field takes it (Value, Value Changed) unless it holds the keyboard; off the page Value alone, when it differs',
        { set: { text, ...w.set }, send: w.send, emit: w.emit }
      );
    },
    // run-on-value-change.ts :136-138
    'runOnChange-startValue': (_s, v) => ({ says: 'always: whether a new Value is written at once, or waits for Set', set: { runOnChange: v !== false }, send: [] }),
    // text-input.ts :188-196 — at the frame's end, in the order scheduled
    set: (s) => ({
      says: 'always: at the end of the frame (or a pointer act\'s drain before it) the Value as it stands is written, as a ticked Value writes it — Done if it wrote, else Unchanged',
      set: { queue: [...s.queue, 'set'] },
      outcome: 'deferred',
      send: []
    }),
    // text-input.ts :251-253
    textToInsert: (_s, v) => ({ says: 'always: read by the next Insert Text, as text (nothing as empty)', set: { textToInsert: v === undefined || v === null ? '' : String(v) }, send: [] }),
    // text-input.ts :261-266 — at the frame's end
    insert: (s) => ({
      says: 'always: at the end of the frame Text To Insert goes in at the caret (at the end, off the page), within Max length — Value, Value Changed on the page, and Done; Unchanged when nothing fits',
      set: { queue: [...s.queue, 'insert'] },
      outcome: 'deferred',
      send: []
    }),
    // text-input.ts :273-276 — at once
    backspace: (s) => {
      const w = edit(s, 'backspace', '');
      return said(
        'always, at once: the character before the caret goes (the last one, off the page) — Value, Value Changed on the page, and Done; Unchanged when there is none',
        { set: w.set, send: w.send, emit: w.emit, outcome: w.landed ? 'done' : 'unchanged' }
      );
    },
    // text-input.ts :283-286, :485-512
    clear: (s) => {
      const w = clear(s);
      return said(
        'always, at once: the field and Value are emptied (Value Changed on the page, focused or not) — Done; Unchanged when they were empty already',
        { set: w.set, send: w.send, emit: w.emit, outcome: w.landed ? 'done' : 'unchanged' }
      );
    },
    // text-input.ts :158-164
    maxLength: (_s, v) => ({ says: 'always: read at the next keystroke and Insert Text — above 0, no more characters than this', set: { maxLength: v }, send: [] }),
    // react-component-node.ts :2310-2320 — what the node wants; the page follows at the next paint
    mounted: (_s, v) => ({ says: 'always: the field is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint', set: { mounted: !!v }, send: [] }),
    // node-shared-port-definitions.ts `addLabelInputs` — a label above the field; the field and its keyboard stay (docblock, C80)
    useLabel: () => ({ says: 'always: a label is drawn above the field, or not; the field and its keyboard stay', send: [] }),
    // text-input.ts :293-308 → focus-tracker.ts :57-78: `_canFocus` is "the component is on the page" (:431-433); a disabled
    // element takes nothing, silently (`focus()` on it is a no-op — the focusing steps); none, Unchanged (R13)
    focus: (s) => {
      if (!s.onPage) return { says: 'not on the page: nothing to focus, the Focus is not kept, and the editor is told', set: focusMissed(s, true), send: [], outcome: 'unchanged' };
      if (s.elementFocused || !s.pageEnabled || !s.pageVisible) return { says: 'it holds the keyboard already, or is disabled or hidden: nothing changes', set: focusMissed(s, false), send: [], outcome: 'done' };
      return { says: 'otherwise the keyboard is put on it, and the Focused state goes true', set: { focused: true, elementFocused: true, hadCaret: true, ...focusMissed(s, false) }, send: ['focusState'], emit: ['onFocus'], outcome: 'done' };
    },
    // text-input.ts :315-319 → focus-tracker.ts :87-89: `blur()` on the element; Done either way
    blur: (s) => {
      if (!s.onPage || !s.elementFocused || !s.pageEnabled) return { says: 'it does not hold the keyboard (or is disabled, and gives it up to nobody): nothing changes', send: [], outcome: 'done' };
      return { says: 'it holds the keyboard: it is taken off it, and the Focused state goes false', set: { focused: false, elementFocused: false }, send: ['focusState'], emit: ['onBlur'], outcome: 'done' };
    },
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the field can be seen', send: [] }),
    // pointerlisteners.ts :113-133 — a blocker on every pointer event (docblock: the drain); what reaches the nodes around it is a graph's matter
    blockTouch: (_s, v) => ({ says: 'always: on, a pointer act that lands here goes no further — the nodes it sits inside do not hear it', set: { blocksPointer: !!v }, send: [] }),
    // NSP-019 R38 — node.ts :446-458, react-component-node.ts :706-753 (wired-grow.ts)
    width: sizeReducer('width'),
    height: sizeReducer('height'),
    // node-shared-port-definitions.ts :366-375, :320-328 — the page follows at the next paint (TextInput.tsx :118-120 compares the
    // Opacity the style holds with the number 0)
    visible: (_s, v) => ({ says: 'always: shown or hidden at the next paint, its space kept; hidden, a Focus does not reach it', set: { visible: !!v }, send: [] }),
    opacity: (_s, v) => ({ says: 'always: how see-through it is; at exactly 0 it takes no pointer, and an act goes to what is behind it', set: { opacityZero: v === 0 }, send: [] })
  },
  {
    // react-component-node.ts :785-830 `DATA_ATTRIBUTES_RULE` — one string input per name the Data Attributes list names (the
    // editor's stringlist: comma-separated; only a `data-…` name counts), written on the element as that attribute: nothing
    // on the wire. The catalog also marks this node `runtime-narrowed` (text-input.ts :602-623 republishes `startValue` and
    // `onTextChanged` with `number` when Type is Number, `string` otherwise): the port LIST is complete above, only the type
    // field moves, and a declared port cannot be re-derived — the narrowing is a sentence here, not a port.
    derived: {
      inputs: (params) => Object.fromEntries(dataAttributeNames(params.dataAttributes).map((name) => [name, dataAttributeInput(name)])),
      on: () => NOTHING
    },
    world: {
      // placed on the page with its params set — the first render: Did Mount, and the mount's announcement of the Value (TextInput.tsx :97-110)
      place: (s, i, w) => withGrow(s, painted(s), i.sizeMode, i.position, w)
    },
    // the frame's end: the scheduled callbacks in order (nodecontext.ts :478-486 — before the paint, which the target's frame
    // end raises after `update()`), then the paint
    afterInputs: (s, i, w) => {
      const d = drained(s);
      const p = withGrow(after(s, d), painted(after(s, d)), i.sizeMode, i.position, w);
      return { set: { ...d.set, ...p.set }, send: [...d.send, ...p.send], emit: [...d.emit, ...p.emit], outcomes: d.outcomes };
    },
    // a person acts on a PAINTED page (adapter.ts `act`): the page follows first, then the act meets what is there
    person: {
      // utils.ts :216-234 — not dropped on a disabled control; then the drain (docblock)
      hover: (s) => onPainted(s, (p) => thenDrained(p, { set: { hover: true }, send: ['hoverState'], emit: ['hoverStart'] })),
      // utils.ts :224-227, :235-243, :276-280 — hover before the press it ends
      leave: (s) => onPainted(s, (p) => thenDrained(p, { set: { hover: false, pressed: false }, send: ['hoverState', 'pressedState'], emit: ['hoverEnd'] })),
      // a Text Area's mousedown is the control's (wrapped: it drains, inside the handler — before the browser's default action puts
      // the keyboard on the element); an <input>'s too, since P109 ISL-031 (C68: its own handler replaced the control's)
      press: (s) => onPainted(s, (p) => blockerFirst(p, (q) => (q.enabled ? pressed(q) : NONE))),
      release: (s) => onPainted(s, (p) => blockerFirst(p, (q) => (q.enabled ? thenDrained(q, { set: { pressed: false }, send: ['pressedState'], emit: ['pointerUp'] }) : NONE))),
      // the press, the release, and a click nothing listens for (the node has no Click output); the release's handler drains
      click: (s) =>
        onPainted(s, (p) =>
          blockerFirst(p, (b) => {
            if (!b.enabled) return NONE;
            const d = pressed(b);
            const q: State = { ...b, ...d.set };
            return join(d, thenDrained(q, { set: { pressed: false }, send: ['pressedState'], emit: ['pointerUp'] }));
          })
        ),
      // utils.ts — a finger on a disabled field reports nothing (v5, C64), and TextInput.tsx overrides no touch handler; the wrapped handler drains
      // either way (pointerlisteners.ts: the drain follows the handler, which returns early)
      touch: (s) => onPainted(s, (p) => blockerFirst(p, (q) => thenDrained(q, q.enabled ? { set: { pressed: true }, send: ['pressedState'], emit: ['pointerDown'] } : NONE))),
      lift: (s) => onPainted(s, (p) => blockerFirst(p, (q) => thenDrained(q, q.enabled ? { set: { pressed: false }, send: ['pressedState'], emit: ['pointerUp'] } : NONE))),
      // utils.ts :157-195 — a disabled field is not a focusable area
      focus: (s) => onPainted(s, (p) => (p.enabled && !p.elementFocused ? focusTaken() : NONE), 'keyboard'),
      blur: (s) => onPainted(s, (p) => (p.elementFocused && p.enabled ? { set: { focused: false, elementFocused: false }, send: ['focusState'], emit: ['onBlur'] } : NONE), 'blur'),
      // THE PERSON types (docblock "typing"): the keyboard onto the field first, then one key at a time
      type: (s, _i, value) =>
        onPainted(s, (p) => {
          if (!p.enabled) return NONE;
          const first = p.elementFocused ? NONE : focusTaken();
          let set: Partial<State> = { ...first.set };
          let state: State = { ...p, ...first.set };
          const send: ValueOut[] = [...first.send];
          const emit: Pulse[] = [...(first.emit ?? [])];
          for (const ch of Array.from(str(value))) {
            const w = typed(state, ch);
            if (!w) continue;
            set = { ...set, ...w.set };
            state = after(state, w);
            send.push(...w.send);
            emit.push(...w.emit);
          }
          return { set, send, emit };
        }, 'keyboard'),
      // TextInput.tsx :284-288 `onKeyDown`: Enter → On Enter; the browser's default action of Enter in a <textarea> writes a newline
      key: (s, _i, value) =>
        onPainted(s, (p) => {
          if (!p.enabled || value !== 'Enter') return NONE;
          const first = p.elementFocused ? NONE : focusTaken();
          let set: Partial<State> = { ...first.set };
          const send: ValueOut[] = [...first.send];
          const emit: Pulse[] = [...(first.emit ?? []), 'onEnter'];
          if (elementType(p.pageType) === 'textArea') {
            const w = typed({ ...p, ...first.set }, '\n');
            if (w) {
              set = { ...set, ...w.set };
              send.push(...w.send);
              emit.push(...w.emit);
            }
          }
          return { set, send, emit };
        }, 'keyboard')
    }
  }
);

/** The keyboard onto the field (utils.ts :157-168; TextInput.tsx :177-180 `hadCaret`) */
function focusTaken(): Act {
  return { set: { focused: true, elementFocused: true, hadCaret: true }, send: ['focusState'], emit: ['onFocus'] };
}

/**
 * text-input.ts :521-540 `setText`: the start value is written on every path; on the page the component takes it
 * unless the field has the keyboard (TextInput.tsx :89-95 — the field, the output, Value Changed); off the page the
 * output alone, when it does not already read the text as written (raw compare, :530).
 */
function setText(s: Readonly<State>, text: unknown): Write {
  const startValue: Partial<State> = { startValue: text }; // :522 — every path
  if (s.onPage) {
    if (s.elementFocused) return { set: startValue, send: [], emit: [], landed: false }; // :525-529
    const c = componentSetText(s, text); // :526
    return { set: { ...startValue, ...c.set }, send: c.send, emit: c.emit, landed: true };
  }
  // v3 (P109 ISL-031, row D32 ruled "Always text"): made text first, as the component makes it on the page, and compared
  // as it would be published. v1–v2, as the runtime was, published the raw value (a number stayed a number on a text field)
  const out = outward(s.fieldType, str(text));
  if (s.out !== out) return { set: { ...startValue, ...sent(s, out) }, send: ['onTextChanged'], emit: [], landed: true }; // :530-537
  return { set: startValue, send: [], emit: [], landed: false };
}

/**
 * TextInput.tsx :89-95 — the component's `setText`: the field as text, at once (one write after another: docblock), the
 * output converted with the Type as it stands, and `onTextChanged` → announced, Value Changed (text-input.ts :374-378)
 */
function componentSetText(s: Readonly<State>, value: unknown, edited: number | null = null): Omit<Write, 'landed'> {
  const text = str(value);
  const out = outward(s.fieldType, text); // the Type as it stands (the runtime too since P109 ISL-031; it was as last drawn — row C72)
  return { set: { ...written(s, text, edited), ...sent(s, out), announced: out, hasAnnounced: true }, send: ['onTextChanged'], emit: ['textChanged'] };
}

/**
 * The field takes `text`. The cursor (State `caret`): HTML's value setter moves it to the end when what the element shows —
 * the text sanitised by the element's type — changed; then an Insert Text or Backspace (`edited`) puts it after what it
 * wrote, if the field has the keyboard (TextInput.tsx :359-369 — `setSelectionRange` clamps to the value; on a type without
 * the API it throws and is caught).
 */
function written(s: Readonly<State>, text: string, edited: number | null): Partial<State> {
  const before = sanitize(s.pageType, s.field);
  const after = sanitize(s.pageType, text);
  let caret = s.caret;
  if (after !== before) caret = after.length;
  if (edited !== null && s.elementFocused && selectable(s.pageType)) caret = Math.min(edited, after.length);
  return { field: text, caret };
}

/** text-input.ts :485-512 */
function clear(s: Readonly<State>): Write {
  const empty = emptyFor(s.fieldType);
  // :490 — v4 (P109 ISL-031, row D33 ruled "Check the field's text"): the field's own text too — the field on the page (a Set
  // that met the keyboard wrote only the start value), the start value off it. v1–v3, as the runtime was, read only the
  // author's Value and the output, so emptying 'ab' from a Number field reported Unchanged
  const wasEmpty = s.text === empty && s.out === empty && (s.onPage ? s.field : str(s.startValue)) === '';
  const emptied: Partial<State> = { text: empty, startValue: empty }; // :496-497 — every path
  if (s.onPage) {
    const c = componentSetText(s, ''); // :504 — focused or not
    return { set: { ...emptied, ...c.set }, send: c.send, emit: c.emit, landed: !wasEmpty };
  }
  // :505-509 — the output written when it differs; written here regardless (the same value is silent on the wire), so an
  // off-page Clear is one branch and not two twins a mutant cannot tell apart
  return { set: { ...emptied, ...sent(s, empty) }, send: ['onTextChanged'], emit: [], landed: !wasEmpty };
}

/**
 * text-input.ts :463-483 `edit` → TextInput.tsx :330-371 on the page: on the field as the last write left it, at the caret
 * (`caretOf`), within `Number(Max length)` as it stands when above 0 (rows C69, C72, fixed on the runtime in P109 ISL-031); off the page the start
 * value is appended to or trimmed.
 */
function edit(s: Readonly<State>, mode: 'insert' | 'backspace', replacement: string): Write {
  const none: Write = { set: {}, send: [], emit: [], landed: false };
  if (s.onPage) {
    const value = s.field; // :331
    const at = caretOf(s, value); // :332 — no selection ever: start and end are one
    let from = at;
    let text = replacement;
    if (mode === 'backspace') {
      text = '';
      if (at === 0) return none; // :339
      const before = Array.from(value.slice(0, at));
      from = at - before[before.length - 1].length; // :341-342 — one character, not one code unit
    } else {
      const maxLength = Number(s.maxLength); // :346-350
      if (maxLength > 0) text = fit(text, Math.max(0, maxLength - value.length));
      if (text.length === 0) return none; // :351
    }
    const next = value.slice(0, from) + text + value.slice(at); // :354
    if (next === value) return none; // :355
    // :358-359 — `_typed(next)` then `setText(next, …)` with the caret after what was written (:356)
    const c = componentSetText(s, next, from + text.length);
    return { set: { startValue: next, ...c.set }, send: c.send, emit: c.emit, landed: true };
  }
  const current = str(s.startValue); // :466
  let next: string;
  if (mode === 'backspace') {
    const chars = Array.from(current);
    chars.pop();
    next = chars.join('');
  } else {
    const maxLength = Number(s.maxLength);
    const room = maxLength > 0 ? Math.max(0, maxLength - current.length) : Infinity;
    next = current + fit(str(replacement), room);
  }
  if (next === current) return none; // :477
  // :479-481 — the start value and the output, converted; no announcement, no Value Changed
  return { set: { startValue: next, ...sent(s, outward(s.fieldType, next)) }, send: ['onTextChanged'], emit: [], landed: true };
}

/**
 * TextInput.tsx :304-316 `caret`: the element's cursor once the field has held focus (`hadCaret`) and the type has one
 * (`selectionStart` is null on an Email or Number field: append), clamped to the text; else the end.
 */
function caretOf(s: Readonly<State>, value: string): number {
  if (s.hadCaret && selectable(s.pageType)) return Math.min(s.caret, value.length);
  return value.length;
}

/**
 * One key on the field the keyboard is on (docblock "typing"): the browser refuses it past the element's `maxlength`
 * (never on a Number field) and refuses every key but a digit on a Number field; what it writes is the element's value
 * — the field sanitised by its type — plus the key, sanitised again; when that differs, `input` → `onChange`
 * (TextInput.tsx :290-297): `_typed`, then `setText`. Returns undefined for a refused or ineffective key.
 */
function typed(s: Readonly<State>, ch: string): Omit<Write, 'landed'> | undefined {
  const kind = elementType(s.pageType);
  const shown = sanitize(s.pageType, s.field);
  if (kind === 'number') {
    if (!/^[0-9]$/.test(ch)) return undefined;
  } else {
    const max = maxLengthAttribute(s.maxLength);
    if (max >= 0 && shown.length + ch.length > max) return undefined;
  }
  // the key goes in at the text entry cursor where the type has one; where it does not (email, number) the face appends
  const at = selectable(s.pageType) ? Math.min(s.caret, shown.length) : shown.length;
  const next = sanitize(s.pageType, shown.slice(0, at) + ch + shown.slice(at));
  if (next === shown) return undefined; // a key that changes nothing the element shows raises no change
  const c = componentSetText(s, next); // :295-296 — `_typed(next)`, then `setText(next)`
  // the cursor sits after the key (the field already holds the text the element shows: the write moves nothing)
  return { set: { startValue: next, ...c.set, caret: Math.min(at + ch.length, next.length) }, send: c.send, emit: c.emit };
}

/**
 * A paint: the page follows what the node wants (button.ts `painted`), and a field put on the page announces the Value
 * (TextInput.tsx :97-110): the field starts from the start value; when the output has not announced exactly that
 * (text-input.ts :453-455), `setText(startValue)` — the output and Value Changed (before Did Mount: the field is on the
 * page before the node's wrapper). The element's type follows Type; a change between Text Area and the rest replaces the
 * element, and the keyboard leaves with the old one.
 */
function painted(s: Readonly<State>): { set: Partial<State>; send: ValueOut[]; emit: Pulse[] } {
  const set: Partial<State> = {
    ...(s.pageEnabled === s.enabled ? {} : { pageEnabled: s.enabled }),
    ...(s.pageVisible === s.visible ? {} : { pageVisible: s.visible }),
    ...(s.pageOpacityZero === s.opacityZero ? {} : { pageOpacityZero: s.opacityZero })
  };
  const type = s.fieldType;
  const area = elementType(type) === 'textArea';
  if (s.mounted && !s.onPage) {
    const field = str(s.startValue); // TextInput.tsx :78
    const o = outward(type, field); // :106-107
    // a fresh element: `hadCaret` false (:319), the cursor at the end of the text (State `caret`)
    const fresh: Partial<State> = { onPage: true, field, pageType: type, hadCaret: false, caret: sanitize(type, field).length };
    if (s.hasAnnounced && s.announced === o) return { set: { ...set, ...fresh }, send: [], emit: ['didMount'] };
    const c = componentSetText({ ...s, ...fresh }, s.startValue); // :109 — the same text: the cursor stays
    return { set: { ...set, ...fresh, ...c.set }, send: c.send, emit: [...c.emit, 'didMount'] };
  }
  if (!s.mounted && s.onPage) {
    // the element leaves with the keyboard it held, and the states go with it (v6, D30)
    const l = leftPage(s);
    return { set: { ...set, onPage: false, elementFocused: false, ...l.set }, send: l.send, emit: ['willUnmount', ...l.emit] };
  }
  if (!s.onPage) return { set, send: [], emit: [] };
  if (type === s.pageType) return { set, send: [], emit: [] };
  // on the page, the type changed. `<textarea>` ↔ `<input>`: a new element, its cursor at the end, the keyboard left with the
  // old one. Else HTML's type change steps (a type without the selection API to one with it: the start), then the value the
  // element holds re-sanitised by the new type, set to the field again: the end, when that changed what it shows
  if (area !== (elementType(s.pageType) === 'textArea')) {
    const replaced: Partial<State> = { ...set, pageType: type, caret: sanitize(type, s.field).length };
    if (s.elementFocused) replaced.elementFocused = false;
    return { set: replaced, send: [], emit: [] };
  }
  let caret = s.caret;
  if (!selectable(s.pageType) && selectable(type)) caret = 0;
  const after = sanitize(type, s.field);
  if (after !== sanitize(type, sanitize(s.pageType, s.field))) caret = after.length;
  return { set: { ...set, pageType: type, caret }, send: [], emit: [] };
}

/**
 * NSP-016 s43 — what reaches the field: no pointer when it is hidden (`visibility: hidden`) or at Opacity exactly 0 (`pointer-events:
 * none`) — the browser's hit test passes it by; the keyboard when it can be seen, or when it holds it already (`focus()` refuses a
 * hidden element — Chromium `IsFocusableStyle` — and jsdom has no focus fixup; opacity does not stop a focus); a blur always.
 */
type Reach = 'pointer' | 'keyboard' | 'blur';
function reaches(p: Readonly<State>, how: Reach): boolean {
  if (how === 'blur') return true;
  if (how === 'keyboard') return p.pageVisible || p.elementFocused;
  return p.pageVisible && !p.pageOpacityZero;
}

/** The act on the painted page (button.ts `onPainted`): nothing to act on when the element is not there; else `then` on the painted state, after the paint's own pulses. */
function onPainted(s: Readonly<State>, then: (painted: Readonly<State>) => Act, how: Reach = 'pointer'): Act {
  const p = painted(s);
  const after: State = { ...s, ...p.set };
  const a = after.onPage && reaches(after, how) ? then(after) : NONE;
  const out: Act = { set: { ...p.set, ...a.set }, send: [...p.send, ...a.send], emit: [...p.emit, ...(a.emit ?? [])] };
  if (a.outcomes && a.outcomes.length > 0) out.outcomes = a.outcomes;
  return out;
}

/**
 * The frame-end work queued so far (text-input.ts :190, :263 — node.ts :1276-1279 runs the callbacks in order at the node's
 * next update): a Set reads the author's Value, an Insert Text the Text To Insert, each as they stand now; each resolves its
 * press. Run at the frame's end (`afterInputs`), and by a pointer act's handler (docblock: the drain).
 */
function drained(s: Readonly<State>): { set: Partial<State>; send: ValueOut[]; emit: Pulse[]; outcomes: Resolved[] } {
  // the callback list is consumed (node.ts :743-744): written only when it held something
  let set: Partial<State> = s.queue.length > 0 ? { queue: [] } : {};
  let state: State = { ...s, ...set };
  const send: ValueOut[] = [];
  const emit: Pulse[] = [];
  const outcomes: Resolved[] = [];
  for (const op of s.queue) {
    const w = op === 'set' ? setText(state, state.text) : edit(state, 'insert', state.textToInsert || '');
    set = { ...set, ...w.set };
    state = after(state, w);
    send.push(...w.send);
    emit.push(...w.emit);
    outcomes.push({ port: op, outcome: w.landed ? 'done' : 'unchanged' });
  }
  return { set, send, emit, outcomes };
}

/** A pointer act's own work, then the drain its wrapped handler runs (pointerlisteners.ts :180-183). */
function thenDrained(p: Readonly<State>, a: Act): Act {
  const d = drained({ ...p, ...a.set });
  const out: Act = { set: { ...a.set, ...d.set }, send: [...a.send, ...d.send], emit: [...(a.emit ?? []), ...d.emit] };
  if (d.outcomes.length > 0) out.outcomes = d.outcomes;
  return out;
}

/**
 * A mouse button down on an enabled field (utils.ts :255-259, :285-293): Pressed and Pointer Down, and the handler's drain
 * (pointerlisteners.ts :180-183), on a one-line field and a Text Area alike (docblock; the runtime's one-line field until P109 ISL-031: row C68);
 * then the browser's default action of `mousedown`: the keyboard onto the element, if it is not there already.
 */
function pressed(s: Readonly<State>): Act {
  const down = thenDrained(s, { set: { pressed: true }, send: ['pressedState'], emit: ['pointerDown'] });
  if (s.elementFocused) return down;
  return join(down, focusTaken());
}

/**
 * Block Pointer Events on (pointerlisteners.ts :113-133): every pointer event gets a handler, a blocker where nothing listened, and
 * each is wrapped with the drain (:180-183). A browser raises `pointerdown` / `pointerup` BEFORE the `mousedown` / `touchstart` /
 * `mouseup` / `touchend` the control listens to, and raises them on a disabled control too: so a press, release, click, touch or lift
 * drains the frame first, then does its own work (s45, the 10,000 run, seed 20731; measured side by side, any frame).
 */
function blockerFirst(p: Readonly<State>, then: (q: Readonly<State>) => Act): Act {
  if (!p.blocksPointer) return then(p);
  const d = drained(p);
  const early: Act = { set: d.set, send: d.send, emit: d.emit };
  if (d.outcomes.length > 0) early.outcomes = d.outcomes;
  return join(early, then(after(p, d)));
}

/** Two acts in sequence, as one patch. */
function join(a: Act, b: Act): Act {
  const out: Act = { set: { ...a.set, ...b.set }, send: [...a.send, ...b.send], emit: [...(a.emit ?? []), ...(b.emit ?? [])] };
  const outcomes = [...(a.outcomes ?? []), ...(b.outcomes ?? [])];
  if (outcomes.length > 0) out.outcomes = outcomes;
  return out;
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
