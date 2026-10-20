---
id: P123-TRANSITLOST
title: An element's own Bubble transitions are dropped on import, so its hover change snaps instead of fading, with no finding
status: open
severity: low
area: P123 importer (`dev-docs/tasks/phase-123-open-bubble/import/bubble2nodegx.mjs`: `transitions` read only for a style's variant, :149)
found: docs session (Bubble dictionary page), 2026-10-17, while writing the Button example in `docs-site/docs/bubble-dictionary.md`
evidence: `scripts/bubble-dictionary/sample.bubble.json` Button `cmMfz` carries `transitions.font_color` (ease-in-out, 200 ms); the converted `el_cmMfz` has `stateParameters.hover` and no transition
---

A Bubble element can carry its own `transitions` beside its conditions (the template's nav buttons fade their text colour
over 200 ms on hover). The converter carries a style's transitions onto its variant as `stateTransitions`, but an
element's own are not read, so the converted button's hover colour changes instantly. Nothing in the import report
says so.

Fix: when an element gets `stateParameters` from a hovered/focused/pressed condition, carry its `transitions` onto the
node the same way the variant gets them (`{ curve: fn, duration }` per property). Size: a few lines beside the
existing variant code.
