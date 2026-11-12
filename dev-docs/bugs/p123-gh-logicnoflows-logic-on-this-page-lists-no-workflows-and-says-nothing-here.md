---
id: P123-GH-LOGICNOFLOWS
title: Design's "Logic on this page" lists no workflows: a page with several says "Nothing here that Studio does not edit"
status: fixed
commit: nodegx-studio bd4fff1
severity: medium
area: "nodegx-studio / Design left panel (editor/studio.html renderLogic)"
found: STU-091 Greenhouse, Richard's second play test in NodeGX Studio, 2026-10-31
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes, second round (2026-10-31)
phase: P123
---

Richard (2026-10-31): *"I still don't see the workflows on the design page on the left menu or a link to the workflow page, it just says 'nothing here that studio can't edit'"*. His Greenhouse note 10 asked for the list to explain the wiring OR jump to the page's workflows; STU-097 built the part card, and the list still held only the parts Studio does not edit.

Fix: the page's workflows first (name, what starts it, step count), each opening its card in the Workflow tab with Back to Design, *Open in Workflow →*, then the parts. Gate: `check:editor` "lists the page's workflows first".

## Fixed (s35, 2026-10-31; landed 2026-11-01)

Logic on this page lists the page's workflows first, each opening in Workflow (*Open in Workflow →*). Gate: `check:editor` 253/253. Every Studio gate green on 2026-11-01, run one at a time.
