---
id: P107-C96
title: A Video showing a YouTube or Vimeo link throws when Source Object arrives — before its first draw, the throw is inside React's commit and the page goes blank
status: open
severity: medium
area: runtime / Video (noodl-viewer-react/src/components/visual/Video/Video.tsx `setSourceObject` :129-134; nodes/visual/video.ts Source Object :39-48)
found: P107 NSP-016 s54, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.15; the s54 probe on the runtime target (Source `https://youtu.be/dQw4w9WgXcQ` with Source Object null placed: TypeError at the first settle; Source Object written after the first draw: TypeError out of the input write)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Video.json "row C96 — Source Object placed with an embed: nothing (the runtime throws inside its first draw)"
---

**What a person sees.** A Video's Source is a YouTube or Vimeo link, so it draws an embedded player, and something is wired into
Source Object (a camera stream that has not started yet sends nothing, then null). If the value arrives before the Video has drawn,
the page goes blank. If it arrives later, nothing visible happens, but the console shows `TypeError: Cannot read properties of null
(reading 'srcObject')`, and the rest of that node's update is skipped.

**Where.** Source Object runs `inner.setSourceObject(value)` through `withInnerComponent`. `setSourceObject` reads
`this.video.srcObject` with no guard. On the embed path Video.tsx renders an `<iframe>` and never sets `this.video`: it is
`undefined` before any `<video>` was drawn, and `null` after one was swapped for the embed (the `<video>`'s ref is called with null).
A value that arrives before the first draw waits in `_pendingInnerActions` and runs from the wrapper's ref callback, inside React's
commit. A built-in node has no error boundary (kit-node-boundary.ts), so the root unmounts.

**How to reproduce.** Place a Video with Source `https://youtu.be/dQw4w9WgXcQ` and Source Object `null`, and let one frame run: the
settle throws. Or place it with the link, let it draw, then write Source Object: the write throws.

**Proposed fix.** In `setSourceObject`, return when `this.video` is not set (an embed has no media element to give a stream to).
When it is fixed, remove the scenarios' `row` fields and the C96 entry from KNOWN_ROWS in the same commit.

**Measured 2026-10-26 (the Beta sweep s11): the row's scenario no longer fires on the runtime.** `NSP_ONLY=Video`
conformance at HEAD 656f5e938: "row C96 — Source Object placed with an embed" passes, and the known-rows test is red
for that ("close the row or drop the mark"). Not graded further: which change made it stop, and whether Source Object
written after the first draw still throws, decide whether the row closes.

