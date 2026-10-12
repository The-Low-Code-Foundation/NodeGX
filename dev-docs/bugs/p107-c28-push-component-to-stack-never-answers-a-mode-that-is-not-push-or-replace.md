---
id: P107-C28
title: Push Component To Stack never answers a press when Mode is neither push nor replace
status: fixed
commit: e965f8241
phase: P109
task: ISL-028
severity: low
area: runtime / Push Component To Stack (viewer)
found: P107 NSP-015 s18, 2026-10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/PageStackNavigate.json "C28 — a Mode that is neither push nor replace hands nothing and is Failure, Error naming the value; push again answers (v2)"
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Fail and name the value".** The press fires Failure with an error such as "Unknown mode 'Push'", so the author sees what their wire sent. One extra branch in one place. The question as asked: *"Should a press with an unknown Mode report a failure that names the value it got?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed e965f8241 (P109 ISL-028, 2026-10-06), as ruled.**
