---
id: P78-TPL013-STALEDRIVE
title: The Rocket School drive fails four clauses on today's game, and its class clause passes without checking the class
status: open
severity: low
area: devtools / drive-tpl007-rocket.js
found: P78 TPL-013 s1, 2026-10-14
evidence: dev-docs/tasks/phase-78-the-templates/TPL-013-STAR-CLASS.md §6
---

`scripts/devtools/drive-tpl007-rocket.js` was written for Rocket School's first cut (2026-09-12). Run on today's
`templates/rocket-school` (deployed locally with `--allow-development-engine`), it passes 13 of 17 clauses, with
0 console errors. The four reds are the drive, not the game: the race setup lost its "Maths or typing" pills to P113's
chooser, and the answer is now typed on an on-screen keypad, so the drive's typing and its "the banner offers Next" and
"FR switches the interface" reads no longer find what they look for. The same four fail on Star Class.

The worse half: the clause **"the typed name is in the box and CM1 is the chosen class"** (line 155) checks only the
name. It clicks `CM1` and asserts nothing about it, so it passed on Star Class, which has no CM1 button.

**Proposed:** take the class to choose as an argument (`--class P4`) and assert the chosen pill and the profile
card say it; re-aim the four stale clauses at the chooser and the keypad. Small.
