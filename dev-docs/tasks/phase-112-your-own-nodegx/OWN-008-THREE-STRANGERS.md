# OWN-008 — Three strangers

**Opened 2026-10-02.** **Depends on OWN-007** (and therefore on everything before it).
**Status: 📋 not started.** The phase's thesis test.
**Model:** **Opus, on purpose, for the three strangers**: the test is whether the kit is enough for the model a person has by default. The session that runs them and reads their questions: Opus. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **Three agents that have never seen this repo each build a different NodeGX editor from the kit and the brief alone,
> and each opens the real todo app, changes it, and saves it so the official editor opens it unchanged.**

## 2. Why

README §7 criteria 1 and 2. A kit proven only by the people who wrote it is not a kit. NSP-006 is the method: a fresh
agent, a scratch directory, a brief, the suite, a list of what it may not read, and a timed report. Here the stranger
also gets a wish, because "your own" means each editor is different.

## 3. What to build

1. **A lab directory per stranger** holding only the published kit (or, if R2 rules against publishing, a copy of the
   kit's packages), the brief, the suite, and a copy of `templates/todo-list`. No repo, no `git`, no web search.
2. **Three wishes**, chosen so the editors share nothing but the kit:
   - *"Show my project as a 3D map I can fly through, and let me rewire it there."* (the prototype's direction)
   - *"A big-block editor my children can use: few nodes, huge targets, no jargon."* (Richard's daughters and P108's
     Coding Garden are the audience; memory: *kids, no clock*)
   - *"A table: one row per node, one column per port, edit cells to change the app."* (nothing visual at all)
3. **Each stranger reports**, as NSP-006's did: start and finish time, tokens if the harness reports them, every
   question they had to answer by guessing, and the suite's output.
4. **Fold back**: every guess becomes a sentence in the brief or a fix in a package, and the run is repeated for any
   stranger whose guess changed the result.

## 4. Acceptance criteria

1. All three pass the suite on the todo template; the official editor opens each saved project with zero new validator
   diagnostics.
2. No stranger read a file outside the lab (the lab's tree is hashed before and after, as NSP-006's was).
3. Each stranger's report is in this folder, with the time taken, and the brief's change log names what each one
   added.
4. Richard has looked at the three editors (a screenshot each is enough to start).

## 5. Watch for

- NSP-006 §5.4: the hole the pilot could not see was found by a stranger whose target read outputs only at settle. The
  strangers' editors will find holes in the suite. A stranger that passes with something obviously wrong is a suite
  defect, filed in OWN-006 §6, not a pass.
- Memory: *one heavy job*. Run the strangers one after another, not three at once, and tear each lab down after.

## 6. Built

*(empty)*
