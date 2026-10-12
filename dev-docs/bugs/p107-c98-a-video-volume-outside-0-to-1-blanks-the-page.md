---
id: P107-C98
title: A Video whose Volume is outside 0 to 1, or not a number, blanks the whole page — Volume 50 from a Slider is enough
status: open
severity: high
area: runtime / Video (noodl-viewer-react/src/components/visual/Video/Video.tsx `CachedVideo.componentDidUpdate` :64-72; nodes/visual/video.ts Volume :175-182)
found: P107 NSP-016 s54, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.15; the s54 probe on the runtime target — placed with Volume 2: `IndexSizeError` at the first settle; Volume written 2 or -0.5 after the first draw: `IndexSizeError`; written with no value: `TypeError ... not a finite floating-point value`; controls: 0.5 and "0.5" play at that volume, null at 0
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Video.json "row C98 — placed with Volume 50: nothing (the runtime throws at its first frame)"
---

**What a person sees.** A Video's Volume is set to 50, or wired from a Slider (whose range is 0 to 100 unless changed), or from a
calculation that can come out empty. The whole page goes blank, in the editor's preview and in the deployed app, with
`IndexSizeError: The index is not in the allowed range` (or a TypeError for an empty value) in the console. Nothing points at the
Video.

**Where.** `CachedVideo.componentDidUpdate` writes `this.video.volume = this.props.volume` on every update. A browser's `volume`
setter throws `IndexSizeError` outside 0 to 1 and `TypeError` for NaN, Infinity or undefined (HTML media elements; WebIDL `double`).
The throw is in React's commit, and a built-in node has no error boundary (kit-node-boundary.ts), so the root unmounts. The Video
renders twice when it is placed, so a Video placed with Volume 2 throws at once; one placed in range throws at the first update after
Volume leaves it.

**How to reproduce.** Place a Video with Volume 2 and let one frame run. Or play the `regression:` scenario on the runtime target once
it exists (NSP-016 s54's Video spec).

**Proposed fix.** Clamp before writing: a finite number held between 0 and 1, and the default 1 for anything else (or keep the last
good volume). The same guard belongs on `muted`, `loop` and `autoplay`'s writes only if they can throw, which they cannot (boolean
setters). When it is fixed, remove the scenarios' `row` fields and the C98 entry from KNOWN_ROWS in the same commit.
