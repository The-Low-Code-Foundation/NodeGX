---
id: P107-C28
title: Push Component To Stack never answers a press when Mode is neither push nor replace
status: needs-ruling
severity: low
area: runtime / Push Component To Stack (viewer)
found: P107 NSP-015 s18, 2026-10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md §6.1d, §6.2
---

Mode is an enum (Push / Replace), but a wire can feed it any value — `'Push'` with a capital, `''`,
`null`, a typo. With any of those, pressing Navigate does nothing and says nothing: no request reaches a
Component Stack, and the press gets no Done, no Unchanged, no Failure, ever. The next press with a real
Mode works.

Where: `packages/noodl-viewer-react/src/nodes/navigation/navigate.ts` `navigate()`: `if (mode === 'push'
|| mode === undefined) … else if (mode === 'replace') …` (:177, :203) has no else, and the frame's tokens
were already taken (:170-171). The States lesson: an enum input is not a closed set at run time.

Measured 2026-10-01 (runtime target, the real `NavigationHandler`): Mode `'Push'` + Navigate → the
handler's queue unchanged, no `stack` call, no outcome; Mode `'push'` + Navigate in the next frame → one
call. Graded every run by `scenarios/PageStackNavigate.json` "C28 — …" (the spec follows the runtime).

Proposed: an else that reports Failure `push-component-stack/unknown-mode` with an Error naming the value.
One branch; ships alone.
