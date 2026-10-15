---
id: P112-OWN019-GRADERFLASH
title: "The quiz grader's `carryover` reads the new question's answers by screenshot after its words appear, so it cannot see a one-frame flash — the next question's colours painted on the LAST question just before the words change (the Sonnet yardstick: Lisbon tapped right, one painted frame shows Lisbon red and Porto green). Large 4, asked only to check the app, found it; the grader called it clean"
status: open
phase: P112
task: OWN-019
severity: high
area: the lab — `own-018/grade-quiz.mjs` `answerQuestion` (carryover: `waitText` at 25 ms, then one `Page.captureScreenshot` per answer, after the advance); every carryover verdict it has given
found: P112 OWN-019 s8, 2026-10-15 (AC3 round K-control: Large 4 on tgz33 checking the Sonnet yardstick quiz, "change nothing")
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s8); s8 scratchpad `flash/` (flash-probe.mjs, flash-grade.mjs, the painted frames)
kit: lab
---

AC3's control round handed Large 4 the Sonnet yardstick (grade-quiz 12/12, `carryover: clean`, today and in OWN-018)
with "check it against what I asked for; change nothing". Its report: 22 of 23 lines work; **one defect — on 3 of 5
question changes the new answers flash the wrong colours for about one frame**, with its `watch` evidence (Toronto red
for one sample at 953 ms, white from 982 ms) and a cause ("the new question's data arrives one step before the previous
answer's colour state is reset").

Measured independently (s8, CDP screencast = every frame Chrome painted, phone size): **the flash is real and painted,
on every change.** The DOM log at the Q1 → Q2 change: +0 ms Lisbon red, Porto green (the next question's colour state
on the old answers) · +2 ms Sydney red, Canberra green (the new words, still carrying it) · +17 ms all white. One
painted frame between "Lisbon green" and question 2 shows **Lisbon red and Porto green** — for a person who just tapped
the right answer, ~20 ms of being told they were wrong. The painted-frame grade (`flash-grade.mjs`: each frame's
question by a fingerprint of its question line, each answer's colour by pixels, judged against what that tap should
show) finds it at all four changes (Q1–Q4).

Why the grader is blind: it waits for "Question n" (25 ms poll) and THEN screenshots each answer of the new question,
one after another — the flash is over (~17 ms) and, for the half painted before the words change, on the old
question's answers, which it never reads.

Open: carryover in grade-quiz must be read from painted frames (screencast) across each change, before and after the
words, with the yardstick as its known-firing control; then every carryover verdict since OWN-018 is re-read with it
(T2, T3, T1b — AC4's three — first).

**Re-read with painted frames (s8, `own-019/flash-grade.mjs`, tgz33's preview, the control fired in the same
session every time):** AC4's three **T2 (85 frames), T3 (86), T1b (86): no flash**; R1, R2 none; **R3 fires** on Q2–Q4
for 15+ frames each (its grade-quiz `carryover ✗`, WATCHONE — the known-firing Mistral case). So the grader's blind
spot hid the yardstick's one-frame flash, not a Mistral one: AC4 stands, measured the stricter way. Still open: fold
the painted-frame read into grade-quiz itself.
