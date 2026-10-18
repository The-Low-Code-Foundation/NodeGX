---
id: P121-TWO005-DROPDOWNSTALE
title: A Dropdown whose Items are wired reports "Option 1" as its Value until someone picks, while the screen shows the placeholder
status: open
severity: medium
area: viewer / Dropdown (`packages/noodl-viewer-react/src/nodes/controls/options.ts`, `initialize`: `this.props.value = this._internal.value = DEFAULT_ITEMS[0].Value`)
found: P121 TWO-005 s15, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-005-THE-COMMUNITY-APP.md §10.5
kit: core
---

The community template's Report page offers the reasons in a Dropdown whose Items come from a script (a post's four
reasons, a comment's three) and whose placeholder says "Choose why". Nobody has picked yet, so the page should hold
the report back with "Choose why."

Measured 2026-10-15 (`packages/nodegx-backend/tests/two-005-moderate-drive.test.ts`, its second run): the screen
showed "Choose why", the person pressed Send, and the page sent a report. The cloud function refused it ("Say why: a
child shown without a parent’s yes, unkind, spam or something else."), so the reason it got was a string that wasn't
one of the four. The Dropdown's `initialize` seeds its value with its DEFAULT items' first Value, `"Option 1"`, so a
freshly placed node shows a real option (Richard, 2026-09-04). When a wired Items list replaces the default items,
that seeded value stays: it matches none of the new options, so the `<select>` shows the placeholder, and the Value
output still says "Option 1". The graph and the screen disagree, which the code's own comment says the seed exists to
prevent.

A builder's form that checks "was anything chosen?" sees "Option 1" and sends it. Here the backend caught it; a form
that saves the value as it comes would store "Option 1".

The template now sets the Dropdown's Value to `''` (an authored value goes through the port's `set`); the drive
passes with it.

Fix, proposed (small): when Items arrive and the current value matches none of them, and the value is still the
seeded default (nobody authored or picked it), drop it to `undefined` and flag the Value output, so the output says
what the screen does.
