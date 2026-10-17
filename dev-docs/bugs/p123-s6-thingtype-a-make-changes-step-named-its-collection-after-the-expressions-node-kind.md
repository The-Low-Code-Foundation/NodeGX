---
id: P123-S6-THINGTYPE
title: A converted "Make changes to / Delete a thing" step named its collection after the expression's node kind — 111 of TrybeUP's 216 writes went to "Message" or "thing"
status: fixed
commit: (this session, P123 s6)
phase: P123
task: s6 (privacy rules and the writes census)
severity: high
area: Bubble importer (`dev-docs/tasks/phase-123-open-bubble/import/bubble2nodegx.mjs`, `thingTypeOf`)
found: P123 s6, 2026-10-17, the writes census over the live TrybeUP bundles (17 pages): the Security section of its IMPORT-REPORT.md listed 88 steps writing a "thing" and 23 writing a "Message"
evidence: dev-docs/tasks/phase-123-open-bubble/import/IMPORT.md §14 ("the type of the thing a step changes"); before the fix the converter read `p.thing_to_change?.next?.type`, which is the next MESSAGE's node kind (`Message`), never a data type, and fell back to the literal `thing`
regression: dev-docs/tasks/phase-123-open-bubble/import/check.mjs "P123-S6-THINGTYPE" (a synthetic page whose steps change "Parent group's item" in a row, in a typed Group, and "Result of step 1")
---

A Bubble *Make changes to a thing* or *Delete a thing* step rarely carries `thing_type`: the thing is an expression —
*Parent group's Booking*, *Result of step 1*, *Group listing's Listing*, *Current Workflow's thing*, *Search for
Bookings:first item*, *Parent group's Booking's renter*. The converter wrote a `SetDbModelProperties` whose
`collectionName` was `Message` (the kind of the expression's first operator node) or the placeholder `thing`, so the
Record node pointed at a collection that does not exist, and the s6 write census could not say which collection the
step writes — which is what the create / update / delete rules are derived from.

**Fix.** `thingTypeOf(expr, g)` infers the Bubble type: the row's `group_type` for *Parent group's item* in a repeating
group, the nearest typed ancestor Group's (`preIndex` now records `parentType`), a reusable's own *Type of content*,
the step that *Result of step N* names (its node's `collectionName`), an element's `group_type` or its data source's
type, the workflow's thing (a page custom event's `custom_event_data_type`, a trigger's `data_trigger_type`), a
parameter's declared type, a Search's type, and a field read's declared type (the schema, else the type the field key
spells: `booking_custom_booking`, `renter_user`). A list is not one thing; the item operators (`first item` …) take
the item's type. TrybeUP: 111 → 4 unresolved (all four read an element that is not in the export).
