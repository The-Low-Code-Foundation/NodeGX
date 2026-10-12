# The Text at 10,000 on the runtime — 2026-10-05 (s43), seed 20731, 806 s

**Not conforming yet: 1 divergence, 47 mutant survivors** (780 / 833 killed, the rest declared). s44 starts here.

> **Settled in s44 (NSP-016 §7.9).** The divergence is row C79, now modelled: Text v2 keeps the element's own `pointer-events`
> beside React's last render, and a frame end renders only when an input asked for it. The 47 survivors were the families below;
> each now has scenarios the runtime also plays (203 in all), and five more are declared equivalent. The readings are in §7.9.

## The divergence → row C79

Shrunk to three steps: params `{"opacity": 0}`, steps `[{"set": "pointerEventsEnabled", "value": []}, {"act": "press"}, "settle"]`.
The runtime fires Pointer Down and the spec says the press meets nothing. Isolated with the side-by-side probe:

| case | interpreter | runtime |
|---|---|---|
| Opacity 0 as a param, press | nothing | nothing |
| Opacity 0 as a param, Pointer Events Enabled `[]`, press | nothing | **Pointer Down** |
| Opacity 0 as a param, Pointer Events Enabled `true`, press | nothing | **Pointer Down** |
| Opacity 0 written after the first frame, Enabled `true`, press | nothing | nothing |
| Enabled `true`, then Opacity 0, press | nothing | nothing |
| Opacity 0 written, Mode `inherit`, press | nothing | nothing |

The cause is in the runtime and a browser does the same: `setStyle` / `removeStyle` write Pointer Events straight onto the DOM, and
React re-writes a style key only when its own rendered value changes ([P107-C79](../../bugs/p107-c79-an-invisible-element-catches-clicks-after-a-pointer-events-write.md)).

**To model it** the spec needs the element's own `pointer-events` (`domPe`) beside what React last rendered (`renderedPe` = the
component's computed value: `none` at Opacity exactly 0, else the style's). A DOM patch sets `domPe`. A RENDER writes the computed value
only when it differs from `renderedPe`, and a new element takes it whole. The open question is WHEN a render happens. An act's paint
always renders. A frame end renders only when something asked for it (an input prop, Mounted, a zero↔non-zero opacity change,
position / margins / transform …). In rare sequences (a patch, a render that moves `renderedPe`, then a patch back) the answer depends
on it. Measure first: list which of the Text's inputs force an update (react-component-node.ts `setStyle`'s `forceUpdate` cases and the
`inputProps` setters), then decide whether to track a `renderPending` flag or to scope the scenarios.

## The survivors (47; `reducer kind branch ↔ swapped`)

Families, read before writing scenarios: paints that MOUNT at an act (`didMount` in a press / touch / release / hover branch) swapped
with acts that do not, the Tag-replacing paint (`elem`, `shownTag`) handed to a click / blur / release that does not replace, the
`elementFocused` takes of a press (only readable by hiding the element and pressing Space), the keyboard cancels with and without the
keyboard taken, and the frame end's unmount with and without a chain check. Each wants a scenario the runtime also plays, then a re-run
at 10,000 — the s40 / s42 shape.

```
afterInputs swap-branch on branch {"set":["elementFocused","onPage"],"emit":["willUnmount"],} ↔ {"set":["attrsOn","chain","elementFocused","onPage"],"emit":["willUnmount"],}
person.click swap-branch on branch {"set":[],"emit":["pointerDown","pointerUp","onClick"],} ↔ {"set":["elem","elementFocused","shownTag"],"emit":["pointerDown","pointerUp","onClick"],}
person.blur swap-branch on branch {"set":[],"emit":[],} ↔ {"set":["elem","elementFocused","shownTag"],"emit":[],}
person.release swap-branch on branch {"set":[],"emit":[],} ↔ {"set":["elem","elementFocused","shownTag"],"emit":[],}
person.key swap-branch on branch {"set":["inZone","input","isLifted","phase"],"emit":["dragCancelled"],} ↔ {"set":["elementFocused","inZone","input","isLifted","phase"],"emit":["dragCancelled"],}
person.key swap-branch on branch {"set":["inZone","input","isDropTarget","isLifted","phase"],"emit":["pickedUp"],} ↔ {"set":["elementFocused","inZone","input","isDropTarget","isLifted","phase"],"emit":["pickedUp"],}
person.click swap-branch on branch {"set":["inZone","input","phase"],"emit":["pointerDown","pointerUp","onClick"],} ↔ {"set":["elem","elementFocused","shownTag"],"emit":["pointerDown","pointerUp","onClick"],}
person.press swap-branch on branch {"set":["elem","elementFocused","onPage","shownTag"],"emit":["didMount","pointerDown"],} ↔ {"set":["elem","elementFocused","input","onPage","phase","shownTag"],"emit":["didMount","pointerDown"],}
person.touch swap-branch on branch {"set":["elem","elementFocused","onPage","shownTag"],"emit":["didMount","pointerDown"],} ↔ {"set":["elem","elementFocused","input","onPage","phase","shownTag"],"emit":["didMount","pointerDown"],}
afterInputs swap-branch on branch {"set":["attrsOn","chain","elementFocused","onPage"],"emit":["willUnmount"],} ↔ {"set":["elementFocused","onPage"],"emit":["willUnmount"],}
person.release swap-branch on branch {"set":["elem","elementFocused","onPage","shownTag"],"emit":["didMount"],} ↔ {"set":[],"emit":[],}
person.release swap-branch on branch {"set":["elem","elementFocused","onPage","shownTag"],"emit":["didMount"],} ↔ {"set":["elem","elementFocused","shownTag"],"emit":[],}
person.press drop-set on branch {"set":["elementFocused"],"emit":["pointerDown"],}
person.press swap-branch on branch {"set":["elementFocused"],"emit":["pointerDown"],} ↔ {"set":[],"emit":["pointerDown"],}
person.press swap-branch on branch {"set":["elementFocused"],"emit":["pointerDown"],} ↔ {"set":["input","phase"],"emit":["pointerDown"],}
person.hover swap-branch on branch {"set":["elem","elementFocused","onPage","shownTag"],"emit":["didMount"],} ↔ {"set":[],"emit":[],}
person.touch swap-branch on branch {"set":["elem","elementFocused","input","onPage","phase","shownTag"],"emit":["didMount","pointerDown"],} ↔ {"set":["elem","elementFocused","onPage","shownTag"],"emit":["didMount","pointerDown"],}
person.key swap-branch on branch {"set":["elementFocused","inZone","input","isLifted","phase"],"emit":["dragCancelled"],} ↔ {"set":["inZone","input","isLifted","phase"],"emit":["dragCancelled"],}
person.key swap-branch on branch {"set":["elementFocused","inZone","input","isLifted","phase"],"emit":["dragCancelled"],} ↔ {"set":["inZone","input","isDropTarget","isLifted","phase"],"emit":["dragCancelled"],}
afterInputs drop-set on branch {"set":["attrsOn","chain","elem","elementFocused","shownTag"],"emit":[],}
afterInputs swap-branch on branch {"set":["attrsOn","chain","elem","elementFocused","shownTag"],"emit":[],} ↔ {"set":[],"emit":[],}
afterInputs swap-branch on branch {"set":["attrsOn","chain","elem","elementFocused","shownTag"],"emit":[],} ↔ {"set":["attrsOn","chain"],"emit":[],}
afterInputs swap-branch on branch {"set":["attrsOn","chain","elem","elementFocused","shownTag"],"emit":[],} ↔ {"set":["elem","elementFocused","shownTag"],"emit":[],}
afterInputs swap-branch on branch {"set":["attrsOn","chain","elem","elementFocused","shownTag"],"emit":[],} ↔ {"set":["chain"],"emit":[],}
person.press drop-set on branch {"set":["elem","elementFocused","shownTag"],"emit":[],}
person.press swap-branch on branch {"set":["elem","elementFocused","shownTag"],"emit":[],} ↔ {"set":[],"emit":[],}
person.leave drop-set on branch {"set":["elem","elementFocused","shownTag"],"emit":["hoverEnd"],}
person.leave swap-branch on branch {"set":["elem","elementFocused","shownTag"],"emit":["hoverEnd"],} ↔ {"set":[],"emit":["hoverEnd"],}
person.blur drop-set on branch {"set":["elem","elementFocused","shownTag"],"emit":[],}
person.blur swap-branch on branch {"set":["elem","elementFocused","shownTag"],"emit":[],} ↔ {"set":[],"emit":[],}
person.blur swap-branch on branch {"set":["elem","elementFocused","shownTag"],"emit":[],} ↔ {"set":["elementFocused"],"emit":[],}
person.click drop-set on branch {"set":["elem","elementFocused","shownTag"],"emit":["pointerDown","pointerUp","onClick"],}
person.click swap-branch on branch {"set":["elem","elementFocused","shownTag"],"emit":["pointerDown","pointerUp","onClick"],} ↔ {"set":[],"emit":["pointerDown","pointerUp","onClick"],}
person.click swap-branch on branch {"set":["elem","elementFocused","shownTag"],"emit":["pointerDown","pointerUp","onClick"],} ↔ {"set":["inZone","input","phase"],"emit":["pointerDown","pointerUp","onClick"],}
person.click swap-branch on branch {"set":["elem","elementFocused","shownTag"],"emit":["pointerDown","pointerUp","onClick"],} ↔ {"set":["elementFocused","inZone","input","phase"],"emit":["pointerDown","pointerUp","onClick"],}
person.click swap-branch on branch {"set":["elem","elementFocused","shownTag"],"emit":["pointerDown","pointerUp","onClick"],} ↔ {"set":["elementFocused"],"emit":["pointerDown","pointerUp","onClick"],}
person.key swap-branch on branch {"set":["elementFocused","inZone","input","isDropTarget","isLifted","phase"],"emit":["pickedUp"],} ↔ {"set":["inZone","input","isDropTarget","isLifted","phase"],"emit":["pickedUp"],}
person.press swap-branch on branch {"set":["elem","elementFocused","onPage","shownTag"],"emit":["didMount"],} ↔ {"set":[],"emit":[],}
person.press swap-branch on branch {"set":["elem","elementFocused","onPage","shownTag"],"emit":["didMount"],} ↔ {"set":["elem","elementFocused","shownTag"],"emit":[],}
person.lift drop-set on branch {"set":["elem","elementFocused","shownTag"],"emit":[],}
person.lift swap-branch on branch {"set":["elem","elementFocused","shownTag"],"emit":[],} ↔ {"set":[],"emit":[],}
person.release drop-set on branch {"set":["elem","elementFocused","shownTag"],"emit":["pointerUp"],}
person.release swap-branch on branch {"set":["elem","elementFocused","shownTag"],"emit":["pointerUp"],} ↔ {"set":[],"emit":["pointerUp"],}
person.release swap-branch on branch {"set":["elem","elementFocused","shownTag"],"emit":["pointerUp"],} ↔ {"set":["inZone","input","phase"],"emit":["pointerUp"],}
person.touch swap-branch on branch {"set":["elem","elementFocused","onPage","shownTag"],"emit":["didMount"],} ↔ {"set":[],"emit":[],}
person.release drop-set on branch {"set":["elem","elementFocused","shownTag"],"emit":[],}
person.release swap-branch on branch {"set":["elem","elementFocused","shownTag"],"emit":[],} ↔ {"set":[],"emit":[],}
```
