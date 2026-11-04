---
id: P134-HTX004-CLOUDARM
title: "test rig: the runtime arm cannot mount a Cloud Function node, so no export's Cloud Function call is graded against the runtime"
status: open
severity: low
area: export tests (`packages/nodegx-export/tests/helpers/runtime-mounted-arm.js`); the node `CloudFunction2` (`noodl-runtime`'s `cloudfunction2.ts`)
found: P134 HTX-004 session 6, 2026-11-04, grading the HTML export's Cloud Function call on `tests/fixtures/call-desk`
evidence: dev-docs/tasks/phase-134-the-app-in-plain-files/README.md §10 session 6; `packages/nodegx-export/tests/html-the-backend.test.ts` §E
kit: node-spec
---

Run on `tests/fixtures/call-desk` with a backend, the runtime arm stops before its first reading:

> Can't find component model for CloudFunction2 / Unknown node id publishFn (×9)

A Cloud Function node's ports come from the project's cloud component (`/#__cloud__/publishPage`), which the arm does
not load, so the node is never made. So the HTML export's Cloud Function (HTX-004 §E) is graded against a prediction
written before the run and against the React export (equal at every reading, the same two requests), and React's own
spec (`cloud-function.test.ts`) grades printed text. Neither has been run against the runtime's own node.

Fix: teach the arm the cloud components a project declares (as session 5 taught it the Checkbox), then grade §E's three
arms together. `fake-parse-backend.js` already answers `publishPage`.
