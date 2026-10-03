---
id: P108-S9-BUILT
title: A building her robot built in the Workshop went back to unbuilt — every Play and Start over restarted from the save, which only the island tick wrote; a kept island drew parts the save held as unbuilt
status: fixed
commit: 710c7a05c
severity: high
area: template / Olive's Island — Pages/Workshop + Workshop/Play (Start world's consumers), Island world (the kept state), Read family's land text; new p108s9Land.ts (Land keep here, Land start, Land lift)
found: P108 (the island works) s9, 2026-10-03 — Richard: "it doesn't show as built until you go back to the island and return to the plot of land. And sometimes it even goes back to being unbuilt … Once built, they should be permanent and out of the game modes."
evidence: scripts/devtools/drive-p108s9.js --mode 2d BUILT — 14/14 on s9; the same drive on the template before s9 (4e965d3c2) 5/14 (the stone in at 6/6, the save still 5/6, Start over back to 5/6, the island 5/6); p108s9.test.ts (arms red: no lift → the Workshop opens the spa empty; no island lift → the kept island draws it short)
---

Measured: the Workshop on her land never wrote a part to her save (only `Island keep` did, at island moments), and
every Play and Start over began from the land as the save held it — so what a robot built in the Workshop vanished
at the next Play, and came back only after her robots rebuilt it on the island. Separately, the island goes on from
its kept state (`gardenIsland`) whenever the build hash matches, and the hash never moves with a part's `have`.

Fixed (c25fb8ee5, 710c7a05c): `Land keep here` writes each part the moment it is delivered — by a program (runner
tick) or by the pad, Drive or Teach — and a part's have only rises; `Land start` / `Land lift` give the Workshop's
drawn start, the runner, the pad and Teach every part her save holds; Island world lifts a kept island's land the same
way; Read family's land text drops `have`, so the Workshop's own write never re-runs Start world (its Ran clears her
program). Sources and bowls stay the island's.

**Plain words:** *"Whatever a robot builds, in the Workshop or on the island, stays built — Start over and Play never
take it down."*
