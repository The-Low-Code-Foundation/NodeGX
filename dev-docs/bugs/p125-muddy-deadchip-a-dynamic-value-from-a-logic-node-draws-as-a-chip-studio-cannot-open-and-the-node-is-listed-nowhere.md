---
id: P125-MUDDY-DEADCHIP
title: A dynamic value fed by an ordinary logic node (a placed logic component, a States node) draws in Studio as a plain chip with no click, and the node is listed nowhere, so the person reads "Headline wording's Text" and cannot find what it is or where it lives
status: open
severity: medium
area: "nodegx-studio `editor/studio.html` `sourceChip` 2975–2982 (custom states, option sets, page data and composed expressions get a kind; everything else falls through to a plain `chip` span with no onclick), `isHelperNode` 3488, the element tree (visual nodes only)"
found: Richard's Muddy Paws Shelter run in Claude Desktop, 2026-10-27 (his point 3, the screenshot: the chip under the headline's Text; the video at 22:30, "I'm not finding it yet")
evidence: dev-docs/reviews/the-three-surfaces-audit-2026-10-27.md §1.3 — READ: the fall-through branch of `sourceChip` builds a span with no handler; the source is reachable only as an entry in the bolt menu's "logic" group, never as a thing to open; the full NodeGX editor shows the same node and its wires (the video, 27:00)
owner: none
task: STU-081 (proposed in the audit §4): a chip outside Studio's vocabulary opens a card naming the node and its type, saying Studio does not draw it, with the NodeGX editor's download and "ask the agent"; a "Logic on this page" list under the element tree
---

Not a wrong graph: every node is valid NodeGX and the full editor draws it. The defect is that Studio shows the value
and hides the thing that makes it, with no word about where it is.
