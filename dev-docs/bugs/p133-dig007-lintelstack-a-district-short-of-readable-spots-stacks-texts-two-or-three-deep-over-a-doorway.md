---
id: P133-DIG007-LINTELSTACK
title: In The Dig, a district short of readable spots stacks its texts two or three deep on a lintel over a doorway
status: open
severity: low
area: the Dig (private repo) — `public/src/districts.mjs` (`assignTexts`: the spill after the shelves), `public/src/gen-settle.mjs` (how many readable spots a settlement leaves standing)
found: P133 DIG-007 s3, 2026-11-03, the lore agent writing the first district (counts only, behind the spoiler wall)
evidence: On the six checker seeds the first district's style at village size leaves 10–16 readable spots, most of them lintels, with 0–2 shelves of tablets and no mural or statue spots. A district must hold 20–40 texts (STYLE.md), so even 20 doubles up. `assignTexts` spills extra texts onto the shelves first (up to four each) and then onto ANY spot, so a lintel can carry a second and third text, read one after another with "The next tablet". The checker allows it (`MAX_PAGES` is per spot, not per kind). The writer cut the first draft from 32 texts to 23, partly for this.
---

Nothing breaks: every text is placed and readable, and the drive passes. But a lintel is one carved line over a
doorway, and three pages of it is not a shape a person would expect ("The next tablet" over a doorway). The night job
(DIG-008) writes to the same format and will hit it every night for the sparser styles.

Ways out, not yet chosen: let the spill go onto shelves and notes only, and have the engine leave more readable spots
when a district asks for more texts than it has (an extra shelf in a whole room, or a tablet niche in a passage);
or have the checker refuse more than one text on a carved-line spot, so the writer sizes the district to its spots.
The first keeps the writer free; the second is two lines. Decide with DIG-008.

The district and its counts live in the private repository (`tools/check-district.mjs` prints the readable spots per
seed), so no `regression:` header here: this ledger resolves that to a path in NodeGX.
