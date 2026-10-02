---
id: P109-S4-ROWWRAP
title: Four template rows are set to wrap and cannot — nightbook's three text-tool rows and landing-pages' nav, with no CSS rescuing them
status: open
severity: low
area: templates (nightbook `Pages/Tonight#tnFonts`, `#tnEffects`, `#tnColours`; landing-pages `Site/Header#hdNav`)
found: P109 s4, 2026-10-02 — ISL-022's census of the new `row-cannot-wrap` code
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-022-THE-WRAPPED-ROW-WARNING-MEANS-A-ROW-WILL-OVERFLOW.md §8 s4 (census table; the render of `isl022-wrapped-row/` rows A–D)
---

Each is a row `Group` at `sizeMode: contentSize` with `flexWrap: wrap`, inside a row parent, and carries no `maxWidth`, no
sizing `styleCss` and no class that a stylesheet rescues. Measured on the fixture (`isl022-wrapped-row/`, 390 × 844): that
shape stays ONE line however many items it holds (566 px for five 110 px items), so once the items add up to more than a
phone the page widens and mobile Chrome zooms it out. Three other templates met the same shape and patched it in CSS
(the garden's `.bg-tabs`, planning's `.planner-shrink-wrap`, todo-list's inline `max-width: 100%`); these four were not.

- **landing-pages `hdNav`** (3 text links): rendered 185 px wide at 390 on a probe page — it fits TODAY; the wrap is inert,
  so a fourth or fifth link overflows instead of wrapping.
- **nightbook `tnFonts` (6 buttons), `tnEffects` (5), `tnColours` (8)**: not rendered — they mount only when a text is
  picked, behind the unlock screen. A graph reading: real if the buttons add up past the screen.

**Plain words:** *"Four rows in two templates are set to wrap onto a second line on a phone, and the way they are sized
stops that from ever happening."*

**Proposed (the measured exit):** `maxWidth: 100%` on each row (it stays as narrow as its items until it meets the edge,
then wraps — fixture row C, 2 lines). The validator now names each one (`row-cannot-wrap`), so the template's own build
shows it.
