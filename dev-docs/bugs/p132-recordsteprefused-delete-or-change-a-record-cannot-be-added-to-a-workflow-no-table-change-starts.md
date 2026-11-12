---
id: P132-RECORDSTEPREFUSED
title: Delete or Change a record cannot be added to a workflow no table change starts ("needs a record")
status: fixed
phase: P132
task: BWF-005
severity: high
area: nodegx-studio / Backend tab (a new step's starting settings, newAutoStep)
found: Richard's re-walk of P132 in Studio, 2026-11-03 ("it refused and said I need to have a record to delete before adding this")
evidence: nodegx-studio editor/automations-drive.mjs "delete-record from the menu: added, not refused"
launch: beta
commit: nodegx-studio d4c72c0
---

Richard read the refusal as Studio judging that no record could reach the step: "How does the system know I won't be
able to reference the id … from the input data?" It judged nothing. Studio started a Change or Delete a record with
`record: { $path: 'body' }` when a table change starts the workflow, and with `record: ''` otherwise. The backend's
validator (`steps/kinds.ts`, the record kinds' case) refuses an empty `record` ("needs a \"record\" — which one"),
Studio saves on add, so the add itself was refused and the person never reached the setting where they would pick it.

Same family as P132-FILTERNOCONDITION (a Filter with no condition): a step whose required setting has no default is
refused at the add. Every other such kind has a starting form in `newAutoStep` (measured over the catalog then).

Fixed: with no table change behind it, the record starts as `body.id` (the id in what started the run: a webhook's
or a caller's body), drawn as a pill the person changes. The drive adds both kinds from the menu to a workflow no
trigger starts. Still true and not changed: a step added with an unfinished setting is refused rather than saved
with a warning, as n8n would. If another kind meets it, that is the fix to make.
