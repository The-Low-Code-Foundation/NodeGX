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

## s2 (2026-11-02): built, AC1–AC4 green

Commits: NodeGX `4aec3b83b` (the run route's `as` / `stopAfter` / test mark), `511e41d5d` (the catalog's `testRuns`);
nodegx-studio `0872094` (the sample, the two Test buttons, the tree, the refusals).

| AC | state |
|---|---|
| AC1 | ✅ in the **Electron app on a Greenhouse copy** (own backends dir, the checkout's backend): *When a plant is watered* tested on a picked Watering row: both steps lit, the *Mark the plant watered* panel shows what went in and came out as a tree; the record is `triggerType: db_change`, `metadata.test: true` ([shot](look/bwf-002-greenhouse-tested.png), [the sample form](look/bwf-002-greenhouse-sample.png)). Also in Chrome: automations-drive's BWF-002 section (a two-step workflow on a Task row) |
| AC2 | ✅ *Test up to this step* on step 1: step 2 "Not reached in the test", the run line "stopped after step 1, The watering names its plant", the record `stoppedAfter: check`, `status: success` ([shot](look/bwf-002-greenhouse-up-to-step-1.png)). Backend: `tests/p132-bwf-002-test-runs.test.ts` 6/6; a mutant that ignores `stopAfter` turns 2 red. A sibling branch not on the way to the step is skipped too |
| AC3 | ✅ the sample is read from `.nodegx/workflow-samples.json` on every open (the drive reloads Studio and finds it); `.nodegx/` is appended to the project's `.gitignore` on the first write; `git check-ignore` says ignored |
| AC4 | ✅ `env: 'live'`, a development binding that is the live backend (same endpoint or instance, or a backend named "… live backend") are refused in words before anything runs (`testRefusal`, automations-check) |

**What the run route takes now** (documented in `docs/runtime/WORKFLOW-NODES.md` § *Testing a workflow on a sample*):
`{ payload, as: { type: 'db-change' | 'webhook' | 'schedule' | 'manual', … }, stopAfter }`. `as` starts the run the way
that trigger does (same payload shape and trigger type, so a db-change test runs as the app and a webhook test as a
visitor); either key, or `test: true`, marks the run and its record a test.

**Found while building, fixed in the same commits:** on the kit's published backend (`@nodegx/mcp` 0.2.9) the run route
ignores `stopAfter`, so *Test up to this step* ran **every** step as a plain manual run (measured in the drive). Once
BWF-005's record steps exist that writes rows the person asked not to reach. Studio now asks the catalog (`testRuns`)
and refuses on an older backend, in words, before anything runs. Until a NodeGX release carries `511e41d5d`, Studio
from the kit refuses every test; from the checkout (`NODEGX_REPO`) it works. The default `check:automations` grades the
refusal and says AC1/AC2 are not graded there.

**Not built from the spec:** "or the last change the backend saw" / "or the last call" as a sample source (item 1). A
sample is a picked row, a typed row or a typed body.

**Seen, for BWF-003:** *What went in* still carries the backend's deprecated top-level copy of the payload (`action`,
`collection`, `id`, `record` beside `body` and `trigger`, WFA-003's legacy view). The picker should offer `body.*`,
`trigger.*` and `upstream.*` only. A Watering sample is named by its first text field ("A good soak"), not its plant:
App data's `rowLabel` does not follow a pointer.

**Seen, likely explained (not measured):** on the Greenhouse copy a Watering row made right after a Plant row did not
start *When a plant is watered*, while the Plant row did start TriggerTest. That fits the backend's documented loop
guard, which skips a change that lands while another row-change handler is in flight (`triggers/dbchange.ts` header).
The overlap itself was not measured; if a lone Watering row ever fails to start it, file it.
