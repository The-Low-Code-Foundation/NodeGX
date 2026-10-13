---
id: P112-OWN019-AFTERTIMEOUT
title: "In Mistral's quiz v12, the first right answer after a question timed out is not counted (score 2 where a person earned 3) — five right answers score 5/5, so it is the sequence; the agent's checks tried timing out and scoring apart, never together"
status: fixed
phase: P112
task: OWN-019
severity: medium
area: the app's graph (v12, `Components/QuizEngine`) — not the runtime; the kit's notes (the Condition's) never named the trap
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

**Found (s3, 2026-10-13): the app, not the runtime.** v12's timeout is a Condition (`qe-timeout`, Run On Value Change
left on) watching an And of "seconds ≤ 0" and "not answered". After Q4 timed out, moving on ran
`clear-answered → clear-selected → reset-seconds → advance-index`: for the steps between the first and the third,
`answered` was false while `seconds` still read 0, so the gate fired again on the next question — `answered` true, a
1 s Timer started — and Bern's tap was refused by the "can answer" gate. The grader saw Q5 end 830 ms after the tap.
**Control pair** (s3 scratchpad `at/`, grade-quiz on tgz20's preview): v12 as built **8/12** ("You scored 2");
the same app with three wires re-pointed so the order is `reset-seconds → clear-answered → clear-selected →
advance-index` **12/12** ("You scored 3", carryover clean). No runtime change.

**Fixed in the notes:** the Condition's enrichment gains an anti-pattern — a gate on Run On Value Change fires the moment
its condition is true even for one step mid-chain; reset the value that makes it true before the one that holds it
off. Test `packages/noodl-mcp/tests/own019AfterTimeout.test.ts` reads it through `get_node_type` (control: fails on
HEAD's catalog). The kit side is R31's process: the Vibe kit's CHECKLIST.md plays every worked example whole.


**s2, a second round on the same seam — v11.** Its last think (282 KB, 29.6 min, stopped by the 30-minute watchdog)
was Large 4 debugging its own drive: *"the `tappedIndex` variable read **0**, expected 2 … the repeater re-renders rows
→ the new rows' creation delivers itemOutput-index values (0, 1, 2) → phantom runs"*. A real loop, unlike every
productive think measured: the last two thirds are 100% repeated 8-word phrases (productive thinks ~1%), 74 doubt
words per 10 KB (productive 22–30). Two rounds, two apps, the same seam — a For Each's `itemOutput-*` values when rows
are re-created — so the runtime is the first suspect, and the notes say nothing a builder could use. Reduce it first
(NEXT-SESSION-PROMPT step 4).
