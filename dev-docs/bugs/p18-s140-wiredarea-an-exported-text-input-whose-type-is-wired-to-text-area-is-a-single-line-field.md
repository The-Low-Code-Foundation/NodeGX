---
id: P18-S140-WIREDAREA
title: An exported Text Input whose Type is wired (a component input) and handed "textArea" is still a one-line field
status: open
severity: low
area: export / Text Input (`packages/nodegx-export/src/emit/component.ts` `isTextArea`, `tagOf`)
found: P18 session 140, 2026-10-22, measuring P18-S120-TEXTAREA's reach after its fix (`s140-lists-drive/areas.cts`, `areas.out`)
evidence: nightbook's emitted `src/components/Field.tsx` draws `<input type={type} …>`; `src/pages/Coming.tsx` and `Envelope.tsx` place `<Field … type="textArea" />` three times
---

P18-S120-TEXTAREA is fixed for a Type authored on the field: the export draws a `<textarea>`. A Type that arrives on a
wire is decided only when the app runs. nightbook's `Field` takes it from a Component Input, and three placements on the
Coming and Envelope pages hand it `"textArea"` (the letter's "what are you thinking", "what would help" and "now"
boxes). The export draws `<input type={type}>`, a one-line field, so a letter typed there loses its line breaks, as
every Text Area did before the fix. landing-pages has one more field with a wired Type.

**Reach:** 2 fields with a wired Type in the 17 templates (nightbook's `Field`, 3 placements; landing-pages, 1).

**What a fix needs:** choose the element where the value is known. The field renders
`{type === 'textArea' ? <textarea …/> : <input type={type} …/>}` with the same attributes, and its ref is typed for both
(the Focus/Set code only calls `focus`, `blur` and reads `value`). Grade it with s140's Text Area desk and a variant
whose Type comes through a component input.
