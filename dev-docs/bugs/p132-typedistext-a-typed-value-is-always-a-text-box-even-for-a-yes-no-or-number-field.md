---
id: P132-TYPEDISTEXT
title: A Typed value is always a text box, even for a yes/no or a number field of the table
status: fixed
phase: P132
task: BWF-005
severity: medium
area: nodegx-studio / Backend tab (record steps' fields and Find's condition values, runValueField)
found: Richard's re-walk of P132 in Studio, 2026-11-03 ("it should be appropriate to the type it represents if known")
evidence: nodegx-studio editor/automations-drive.mjs "Typed: a yes/no field is a tick, a number field a number box"
launch: beta
commit: nodegx-studio d4c72c0
---

`runValueField` already draws a tick for a `boolean`, a number box for a `number` and a choice for an `enum`: a
catalog setting with a declared type got its control (Call an API's Method is a choice). A record step's fields
(`recordFieldsField`) and a Find's condition values (`recordCondsField`) passed no type at all, though Studio holds
the table's columns with their types (the project's `dbCollections[].columns`, or the backend's `/admin/schema`).

Fixed: the column's type is passed (`colControl`: Boolean → tick, Number → number, String → text). Also: the columns
were asked only from the backend's copy of the workflow, which a workflow the agent just wrote may not be in yet, so
its fields stayed a JSON box; they are now asked from the project's file first, and again when a form finds none.

Not done: a Date column is still a text box (no date control in `runValueField`); a function step's *What it sends the
function* names carry no type (the Request node's asks are read by name only).
