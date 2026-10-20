---
id: P112-OWN020-RENDERNOVARIANTS
title: "render_report drew a project without its variants — every named Look and every element style in nodegx.styles.json was missing from the render, so the agent's own visual check disagreed with the real preview of the same files"
status: fixed
commit: 3cb9eb745
phase: P112
task: OWN-020
severity: high
area: render harness — `scripts/devtools/render-from-disk.js` `buildProjectData` returned no `variants`; the runtime's `GraphModel.importEditorData` reads `exportData.variants` (`noodl-runtime/src/models/graphmodel.ts:180`)
found: P112 OWN-020, 2026-10-19 (building P112-OWN020-OFFSYSTEM's render check on OpenTune)
evidence: OpenTune (UI-2) copy with element styles: `@nodegx/preview` drew the Sort-by Radio Buttons 16x16, render_report drew them 32x32 and its new `control-off-scale` named them. With the fix: render_report 16px, finding silent; the untouched copy still named (32px beside a 16px label). dev-docs/tasks/phase-112-your-own-nodegx/OWN-020-THREE-HARNESSES.md §12
regression: packages/noodl-mcp/tests/own020RenderVariants.test.ts
kit: mcp
---

`render-from-disk.js` builds the runtime's project data by hand (the exporter's shape) and left out `variants`. So a
render showed every node that names a Look (`variant: "Card"`) without it, and every control without its element
style, while the person's preview of the same files showed both. render_report is the check the kit tells an agent
to trust ("a graph is a claim, a render is evidence"), and on any project with a styles file it was evidence of a
different app.

**Fixed (built 2026-10-19, committed `3cb9eb745` 2026-10-20):** `readVariants()` reads `nodegx.styles.json` into the exporter's shape
(`exportVariant`: name only when named, `stateParameters` from either spelling, transitions defaulted) and
`buildProjectData` passes `variants`. The spec lifts the function from the script and runs it on real files, and pins
the line in the returned object; a mutant that drops the line fails it.

Not checked here: whether the same renderer also drops the styles file's `colors` and `textStyles` (it reads neither).
