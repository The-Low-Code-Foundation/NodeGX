---
id: P134-S14-CLICKNOISE
title: "export: R9's fix printed `event.stopPropagation()` on every wired Click in both exports, and 790 of the corpus's 910 changed nothing (nothing above them listens), so an exported app's every button carried a stop a reader had no reason for"
status: fixed
commit: ae7a3e99d
severity: low
area: the export plan (`packages/nodegx-export/src/analyze/plan.ts`, `clickStopsOf` and now `narrowClickStops`), read by both printers
found: P134 session 14, 2026-11-04, counting why session 13's tree had 58 suites red (162 assertions read the old handler text)
evidence: dev-docs/tasks/phase-134-the-app-in-plain-files/README.md §10 session 14 (910 wired Clicks: 46 under a wired Click in their component, 74 through a placement, 790 with nothing above)
regression: packages/nodegx-export/tests/a-click-stays-where-it-is-used.test.ts (C1b, C6)
---

Richard ruled R10 "Only where it matters". `narrowClickStops` keeps a stop only where something above could hear the
click: a wired Click above it in its component, a slot in a placed component that wires one, or its component placed under
one (an instance, a For Each row, a Router page, a Page Stack page; a cycle answers no). A popup is drawn at the top (no
click listener in the runtime's popup layer or the export's host). Kept everywhere in an app that draws a kit, and for a
component named in a way the rule does not follow. Stops printed 917 -> 343; the Click Desk still reads the same in all
three arms.
