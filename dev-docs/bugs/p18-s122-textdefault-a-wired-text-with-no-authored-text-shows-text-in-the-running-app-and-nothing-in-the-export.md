---
id: P18-S122-TEXTDEFAULT
title: A wired Text with no text of its own shows the word "Text" in the running app until a value arrives; the export shows nothing
status: open
severity: low
area: export / Text (a wired text before its first value)
found: P18 session 122, 2026-10-17, the "Hold the id" drive (S0)
evidence: dev-docs/tasks/phase-18-code-export-v2/s122-holdtheid/readings.json (S0: the runtime reads "Saying · Text · Removed · Text", both exports "Saying · Removed")
---

A Text whose text input is wired and whose own text was never typed shows the node's default, the word "Text", in the
running app until the wire first delivers a value (the source has none yet, and `undefined` is never sent). The exported
Text prints `String(value ?? '')`, so it shows nothing. Usually a flash before data arrives; where the value never
comes (a Function not yet run, a fetch that failed), the running app keeps showing "Text".

**Reach:** 222 of the 1,283 wired Texts in the shipped templates have no text of their own.

Which is right is arguably the export (a person never wants to see "Text"), but the two disagree. Either the export
prints the catalog default until the first value, or this is ruled a deliberate difference and the comparison drives
expect it. Small either way.
