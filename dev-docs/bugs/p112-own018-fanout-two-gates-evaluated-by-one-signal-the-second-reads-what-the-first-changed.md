---
id: P112-OWN018-FANOUT
title: "Two Conditions evaluated by one signal: the second reads the state the first one's On True has already changed — Mistral's quiz scored each answer against the NEXT question's correct answer (all five right → 1)"
status: fixed
severity: medium
area: runtime / signal fan-out and update order (Condition `eval` with `runOnChange-condition: false`, a sibling gate's chain changing its condition's inputs in the same frame); kit guidance either way
found: P112 OWN-018 s2, 2026-10-13 (Mistral Large 4 in OpenCode, quiz run 4; tarballs tgz6 at d787c2220)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §14
launch: beta
regression: packages/noodl-editor/tests-unit/p112/condition-reads-a-siblings-change.test.ts
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

**Ruled by Richard, 2026-10-27 (Beta sweep s19): "Teach it and warn".** Asked: *"When the timer ended it set off two
checks at once … The move-on check changes the question before the scoring check looks, whichever order they are
wired in … What should NodeGX do?"* — teach it and warn / teach it only / change the runtime. So: no runtime change;
Condition's notes and the agent's guidance say "chain them", with an example, and the Problems box warns when a
graph is wired the broken way.

Measured first at HEAD, s19 (`packages/noodl-runtime/test/corpus/p112-own018-fanout.test.ts`): a pulse into two
Conditions, the score gate's condition `index == 0` over a Counter, the advance gate increasing that Counter. Wired
score-first or advance-first, pulsed from outside a frame or inside one: `missed`, index 1, all four. Control (no
advance gate): `scored`. Chained (score's Done → advance's Evaluate): `scored`, index 1. So wire order is no remedy;
only the chain is.

**Built s19, as ruled.**
- **Warn:** editor rule `condition-reads-a-siblings-change` (ALL_RULES, so the Problems panel, Studio's problems box
  and every agent write): a signal port into two or more Conditions' Evaluate, where one gate's outputs reach,
  forward, a node feeding the other's Condition along value wires. Warning, not blocking; it names the reader, the
  writer and the signal, says the reader reads after the change "whichever order the two are wired in", and gives the
  chain. Its walks pass only through catalog-known logic nodes (a visual element's or a component instance's
  outputs answer a later event), and two gates on two `at-` states of one States node are a dispatcher, left out.
- **Calibrated** over 260 local projects (789 Conditions; worktree copies and `~/Documents` left out). The first cut
  gave 41 hits, all false: 6 on the todo template's Dialog flow (a States dispatcher) and the rocket race's Move A/B
  (linked through the results screen's Play again). After the two exclusions: 0 hits. Mutant each exclusion: its own
  test goes red. Mistral's run-4 app is not on disk, so the known-firing case is its shape from this row, Function hop
  included (`tests-unit/p112/condition-reads-a-siblings-change.test.ts` 8/8).
- **Teach:** Condition's anti-pattern corrected to the measurement (it said "the second can read the changed value";
  the reader reads it whichever order); example `score-then-move-on` (the chain), cited by the anti-pattern and
  attached to the warning (`diagnosticExamples.ts`, `rejectionExamples.test.ts` 8/8). `catalog:examples` 116/116; the
  example rewired the broken way fails it with this warning (control). Enriched catalog merged, check up to date. The
  briefing (`guidance.ts`, `instructions.ts`) names no node's pitfalls, so nothing was added under its budget.
- Runtime pin: `noodl-runtime/test/corpus/p112-own018-fanout.test.ts` 8/8. Editor validator suites 160/160.
