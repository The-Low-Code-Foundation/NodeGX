---
id: P132-FILTERNOCONDITION
title: Studio's "Add a step → Filter" writes a Filter with no condition, which the backend refuses
status: fixed
phase: P132
task: BWF-003
severity: medium
area: nodegx-studio / Backend tab (a new step's starting settings)
found: building BWF-003's item picker, which lives in a Filter's condition, 2026-11-02 (s3)
evidence: nodegx-backend validateWorkflowDefinition on the step Studio writes
launch: beta
commit: nodegx-studio b4609f8
---

A new step starts with the catalog's required settings that have a default, plus Studio's own starting form for the
kinds that have none (`newStep` in `editor/studio.html`: branch, switch, transform, validate, wait, wait-until, split).
`filter` is the one kind in the catalog with a required setting, `condition`, that has no default and no starting form
(measured over `STEP_KIND_SPECS`: every other such kind is covered). So the Filter Studio writes is
`{ kind: 'filter', params: { items: { $path: 'previous.items' } } }`, and the backend's validator says
`step "a": filter needs a "condition" param — it would keep everything` (measured with `validateWorkflowDefinition`;
the same step with a condition passes). The write is refused, so a person cannot add a Filter in Studio, and so never
reaches its condition, where BWF-003 offers *this item* and *its position*.

**Fix:** a Filter starts as `condition: { left: { $path: 'item' }, op: 'truthy' }` (keep every item that is not empty),
the simplest working form, said in words in the panel and changed there.

**Fixed (P132 s3, BWF-003):** `newStep`'s starting forms carry the Filter's. Gate: automations-drive adds a Filter
from the step menu and finds it, with its condition, in the file and on the backend.
