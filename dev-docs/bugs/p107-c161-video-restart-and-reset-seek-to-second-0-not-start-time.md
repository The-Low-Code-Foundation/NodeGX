---
id: P107-C161
title: Video — Restart and Reset seek to second 0, not Start Time: with a Start Time set, a Restart plays from before it, and the seek takes the End Time bound with it
status: fixed
severity: medium
area: runtime / Video (noodl-viewer-react/src/components/visual/Video/Video.tsx `restart` :184-189, `reset` :197-203; the port descriptions, noodl-viewer-react/src/nodes/visual/video.ts :70 and :105)
found: P107 NSP-018 s77, 2026-10-10 — writing the node's rules in words
kit: node-spec
evidence: read on the runtime 2026-10-10 — video.ts :70 Restart "Seeks to the beginning and plays, then fires Done", :105 Reset "Stops playback and seeks to the beginning"; Video.tsx :187 and :200 `this.video.currentTime = 0`; Start Time / End Time reach the element only as the `#t=start,end` media fragment on `src` (Video.tsx :84-89, media-fragment.ts :56 `withMediaFragment`), never as a seek. The spec records it (packages/nodegx-node-spec/src/nodes/video.ts :351 / :353 copy the two descriptions; its words at :533 and :541 already say "goes back to second 0 (Playback Position 0 — not Start Time)")
---

A Video with Start Time 30 loads at second 30: the port composes `#t=30` onto the source (Video.tsx :89), and the browser
opens the file there. **Restart** and **Reset** then do `currentTime = 0` (Video.tsx :187, :200) — second 0 of the file,
not the 30 the author set — so a Restart plays the thirty seconds the Start Time was there to skip, and a Reset parks the
video on a frame the author never meant to show. The descriptions say "the beginning" (video.ts :70, :105), which for a video
that begins at Start Time is the wrong second.

A second effect, read in the browsers' behaviour and not driven here: an End Time is enforced only as the media fragment's
end, and a seek outside the fragment (which `currentTime = 0` is, with a Start Time set) discards the fragment's clip in
Chromium and Firefox, so after a Restart the video no longer pauses at End Time either. The spec's own `startTime` words
(:514) say the fragment is the only mechanism — "put into the address it loads from".

**Why no test saw it:** the spec plays `currentTime = 0` (video.ts :956 and the `restart` / `reset` ops at :893-907), so
conformance agrees by construction; NSP-018's s77 words at :533 / :541 already state "second 0 — not Start Time", which is
the lane recording the behaviour it found, not the behaviour the ports describe. No scenario sets Start Time and then
Restarts, and the fragment's end bound is browser behaviour no target plays.

**Why it matters now:** the published rule for Restart now contradicts the published description of the same port one
line away ("the beginning" vs "second 0 — not Start Time"). (Row C97, the embedded player's Play / Restart throw, is the
separate, known defect on these actions and is not this.)

**Ruling needed (R1):** (a) Restart and Reset seek to Start Time when one is set (Video.tsx :187 / :200 become
`currentTime = startSeconds || 0`, with the same `fragmentSeconds` clamp the spec uses at :689), which also keeps the seek
inside the fragment so End Time keeps bounding playback — the change the descriptions already promise; the spec's
`restart` / `reset` ops take Start Time, `version` up with a `changes` entry naming this row (NSP-010); or (b) keep second 0
and say it in the two descriptions (video.ts :70, :105 and the spec's :351, :353): "Seeks to second 0 (not Start Time) and
plays…". Regression when fixed (a): `packages/nodegx-node-spec/scenarios/Video.json` "Restart with a Start Time of 30 goes
to Playback Position 30, not 0 (row C161)".

**Ruled 2026-10-12 (R27, P107 s91 rulings page, asked in plain words with the reach measured that morning):** **"Restart and Reset go to Start Time (or 0:00 when there isn't one)"** — option (a). `Video.tsx` :187 / :200 and the spec's `restart` / `reset` ops, `version` up; the regression scenario above. 13 Video nodes in Richard's projects, none with a Start Time. Built s92 (below).

**Fixed 2026-10-12 (P107 s92):** `media-fragment.ts` `startSeconds` (Start Time as the fragment reads it, second 0 when
there is none); Video.tsx `restart` / `reset` seek there, from `this.props.dom.startTime` — the Start Time the component was last
drawn with. The spec (v6, with its `changes` entry) holds that as `elStart`, written with the other drawn flags on every paint, so
a Restart in the frame Start Time changes seeks to the one drawn, and the frame's end then loads the new address. Port
descriptions in both: "Seeks to Start Time (the beginning when there is none)". Regression scenarios in `scenarios/Video.json`:
"Restart with a Start Time of 30 goes to Playback Position 30, not 0 (row C161)" and its twin with Start Time as the text
"12", then 20, then a negative and a cleared one. Runtime at seed 20738: every scenario passes, 0 mutant survivors (the six
declared equivalents now name `elStart` in the paint's keys); control (Video.tsx's `currentTime = 0` put back) red on exactly
the two. A first twin graded nothing (its Restart in the frame Start Time changed is overwritten by that frame's reload before
the settle reads Playback Position) and was rewritten. The run is still red on this seed for P107-S92-VIDEOEMBEDSEED, identically
at HEAD's v5. **The export (P18):** not checked. The End Time half (the browser drops the fragment after a seek outside it) is browser behaviour no target plays; the seek
now stays inside the fragment, which is what keeps it.
