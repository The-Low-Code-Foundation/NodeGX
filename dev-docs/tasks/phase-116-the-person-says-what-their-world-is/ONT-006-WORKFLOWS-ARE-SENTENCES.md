# ONT-006 — Workflows are sentences

**Opened 2026-10-08.** **Depends on ONT-001 and NSP-014** (✅). **Status: 📋 not started.**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Fable 5.1** — it invents a small language (a verb over the graph with named failure arms); the sentence shape wrong is a phase-level mistake, not a bug. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Fable 5.1; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **The thing I do every week is a sentence over my world with its failures named, and when a step cannot be done the
> system says which one and why, in the words I used.**

## 2. Why

README §1 readings 4 and 7. The workflow engine has fifteen step kinds with error edges; the 24 backend nodes are
specced as the requests they make and what they do with each answer, failures included (NSP-014 AC5). What does not
exist is the workflow as a sentence. Acme's enrolment note is that sentence, written by hand after an incident:
*when a membership is activated, create or update the person here, create or update them in the mailing system,
enrol them in the learning platform; if they have no account there yet, skip the enrolment and record it.* The
"skip and record" arm is P107's known row for a person: counted, never hidden.

## 3. What to build

1. **The verb.** `verbs.json` in `docs/world/`: a sentence, the nouns and relations it touches, its steps as sentences,
   and its failure arms, each with what the person sees. A verb's steps bind to step kinds and to specced nodes by
   name; the binding is checked by the validator.
2. **The projection.** A verb projects to a workflow definition (`WorkflowDefinition`, `steps`, success and error
   edges) through the admin workflow route, never by hand; the failure arms become error edges whose target step
   records the arm in the person's words.
3. **The grade.** A verb's claims played through NSP-014's world: the requests it makes, in order, and the arm taken on
   each scripted failure. The enrolment fixture: the member exists elsewhere → three requests and done; the member does
   not → two requests, the arm "no account there yet" recorded, the membership still created.
4. **The view.** Each verb is a button in the data manager (ONT-008) with its sentence under it, and a run shows the
   arm taken in the person's words, from the engine's run record (BMG-009's Runs page already lists runs; this adds the
   sentence).

## 4. Acceptance criteria

1. The enrolment verb projects to a runnable workflow and both arms are taken on the fixture, with the request count
   asserted in the world.
2. The archive verb (the archive note's table, "stays / ends") projects to a workflow whose steps are the rows of
   that table, and a claim per row passes on both adapters.
3. A verb that names a step kind or a node that does not exist is refused by the validator with the name expected.

## 5. Watch for

- **A throw wears the emitter's name** (memory). The arm recorded must name the step that took it, not the one that
  reported it.
- **Cloud-only nodes** (NSP-022) are not specced; a verb that binds to one is `outside` in the runner's words, counted.
- **Server-side verbs** run in the engine; client-side ones in the app. The verb says which, and the projection
  refuses a mix it cannot honour.

## 6. Built

*(empty)*
