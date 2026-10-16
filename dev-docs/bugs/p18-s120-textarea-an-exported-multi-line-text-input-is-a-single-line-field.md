---
id: P18-S120-TEXTAREA
title: An exported Text Input of type Text Area is a single-line field; the running app's is a multi-line box
status: open
severity: medium
area: export / Text Input
found: P18 session 120, 2026-10-16, reading the Site Builder's ContactForm as the export writes it (EXP-011 §87)
evidence: packages/noodl-viewer-react/src/components/controls/TextInput/TextInput.tsx:223-247 (type 'textArea' renders a <textarea>); the export's ContactForm.tsx prints `<input className={styles.field} type="textArea" …>`
---

A Text Input whose Type is Text Area is drawn by the running app as a `<textarea>`: several lines, Enter makes a new
line. The export prints `<input type="textArea">`. A browser does not know that type and draws a one-line text field,
so a contact form's "Your message" box takes one line and Enter does nothing useful.

**Reach:** 33 Text Inputs with Type Text Area in the shipped templates (`templates/` and the two `*.content.json`
templates, materialized), among them the Site Builder's and landing-pages' contact forms.

**What a fix needs:** the emitter draws a `<textarea>` for that type, with the same value, change handler, mount
announcement (EXP-011 §85) and class as the input; and a row that reads the runtime's own control (s118's
`runtime-field-arm.js`) for what Enter and the value do.
