---
id: P134-HTX003-BOXREMOUNT
title: "export: a checkbox the plan gives no state row (only its Changed wired) comes back unticked when a value mounts it again; the running app keeps its tick"
status: open
severity: low
area: export / the plan's control-state minting (`packages/nodegx-export/src/analyze/plan.ts`, "Minting (§4c)"), all printers
found: P134 HTX-003 session 5, 2026-11-04, grading the Checkbox Desk against the runtime's own nodes
evidence: packages/nodegx-export/tests/html-lists-fields-pages.test.ts §F (F1 pins the cells); dev-docs/tasks/phase-134-the-app-in-plain-files/README.md §10 session 5
---

The plan mints a checkbox its own state row when its Checked is wired in, when Check or Uncheck targets it, or when a
drawn element or a handler reads its Checked. A box with only its Changed wired gets none, so every export draws it as
a box that keeps its own tick (React: an uncontrolled `<input type="checkbox">`).

Under a Mounted that a value decides (the desk's Later, mounted while Done is ticked, as planning's Money editor mounts
its month-end box), that is lost when the box goes and comes back: the export's element is new, so it is unticked. The
runtime's node outlives its element (`checkbox.ts` keeps `_internal.checked` and `props.checked`), so the box comes
back ticked. Measured: tick Later, untick Done, tick Done: the runtime reads `[Later]=on`, the HTML export
`[Later]=off`; the React export prints the same uncontrolled box.

Fix in the plan: a control under a value-decided Mounted (or inside a part that can unmount) earns a row, so the tick
lives in the component and not in the element. A Text Input with no row under the same Mounted probably loses its text
the same way; not measured.
