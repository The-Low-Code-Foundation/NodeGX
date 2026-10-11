---
title: "Drag"
---
Makes its child subtree draggable along X and/or Y, reporting position and drag signals, with animated snap-to-position.

Drag is a visual container: whatever you place inside it can be dragged with the pointer. `axis` restricts movement ('x' by default, 'y' or 'both'), `enabled` turns dragging on/off, and `useParentBounds` (Constrain to parent, default true) keeps the content inside its parent's box. While dragging, `positionX`/`positionY` (Drag X/Y) hold the current offset in pixels and `deltaX`/`deltaY` the per-move change; `onStart` (Drag Started), `onDrag` (Drag Moved) and `onStop` (Drag Ended) are signals bracketing the gesture. The position can also be driven from the graph: setting `inputPositionX`/`inputPositionY` (Start Drag X/Y) moves the content and updates the outputs, and the `snapToPositionX.do`/`snapToPositionY.do` signals animate to `snapToPositionX.value` over `snapToPositionX.duration` milliseconds (default 300).

## When to use it

Sliders, swipeable cards, drawers — any direct-manipulation gesture where you need the live drag offset. For scrolling content use a Group with scrolling enabled instead; for purely programmatic motion use an Animation on a node's Pos X/Y rather than a Drag no one touches.

## At a glance

| | |
|---|---|
| Category | Visual |
| Type name | `Drag` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `axis` | Enum (`x`, `y`, `both`) | `x` | Which axes dragging is allowed on |
| `cssClassName` | String | `` | Extra CSS class names to put on this element, for styling from a stylesheet you supply |
| `enabled` | Boolean | `true` | Lets the user drag this element; when off it still renders and still responds to the Snap actions |
| `inputPositionX` | Number | — | Sets the X position the element starts at, before any dragging |
| `inputPositionY` | Number | — | Sets the Y position the element starts at, before any dragging |
| `mounted` | Boolean | `true` | Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen) |
| `scale` | Number | `1` | Divides pointer movement before it becomes element movement, so 2 makes the element move half as far as the pointer |
| `scrollIntoViewAlign` | Enum (`nearest`, `start`, `center`, `end`) | `nearest` | Where Scroll Into View leaves the element: Nearest edge moves only as far as needed |
| `snapToPositionX.duration` | Number | `300` | How long the X snap animation takes, in milliseconds |
| `snapToPositionX.value` | Number | `0` | X position the element animates to when Snap To Position X — Do fires. An empty value leaves the current position alone |
| `snapToPositionY.duration` | Number | `300` | How long the Y snap animation takes, in milliseconds |
| `snapToPositionY.value` | Number | `0` | Y position the element animates to when Snap To Position Y — Do fires. An empty value leaves the current position alone |
| `styleCss` | String | `/* background-color: red; */` | Raw CSS declarations applied to this element, overriding the styling ports above |
| `useParentBounds` | Boolean | `true` | Stops the element being dragged outside its parent's bounds |
| `variant` | String | — | Name of a saved variant of this node type to apply, replacing the styling set here |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `scrollIntoView` | Signal | — | Scrolls the page, or the scrolling Group holding this element, until the element can be seen |
| `snapToPositionX.do` | Signal | — | Animates the element to Value on the X axis; does nothing if it is already there |
| `snapToPositionY.do` | Signal | — | Animates the element to Value on the Y axis; does nothing if it is already there |

### What each input does

**Do** (`snapToPositionX.do`)

- always: at the end of the frame the element starts moving on X from where it is to Value, over Duration, easing out, Drag X sent each frame (no Drag Moved) — Done once it has started, or at once when it is already at Value; a drag under way is moved too; before the Drag is on the page it waits for the mount (at most 16 wait, and the oldest pushed out reports Failure)

**Do** (`snapToPositionY.do`)

- always: at the end of the frame the element starts moving on Y from where it is to Value, over Duration, easing out, Drag Y sent each frame (no Drag Moved) — Done once it has started, or at once when it is already at Value; a drag under way is moved too; before the Drag is on the page it waits for the mount (at most 16 wait, and the oldest pushed out reports Failure)

**Value** (`snapToPositionX.value`)

- nothing, null, empty, or not readable as a number: the X the snap goes to is left as it was (what cannot be read is reported as a runtime error)
- a number, or text that reads as one: where Snap To Position X — Do takes the element

**Value** (`snapToPositionY.value`)

- nothing, null, empty, or not readable as a number: the Y the snap goes to is left as it was (what cannot be read is reported as a runtime error)
- a number, or text that reads as one: where Snap To Position Y — Do takes the element

**Duration** (`snapToPositionX.duration`)

- always: read at the next Do — how long the X snap takes, in milliseconds; nothing means 300, and 0 or less lands at Value at the next frame

**Duration** (`snapToPositionY.duration`)

- always: read at the next Do — how long the Y snap takes, in milliseconds; nothing means 300, and 0 or less lands at Value at the next frame

**Enabled** (`enabled`)

- always: read at the next press — off (exactly false; 0 or the text "false" is not off), a press starts no drag, a drag under way carries on to its let go, and the snaps still run

**Axis** (`axis`)

- always: read at the next press, move or let go, a drag under way included — X, Y or Both; on an axis it does not allow the element stays, Drag X / Y say where it is and Delta X / Y is 0; any other value moves it on neither

**Constrain to parent** (`useParentBounds`)

- always: read at the next move, a drag under way included — on, the element is kept inside its parent's box; off, it can leave it

**Scale** (`scale`)

- always: read at the next press, move or let go, a drag under way included — the pointer's movement is divided by it before it moves the element; nothing or 0 counts as 1

**Start Drag X** (`inputPositionX`)

- always: where the element starts on X — at the next paint a change moves it there and sends Drag X and Delta X (the change from the last one; a drag under way goes on from there); text is read as a number, and a value that is not a number again is no change

**Start Drag Y** (`inputPositionY`)

- always: where the element starts on Y — at the next paint a change moves it there and sends Drag Y and Delta Y (the change from the last one; a drag under way goes on from there); text is read as a number, and a value that is not a number again is no change

**Mounted** (`mounted`)

- always: at the next paint — off takes the Drag and its child off the page (Will Unmount; both snaps stop, and a drag under way ends with no Drag Ended); on again makes a new one at Start Drag X / Y (Did Mount, all four values sent, and the snaps that waited run from there)

**Scroll Into View** (`scrollIntoView`)

- always: asks the page to scroll until the element it moves can be seen — nothing on the wire

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `boundingHeight` | Number | — | Height this element actually ended up with after layout, in pixels |
| `boundingWidth` | Number | — | Width this element actually ended up with after layout, in pixels |
| `childIndex` | Number | — | This element's position among its parent's children, counting from 0 |
| `childrenCount` | Number | — | How many child elements are currently mounted inside this one |
| `deltaX` | Number | — | How far the element moved on X since the last Drag Moved |
| `deltaY` | Number | — | How far the element moved on Y since the last Drag Moved |
| `positionX` | Number | — | Current X position of the element relative to where it started |
| `positionY` | Number | — | Current Y position of the element relative to where it started |
| `screenPositionX` | Number | — | Distance in pixels from the left edge of the window to this element's left edge |
| `screenPositionY` | Number | — | Distance in pixels from the top edge of the window to this element's top edge |
| `this` | Reference | — | A reference to this node itself, for ports that take a node rather than a value |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `didMount` | Signal | — | Fires once this element has been added to the page and can be measured |
| `done` | Signal | — | Fires once a snap animation has been started on the element |
| `onDrag` | Signal | — | Fires on every frame the element moves while being dragged |
| `onStart` | Signal | — | Fires when the user starts dragging |
| `onStop` | Signal | — | Fires when the user releases the element, including when the pointer leaves the window |
| `willUnmount` | Signal | — | Fires just before this element is removed from the page, while it still exists |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `failure` | Signal | — | Fires when the snap never reached the element, because it has still not mounted |

## Patterns

- Snap back: `onStop` → `snapToPositionX.do` with `snapToPositionX.value` 0 — released content animates home.
- Swipe threshold: `positionX` → Expression/Condition deciding on `onStop` whether to snap to the open or closed position.

## Watch out for

- Working out which list a card landed in from its drag offset (start + offset ÷ column width). It breaks as soon as two columns differ in width and does nothing on a phone where columns stack. To move a card between lists or reorder one, switch Draggable on the card and Accept Drops on each list instead: the list reports Dropped, Dropped Value and Drop Index (example vis-kanban-drag-between-columns).
- Rebuilding a scroll view out of Drag — a Group with scrolling enabled handles momentum, wheel and touch for free.

## Examples

**Draggable chip that snaps back on release**

Drag is a visual container that makes its children draggable. Its `onStop` signal fires when the user releases; wiring it to the `snapToPositionX.do`/`snapToPositionY.do` signal inputs animates the chip back to the configured snap position (0,0 here) over the given duration. `positionX`/`positionY` report the live offset while dragging — here mapped into the label.

## Related nodes

[Group](./group.md), [Animation](../animation/animation.md), [Condition](../logic/condition.md), [States](../animation/states.md)


:::info Generated
This page is generated from `node-catalog-enriched.json`. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source enrichment instead.
:::
