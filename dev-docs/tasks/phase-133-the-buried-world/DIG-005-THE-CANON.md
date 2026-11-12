# DIG-005 — The canon, behind the wall

**Phase:** [133](README.md). **Depends on:** DIG-001. **Round:** 8. **Scope:** [SCOPE §6.1, §6.4, §7](SCOPE.md).

> "I'll leave the details up to you to write without telling me so I can discover them." — Richard, 2026-11-03

## What

Written in the private repository's `lore/`, by an Opus session. **Never quoted to Richard.** This file and the log
below hold counts and checks only.

The canon covers: who they were and their eras; their styles of building (names, materials, proportions, what each
is for) as data DIG-006 reads; their practices; what happened to them; what the creatures are to them; why some rooms
are safe; the earlier expedition; why the ship's pulse rings in their halls. Plus:

- **`lore/practices.json`:** every practice they lived by. Each has its name in their culture, a short account in
  their voice, **the real tradition and the primary text it is drawn from** (e.g. a chapter and verse, a section of the
  Enchiridion), its family (SCOPE §6.4), the task kinds and weights it answers (the table DIG-012 reads), and two or
  three ask templates.
- **`lore/STYLE.md`:** the voice for every later writer (the nightly job reads it): lengths, what a fragment may and
  may not do, the banned words (should, therapy, treat, heal, mental health, and the rest of SCOPE §10), and R4's rule
  that hopes and worries carry equal weight.
- **"Where these come from"**: the one page that names real traditions. It may be shown to Richard (it names
  sources, not lore).

## Acceptance

- **AC1.** At least 24 practices, every one with a source a reader can look up; each checked against that source by a
  second pass that did not write it (the log says how many were corrected).
- **AC2.** A consistency pass by a fresh session reports no contradictions inside the canon (or lists what it fixed).
- **AC3.** `lore/check-canon.mjs` exits 0: every practice has its source, family, table rows and asks; no banned word
  anywhere in `lore/`.
- **AC4.** The report to Richard is one paragraph of counts and checks, with no names or quotes from the lore.

## Log

**2026-11-03, s2:** written by a separate agent in the private repo's `lore/` (never read into the main session's
chat). `lore/check-canon.mjs` (written first, as the data contract) on the draft: canon 8,066 words, style guide 2,055,
sources page 1,057; 30 practices in 15 families; all 32 kind × weight cells answered at least twice; looking ahead,
hard 12 against good 37 (R4); 6 styles in 5 settings, 16 motifs. Mending with gold dropped: no page-numbered source
found (the family draws on another text). AC1's second pass (a fresh agent checking every source) is running; AC2's
consistency pass follows it.

**2026-11-03, s2, later (private repo `dfeb30e`):** AC1 ✅ a second agent checked all 30 practices against public
texts and corrected 11 (sayings the source does not contain, a teaching turned the wrong way, a wrong chapter or
page, words given to the wrong speaker); three refs remain second-hand and say so in their `checked` notes (one 1969
page number, one book page cited via a secondary source with a checked article as the main source, one paragraph
number from the standard numbering). AC2 ✅ a fresh agent read the canon for contradictions: 22 found, 20 fixed in
`lore/`; one was code (refuges safe only when whole, fixed in `5bb1d5f`); one is a placement rule handed to DIG-008.
AC3 ✅ `node lore/check-canon.mjs` exits 0: canon 8,207 words, style guide 2,073, sources page 1,160; 30 practices
in 15 families, all checked; 32/32 cells; looking ahead hard 12 / good 37; 6 styles, 16 motifs. AC4: the report to
Richard was counts only.
