---
id: P107-C99
title: A Video's Source Object wired anything that is not a stream (text, a number, an object) throws — before the first draw, inside React's commit
status: open
severity: low
area: runtime / Video (noodl-viewer-react/src/components/visual/Video/Video.tsx `setSourceObject` :129-134; nodes/visual/video.ts Source Object :35-47)
found: P107 NSP-016 s54, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.15; HTML's `srcObject` is WebIDL `MediaProvider?` — a MediaStream, MediaSource or Blob, or null — so a browser's setter throws TypeError for anything else; jsdom has no `srcObject`, so the runtime target's face gives the browser's setter (node-spec-target.ts THE MEDIA ELEMENT)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Video.json "row C99 — Source Object 'abc' on a video file: the browser refuses it, nothing changes (the runtime throws)"
---

**What a person sees.** Source Object is wired from something that is not a camera stream: a Variable that holds text, an Object, a
number. The node throws `TypeError: Failed to set the 'srcObject' property on 'HTMLMediaElement'`. Written after the Video has
drawn, the console shows it and the rest of that node's update is skipped. Written before (a value that arrives as the page opens),
it runs inside React's commit and the page goes blank.

**Where.** `setSourceObject` assigns whatever arrives to `this.video.srcObject` when it differs from what is there. Only null, a
MediaStream, a MediaSource or a Blob may be assigned. The port is typed `mediastream`, but a `*` output (a Variable, a Function, an
Object's property) connects to it all the same.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The generated
sequences withhold these values on the runtime (WITHHELD), so a play is not cut short by them.

**Proposed fix.** Assign only a value the element can take: `src === null || src instanceof MediaStream || (typeof MediaSource !==
'undefined' && src instanceof MediaSource) || src instanceof Blob`; treat anything else as nothing. C96 is in the same function. When it
is fixed, remove the scenarios' `row` fields, the C99 entry from KNOWN_ROWS and the WITHHELD entry in the same commit.
