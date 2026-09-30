# 006 — The first writes

_Recorded 2026-09-30, TASK-L177 and TASK-L178 (sprint 51 in the Digital Bricks Training repo)._

## What changed

The template saves two things, both through cloud functions and never by opening a collection:

- **`capture`** — one of the learner's answers onto their project context: a `capture` section, or
  an `activity` that captures a fact.
- **`finishStep`** — their current step complete and the next one open.

Home now says what you do is saved and that `reset-demo` puts it back (TASK-L179).

## Decisions

Richard took four on 2026-09-23, all as recommended. The full record is the sprint index
(`dev-docs/sprints/sprint-51-the-first-writes/README.md` in the product repo).

1. **No version history of the project.** `version` plus compare-and-swap is the whole guard, and
   nothing reads a history.
2. **The step-5 lesson is authored**, which sprint 52's L181 did.
3. **Finishing a step is built on compare-and-swap and measured**, not handed to core as a
   transaction.
4. **The reset is a developer command on NodeGX's own backup** (L179).

## Decisions made while building, each on a measurement

- **The write lives in the row, not on the page.** A For Each hands its page a signal and the
  row's id, never the row's outputs, so the field and the value a learner typed reach nothing above
  `Lesson/Section row`. The row carries its lesson's concept; with no concept (Palette) it calls
  nothing.
- **The kit's words wait for the backend.** Before this, `Capture` said *✓ Saved to your project*
  the moment it was pressed. With `Waits for save` on, the ✓ comes only when the graph says
  `saved:<token>`. The token is new for every save, because a fast backend can answer inside one
  frame and the `saving` in between is never seen.
- **Finishing opens the next step BEFORE completing this one.** Every state a crash between two
  writes can leave was built by hand and looked at as the learner. With complete-then-open, a crash
  leaves **every step done and nothing to open**, and nothing the learner would naturally do fixes
  it. With open-then-complete, a crash leaves two open steps, and finishing the current one (which
  they were doing) heals it. So compare-and-swap with the right order expresses the product's
  transaction. **That is evidence that this write is not the case that reopens HLT-016 (b).**
- **After finishing, the page goes to the course**, not to the next lesson (the product's choice),
  because this template has no lesson engine and every next lesson would say *not written yet*.
- **A failure says so and stays.** The product goes to the course on any error, silently.
- **The lesson page now passes the learner's facts to its rows.** It never did, so a capture
  saved long ago opened empty.

## What NodeGX did not tell us

- **A client Cloud Function's outcome port is `done`, not `success`** (ERG-001 renamed it). A wire
  from `success` passes `validate_project` with 0 errors and never fires. `check-write-functions`
  now refuses one. Reported, not filed as a core row.
- **A NodeGX archive carries the deployed functions**, so `reset-demo` also restores the functions
  that were sealed. A mutation deployed and then reset away is gone. Deploy after resetting.
