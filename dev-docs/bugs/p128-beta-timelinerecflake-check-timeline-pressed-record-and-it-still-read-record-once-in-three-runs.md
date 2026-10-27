---
id: P128-BETA-TIMELINERECFLAKE
title: check:timeline pressed Record and Studio still read "Record" (not "Waiting for the app"), then aborted at "nothing on screen at #tlopen" — once in three runs this round, green on the next run
status: open
severity: low
area: "nodegx-studio `editor/timeline-check.mjs` ~222 (`b.clickSel('#recbtn')`, then `recState()` after 300 ms); `editor/studio.html` the header fold (`setupHeaderFold`, P123-STU-TOPBAROVERFLOW), which re-fits on every header text change"
found: P128 Beta round, Track A, 2026-10-27, the final gate sweep on nodegx-studio fcdd55e
evidence: "MEASURED: check:timeline 53/53 on b332a15's tree (22:2x), FAIL 25/27 on fcdd55e at 22:46:30 (`Record waits for the app … — \"Record\"`, then `the gate itself: nothing on screen at #tlopen`), PASS 53/53 on the same tree at 22:47:22; load average 6–8. Between b332a15 and fcdd55e nothing the timeline reads changed (the map pin, the option-set words, lib/nodegx.mjs resolving the same folders). NOT established, one candidate: STU-080 put Preview ↗ in the header; at the gates' 1600 px it fits with 8 px to spare (measured: apppreviewbtn right edge 1586, header 1600), so a longer status or backend pill folds it into ⋯ and back, and each fit moves header children. recbtn sits left of the spacer and was not seen to move; nobody has watched the fold during that click."
regression: none yet
owner: none
launch: none
---

What a person sees: nothing measured. The gate's click on Record did not start a recording once, under load, and the
next run passed. The next session that sees it red reads `#recbtn`'s rect before and after the click and whether
`#morebtn` toggled in between, before calling it the fold or the machine.
