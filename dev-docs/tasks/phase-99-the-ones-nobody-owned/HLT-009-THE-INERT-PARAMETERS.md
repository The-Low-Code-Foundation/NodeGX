# HLT-009 — The inert parameters in the training template

**Status: ✅ built 2026-09-22 (s20).** The owner said *"P99 take it: drop width+sizeMode from the
four instances … do not declare the ports on the kit"*. The count had grown to **8** on 4 nodes
(`ds_seg` added in L167). All removed. The validator reads 0 warnings, and the Course render is
byte-identical. [Verdict](./verdicts/HLT-009/2026-09-22/VERDICT.md).

**Six parameters that are read by nothing, in the template being written right now — and the first
job is not a fix, it is a message to the stream that owns it.**

## 🔴 Check the owner before editing a file

`templates/digital-bricks-training` is under **active construction in numbered sprints by another
session** (`0a0fd7f0d` — *"Digital Bricks Training template: sprints 44 and 45 (L154–L159)"*, which
also landed `library/modules/dbt-lesson/` — a 2,068-line kit and a 2,414-line stylesheet).
**Message that stream before touching anything.** This may already be its next sprint's work, and a
fix landing underneath it is an unperformed merge
([[a-peer-may-be-doing-your-exact-task]], [[a-wholesale-write-over-a-shared-file-is-an-unperformed-merge]]).

## 1. The person sentence

> **Someone reading the training template to learn how sizing works copies a parameter that does
> something.**

## 2. What it is — measured, not guessed

`npm run validate:project` over all seven shipped templates, 2026-09-20:

```
templates/digital-bricks-training   0 errors, 6 warnings — 128 nodes, 246 endpoints
```

All six are `unknown-parameter`, on three custom node types from the `dbt-lesson` kit:

| component | node | type | inert inputs |
|---|---|---|---|
| `/Course/Timeline row` | `tr_row` "The entry" | `dbt-lesson.TimelineRow` | `width`, `sizeMode` |
| `/Course/Trajectory row` | `tj_gauge` "Where they are against the goal" | `dbt-lesson.RatingGauge` | `width`, `sizeMode` |
| `/Pages/Course` | `cs_pace` "Two lines and a horizon" | `dbt-lesson.PaceTracker` | `width`, `sizeMode` |

The type declares no such input port, so **the parameter is never read**. The node is sized by
something else, and a reader who copies `width` gets nothing
([[an-inert-parameter-in-a-corpus-example-teaches-a-lie]]).

## 3. ✅ The rest of the corpus is clean — do not go looking

Same run, same day: **0 errors across all seven templates**, 2,658 nodes, 6,146 endpoints. The only
other diagnostics are two `inactive-conditional-parameter` warnings in `members-area` (a `columnGap`
on a column-direction `Group`) and five `oversized-page` **info** notes, which are advice, not
defects. Richard's "there's probably other places too" is answered by this measurement: **the
templates are sound; the editor was the problem.**

⚠️ `members-area`'s two are the same *class* as this task's and are **not** in scope — they are a
different template with a different owner, and they are warnings about a conditional, not an
undeclared port. If they are to be fixed, they get their own row.

## 4. Scope

**In:** the six, and the question of which of the two is true — the kit should declare the ports,
or the template should stop setting them.

**Out:** the `dbt-lesson` kit's design, the template's content, curriculum, sprints or lessons.

## 5. Acceptance criteria

1. ✅ **The owning stream has been asked**, and its answer is recorded here by date. If it is already
   doing this, **this task closes as disproved** and says so.
2. ✅ `npm run validate:project templates/digital-bricks-training` reports **0 warnings** — measured on
   the artefact, output committed to `verdicts/HLT-009/<date>/`.
3. ✅ **Whichever way it is fixed, the rendered result is unchanged or better** — a screenshot pair
   before and after. Deleting a parameter that turns out to be read by a later kit version would be
   a silent regression.
4. ✅ **The other six templates stay at 0 errors** — re-run the validator over all of them, because
   the fix may touch shared kit code.

## 6. Landmines

- 🔴 **This template has no generator script.** The other seven have `template:landing`,
  `:members`, `:pixel`, `:rocket`, `:site-builder`, `:story`, `:todo`; there is **no
  `template:training`**. So this one is hand-built or built from elsewhere, and **a fix cannot be
  regenerated** — it is a direct edit to files a peer is writing. That is the whole reason for the
  owner check above.
- ⚠️ **`width`/`sizeMode` are the standard visual-node port names.** Their absence on these three
  types may be the kit's defect rather than the template's. Read the kit before editing the JSON.
