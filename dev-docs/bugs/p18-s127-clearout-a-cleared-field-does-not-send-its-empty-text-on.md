---
id: P18-S127-CLEAROUT
title: A field's Clear empties the exported field and does not send the empty text on to what its text feeds
status: open
severity: low
area: export / a Text Input's Clear on a field whose text is written through (`src/analyze/plan.ts` `compileControlAction`)
found: P18 session 127, 2026-10-19, the Signal Desk's first draft (the Banner's field written to a page Variable)
evidence: dev-docs/tasks/phase-18-code-export-v2/s127-insignal/EXPECTED.md
---

A Text Input's text goes on to whatever reads it: a Variable through `onTextChanged`, for example. Its Clear empties it, and
in the runtime the empty text goes on too (`text-input` `clear()` calls the field's own `setText('')`, which flags
`onTextChanged`; unmounted, it flags it by hand). The export's Clear writes the field's own state (`setNoteBox('')`) and
nothing else: the write-through to the Variable runs only from the field's `onChange`, a person typing.

Measured on the Signal Desk's first draft, the Banner's field wired to a page Variable `note`: after Wipe (a Clear sent in
through a signal input) the runtime read `note` empty and the export kept "note Ann" (4 readings of 9). The Clear is the
same compile from a click in the field's own component (`compileControlAction`): read in the code, not run.

Reach: every field whose Clear is wired and whose text is written to a Variable (todo-list's three "new" fields, its
history note, bot-garden's Form name and rocket-school's New player form name are cleared this way; whether each writes a
Variable was not counted). Fix, small: the Clear action also writes the empty value to each write-through Variable of that
field (the `store-set`s its `changeHandlers` hold with `input-text`), after the state write.
