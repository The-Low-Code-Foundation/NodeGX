---
id: P18-S124-RUNINPUTS
title: A node read only by a Function's run (a Page Inputs in a Did Mount) is reported as read by nothing, while the export reads it
status: open
severity: low
area: export / dispositions (the run's input sources)
found: P18 session 124, 2026-10-19, reading every disposition the undrawn-trigger refusal moved in the corpus
evidence: dev-docs/tasks/phase-18-code-export-v2/s124-deadrow/README.md; EXP-011 §91.5 (5 older Site Builder copies, Pages/Site "The slug from the URL")
---

A Run-wired Function's compile (`compileJsRun`) returns the collapses of its Done and signal chains, not the logic nodes
its inputs resolve through. A node read only there is never collapsed by the run, and its own sweep names it. For a Page
Inputs that sentence is "nothing reads any of its parameters, so it contributes no value to the page", while the emitted
page reads it: `runFunction(The_slug_to_show, { …, slug: pageQuery.get("slug") ?? pageParams.slug }, …)` in the Site's
Did Mount effect.

Measured: 5 copies of the older Site Builder in the corpus (`SBR AC4 Drive`, `SBR AC4 Drive 2`, `SBR Drive Site`,
`SBR Setup Drive`, `Test site builder`), Pages/Site, "The slug from the URL". Until session 124 a drawn element's read of
a never-written row ("Read the page record") carried the Page Inputs into the file as a render read and hid this; with
that read refused (P18-S122-DEADROW) the node's disposition reads "deferred" and the code is unchanged. None in the
shipped templates.

Fix, its size: add the run's input sources (`jsFunDefOf(node).logicNodeIds`) to the collapses `compileJsRun` returns,
then read the gains with `dispdiff.ts`: every node it moves should be one a printed run reads. Small.
