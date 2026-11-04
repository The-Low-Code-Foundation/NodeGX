---
id: P112-OWN038-VAGUEOFFER
title: "Cline + DeepSeek makes the first-run practice-round offer to a person whose first message already names an app (\"an app for my running club\"), against R13's \"only when they haven't said what to build\""
status: open
phase: P112
task: OWN-038
severity: low
area: packages/create-nodegx/bin/create-nodegx.js (AGENT_NOTE, the line "If I'm new to building with an AI and haven't said what to build yet, offer me the practice round in one line")
found: P112 OWN-038 AC4, 2026-11-04 (arm cl-vague, Cline 3.0.71 + DeepSeek V4.1 Flash, create-nodegx 0.2.10 from npm)
evidence: /Users/Shared/nodegx-lab/own038/cl-vague/sittings.json (sitting 1); dev-docs/tasks/phase-112-your-own-nodegx/own-038/RESULTS.md
kit: create-nodegx
---

The person's first message: "I've never built an app before. I want an app for my running club." Cline's first
reply opened with the round's offer, word for word from the note, then asked about the club app. Claude Code on the
same kit and message made no offer at turn 1. It offered once, later, after the person's first vague answer (the
sign of trouble the guide names).

What it costs: one extra line for a person who has said what they want, the obligation R13 kept out. AC4 still
passes on its count (one offer for the vague person, none after; zero for the clear person, whose message named every
detail). One sample.

Read: "haven't said what to build yet" is a judgement, and a vague brief ("an app for my running club") reads to
DeepSeek as not having said. Fix candidates (not chosen): name the case in the note ("If my first message names an
app or game, even in a few words, don't offer it then"); or leave it, since the offer is one line and a vague brief is
the person the round is for. Ask Richard before changing it; R13 was his. Re-measure: the same message in a Cline arm
gets no offer at turn 1.
