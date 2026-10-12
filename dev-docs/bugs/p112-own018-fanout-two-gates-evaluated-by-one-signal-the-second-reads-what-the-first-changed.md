---
id: P112-OWN018-FANOUT
title: "Two Conditions evaluated by one signal: the second reads the state the first one's On True has already changed — Mistral's quiz scored each answer against the NEXT question's correct answer (all five right → 1)"
status: needs-ruling
severity: medium
area: runtime / signal fan-out and update order (Condition `eval` with `runOnChange-condition: false`, a sibling gate's chain changing its condition's inputs in the same frame); kit guidance either way
found: P112 OWN-018 s2, 2026-10-13 (Mistral Large 4 in OpenCode, quiz run 4; tarballs tgz6 at d787c2220)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §14
---

Mistral's `Pages/Home` (run 4): the reveal pause's `timerFinished` → `eval` on two gates, wired in this order:

1. `home_score_if_correct` (Condition, condition ← Expression `selected == correct`) → `ontrue` → score Counter `increase`
2. `home_not_last` (Condition, condition ← `index < 4`) → `ontrue` → question-index Counter `increase` (and the next
   question's resets)

The question index feeds the Function that publishes `correctIndex`, which feeds `selected == correct`. Measured by the
agent itself with four controlled drives: the point for question n was decided with question n's tap against question
n+1's correct answer, except the last question, which does not advance and scored correctly. All five right → 1.

Both gates are passive (`runOnChange-condition: false`) and evaluated by one pulse, the shape the Condition notes now
recommend. The first in wire order still decides AFTER the second's chain has moved the index: by the time
`score_if_correct` reads its condition, the Expression has re-evaluated over the next question.

**The question to rule:** is one signal's fan-out supposed to see the world as it was when the signal fired (each
target reads the state before any sibling acts), or is this the author's race to order (chain: score's `done` → the
advance)? GAM-004 ("a gate reads the value from the same turn as its signal") covers a gate and the value its own
signal produced, not a sibling's effects.

- If the runtime should hold: a fix in the update loop (siblings of one pulse evaluate before any of them propagates),
  with GAM-004's harness extended by this graph.
- If it is the author's to order: one line in Condition's notes ("two gates off one signal, where one changes what the
  other reads: chain them — the reader's `done` → the writer's `eval`"), and an example.

Either way it is not Mistral's: Sonnet's run 0 met the same family (it rewrote its advance as one Function).
