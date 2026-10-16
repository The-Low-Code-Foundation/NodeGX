---
id: P18-S116-FIELDMOUNT
title: An exported text input's Value reaches its wires only when someone types, never at mount
status: open
severity: medium
area: export / Text Input
found: P18 session 116, 2026-10-16, driving P18-S115-QUERYPARAMS (s116-queryparams-drive, step S0)
evidence: dev-docs/tasks/phase-18-code-export-v2/s116-queryparams-drive/readings.json (S0); runtime noodl-viewer-react TextInput.tsx `componentDidMount` → `setText(startValue)` → `onTextChanged(outwardValueForFieldType(type, text))`; nodegx-export src/analyze/plan.ts pass 3 (the write-through is the input's `onChange` and nothing else)
---

A page has a City box whose Value is wired into a Variable `city`, and a list filtered by `city equal to <city>`.
In the running app the box publishes its Value when it mounts: `""` for an empty Text field, `null` for an empty
Number field, the start value when it has one (`componentDidMount` calls `setText(startValue)`, which sends
`onTextChanged`). So `city` holds `""` from the first frame, the query asks for `city = ""`, and the list is empty
until someone types. In the exported app `city` holds nothing until the first keystroke (`onChange` is the only
write), the condition is dropped, and the list shows every row.

Measured in the drive: the runtime made two queries at load (`vip` only, then `city = ""`) and settled on no rows;
the fixed export made the first and showed all eight vips. Every later step agreed.

It is not only Variables: every sink of a text input's Value sees the mount value in the runtime. On this machine
792 wires leave `onTextChanged` in 46 projects (Function inputs 304, Set Record properties 146, New Record 64, Cloud
Function 30, Sign Up / Log In fields), and a dozen export fixtures carry one.

The fix: the field's mount publication in the export, as the runtime computes it (`outwardValueForFieldType(type,
startValue ?? '')`), delivered to each translated sink of the Value at the host's mount; GAM-009's remount rule
(a field coming back to the value it last announced announces nothing) decides whether a remount repeats it.
