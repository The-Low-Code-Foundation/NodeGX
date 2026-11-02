# BWF-002 — Run it on sample data

**Phase:** [132](README.md). **Repo:** NodeGX `packages/nodegx-backend` (the run route, a stop-after option);
nodegx-studio (`studio.html` Backend mode, `serve.mjs`). **After:** BWF-001.

## Why

n8n's loop is *build a step, run it, see what came out, build the next one from that*. Ours has the run record
(STU-092 shows a step's `inputData` / `outputData` from the last real run) but no way to make a run while building:
a db-change workflow runs only when a row changes, a schedule only at its hour. BWF-003's field picker needs real
outputs to pick from, so this comes first.

## What to build

1. **A sample for what starts it.** *A change to a table*: pick a row from the table (App data's list), or the last
   change the backend saw; made / changed / deleted chosen. *A call from outside*: paste a body, or the last call.
   *A time*: no payload (the schedule's `payload` if it has one). *Nothing*: an empty body or a pasted one. The sample
   is **kept per machine** beside the project, gitignored like the hold file (it can hold a person's row), and named in
   the panel: "Sample: Plant *Monstera*, made".
2. **Test the workflow** and **Test up to this step**. Both call `POST /admin/workflow-defs/:id/run` with the sample as
   the trigger's body. *Up to this step* needs the engine to stop after a named step: a `stopAfter: <stepId>` option on
   the run route (the run record says it stopped there, not that it failed). Check whether the route already takes a
   body and a trigger shape before adding one.
3. **Each step shows its run.** After a test, every step on the canvas is lit (ran / failed / not reached) and its panel
   shows *What went in* / *What came out* as a tree (BWF-003 makes it clickable).
4. **It runs for real.** A test runs on the development backend, and the steps that write (BWF-005..007) really write.
   The button says so the first time ("This runs on your development backend: rows it makes are real"), once per
   workflow. Never on live.

## Acceptance

- AC1: on a copy of Greenhouse, *When a plant is watered* tested on a picked Watering row: both steps lit, each step's
  in/out shown, the run in the backend's history marked as a test.
- AC2: *Test up to this step* on step 1 of a two-step workflow: step 2 shown *not reached*, the record says stopped
  after step 1 (a backend test for `stopAfter`, a mutant that ignores it is red).
- AC3: the sample survives a Studio restart and is in no file git tracks (`git check-ignore` on it).
- AC4: Studio refuses a test against a live backend in words.
