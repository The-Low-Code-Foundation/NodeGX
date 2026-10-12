---
id: P112-S14-DETACHEDVISUAL
title: "A visual node an agent leaves outside the component's tree (a hidden Video used as an audio player) passes the checker with 0 errors and is never mounted — its signals do nothing"
status: open
severity: medium
area: mcp / validation (a visual node with no parent that isn't in `visualRoots`); `render_report` can't see it (nothing is drawn either way)
found: P112 OWN-015 s14, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §7 (round 2)
---

OWN-015's second stranger round needed audio playback and had no Audio node, so it used a `Video` node
(1×1 px, `opacity: 0`, `position: absolute`) as a hidden player. It wired `CloudFunction2 out-audioDataUrl → src` and
`done → play`, and left the Video as a second root of `PhraseRow`: `parent` none, `visualRoots: ["row"]`.
`validate_project` reported 0 errors.

In the page there is **no** `<video>` element at all, so the tap fetches the audio and nothing plays. With the node
moved under `row` (the only change), the same tap plays the WAV to the end (1.45 s of 1.45 s, phone viewport).

**Proposed:** the checker warns on a visual node that is neither in `visualRoots` nor under one: *"Video "Hidden audio
player" is outside the visual tree, so it is never drawn and its inputs (play, src) do nothing. Put it under
"Row"."* The editor would show it as a floating node, but on the agent's path nothing does.
