---
id: P112-OWN019-CARRYOVER
title: "The next question appears wearing the last one's colours (a moment of green and red on the new answers), and the Vibe kit's checklist never asks the agent to look at the moment a screen appears — so its drives pass and a person sees the flash"
status: open
phase: P112
task: OWN-019
severity: medium
area: kit — the Vibe AGENTS.md checklist step (`packages/create-nodegx/profiles/vibe/AGENTS.md`); the same lesson is owed to the core kit
found: P112 OWN-018 s3 (run 10, observed), OWN-019 s2 2026-10-13 (v7 and v9, Mistral Large 4 in Vibe)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s2); own-018/grade-quiz.mjs `carryover`
kit: core
---

v7 and v9 both grade 12/12 on the quiz and both carry over: the moment "Question 2 of 5" appears, Sydney (in Lisbon's
slot) is green; on Q3 Toronto is red; on Q4 Rabat red. v9's graph shows why: one Function picks each button's
state from `answered`, `tapped` and the question's `correct`; when the pause ends, `advance` sets the new index (new
words, new `correct`) while `answered` is still true, and it is cleared afterwards — so for a moment the new answers
are coloured by the old question's state. v2 and v3 cleared the state first and were clean.

Neither agent's checklist had a line for it; their drives read the colours after a tap and the words after the
advance, never the colours at the moment of the advance. AC4 requires carryover clean.

**Lever (s2, measuring):** the Vibe AGENTS.md checklist step now asks for "what the next screen looks like the
moment it appears: nothing left over from the one before … Reset that state before the words change, not after."
Open until rounds on it come back clean; then the same line for the core kit.
