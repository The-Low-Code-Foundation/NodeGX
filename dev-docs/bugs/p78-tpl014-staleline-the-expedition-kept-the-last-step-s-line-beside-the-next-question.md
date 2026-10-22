---
id: P78-TPL014-STALELINE
title: The Expedition kept the last step's line ("Right! Zib walks on") beside the next question, because a repeated line publishes nothing
status: fixed
severity: medium
area: Rocket School and Star Class / Trip/Play and School/Play (`packages/noodl-mcp/tests/tpl007Components.ts`)
found: P78 TPL-014 M2–M5, 2026-10-22
evidence: dev-docs/tasks/phase-78-the-templates/TPL-014-THE-MOON-GROWS.md §7, M2–M5
---

Trip/Play first wired every act's Said straight to the line under the map. A Function output publishes only when its
value changes, so the second aim of a trip ("To walk there, answer:", the same words as the first) published nothing,
and the line kept the previous step's "Right! Zib walks on, and the lantern clears the fog around it." beside a new
question. The first drive of the Expedition read it as taps doing nothing: 1 step walked in 24 tries.

**Fixed:** each act's line goes through its own Set Variable into one Variable (`tripSaid`), so a line that repeats is
still set when its act runs; School/Play does the same for what the alien says (`schoolSays`). Driven 28/28 on both games
(1100 and 390 px) and on the live demo, where the walk takes nine steps.

The same shape is still in Moon/Care (feed, wear and buy each wire Said straight to one Text), where two acts can say
the same words in turn; not seen in a drive, not changed here.
