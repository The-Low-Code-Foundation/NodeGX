# ONT-002 — The conversation is a runner

**Opened 2026-10-08.** **Depends on ONT-001, ONT-005 and R5.** **Status: 📋 not started.**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Fable 5.1 for the brief; Opus 5.5 for the runner** — the brief decides whether the questions arrive before the schema — the thesis itself; the runner is mechanical. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Fable 5.1; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **Every question I am asked about my world has a reason, and the reason is written down: a mistake that would have
> survived if I had not answered it.**

## 2. Why

Richard: *"it's not pushing the user to predict what things might come up."* A free-form chat asks whatever it thinks
of, or nothing. P107's runner has the shape this needs: generate, grade, and report the mutants that survive. Here a
surviving mutant is a classic mistake the person's answers so far do not rule out, and the question that kills it is
the next question. Nothing else is asked.

## 3. What to build

1. **The brief.** One document an agent reads before the first sentence: what an ontology is in NodeGX terms (README
   §3), how to write a noun and a relation into the files, the one tool, and the rule that a question is asked only when
   the tool names it. Served where P112 R3 serves the kit's brief.
2. **The runner.** `validate` over a project's `docs/world/`: project (ONT-003), generate each relation's mutants (ONT-005),
   grade the mutants against the claims the answers so far make, and return the survivors as a list of questions in
   the person's words, each with the kind, the relation and the incident it stands for. Empty list means the world is
   described enough to build.
3. **The budget.** Questions ranked by the corpus incidents each would have prevented (ONT-000 step 3); the runner
   returns the top few, not all. A question with no incident behind it is asked only when a mutant survives and nothing
   ranked higher does.
4. **The record.** Each answer written into `relations.json` with the question it answered, so a view can show "what it
   asked me and what I said" (README §2, *See it*).
5. **The one tool** (R5). `validate_ontology`, or the existing `validate_project` grown by one section, whichever the
   budget gate allows. Measured before chosen.

## 4. Acceptance criteria

1. On a fixture world with no answers, the runner asks, in order, the questions whose incidents rank highest, and asks
   nothing for a relation whose mutants are all dead.
2. On the Acme-shaped fixture with the *ends* and *exists elsewhere* questions unanswered, those two are in the first
   list returned (ONT-009's precondition).
3. Every question returned names its mutant and its incident; a question with neither cannot be returned.
4. The tool surface after this task is inside the MCP budget gate.

## 5. Watch for

- **The MCP cannot write `docs/world/` today (found by ONT-001, 2026-10-08).** `write_project_doc` refuses every path under
  `docs/` that is not `.md` (the editor's `assertInsideDocs`, `docsText.ts:438`). Claude Code can write the files with its
  own tools; an agent on the MCP alone cannot. The writer exists and is pure (`planWorldWrite` in
  `@nodegx/project-contract/world`, the `if_revision` rule) — whether R5's one tool writes through it, or the docs
  containment widens to `docs/world/*.json`, is this task's call, after the budget gate is measured.

- **The agent asks anyway.** The brief says the rule; the honesty number for the ontology (README §12) counts answers
  with no question behind them.
- **A predicate with no arm** (memory: *an arm with no predicate in it*). A mutant whose claim grades nothing in both
  arms is not a question; ONT-005's suite proves each mutant can fail before it can ask.
- **Question text is copy.** Pass it through the content-authoring skill (memory).

## 6. Built

*(empty)*
