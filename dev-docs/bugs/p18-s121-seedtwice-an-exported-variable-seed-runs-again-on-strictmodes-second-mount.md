---
id: P18-S121-SEEDTWICE
title: In development an exported Variable's authored Value is stored again on StrictMode's second mount, over what a mount effect wrote
status: open
severity: low
area: export / Variable seed (EXP-011 §67), development builds
found: P18 session 121, 2026-10-17, a Page's Did Mount that writes a seeded Variable (s121-tickedrun README, "po")
evidence: packages/nodegx-export/src/emit/component.ts `variableSeeds` (a mount effect with no once-guard, where §53's, §57's and FIELDMOUNT's have one); the emitted `main.tsx` renders under `<StrictMode>`
---

A Variable with an authored Value is seeded by a mount effect with no guard. Under StrictMode (the exported app's
development build) React mounts twice, and the second run of the seed writes the authored value back over anything
another mount effect wrote in between: a Did Mount chain, a ticked run's signal, a field's announcement. The page then
shows the authored value where the running app shows the later write. Production builds mount once and are right.
**Reach, measured:** 8 seed effects in 6 corpus files, 0 in the shipped templates; whether any of them meets a later
write in the same mount is not counted. The fix is the once-guard §53 uses.
