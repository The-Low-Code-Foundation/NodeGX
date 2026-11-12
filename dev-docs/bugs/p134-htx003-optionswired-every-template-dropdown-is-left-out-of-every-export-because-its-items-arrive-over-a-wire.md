---
id: P134-HTX003-OPTIONSWIRED
title: "export: all 39 Options (dropdowns) in the templates are left out of every export, because each one's items arrive over a wire"
status: open
severity: medium
area: export / the plan (`packages/nodegx-export/src/analyze/plan.ts`: "its items arrives over a wire, so the rendered structure is not static"), all printers
found: P134 HTX-003 session 5, 2026-11-04, measuring which Options the HTML printer would reach
evidence: dev-docs/tasks/phase-134-the-app-in-plain-files/README.md §10 session 5; the React export's EXPORT-REPORT.md for templates/planning (e.g. "node bsProject (net.noodl.controls.options) deferred: its items arrives over a wire")
---

Measured across `templates/` on 2026-11-04: 39 Options nodes; the React export draws 0 `<select>` elements. Each one's
items come from a wire (a Component Input, a Function's output, a Roster filter's output), and the plan defers an
Options whose items are wired, by name, in every export. React's `renderSelect` prints only authored JSON items, which
no template uses.

So a person's dropdowns (planning's project, billing and money pickers, marketplace's country and shelf, gram's time
and reason, digital-bricks-training's cohort filters) do not travel in any export, and printing Options in the HTML
printer (HTX-003's "a Checkbox and Options likewise") reaches nothing until the plan carries wired items. The HTML
printer does not draw Options yet for that reason.

Fix in the plan: wired items as a list value (the For Each rule: a typed list source, its rows `{ Label, Value }`),
then each printer's options drawn from it, keyed by Value.
