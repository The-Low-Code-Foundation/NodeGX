---
id: P123-GH-PHRASECODE
title: The Composer view shows `[0]` and `slice()` for a phrase picked from more…, the JavaScript the sentence was meant to hide
status: fixed
commit: nodegx-studio bd4fff1
severity: medium
area: "nodegx-studio / expression composer (editor/sentence.mjs pieces, editor/studio.html openComposer)"
found: STU-091 Greenhouse, Richard's second play test in NodeGX Studio, 2026-10-31
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes, second round (2026-10-31)
phase: P123
---

Richard (2026-10-31, after STU-098): *"The expression composer still shows [0] when you add a list type dynamic value and do the 'more' 'first item' option when you're in 'Composer' view, which should be in the javascript view. Same story for a lot of the other 'more' options like 'items from' comes up as 'slice()'"*.

Measured: `sentenceLine('plants[0]')` read `[plants] [ 0 ]`, `plants.slice(4)` read `[plants].slice (4)`: the sentence knew operators only, and 61 of the phrasebook's 69 inserting phrases are more than an operator. The menu's own hint line also showed the code in the Composer view.

Fix: `phraseReads` makes each phrasebook phrase a template (its subject, its other values and the numbers / texts its words ask for are holes); `pieces` reads a matched phrase as one word piece, the button's own words (`[plants]:first item`, `[plants]:items from # 4`), its other code hidden but lit in Both, and Remove takes the phrase back to its value. Gate: `check:sentence` runs every phrase through `applyPhrase` and back.

## Fixed (s35, 2026-10-31; landed 2026-11-01)

`sentence.mjs` `phraseReads` reads every phrasebook phrase back as its button's words (`[plants]:first item`, `[plants]:items from # 4`). Gate: `check:sentence` 54/54. Every Studio gate green on 2026-11-01, run one at a time.
