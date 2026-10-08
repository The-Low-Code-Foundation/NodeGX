# ONT-005 — The mistakes are mutants

**Opened 2026-10-08.** **Depends on ONT-003.** **Status: 📋 not started.**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Fable 5.1** — the judgement task of the phase: a mutant the claims already kill is not a mutant, and the survivors are the vocabulary's honesty number. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Fable 5.1; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **The mistakes everyone makes the first time they build a database are written down as things the system tries to
> get away with, and a test proves that what I said stops each one.**

## 2. Why

Richard: *"category and subcategory … naturally it should just be a text field … relating subcategories to categories,
creating filtering and indexing etc is going to be a nightmare."* P107's runner patches an implementation and checks
the suite notices. The same move here: a classic mistake is a patch to the right projection, and it survives exactly
when the person was never asked the question that rules it out. A surviving mutant is the runner's reason to ask
(ONT-002). This is the piece that joins the two ideas.

## 3. What to build

1. **The list.** From ONT-000 step 5 (Richard's Bubble list) and the corpus: free text where a fixed list belongs;
   a fixed list where an open one belongs (tags as a Choice); a Link where a Links with a date belongs (one account,
   no history); a Links where a junction with properties belongs; no end date on a thing that ends; a hard delete on a
   thing whose history must stay; an external id stored nowhere; a name used as an identity; a path answered by
   copying the far value into the near row; a number stored as text. Each with the kind it is a mutant of and the
   question that kills it.
2. **The mutant generator.** For each kind, `mutants(answers) → Projection[]`: the projections a kind would produce if
   one answer were missing or wrong. Declared per kind, like `equivalent-mutants.ts` declares P107's.
3. **The grade.** For a fixture ontology with full answers, every mutant fails at least one claim (ONT-003) on both
   adapters. For the same ontology with one answer removed, the mutant that answer kills survives, and the runner
   (ONT-002) returns that answer's question.
4. **The honesty number.** Survivors on a fully answered fixture are the vocabulary's unseen mutants; counted and
   printed, never hidden, as NSP-005's reach number is.

## 4. Acceptance criteria

1. Every mutant on the list is killed on the fully answered fixture, or it is named in the survivors count with the
   question that would kill it added to its kind.
2. Removing any one answer from the fixture makes exactly its mutant survive, and the runner names that question.
3. The category/subcategory example from Richard's message is a fixture: with "a subcategory belongs to exactly one
   category, from a fixed list" unanswered, the free-text mutant survives; answered, it dies.

## 5. Watch for

- **A gate can have a hole shaped like the defect** (memory). A mutant that passes because the fixture has no rows that
  exercise it is a green gate pinning the mistake. Each mutant's fixture carries the row that breaks it.
- **Elimination over an unchecked list** (memory). The list is from the corpus and Richard; it is not complete, and
  ONT-000's census says what it was read from.

## 6. Built

*(empty)*
