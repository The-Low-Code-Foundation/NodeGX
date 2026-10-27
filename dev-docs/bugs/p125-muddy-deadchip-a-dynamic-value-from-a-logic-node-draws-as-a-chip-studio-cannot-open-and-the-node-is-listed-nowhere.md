---
id: P125-MUDDY-DEADCHIP
title: A dynamic value fed by an ordinary logic node (a placed logic component, a States node) draws in Studio as a plain chip with no click, and the node is listed nowhere, so the person reads "Headline wording's Text" and cannot find what it is or where it lives
status: fixed
commit: nodegx-studio 53ef270, NodeGX f093b6068
severity: medium
area: "nodegx-studio `editor/studio.html` `sourceChip` 2975–2982 (custom states, option sets, page data and composed expressions get a kind; everything else falls through to a plain `chip` span with no onclick), `isHelperNode` 3488, the element tree (visual nodes only)"
found: Richard's Muddy Paws Shelter run in Claude Desktop, 2026-10-27 (his point 3, the screenshot: the chip under the headline's Text; the video at 22:30, "I'm not finding it yet")
evidence: dev-docs/reviews/the-three-surfaces-audit-2026-10-27.md §1.3 — READ: the fall-through branch of `sourceChip` builds a span with no handler; the source is reachable only as an entry in the bolt menu's "logic" group, never as a thing to open; the full NodeGX editor shows the same node and its wires (the video, 27:00)
owner: "Beta sweep s22 (2026-10-27), as P128 S6, on Richard's yes"
task: STU-081 (proposed in the audit §4): a chip outside Studio's vocabulary opens a card naming the node and its type, saying Studio does not draw it, with the NodeGX editor's download and "ask the agent"; a "Logic on this page" list under the element tree
regression: ../nodegx-studio/editor/check.mjs "P125-MUDDY-DEADCHIP: a text fed by a placed logic component is a chip that names it and can be pressed"
launch: beta
---

Not a wrong graph: every node is valid NodeGX and the full editor draws it. The defect is that Studio shows the value
and hides the thing that makes it, with no word about where it is.

## 2026-10-27, Beta sweep s22 (as P128 S6, on Richard's yes): fixed

The chip names the part and opens its card: what it is, *"Studio doesn't edit this. Look at the wiring underneath, or
open it in the NodeGX editor."*, **Wiring**, **Get the editor**, **Ask the agent**. "Logic on this page" under the
element tree lists every node Studio does not edit, each opening the same card. **Wiring** draws the page whole, read
only, in the NodeGX canvas's look, with the part selected; a placed component opens into its own wiring (STU-084,
nodegx-studio `docs/SCOPE.md`). Studio's vocabulary is one file (`editor/vocabulary.json`), pinned into `@nodegx/mcp`
with a drift test; "Ask the agent" reaches `what_changed_since` (and the conversation, where the host takes a message).

- **Red at HEAD:** `check:editor`'s new section on the todo copy with the Muddy shape built in (a Text fed by a placed
  `Logic/Greeting` holding a `States` node): "Logic on this page" `[]`, no chip, the gate stops.
- **Green after:** `check:editor` 213/213 (9 new), `check:hosted` 27/27, `check:app` 64/64, `check:data` 80/80,
  `check:timeline` 53/53; `wiring-check` 6636/6636 over 968 template components.
- **On a copy of Muddy Paws Shelter** (the project itself is no longer on disk; a copy from a P128 session's scratchpad,
  read 13:01): the headline's chip opens the card; Wiring opens Home with `wording` selected (15 cards, 5 wires); into
  Wording: `langvar-3`, `wordStates` (States), `wordOut`; Esc back, Esc closed; no project file changed (hash of every
  file before and after a drag, Delete, Backspace, ⌘Z); Ask wrote `.nodegx-questions.json`.

**Not yet where Richard sees it:** Claude Desktop draws the panel from the Studio its `.mcpb` bundles, and the agent's
`what_changed_since` is in `@nodegx/mcp`'s dist (rebuilt here, not published): both reach him with the next `.mcpb`.
