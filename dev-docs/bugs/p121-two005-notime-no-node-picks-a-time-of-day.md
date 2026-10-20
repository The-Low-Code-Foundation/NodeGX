---
id: P121-TWO005-NOTIME
title: No node picks a time of day, so an event's start time is a 33-item Dropdown
status: open
severity: low
area: viewer / Text Input (`type` enum in `packages/noodl-viewer-react/src/nodes/controls/text-input.ts`); the library's Date Picker (`packages/noodl-mcp/tests/datePicker.ts`)
found: P121 TWO-005 s16, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-005-THE-COMMUNITY-APP.md §11
kit: core
---

The community template's events carry a day and a time ("Saturday 18 October, 9:00" in the approved picture). The
day has a part: the library's Date Picker, the one the todo templates ship, a real `<input type="date">` with a
calendar on a computer and the phone's own picker on a phone. The time has nothing:

- Text Input's `type` takes `text`, `textArea`, `email`, `number`, `password`, `url` (the node catalogue, 2026-10-15).
  No `time`, no `date`, no `datetime-local`, so the browser's own time picker can't be asked for.
- The Date Picker reads and writes a day (`YYYY-MM-DD`) only.

Measured building TWO-005 slice 4b: the time is a Dropdown of every half hour from 6:00 to 22:00 (33 options, Value
`HH:MM`), and the page joins the day and the time into one instant in the phone's own zone. It works, and it's a long
list on a phone; a quarter-hour list would be 65. A builder making a booking app, a class timetable or a reminder meets
the same gap, and an agent reaching for `type: 'time'` is refused by the door.

Fix, proposed (small): `time` (and `date`, `datetime-local`) in Text Input's `type` enum, passed to the `<input>` as
it is; its Text output is then the browser's `HH:MM`. The node spec, both catalogues and the docs carry the new
values. Larger, later: a Time Picker beside the library's Date Picker, or a `withTime` setting on it.
