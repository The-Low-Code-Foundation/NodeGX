---
id: P107-C97
title: Play or Restart on a Video whose Source changed from a video file to a YouTube or Vimeo link throws, and the action reports neither Done nor Failure
status: open
severity: low
area: runtime / Video (noodl-viewer-react/src/components/visual/Video/Video.tsx `startPlayback` :159-160, `play` :175-180, `restart` :182-188)
found: P107 NSP-016 s54, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.15; the s54 probe on the runtime target (Source `clip.mp4`, its `canplay`, Source written `https://youtu.be/dQw4w9WgXcQ`, a settle, Play: TypeError `Cannot read properties of null (reading 'play')`)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Video.json "row C97 — a file loads, then a YouTube link: Play does nothing to the embed and reports Done (the runtime throws)"
---

**What a person sees.** A Video plays a file, and the app then switches its Source to a YouTube or Vimeo link (a playlist of
mixed sources, say). The node's description says Play does not apply to an embed. But the next Play or Restart throws: the console
shows `TypeError: Cannot read properties of null (reading 'play')`, the action fires neither Done nor Failure, and the rest of that
node's update is skipped.

**Where.** `canPlay` is the component's flag. It is set by the `<video>`'s `canplay` and cleared only when the component unmounts or
Source Object changes. Swapping the `<video>` for the embed's `<iframe>` keeps the component, so `canPlay` stays true while
`this.video` is now null (the `<video>`'s ref was called with null). `play` and `restart` then call `startPlayback`, which calls
`this.video.play()` unguarded. `pause` and `reset` guard `this.video` and do not throw.

**How to reproduce.** Play the `regression:` scenario on the runtime target.

**Proposed fix.** In `play` and `restart`, start playback only when `this.video` is set; or clear `canPlay` when the `<video>`'s ref is
called with null. When it is fixed, remove the scenarios' `row` fields and the C97 entry from KNOWN_ROWS in the same commit.
