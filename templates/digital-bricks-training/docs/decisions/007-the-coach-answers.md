# 007 — The coach answers

_Recorded 2026-10-01, TASK-L186–L188 (sprint 54 in the Digital Bricks Training repo)._

## What changed

A learner can ask their coach about anything on their programme, and the coach can reply. Until
now *Ask your coach about this* logged to the console (L184's recorded finding).

## Decisions

Richard took four on 2026-10-01. The full record is the sprint index
(`dev-docs/sprints/sprint-54-the-coach-answers/README.md` in the product repo).

1. **Two-way threads, as recommended.** A coach answers a thread the learner started and never starts
   one. Coach notes stay read-only.
2. **When a learner asks, the coach who added them is emailed, as recommended**; with nobody
   recorded, every staff account, and the mail says so (TASK-L188).
3. **Mail is stopped by a switch on `/settings` AND a one-click link in every mail — against the
   recommendation**, which was the switch alone. The link is signed, never stored, never expires, and
   unsubscribes on a press, never on a GET (TASK-L187).
4. **The mail carries the message and a link, as recommended** — never the whole thread, and never
   the message in the subject (TASK-L188).

## Decisions made while building, each on a measurement

- **The ask control renders only on what a thread can be about.** The product shows it only where
  `isNoteAnchorKind(entry.kind)`; this kit showed it on every kind, a coach's note included.
- **One owner for the thread's rules** (`shared/Thread`), because the four functions would otherwise
  spell the limit, the subject and the read-marking four times.
- **The notice bumped to `2026-10-02`.** `2026-10-01` said *"No messages … can be written in this
  version"*, and it is deployed, so it could not take new text.
