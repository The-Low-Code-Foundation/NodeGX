---
id: P123-GH-COMPOSERJS
title: The expression composer shows JavaScript (===, quotes) to a person who does not code
status: needs-ruling
severity: medium
area: nodegx-studio / expression composer (editor/studio.html openComposer)
found: STU-091 Greenhouse, Richard's play test in NodeGX Studio, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes (2026-10-30)
phase: P123
task: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes
---

Richard (Greenhouse, 2026-10-30): picking *is* puts `===` in the composer *"even though 'both' is selected, or is that
the point? The user won't know how to read a longer expression if they don't understand the JS … If they click 'text' and
it shows them an empty pair of quotes, they won't know that that's a string … and are likely to accidentally delete the
quotes … There needs to be a 'non-coder' composer like Bubble, and the ability to view the same thing in JS, like with
Blockly."*

The composer has three modes (`Composer` chips, `Both` = JS text with chips, `JavaScript`); the default is `Both` and the
last pick is remembered (`localStorage ob.composer.mode`). So `===` in Both is by design, and that is the defect: the
default view is code. Proposed: Composer is the default and the only view a new person sees; it reads `Plant's room is
"Kitchen"` with a typed value box (text / number / yes-no / date, no quotes to delete), operators as words; JavaScript is
a second view of the same thing. Ruling: drop Both, or keep it for coders. Task: SCOPE.md STU-098.
