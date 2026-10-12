---
id: P107-S89-XMLEXAMPLE
title: The "Read an XML response" example draws a For Each that nothing feeds — no wire reaches its Items, and its row's label reads nothing
status: open
severity: low
area: catalog examples / `docs/node-catalog/examples/bubble-read-an-xml-response.json`
found: P107 NSP-021 s89, 2026-10-12
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-021-THE-SECOND-EDITOR.md §6.3
---

s89 moved the example's row out of the For Each into a template (`/Tool Row`, R23) and kept it as it was: one Text with
no wire. No connection reaches the For Each's `items`, so the list draws nothing, though the description builds up to
Always Array being "the setting worth understanding" for exactly that list. The fix is the example's: wire the parsed
`tool` array into Items and a field of each tool (its `@id`, or its name's `#text`, as the description warns) into the
row through Component Inputs.
