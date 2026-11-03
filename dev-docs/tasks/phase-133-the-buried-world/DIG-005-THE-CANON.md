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
