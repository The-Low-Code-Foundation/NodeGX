# BWF-003 — Pick a value from what came before

**Phase:** [132](README.md). **Repo:** nodegx-studio (`studio.html` `runValueField` 5572-5592 and the step panel);
reads NodeGX's catalog. **After:** BWF-002. Richard's words: *"Dynamic values coming from previous workflow runs and
all that stuff."*

## Why

Today a value from earlier is typed: a free-text `$path` box with a datalist of `body.`, `previous.result`, `trigger.`
and `upstream.<id>.` for **every** step, upstream or not, and no field names (5572-5592). A person who doesn't know
`upstream.validate-1.value.plant` exists cannot use it. n8n shows the input on the left of a step as a tree and lets
you drag a field into a setting; Bubble's dynamic-data menu does the same in a dropdown.

## What to build

1. **What this step can read**, beside its settings: *What started it* (the trigger's body) and each step **upstream of
   this one** (port the NodeGX editor's `workflowScope.ts`, which computes it correctly) in order, each a tree of its
   fields. Field names come from, in order: the BWF-002 sample run's real output; else the kind's declared output
   shape in the catalog; else, for a db-change trigger, the table's columns; else a cloud function's Response outputs.
   Where a value is from the shape and not a run, it says "no run yet".
2. **Click or drag a field into any setting.** It writes `{"$path": "upstream.<id>.…"}` (or `body.…`) and draws a pill
   in words: "*name* · from the Plant that was made", "*result* · from Check thirst". The path is never typed by hand
   unless the person opens *Edit as path*.
3. **Text with values in it.** A text setting takes pills between words ("Hi {name}, your {plant} needs water"),
   written as BWF-004's text-with-values formula. Until BWF-004 lands, a setting holds one value or one literal.
4. **A list inside a for-each.** Inside a for-each, *This item* and *Its position* are offered (the kind's `itemKey` /
   `indexKey`).
5. **Out of scope at the entry.** The entry step is never offered `previous` (BWF-001 AC6 warns on it).

## Acceptance

- AC1: on *When a plant is watered* after a test run, the call-function step's `plant` setting set by dragging the
  trigger's `plant` field: the file holds `{"$path":"body.plant"}`, the panel shows the pill in words.
- AC2: a step offers exactly its upstream steps: a gate on a diamond (A → B, A → C, B & C → merge D): D offers A, B, C;
  B does not offer C.
- AC3: with no run, a db-change workflow's first step still offers the table's columns, marked "no run yet".
- AC4: in a for-each, *This item*'s fields are offered from the list's sample.
