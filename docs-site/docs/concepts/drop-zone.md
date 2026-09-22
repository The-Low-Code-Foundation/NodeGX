---
title: Drop Zone — somewhere to drop it
sidebar_position: 9
---

Switch **Accept Drops** on for any Group, Text, Image, Circle or Video, and a
[Drag Source](./drag-source.md) can be dropped on it. A kanban column is the typical example: the
list that holds the cards is the zone, and each card is a source.

The ports are in the **Drop Zone** group, under *Advanced CSS* in the property panel.

## What a person sees

- **Drag Over** turns true while something the zone takes is held over it. Wire it to a border or
  a background so the zone lights up.
- **With Make Room on** (the default), the zone slides its children apart to show where the drop
  will land. Moving along the zone moves the gap. Moving away closes it. The zone grows by the gap,
  so nothing spills out of it. The children are moved, not re-rendered, so nothing in your graph
  runs while someone hovers.
- Hovering over the spot the item already occupies opens no gap, because the faded original
  already stands there.

## Inputs

| Port | What it does |
|---|---|
| Accept Drops | Turns this on. It is off by default |
| Accept Kind | Comma-separated Drag Kinds this zone takes. Leave it blank to take anything |
| Make Room | Opens a gap where the drop will land. If it is off, the children stay still and only **Drop Index** is reported |
| Zone Name | What a screen reader hears this zone called while something is moved with the keyboard, such as "Thursday" |

## Outputs

| Port | When |
|---|---|
| Dropped | Something was dropped here. It fires after the two outputs below are up to date. Move your data here |
| Dropped Value | The source's **Drag Value** |
| Drop Index | Where it landed among this zone's children, counting from 0 |
| Drag Over | True while something this zone takes is held over it |

## Drop Index leaves the dropped item out

**Drop Index** counts the other children only, as if the dragged one had already been removed. So
it is the index to insert at after you have taken the item out of its old place. The same Function
handles a move between lists and a reorder within one:

```js
var card = Noodl.Objects[Inputs.id];
Noodl.Arrays[card.get('list')].remove(card);
card.set('list', Inputs.list);
Noodl.Arrays[Inputs.list].addAtIndex(card, Inputs.index);
```

## Zones inside zones

The innermost zone under the pointer that takes the item gets the drop, and the zones around it
get nothing. A zone whose **Accept Kind** does not match is skipped, so a zone around it that does
match can still take the drop.

**Drop Index** counts the zone's *direct* children. Put **Accept Drops** on the element whose
children are the cards, such as the list inside a column, not on the column around it. The
column's title would otherwise count as a slot.
