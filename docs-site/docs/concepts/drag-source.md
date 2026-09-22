---
title: Drag Source — letting a person pick something up
sidebar_position: 8
---

Any Group, Text, Image, Circle or Video can be picked up and dropped on something else. Switch
**Draggable** on, and give it a **Drag Value** — usually the id of the item it shows. The thing it
is dropped on is a [Drop Zone](./drop-zone.md).

The ports are in the **Drag Source** group, under *Advanced CSS* in the property panel. Everything
except the checkbox stays hidden until it is on.

## What a person sees

- **With a mouse,** the press picks up as soon as the pointer moves a few pixels. A plain click is
  still a click.
- **On touch,** a ring fills beside the finger while they hold. When it is full (half a second by
  default), the element lifts. If the finger moves first, the page scrolls instead, and if they let
  go early, nothing is picked up.
- **Once lifted,** a see-through copy follows the pointer. The element itself stays where it was,
  faded, until your graph moves it. If it is let go over nothing, or Escape is pressed, it is
  exactly where it was.
- **From the keyboard,** Tab to it and press Space to pick it up. The arrow keys move it: up and
  down within a list, left and right between lists. Enter drops it and Escape puts it back. A
  screen reader hears each step.

## Inputs

| Port | What it does |
|---|---|
| Draggable | Turns this on. Off by default, and a node with it off behaves exactly as it always did |
| Drag Value | What it carries. The zone it lands on reports this as **Dropped Value** |
| Drag Kind | An optional name, such as `card` or `photo`. A zone with an **Accept Kind** only takes sources of that kind |
| Hold To Drag | *On touch* (the default) holds on touch and not with a mouse. *Always* and *Never* do what they say |
| Hold Time | How long the hold takes, in seconds. The default is 0.5 |

## Outputs

| Port | When |
|---|---|
| Picked Up | The moment it lifts |
| Landed | It was dropped on a zone that took it. This fires after the zone's **Dropped** |
| Cancelled | It was let go over nothing that takes it, or Escape put it back |
| Is Lifted | True while it is being dragged. Useful for dimming the rest of a screen |

## The engine never moves your data

Dropping fires signals, and your graph decides what happens. That is why a failed save or a
refused move leaves nothing half done. See the
[kanban example](../nodes/visual/group.md): one Function takes the card out of the list it was in
and puts it into the one it landed on.

:::note Not the Drag node
The [Drag](../nodes/visual/drag.md) node is a free-movement gesture for sliders, swipe panels and
drawers. It moves the element and reports offsets, but it never learns what is under the pointer.
To move something from one list to another, use Draggable and Accept Drops.
:::
