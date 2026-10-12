# 008 — Who writes the lessons

_Recorded 2026-10-01. A ruling by Richard, not a task. Nothing in the template changes today._

## The ruling

1. **The trainer's Claude, over MCP, is the only thing that helps make lessons in this platform.**
   No other route writes a lesson: no in-app generation engine, no learner's assistant, and no
   composer for anyone else.
2. **Richard is responsible for course design.** The trainer's Claude helps write lessons inside
   that design. It does not decide the design.
3. **A learner cannot modify, revise or regenerate a lesson.** The lesson they open is the one
   that was written for them.

"For now" is part of the ruling. It is the pilot's rule, not a permanent one.

## What it decides that was open

- **The connector points at the trainer, not the learner.** In the product (sprint 50, L172–L175),
  the platform became a connector for the *learner's own* Claude. That Claude ran the intake,
  proposed the path and was to write the lessons. This template does not take that direction. The
  learner-facing tools (`training_set_project`, `training_propose_path` and the rest) are not built
  here. The 2026-09-22 round trip that wrote Sam's project and path (START-HERE, "Who the learner
  is") is history about the fixture, not a design to port.
- **There is one lesson source.** The product's L176 setting (`connector` / `generate` / `coach`)
  does not come to this template. The only source is the trainer, through their Claude. A step
  nobody has written yet keeps saying *not written yet*, and that is the honest state.
- **A written lesson is fixed.** The product's closest precedent is L120: a trainer's edit pins a
  lesson, so nothing regenerates over it. Here every lesson starts in that state.

## What it does not change, as read on 2026-10-01

This is a reading of the ruling. Richard can correct it.

- **A learner still writes their own work.** That covers answers to `capture` sections (`capture`,
  006), answers to a brief, and an artifact plus its revisions (*Revise and send it again*). Those
  are the learner's answers to a lesson, not the lesson itself. If the ruling was meant to cover
  them too, that is a different and much larger decision: it would remove the produce loop.
- **A learner still asks their coach (007)**, and still finishes steps at their own pace.

## Answered the same day (decision 009)

- **For whom: once per learner**, onto their own project, so the two-document model holds. A
  lesson can be **duplicated as the basis for a new learner with similar needs**, and it is then
  rewritten for that learner's project.
- **The shape of the trainer's MCP server** is decision 009 and TASK-L189–L191: NodeGX's own
  `/mcp`, nine `role:staff` functions, a key bound to a staff account, the product's
  `validateLessonOutput` on every save, publish and copy.

## What follows for anyone building here

- A task that gives a learner a control to edit, revise or regenerate a lesson reverses this.
  Escalate it, do not implement it. The same goes for one that builds a learner-facing lesson
  generator or connector.
- No learner-callable cloud function may write the `Lesson` or `LessonDraft` collection.
  `tools/check-trainer-door.mjs` fails on one that does, and on any staff function but
  `publishLesson` writing `Lesson`.
