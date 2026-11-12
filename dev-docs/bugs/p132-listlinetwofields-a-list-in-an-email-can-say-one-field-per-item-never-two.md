---
id: P132-LISTLINETWOFIELDS
title: A workflow's email (or any text) can list one field per found record, never two ("Fern, Kitchen"), so "the plants and their rooms" needs a cloud function
status: open
phase: P132
task: BWF-009
severity: low
area: nodegx-backend / workflow formulas (`steps/formulas.ts`: `pick`, `join`, `text`; no per-item template), R2's fixed set
found: BWF-009 part 2, the agent round (2026-11-04, s22), in the agent's own words
evidence: dev-docs/tasks/phase-132-a-backend-workflow-you-can-build-by-hand/agent-round-bwf009.mjs; the agent's closing report quoted in BWF-009's s22 record
launch: none
---

Asked "every morning at 8, find the plants that haven't been watered for three days and email me the list", the agent
built the digest from formulas alone (`add-to-date`, `count`, `text`, `format-date`, `pick` + `join`), and said:

> the email lists names only; the formula language can't format two fields per row, so adding the room or the date
> per plant would need a small cloud function.

Measured by reading `formulas.ts`: `pick(list, field)` gives one field per item and `join` glues them; nothing builds
a line per item from two fields (a `map` with a template, or `pick` taking a `text` pattern). So the first thing a
person adds to a digest ("…and which room") is the step that sends them to code, which BWF-009's pass forbids.

Ask Richard (R2 ruled a small fixed set): one formula more, e.g. `each-line(list, "{name} in {room}")`, or keep the set
and say it in Studio's formula menu ("one field per item; for more, a function")?
