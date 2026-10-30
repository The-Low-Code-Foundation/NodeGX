---
id: P123-GH-CHOICELABEL
title: A page shows a Choice taken from an option set by its Value (kitchen), not its option's label (Kitchen)
status: open
severity: medium
area: nodegx-studio / ⚡ value menu (a Text taking a record's field), option sets × Choice
found: building Richard's P123-GH-OPTSETCHOICE ruling (a record stores the option's Value), 2026-10-30
evidence: dev-docs/bugs/p123-gh-optsetchoice-a-dropdown-of-an-option-set-sends-its.md
---

Since the ruling, a Choice taken from an option set stores each option's Value (`kitchen`). Studio's own views show it
by its label (App data, Data types), but a Text on a page that takes a record's room through ⚡ is wired straight to
the record's `room` output, so the running app shows `kitchen`. Nothing in Studio offers "Plant's room, by its label".

Not measured in a running app yet: read from the wiring Studio makes (the ⚡ menu wires `prop-<field>` straight to the
Text). Fix to scope: a ⚡ entry for a set's Choice that reads the option's label through the set (one lookup node the
⚡ makes, or the option set component read by Value), as STU-094's "the ⚡ menu reads through it" asks for sets.
