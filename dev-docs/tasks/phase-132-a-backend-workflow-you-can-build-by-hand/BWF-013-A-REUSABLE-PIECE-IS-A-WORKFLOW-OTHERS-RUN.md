# BWF-013 — A reusable piece is a workflow others run (R6)

**Phase:** [132](README.md). **Ruling:** R6 (2026-11-03). **Size:** about 2 sessions (engine kind, Studio list and
selection, the editor drawing the kind).

## What he met

> "the 'reusable pieces' list doesn't seem to have any controls. I can't see to create a reusable piece from scratch,
> not select a bunch of nodes in a workflow and group them into a reusable piece."

*Reusable pieces* is the cloud functions list (`renderFnList`): node graphs Studio cannot create, no *New*, and a
workflow's steps cannot become one (steps and nodes are different things). R6: a piece made by hand is a **workflow
with no trigger** that other workflows run. This reverses "sub-workflows" in the README's Not taking.

## Build

1. **Engine:** a `run-workflow` kind: `workflow` (an id), `send` (named values, arriving as the piece's `body`); its
   output is the piece's `return` value. Refused at write: a ring (A runs B runs A), checked across the definitions, as
   `WorkflowEngine.ts` refuses a cycle inside one; at run time a depth cap as a second guard. The run record links the
   child run to its parent step (*Open that run*). Agent catalog words: a piece is how to reuse steps.
2. **Studio list:** *Reusable pieces* shows the workflows no trigger starts, with *New* (a piece: name, first step), and
   the cloud functions under them as "made by the agent: open their steps". A piece's row says which workflows run it.
3. **Make a reusable piece:** select steps on the canvas (shift-press, or a drag box), *Make a reusable piece*: allowed
   when they form one chain in, one way out; they move into a new workflow ending in a `return` of the last step's
   output, and one *Run <piece>* step takes their place, its `send` filled with the values the moved steps read from
   before them (BWF-003's `upstreamOf` / `readSources` say which). Refused in words otherwise ("these steps have two
   ways out").
4. **The NodeGX editor** draws a `run-workflow` step with its piece's name and opens it (BWF-008's panel).

## Acceptance

- AC1: on a Greenhouse copy, *Find thirsty plants* made as a piece with *New*, run from *The morning check* and from a
  second workflow, both tested.
- AC2: two steps of *TriggerTest* grouped into a piece; the workflow's test gives the same result before and after.
- AC3: a ring is refused with both names; an agent asked to reuse steps across two workflows writes `run-workflow`.
