---
id: P109-S19-DEMOSTUBWIRES
title: The training demo's stubbed Functions keep wires into inputs they no longer read
status: fixed
commit: 6d8323ef4
phase: P109
task: ISL-046
severity: low
area: template / digital-bricks-training-demo (templates/digital-bricks-training/tools/build-demo.mjs)
found: P109 ISL-006 s19, 2026-10-05
regression: templates/digital-bricks-training/tools/check-demo.mjs [3b] "keeps wires into inputs it never reads"
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-006-A-FUNCTION-SAYS-WHAT-ITS-PORTS-ARE.md §8 s19
---
`build-demo.mjs` replaces some Functions' scripts with demo stubs ("keeps nothing in the demo") but keeps the wires into
them. Three of those inputs are read by nothing and saved on nothing: `in-conceptId` on `Pages/Lesson`'s finishStep and on
`Lesson/Section row`'s capture, and `in-field` and `in-value` on capture. The editor paints them as missing and leaves them
out of the build, and `validate_project` now names each one (`unknown-function-port`). Harmless to a person (the stub does
nothing with them). **Fix:** drop the wires when stubbing, or put the names on the stub's `scriptInputs`.

**Fixed, P109 s42 (2026-10-11).** Re-measured first: `validate_project` on a copy of the committed demo gave 4
`unknown-function-port` errors, one more than this file counted: `sr_call` `in-conceptId`, `in-field`, `in-value` and
`ls_finish_call` `in-conceptId`. `build-demo.mjs` now drops a wire into a write stand-in's `in-…`, and the demo was
regenerated with it: 0 errors (endpoints 1051 → 1043). `check-demo.mjs` [3b] names any such wire; with HEAD's builder
it names all four.

The regeneration also brought the demo's privacy strings up to the template's (the encrypted backup in Nuremberg,
added to the template in `f3318b205` and never rebuilt into the demo). Before regenerating, HEAD's own builder was run
as a control and differed from the committed demo in that one file only, so nothing hand-made was lost.
