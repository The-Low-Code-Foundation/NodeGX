---
id: P18-S120-TEXTAREA
title: An exported Text Input of type Text Area is a single-line field; the running app's is a multi-line box
status: fixed
severity: medium
area: export / Text Input
found: P18 session 120, 2026-10-16, reading the Site Builder's ContactForm as the export writes it (EXP-011 §87)
evidence: packages/noodl-viewer-react/src/components/controls/TextInput/TextInput.tsx:223-247 (type 'textArea' renders a <textarea>); the export's ContactForm.tsx prints `<input className={styles.field} type="textArea" …>`
fixed: P18 session 140, 2026-10-22, for an authored Type; a wired Type is P18-S140-WIREDAREA
commit: 9e3cc0e26
regression: packages/nodegx-export/tests/a-text-area-keeps-its-lines.test.ts
---

A Text Input whose Type is Text Area is drawn by the running app as a `<textarea>`: several lines, Enter makes a new
line. The export prints `<input type="textArea">`. A browser does not know that type and draws a one-line text field,
so a contact form's "Your message" box takes one line and Enter does nothing useful.

**Reach:** 33 Text Inputs with Type Text Area in the shipped templates (`templates/` and the two `*.content.json`
templates, materialized), among them the Site Builder's and landing-pages' contact forms.

**What a fix needs:** the emitter draws a `<textarea>` for that type, with the same value, change handler, mount
announcement (EXP-011 §85) and class as the input; and a row that reads the runtime's own control (s118's
`runtime-field-arm.js`) for what Enter and the value do.

**Fixed (P18 session 140, driving rocket-school's Lists page, EXP-021 AC4).** On HEAD the exported Lists editor saved a
three-line list as ONE question: Chrome turns each line break typed into a one-line field into a space (`s140-lists-drive/
readings.json`, export-head L3). The emitter now draws a `<textarea>` for an authored Type Text Area (`component.ts`
`isTextArea`, in `tagOf`), prints no `type`, types the field's ref `HTMLTextAreaElement`, and `base.css` turns resizing off
as the control does. Graded on the Field Desk against the runtime's own nodes (8 / 8, 4 mutants killed) and driven: the
fixed export's store equals the runtime's at every step. Reach measured: 25 Text Area fields in the 17 templates (the
"33" above was not re-derivable), 21 now `<textarea>`; the 4 left are a Type WIRED from a component input (nightbook's
Field ×3, landing-pages ×1), filed as P18-S140-WIREDAREA. The editor's two content templates hold 4 more, all authored.

