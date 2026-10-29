---
id: P112-OWN030-PILLSENTENCE
title: A sentence put in a pill never wraps, because the pill and its Text are both content-sized, so the pill runs past a phone's right edge and the page scrolls sideways; nothing warns
status: open
severity: medium
area: style vocabulary (`badge` composition, StyleCompositions.ts) + runtime Text contentSize; validate / render_report (no warning)
found: P112 OWN-030 lanes, 2026-10-29 (the graph lane's look checks, phone 390 px)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-030/runs/graph-plumber/look/phone.png and checks.json (overflowX 402), runs/graph-puppy/look (overflowX 295); the trees own-029/runs/G-plumber/r4/tree.json and G-puppy/r4/tree.json (section testimonials, look `badge`)
kit: core
phase: P112 OWN-030
---

What a person sees: on the plumber page at phone width, a pill under the testimonials reads "Serving the community
with decades of proven e…" on one line and runs off the right edge of the screen. The whole page scrolls sideways by
402 px. The puppy page does the same by 295 px.

What the agent wrote (sensible, and what the kit teaches): a Group with the `badge` composition (`sizeMode:
contentSize`) holding one Text with `sizeMode: contentSize`, exactly as the composition's description says ("the
Texts inside contentSize too, or they split it in equal halves" — the P112-OWN020-PILLWRAP teaching). The words it
put in the pill were a 15-word sentence, not "the few words" the role asked for.

Why it breaks: content-sized Text does not wrap, and nothing caps the pill at its parent's width, so a long label is as
wide as its words. PILLWRAP's fix made short labels right and long ones overflow.

Not seen by: the validator, render_report. The emit lane of OWN-030 (the same tree as plain HTML, `width:auto`) wraps
the same pill inside the phone, so this is the runtime's content sizing, not the tree.

Fix candidates: a `maxWidth: 100%` on the `badge` composition, so the pill can hug short words but wraps a long one
inside its parent; or a render_report finding for any element past the window's right edge at phone width.
