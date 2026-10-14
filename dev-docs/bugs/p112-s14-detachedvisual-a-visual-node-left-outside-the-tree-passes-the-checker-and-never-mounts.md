---
id: P112-S14-DETACHEDVISUAL
title: "A visual node an agent leaves outside the component's tree (a hidden Video used as an audio player) passes the checker with 0 errors and is never mounted — its signals do nothing"
status: fixed
severity: medium
area: mcp / validation (a visual node with no parent that isn't in `visualRoots`); `render_report` can't see it (nothing is drawn either way)
found: P112 OWN-015 s14, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §7 (round 2)
regression: packages/noodl-mcp/tests/own015DetachedVisual.test.ts (the write door and validate_component; the Video under the row, a parentless String, and door-derived roots as known-good arms)
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

**Fixed (s15, 2026-10-12).** A new warning, `detached-visual-node`, from the agent server's precondition checks
(`noodl-mcp/src/validate.ts` `detachedVisualDiagnostics`), so it reaches every write door and `validate_project`. It
fires on a visual node (project-aware predicate, so a drawing component instance counts) that has no parent, isn't
anyone's child, and isn't in a non-empty `visualRoots`:
*"Video "Hidden audio player" is outside the visual tree: it has no parent and visualRoots lists only "Row …", so it
is never drawn and anything wired into it (play, src, text…) does nothing."* The suggestion says to put it under the
first root (opacity 0 for a hidden player) or to list it. It's a warning: the write still lands.

Why only agents meet it: the editor re-derives `visualRoots` on every save, and the MCP derives it when
`visual_roots` is omitted. Only an explicit list that leaves a visual node out (AWP-001 keeps it verbatim) gets here.
Census: 820 components in templates, library and the MCP fixtures (440 with roots), 0 hits. Control: the round's
unrepaired `PhraseRow` 1 hit, the repaired copy 0.
