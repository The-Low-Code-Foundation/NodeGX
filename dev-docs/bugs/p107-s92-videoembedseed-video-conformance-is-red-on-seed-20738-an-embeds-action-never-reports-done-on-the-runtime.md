---
id: P107-S92-VIDEOEMBEDSEED
title: Video's runtime conformance is red on the 2026-10-11 and 2026-10-12 seeds — on a YouTube embed, Play, Pause or Restart reports Done on the interpreter and nothing on the runtime before the trace ends
status: open
severity: low
area: runtime / Video on an embed (noodl-viewer-react/src/components/visual/Video/Video.tsx, nodes/visual/video.ts `outcomeOnInnerComponent`) — or the runtime target's settle; not yet told apart
found: P107 s92, 2026-10-12 — the runtime conformance run for C161 (R27)
evidence: `NSP_ONLY=Video npx jest test/node-spec/conformance.test.ts -t Video` in packages/noodl-runtime at seed 20738 — 3 generated divergences (seeds 688820075, 2117862767, 2081600681), every scenario passing. Identical at HEAD `a94119947`'s Video files (v5, before C161) and with C161 (v6)
kit: node-spec
---

Today's rotated seed draws three generated sequences on a YouTube embed (`src` `https://youtu.be/dQw4w9WgXcQ`) where an
action's outcome is the trace's last event: the interpreter records `{"t":"outcome","port":"pause"|"play"|"restart","value":"done"}`
and the runtime's trace ends (`<end of trace>`) or settles with no outcome. One of them, shortest: params with `startTime: true`,
`endTime: -1`, steps `focus, settle, progress 2.5, advance 1, advance 1000, release, advance 499, settle, hover, settle, pause,
advance 499, settle` → event 59 differs.

**Measured:** the same three seeds diverge at HEAD's Video files (v5) — a control with the four C161 files swapped back — so
C161 did not cause it; the mutant tally is the same either way (2,781 / 2,789, the rest declared equivalent). The known rows
C96–C100 attribute 0 of the three (C97 is Play or Restart on an embed *after a `<video>` loaded*; these sequences start on the
embed).

**Not one seed:** at the 2026-10-11 seed (20737) the same run is red too — 2 divergences (seeds 2757896335 on a Vimeo link,
3045991608 on a YouTube link), both a Pause whose Done the runtime never records. So "red on today's seed" undersells it: the
generator reaches an embed's action as the last thing in a sequence often enough to hit it most days. A candidate, NOT checked:
`42699d261` (P109 ISL-045, 2026-10-11, "a built-in node that throws while drawing loses itself, not the page") — the generated
params are hostile (`visible: {}`, `borderLeftWidth: 2^53`), and a node that loses itself while drawing an embed reports nothing.

**Not done:** whether the runtime holds the Done past the trace's end (the spec's words: "Done, in its turn after outcomes the
frame has already resolved") or never sends it on an embed that was never a `<video>`. Recipe: play the shrunk sequence as a
scenario on a fresh target (`play(withViewerNodes(runtimeTarget()), …)`), then with one more `settle` after the action. Until
then the whole Video runtime run is red on both seeds measured, and every other spec's run is unaffected (it is one `test()`
per spec). Whichever it is, it owes a hand scenario that does not depend on the day's seed.
