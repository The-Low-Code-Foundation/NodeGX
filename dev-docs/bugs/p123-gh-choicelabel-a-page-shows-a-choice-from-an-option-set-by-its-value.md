---
id: P123-GH-CHOICELABEL
title: A page shows a Choice taken from an option set by its Value (kitchen), not its option's label (Kitchen)
status: fixed
severity: medium
area: nodegx-studio / ⚡ value menu (a Text taking a record's field), option sets × Choice
found: building Richard's P123-GH-OPTSETCHOICE ruling (a record stores the option's Value), 2026-10-30
evidence: dev-docs/bugs/p123-gh-optsetchoice-a-dropdown-of-an-option-set-sends-its.md
commit: nodegx-studio 54a66de (editor/studio.html, editor/optionsets.mjs, editor/shapes-check.mjs; STU-094)
regression: ../nodegx-studio/editor/shapes-check.mjs "the ⚡ menu offers the first Task's language by its Label, and its size's Label", "the running app shows Large"
---

Since the ruling, a Choice taken from an option set stores each option's Value (`kitchen`). Studio's own views show it
by its label (App data, Data types), but a Text on a page that takes a record's room through ⚡ is wired straight to
the record's `room` output, so the running app shows `kitchen`. Nothing in Studio offers "Plant's room, by its label".

Not measured in a running app yet: read from the wiring Studio makes (the ⚡ menu wires `prop-<field>` straight to the
Text). Fix to scope: a ⚡ entry for a set's Choice that reads the option's label through the set (one lookup node the
⚡ makes, or the option set component read by Value), as STU-094's "the ⚡ menu reads through it" asks for sets.

**Fixed (STU-094, s31).** The ⚡ menu offers a Choice from a set read through it: "a task's language's Label", and each
of the set's other attributes (and one step on along an attribute that points at another set). A pick places one
Function node that finds the option by its Value and reads the field; measured in the running app (shapes-check
section 5: *Large* on screen through Task → Languages → Sizes). Offered for page data's first item and for the record a
page is about. **Not yet** inside a repeating group's row (its fields come from the row's Component Inputs): read from
the code, not measured; open in nodegx-studio docs/SCOPE.md § STU-094.
