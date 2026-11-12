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

## s3 (2026-11-02): built, AC1–AC4 green

Studio only: no backend change. The catalog's `output` prose already names each kind's fields ("`{ result: boolean,
isfalse: boolean }` — …"), so Studio reads them from it (`shapeFields`), and the Chrome drive grades that every kind in
the live catalog yields its fields (a function step's come from its Response, a transform's from its own object).

**What a step can read** (`automations.mjs`, pure, gated by `automations-check`):

- `upstreamOf(wf, id)`: the backend's own rule (`WorkflowEngine` `ancestorsOf`, the editor's `workflowScope.ts`):
  every step with a path to this one over `next`, routes and `onError`, in the file's order.
- `readSources(wf, id, have)`: *What started it* (`body`), *How it started* (`trigger`), then each upstream step under
  its name. Fields come from the run lit on the canvas, else the test's sample, else the shape: the trigger table's
  columns (the project's; when it declares none, as the todo template does, the backend's `/admin/schema`, asked once
  when such a workflow is opened), the
  catalog's words, a function's Response names. A shape is said "no run yet", a sample "from the sample". The run's
  `body` is offered, never the backend's deprecated top-level copy, and never a row's `ACL`.
- `itemSources`: inside a condition read per item (a Filter's, a For Each's filter), *this item* and *its position*
  first, the item's fields from the list's first item in the run.
- `pathWords`: a value in words for its pill: "plant · from the Watering that was made", "result · from Is it there"; a
  function's answer by its own name (`upstream.mark.result.changed` → "changed · from Mark the plant watered").

**The panel** (`studio.html`): *What it can read* above Settings, a field a line, each draggable onto any value setting
(a drop writes `{ "$path": … }`). A setting's *From the run* opens the same tree as a menu, a click picks. A value read
from the run is a pill in words; a click on it opens the menu again. The path is typed only from the menu's last line,
*Edit as path*. After a test, *What went in* starts folded (the new section says it without the legacy copy); a Pointer
starts folded (a person drags `plant`, not its `__type`); *How it started* starts folded.

| AC | state |
|---|---|
| AC1 | ✅ in the **Electron app on a Greenhouse copy** ([greenhouse-drive-bwf003.mjs](greenhouse-drive-bwf003.mjs), the checkout's backend): tested on a Watering row, *Mark the plant watered*'s `plant` emptied (gone from the file), then the Watering's `plant` dragged onto it from *What it can read*: the file and the backend hold `{"$path":"body.plant"}`, the pill says "plant · from the Watering that was made" ([shot](look/bwf-003-greenhouse-dragged.png)). Also in Chrome: automations-drive drags a Task's `title` onto an If's *This* |
| AC2 | ✅ automations-check: the diamond A → B, A → C, B & C → D: D reads A, B, C; B and C read A only; a step on an error route reads the step that failed. Chrome: the Wait after an If reads only the If, by its name |
| AC3 | ✅ Chrome, a workflow a Task starts that never ran: its first step reads the Task's columns, "no run yet", and no step. Pure: the Watering's columns from the project's file |
| AC4 | ✅ automations-check: a Filter on `upstream.get.result.plants` offers *this item* (`plant`, its itemKey) with Monstera's fields from the run, then *its position*; with no run the item is offered and its fields said to come with a test. Chrome: a Filter added from the menu (P132-FILTERNOCONDITION, fixed here) says "this item · from the list" in its condition, whose menu offers this item and its position first |

Gates: `automations-check` 90/90; `automations-drive` 96/96 with `NODEGX_REPO`, 91/91 on the kit's backend (BWF-003's
section passes there too: the picker needs no test support); `check:hosted` 46/46; `check:editor` green; `check:app` 63/67 on a locked screen at the end of s3 (its Publish click
never opens, the known locked-screen failure), then **67/67 unlocked on 2026-11-03**, with every gate above rerun green
on the same tree before the commit (nodegx-studio `b4609f8`).

**Not built from the spec:** item 3, text with values in it, waits on BWF-004's text formula, as the spec says. A JSON
setting (a Transform's output, Validate's rules, a Switch's cases) takes no drop yet: those become forms in BWF-004/005.
The For Each's per-item *function* gets `item` in its input, not in a workflow setting, so *this item* is offered only
in a condition read per item.

**Found:** P132-FILTERNOCONDITION ([bug](../../bugs/p132-filternocondition-studio-adds-a-filter-step-without-its-required-condition-so-the-backend-refuses-it.md)):
a Filter added from Studio's menu had no condition and the backend refused it; it now starts with `item` is not empty.

🔴 **A read added to `loadAutoBackend` broke `check:hosted`'s BKO-007** (the map's drag onto Task, on the Data tab):
reading `/admin/schema` beside the triggers, workflows and kinds on every Backend visit failed it 4/46 and 2/46; HEAD
in a worktree passed 46/46, and the same tree without that read passed 46/46. The mechanism was not found (a GET; most
likely timing in the hosted host). The columns are now read only when a workflow a table starts is opened and the
project declares none for that table. Keep `loadAutoBackend` to what it asked before.

**Found too:** Studio's global `button { display: inline-flex; gap: 6px }` split the pill's name and words into flex items
(apart, no ellipsis): the pill is `display: block`.
