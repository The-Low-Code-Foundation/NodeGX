---
id: P108-IW7-PARTWORD
title: In the Workshop on her land, the spa's part reads "square … is path" and her bowl "bowl 1"
status: fixed
severity: medium
area: library garden-kit / blocks.js chipLabel + garden_is states (the land's building parts)
found: P108 IW-007 s6, 2026-10-01 (drive-iw007-touch.js screenshot iw7t-pip-stones-won.png)
evidence: dev-docs/tasks/phase-108-the-island-works/IW-007-BUILDING-AND-ANIMALS.md §4 "Session 6"
---

A child picks the spa's stone part on the world for `until [ … ] is done`; the chip says "square" and the state
"is path" — the words of Sami's path squares, because a building part is a `site` and the kit names a thing by
`iw3sK_<id>` only when it has a word of its own (Sami's bench does). A land part's id is `<building id>-<item>` with a
generated building id, so no word can be keyed on it.

Fix (kit, `library/modules/garden-kit/src/blocks.js`, then the built copies): name a site part by its building and its
material — the chip carries `build` and `item` (Pick thing's ref, or a suffix rule on `-stone`/`-plank`), words such as
"🧱 the spa's stones" / « les pierres du spa », and its states "is built" / « est construit » (as the bench's).
Small: ~20 lines + EN/FR words + a kit fixture clause.

The same root, seen on the feeding run (`iw7t-feed-won.png`): her bowl's chip reads "bowl 1" — not her name. Her bowl's
thing carries `animal` and `name` (Draw world passes them); the chip could say "Hazel's bowl" / « le bol de Noisette ».

Fixed in P108 s6: `Logic/Pick thing` carries a land part's `build`/`item` (only when `of` is set) and a bowl's `name`;
garden-kit `chipLabel` names them (`iw7tK_<building>_<material>`, `iw7tK_bowl`) and a part's states (`iw7tS_*`).
Rows: `iw007Touch.test.ts` "her land's parts and her bowl named on a chip"; drive: `drive-iw007-touch.js` PIP/FEED words.

