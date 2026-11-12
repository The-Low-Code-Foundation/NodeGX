---
id: P123-STU-ROWEVENT
title: Studio never offered a repeating group's row events, because the kit draws a For Each's item outputs only once they are wired
status: fixed
commit: nodegx-studio a3a02fd
severity: medium
area: nodegx-studio `editor/studio.html` portsOf (For Each outputs come from the kit's spec, whose `itemOutputSignal-*` / `itemOutput-*` are `onWire`)
found: STU-090 follow-up (a click on a row that opens its record), 2026-10-30
evidence: a Swapshop copy with a row component whose Component Outputs says Click: Workflow's New menu listed Home, Content, Heading, Button and no repeating group; `__ob.ports(<For Each>)` had no item outputs
---

A For Each passes on what its row component says (`itemOutputSignal-<name>`, `itemOutput-<name>`), with the clicked
row's record id on `itemActionItemId`. The kit's spec draws those ports only once something is wired to them
(`onWire`, `needs: wiredOutputs`), which suits an editor that draws a port as you wire it. Studio's event list asks
"which signal outputs does this element have", so an unwired one was invisible, and it could not be wired from Studio
in the first place. Also, Studio's repeating group made rows with no output at all.

Fixed (Studio):
- A row made by *Repeating group* has a Component Outputs `Click`, wired from the row's own click.
- `portsOf` lists a For Each's row outputs from its template, and names `itemActionItemId` "clicked row (its id)".
- The event reads "When Repeating group of Listing has a row clicked" and is among the usual events.

Driven on a Swapshop copy: a click on the "Lamp" row sent Lamp's objectId into a *Write to the log* step, then the
event. check:editor gained a section that does the same through Studio's UI.
