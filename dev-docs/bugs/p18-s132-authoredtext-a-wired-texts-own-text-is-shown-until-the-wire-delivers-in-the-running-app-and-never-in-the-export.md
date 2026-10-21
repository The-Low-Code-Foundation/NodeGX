---
id: P18-S132-AUTHOREDTEXT
title: A wired Text's own text is shown until the wire delivers in the running app, and never in the export
status: open
severity: low
area: export / Text (a wired text with an authored text, before its first value)
found: P18 session 132, 2026-10-21, the Host Desk (EXP-019 slice 1), the runtime arm against the React arm at load
evidence: packages/nodegx-export/tests/the-script-travels-as-written.test.ts (A2, the load row pinned by this id); dev-docs/tasks/phase-18-code-export-v2/s132-hostgates/EXPECTED.md
---

A Text whose `text` input is wired **and** whose own text was typed ("count nothing") shows its own text in the running
app until the wire first delivers a value (the source is a Function not yet run; `undefined` is never sent, so the
authored parameter stands). The exported Text prints `String(value ?? '')` and shows nothing until the first run.

The sibling of [P18-S122-TEXTDEFAULT](p18-s122-textdefault-a-wired-text-with-no-authored-text-shows-text-in-the-running-app-and-nothing-in-the-export.md)
(no authored text → the word "Text"), with the difference that here the right answer is not arguable: the author typed
the text, so the export should print `value ?? 'count nothing'` where the source may be undefined.

**Reach:** 16 of the 1,284 wired Texts in the shipped templates have a text of their own (gram 3, star-class 3,
marketplace 3, rocket-school 3, bot-garden 2, landing-pages 1, members-area 1); python over every `nodes.json` +
`connections.json`, 2026-10-21.

**Fix shape:** in the Text emission, where the wired source `maybeUndefined` and the node's `text` parameter is a
non-empty literal, print `?? <the literal>` instead of `?? ''`. One line; the fixtures with such a Text move (hls001).
