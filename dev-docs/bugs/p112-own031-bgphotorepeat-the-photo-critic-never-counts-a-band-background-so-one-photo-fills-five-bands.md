---
id: P112-OWN031-BGPHOTOREPEAT
title: the photo critic (S1) counts Image nodes only, never a band's background photo, so two photos repeat behind five bands and no round repairs it
status: open
severity: medium
area: guided page review (`packages/noodl-mcp/src/guided/review.ts` `critique`, S1; inherited from `own-029/agent.mjs` harness 22989dd1)
found: OWN-031 s2b, 2026-10-29, the first live build_app run with the review loop (bakery, E4B, 2 repair rounds)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-031/runs/projects/family-bakery-lyon-2/.previews/shots/pages-home-desktop.png (gitignored run); `.previews/build-app.json` there, rounds 0–2
kit: mcp
phase: P112 (OWN-031)
regression: none yet
---

What a person sees: on the bakery page, the same two photographs fill the background of five of seven bands
(hero, about, feature cards, call to action, location and hours). The page reads as one photo on repeat.

Cause: `fillSection` gives an `imageGround` band its photo as `backgroundImage` and never sets `photoFile`, the field
S1 counts. S1 therefore sees one Image (the hero's) and no repetition, and the band-look questions keep picking
`imageGround` (it is offered on every section kind but the footer whenever the page has photos). S8 (three dark bands
in a row) fires, but its flip affects one band per round.

Fix (not done): count a band's background photo as a use in S1, with a repair that flips the band look or re-asks it
without `imageGround`. This changes what the critics find, so the paired gate (`own031GuidedReview.test.ts`), which
equals the lab by construction, needs the change as a deliberate fork: a flag, or new fixtures from a lab run with the
same rule.
