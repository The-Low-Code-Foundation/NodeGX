---
id: P109-S19-DEMOSTUBWIRES
title: The training demo's stubbed Functions keep wires into inputs they no longer read
status: open
severity: low
area: template / digital-bricks-training-demo (templates/digital-bricks-training/tools/build-demo.mjs)
found: P109 ISL-006 s19, 2026-10-05
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-006-A-FUNCTION-SAYS-WHAT-ITS-PORTS-ARE.md §8 s19
---
`build-demo.mjs` replaces some Functions' scripts with demo stubs ("keeps nothing in the demo") but keeps the wires into
them. Three of those inputs are read by nothing and saved on nothing: `in-conceptId` on `Pages/Lesson`'s finishStep and on
`Lesson/Section row`'s capture, and `in-field` and `in-value` on capture. The editor paints them as missing and leaves them
out of the build, and `validate_project` now names each one (`unknown-function-port`). Harmless to a person (the stub does
nothing with them). **Fix:** drop the wires when stubbing, or put the names on the stub's `scriptInputs`.
