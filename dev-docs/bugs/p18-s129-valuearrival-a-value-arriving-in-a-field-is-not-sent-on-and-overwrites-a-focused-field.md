---
id: P18-S129-VALUEARRIVAL
title: A Value arriving in a mounted text field is sent on to what the field's text feeds in the running app and not in the export, and the export writes it over a focused field
status: open
severity: medium
area: export / a text input's sync effect (`src/emit/component.ts`, "Graph-path sync (text input) … Changed never fires"; `src/analyze/plan.ts` the sync-effects pass)
found: P18 session 129, 2026-10-19, the Field Desk's control (`tests/helpers/field-desk.ts`, every wire into a Set removed)
evidence: dev-docs/tasks/phase-18-code-export-v2/s129-fieldset/EXPECTED.md (the third thing the first drafts read); `probe.ts` there with the no-Set edit
---

A text field whose Value is wired, with Run On Value Change ticked (the default), takes each value as it arrives: the
`startValue` setter calls `setText(text)` (`text-input.ts`), and on a mounted field that is not focused the component's
`setText` writes its state and calls `onTextChanged`, so every sink of the Value gets the text and Value Changed fires.
A focused field takes nothing (`setText` returns while `hasFocus()`); its `_internal.text` still holds the value.

The export's sync effect writes the field's row only, and whether or not the field has focus:

```
useEffect(() => {
  if (draftValue === undefined) return;
  setName(draftValue === null ? '' : String(draftValue));
}, [draftValue]);
```

Measured on the Field Desk with no wire into any Set (the name field's Value wired from the Variable `draft`, its text
written to `typed`), steps Fill (`draft` = Bob), Fill Eve, Focus, Fill: the runtime reads typed Bob, Eve, Eve, Eve and the
field Bob, Eve, Eve, **Eve** (focused, the Bob absorbed); the export reads typed `''` throughout and the field Bob, Eve,
Eve, **Bob**.

Reach: every rendered field with a ticked wired Value and a change chain (the mount announcement, P18-S116-FIELDMOUNT,
already runs the chain once at mount; this is every later arrival). Not counted on the templates. Where the field writes
its text back to the Variable its Value reads (rocket-school's Lists Editor and Moon Adopt) the write-through is the same
value, so only a Value Changed chain or a different sink shows it.

Fix, small to medium: the sync effect runs the field's change chain with the arrived text after the write (the
`fieldWriteCode` printer from P18-S128-FIELDSET does exactly that for a Set), skips both while the field's element is
`document.activeElement` (the field needs a ref), and must not run the chain at mount twice (the announcement already
does). Grade on the Field Desk's control.
