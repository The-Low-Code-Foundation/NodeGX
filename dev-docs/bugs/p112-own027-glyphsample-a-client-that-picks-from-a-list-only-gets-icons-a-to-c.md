---
id: P112-OWN027-GLYPHSAMPLE
title: A client that must pick an icon from a list only gets the 36 glyphs from "activity" to "chevrons-left"
status: fixed
severity: low
area: mcp / get_style_vocabulary icons (iconSets.ts GLYPH_SAMPLE)
found: P112 OWN-027 arm T r1, 2026-10-28
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-027/runs/T/r1/ledger.json (call s1n7.glyph → icon-check)
kit: mcp
phase: P112 OWN-028
commit: a475b0683
regression: packages/noodl-mcp/tests/styleTools.test.ts "says one photo per page, offers the icons a page uses, and pages through every icon name"
---

`get_style_vocabulary` → `icons[0].glyphs` is the first 36 of 215 Lucide names, alphabetically: `icon-activity` …
`icon-chevrons-left`, with `glyphsTotal: 215`. `iconSets.ts:84-94` says why: the full list broke the wire budget, and a
model can *guess* any lucide.dev name. That holds for a large model writing free text. It does not hold for a
client that answers from an enum, which is the OWN-027 thesis and any small-model harness. Such a client has no
heart, no home, no paw and no star: nothing after "c". In r1 Gemma's feature icon became `icon-check` because the
list stops before anything a puppy page wants.

Ruling wanted: (a) a `get_style_vocabulary({ glyphs: "all" })` or `list_glyphs(query)` route for clients that pick
from a list; or (b) choose the 36 by use (heart, home, star, check, arrow-right, mail, phone, map-pin, users,
calendar, …) instead of alphabetically, which costs nothing on the wire. (b) is a one-line change of what gets sliced.

Scoped into P112 OWN-028 (ruling R1/R2 asked first): `dev-docs/tasks/phase-112-your-own-nodegx/OWN-028-THE-GATES-A-SMALL-MODEL-FOUND.md`.

Ruled R2 (2026-10-28): both — the useful 36 by default and a paged route. Fixed (OWN-028 AC6): `sampleGlyphs` puts heart, home, star, check … first (`GLYPHS_BY_USE`, `iconSets.ts`); `get_style_vocabulary({ glyphs_page, glyphs_per_page })` returns one page of every name per set, with `next` wrapping to 1 after the last page. ⚠️ Lucide's manifest has no paw or dog glyph.
