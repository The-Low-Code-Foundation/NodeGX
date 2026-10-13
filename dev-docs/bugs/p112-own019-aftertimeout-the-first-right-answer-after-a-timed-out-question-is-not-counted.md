---
id: P112-OWN019-AFTERTIMEOUT
title: "In Mistral's quiz v12, the first right answer after a question timed out is not counted (score 2 where a person earned 3) — five right answers score 5/5, so it is the sequence; the agent's checks tried timing out and scoring apart, never together"
status: open
phase: P112
task: OWN-019
severity: medium
area: unknown yet — the app's graph (v12, `Components/QuizEngine`) or the runtime's ordering of a For Each item signal and its item output value across a component boundary
found: P112 OWN-019 s2, 2026-10-13 (Vibe kit round v12, Mistral Large 4, kit tgz19)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s2); round v12 in the s2 scratchpad
kit: core
---

The grader's play (the brief's own example): Lisbon right, Sydney wrong, Ottawa right, question 4 left to time out,
Bern right → "You scored 3 out of 5". v12 shows **2**. Probes, each on the same app:

- the score on screen after each tap: Lisbon 0→1, Sydney 1→1, Ottawa 1→2, **Bern 2→2** (after Q4's timeout);
- the same play with a 1.2 s pause before every tap: still 2 — not the grader's speed;
- five right answers, no timeout: **5 out of 5** — so the last question counts; the tap after a timeout does not.

v12's wiring: the For Each's `itemOutputSignal-clicked` → the engine's `answerTapped` (signal) and
`itemOutput-clickedIndex` → its `tappedIndex` (value); inside, `tappedIndex == correctIndex` (an Expression) is the
condition a Condition evaluates on `answerTapped`. Ottawa and Bern are both index 2, so the tapped index does not
change between them; Q4's timeout went through `qe-timeout-answered`, not the tap path. Not yet known whether the app
or the runtime drops it — reduce it to the smallest graph first (a For Each row signal + an unchanged item value
into a component, an Expression on it, a Condition on the signal).

The kit lesson either way: the agent's checklist drove each line on its own. A request's own worked example ("You
scored 3 out of 5" — right, wrong, right, timed out, right) is a line to drive whole.
