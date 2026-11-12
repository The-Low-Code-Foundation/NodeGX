---
id: PARKED-LUMIERE-R1C-EMOJIQUESTIONS
title: In Château Lumière, the counting questions were asked in signs ("👆 ≠", "👆 ➕") instead of words
status: fixed
commit: none yet — round 1c of dev-docs/parked/lumiere, commit waits on Richard's go
severity: medium
area: parked lumiere — `public/src/school/school.mjs` (`inWords`)
found: parked LUMIÈRE round 1c, 2026-11-01, Richard's play of round 1b ("The questions with the pointing up emoji or the not equals emoji are confusing, these should be stated in words not with emojis, an 8 year old can read fine")
evidence: rocket.mjs (generated from Star Class, written for children who cannot read yet): oddOne prompts '👆 ≠', morePile '👆 ➕', their explanations "🍉 🍍 🍌  ≠  🐄" and "2 < 10"
---

The generated file stays as it is; Lumière's `ask()` now words the nine counting skills ("Which one does not belong
with the others?", "Which group has more?", "How many are there?" …) and their explanations ("🍉 🍍 🍌 are fruit. 🐄
is an animal."). 4,000 generated counting questions: none left with a sign for a question.
