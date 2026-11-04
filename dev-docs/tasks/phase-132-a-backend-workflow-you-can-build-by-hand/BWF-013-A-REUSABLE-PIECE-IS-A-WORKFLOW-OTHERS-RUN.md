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

## s16 (2026-11-04): Build 1 (the engine) built; Studio, *Make a reusable piece* and the editor are next

**The kind.** `run-workflow` (*Run a workflow*, category Workflow, beside *Call Function* in the catalog's order):
`workflow` (an id, required) and `send` (`{ <name>: value }`, each a literal, `$path` or formula, resolved by the
engine). The piece runs as **its own recorded run** through the same engine, `send` arriving as its `body` (built by
`buildRunPayload`, type `internal_event`, so `body.<name>` reads it as any run's body). The step's output is
`{ result, run }`: `result` what the piece answered (its `return`, else its last step's output), `run` the piece's run
id. Same `result` wrapper as a function step's, so `pathWords` already says `upstream.ask.result.x` as "x".
- The piece's record names its parent: `parentExecutionId`, `parentWorkflowId`, `parentStepId`, `pieceDepth` (for
  *Open that run* in both directions).
- A failing piece fails the step: `the piece "Always fails" failed at its step "Say no": <its message> (its run: …)`,
  so `onError` applies. A cancelled parent cancels the piece (through `onStarted`, the run id as soon as it opens).
- Handed on: the test mark, and "started by the app" (P127-BKO006-SCHEDULEAUTH). A piece run by a schedule's run
  counts as the app, though `internal_event` alone would not (`RunOptions.startedByApp`).
- **Rings refused at write** (`WorkflowRegistry.writeErrors` → `pieces.ts validatePieceUses`), naming them: `"ring-b"
  runs "ring-a", which runs "ring-b" again`, `"loop" runs itself`. **A depth cap of 8** at run time, the second guard.
- **A piece not written yet is a warning, not a refusal** (`definitionWarnings(def, hasWorkflow)` on the admin routes):
  a project file seeds workflow by workflow in its own order, and an agent may write the runner first. The step fails
  naming it if it runs.
- Catalog **1.11.0**, `pieces: true`. WORKFLOW-NODES.md has a `run-workflow` section.

Files: `workflow/pieces.ts` (pure: `pieceOf`, `piecesRunBy`, `ringThrough`, `ringWords`, `MAX_PIECE_DEPTH`),
`workflow/steps/runWorkflow.ts` (the executor and the `PieceRunner` seam), `WorkflowSubsystem.pieces` (the runner),
`StepExecContext.run` (`executionId`, `workflowId`, `depth`, `test`), `RunOptions.parent` / `startedByApp`.

**Gates.** `tests/p132-bwf-013-pieces.test.ts` 11/11 over a real BackendService: two workflows run one piece with
their own values (AC1's engine half); the record links; a failing piece's reason reaches the parent's `onError`; ring
and self refused with names (and the refused one is not stored); the unwritten piece warned then failing by name; the
test mark on the child; the depth cap; what is handed on; cancel. The 44 suites reaching the workflow layer: 670/677
with the 7 being pins this moves (the catalog version in 5, the `source` pattern that allowed only `BWF-00x`, the
kind list in 2), moved, all green. `tsc --noEmit` clean. No MCP or editor test pins the version or the kind list.

**Not done (next):**
- Build 2: Studio's *Reusable pieces* list shows workflows no trigger starts, with *New*; a piece's row says who runs
  it; cloud functions under them as "made by the agent". A `run-workflow` step's panel: a workflow picker
  (`control: 'workflow'`, new) and `send` as key-values with composers; *Open the piece ↗*; the run's *Open that run*.
- Build 3: *Make a reusable piece* from selected steps (shift-press), one chain in, one way out, `send` from
  `readSources`; refused in words otherwise.
- Build 4: the NodeGX editor draws the kind (it reads the catalog; `control: 'workflow'` is new to it, NOT CHECKED).
- The MCP: an agent can write `run-workflow` (it is a kind like any other); `list_backend_workflows` does not say who
  runs a piece. AC3's agent round after Build 2.
- Studio from the kit has none of it until a release carries catalog 1.11.0.
- Rebuild `packages/nodegx-backend/dist` before a Studio drive (`npm run build`): not done this session.
