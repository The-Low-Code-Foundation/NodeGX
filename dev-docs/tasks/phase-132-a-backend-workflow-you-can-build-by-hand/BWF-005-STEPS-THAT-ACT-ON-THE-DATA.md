# BWF-005 — Steps that act on the data

**Phase:** [132](README.md). **Repo:** NodeGX `packages/nodegx-backend/src/workflow/steps/` (new kinds), the node spec
or contract if workflow kinds are specced there, `packages/noodl-mcp` (instructions, the backend group's examples);
nodegx-studio (the forms). **After:** BWF-003 (a record's fields are filled with picked values).

## Why

Richard's point 5: "most of the steps require some kind of code or knowledge of JSON". The catalog is plumbing plus one
action, *Run a function*. In Bubble's backend workflows the steps **are** the actions: *Create a new thing*, *Make
changes to a thing*, *Delete*, *Do a search for*. Here every one of those is a cloud function a person has to author
as a node graph first. Greenhouse's *Mark watered* is a six-step function that a single *Change a record* step would be.

## What to build

1. **Four kinds** in `kinds.ts`, each with its params, output shape and prose:
   - `create-record`: table, fields (each a value: literal, `$path`, `$fn`). Out: the record.
   - `update-record`: table, which record (an id value), fields to change. Out: the record after.
   - `delete-record`: table, which record. Out: `{ deleted, id }`.
   - `find-records`: table, conditions (field · operator · value, all/any, the backend's query operators), sort, limit,
     *one* or *many*. Out: a list (or one record, or empty). Routes `none` / `some` like `filter`.
2. **Who the step acts as.** Ruling owed (README): the recommendation is *as the app*, the same as a cloud function the
   app's own trigger starts (P127 SCHEDULEAUTH: "a run the app starts itself counts as the app"), so privacy rules
   written for people do not block the app's own work; a webhook-started run stays a visitor's. Measure what a
   `call-function` step's function runs as today before proposing anything different.
3. **They write through the same path as everything else**: the backend's data layer with its hooks, so a db-change
   trigger fires on a record a step made (and the engine's existing guard against a workflow re-triggering itself is
   checked, or one is added: a row change made by workflow W does not start W again).
4. **The agent.** The kinds arrive through the catalog; the MCP's backend instructions and its examples say a record
   change in a workflow is a step, not a function. A `kit:` / regression line on the row if the kinds are specced.
5. **Studio's forms** from the table's schema: a table picker; its fields listed with a value box each (picker and
   formulas); conditions as sentences ("*plant* is *the Plant that was watered*"). The form is generated from the kind's
   params and the table's columns, not hand-built per table.

## Acceptance

- AC1: backend tests per kind (made, changed, deleted, found one / many / none), and a privacy test for the ruling.
- AC2: a db-change trigger on Plant fires once for a Plant a step made; a workflow that changes its own trigger table
  does not loop (a test).
- AC3: on a copy of Greenhouse, *When a plant is watered* rebuilt in Studio as *Change a record* (the Plant's
  `lastWatered` = the Watering's date) with no function, no JSON typed; a test run (BWF-002) changes the row.
- AC4: an agent asked for "when a watering is logged, update the plant's last-watered date" writes the step, not a cloud
  function (the file read after).
