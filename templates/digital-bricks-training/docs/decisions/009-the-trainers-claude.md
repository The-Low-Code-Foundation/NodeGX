# 009 — The trainer's Claude

_Recorded 2026-10-01, TASK-L189–L191 (sprint 55 in the Digital Bricks Training repo)._

## What changed

The trainer's Claude writes lessons over MCP: it finds who needs one, reads what the lesson is
written against, saves a draft, previews it, publishes it on the trainer's word, and copies a
published lesson to another learner as the basis of theirs. Nothing else writes a lesson
(decision 008).

## Decisions

Richard took five on 2026-10-01. The full record is the sprint index
(`dev-docs/sprints/sprint-55-the-trainer-writes/README.md` in the product repo).

1. **Once per learner, with duplication as a basis for a new learner.**
2. **Draft, then publish, against the recommendation** (writing is publishing). A draft is its
   own collection, so the learner's `lesson` read cannot reach it, and `Pages/Preview` draws it
   as the learner will see it.
3. **A server-side copy, against the recommendation** (read, then write through the one save
   tool). The copy runs every check a save runs, lands as the other learner's DRAFT, and never
   publishes itself.
4. **Claude Code or the desktop Code tab, by API key.** claude.ai on the web and mobile needs
   OAuth on NodeGX's `/mcp`, which is a core task, recorded rather than opened.
5. **Read context and set paths as well as lessons.** `conceptList` and `setLearnerPath` cost only
   a key scope.

## Decisions made while building, each on a measurement

- **NodeGX already serves MCP** (FED-005). The door is cloud functions plus one key bound to a
  staff account, scoped to exactly nine functions. There is no core change.
- **The gate is the product's code, not a port.** `validateLessonOutput` compiles to an 83 KB
  IIFE with no `</script>`, `require` or `process`, and is generated into the three functions that
  write. A cloud component never reaches a browser.
- **The brief is the product's projection prompt, verbatim, plus the exact JSON Schema** of a
  lesson, generated from the same zod object the product's generator was handed. The first real
  Claude session, without the schema, needed three refusals to learn the field shapes. The second,
  with it, needed none.
- **Only what a lesson needs reaches the model.** No email address, message, note, session or
  review: `roster` and `learnerProgramme` are not on the key. `check-trainer-door` scans every
  output for them, with a control.
- **A copy is the source learner's data until it is adapted.** The copy check names every place
  that repeats the source's project name, problem statement or a saved answer of 12 characters or
  more, and publish refuses while any remain. **It does not catch paraphrase**: Sam's "broken bike"
  survived it in the first copy, and only the preview showed it. An unadapted copy is deleted with
  its source's account, and is not in the source's export.
- **The notice bumped to `2026-10-03`.** *"Nothing you do is sent to an AI model"* became false,
  and Anthropic is a second company. `check-privacy` now requires the notice to name Anthropic
  whenever these functions exist.
- **A backend keeps the policy it started with.** A function deployed later with no rule runs for
  ANY signed-in caller. This was measured, not argued: `previewLesson` ran for a learner-bound key.
  `deploy-functions` now refuses to finish with an unruled endpoint, and `update-backend` brings a
  live backend's schema and policy up to the files, refusing anything destructive.

## Not done

- **No production change.** Deploying, applying the schema and policy, and minting the key are
  Richard's steps (START-HERE).
- **The trainer's tools do not check that a learner has accepted `2026-10-03`** before their
  project is read. That is a decision, put to Richard rather than defaulted.
