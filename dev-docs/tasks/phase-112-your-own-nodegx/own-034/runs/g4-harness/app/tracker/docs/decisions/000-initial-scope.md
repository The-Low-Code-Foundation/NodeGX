# 000 — Initial scope

_Recorded 2026-10-30T15:07:54.143Z, from the scoping conversation held before this project was created._

> This conversation was ended before a scope was agreed. What is written below is what had been
> established at that point — nothing here was inferred to fill the gaps.

## What was asked for

> I want a habit tracker. I can add habits, tick each one off for today, and see the last 7 days for each one, with a streak count. It should remember everything when I come back. I can delete a habit.

## What was decided

**The app.** A habit tracker kept on this device.

**Who it is for.** One person, on their own phone or computer.

**Pages.**

- Home — The list, the add row and today's ticks.

**Records.**

- habit — one thing the person tracks — name, the days it was done

**Backend.** None: everything is kept on this device, in a Global Store with Persist on.

## What was considered and rejected

> TODO: No alternatives were weighed. If one was and it is missing here, add it.

## Deliberately out of scope

> TODO: Nothing was ruled out.

## Still open

Nothing was left open in the conversation.

## Proposed build plan

Produced from the scope above and handed over unexecuted — no components were authored during
scoping. Review it before building.

1. **update `Pages/Home`** — The list, the add row and today's ticks. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.

<!-- The same plan, for the editor to read back if it is offered again. Safe to delete. -->

```json nodegx-plan
{
  "version": 1,
  "plan": {
    "request": "I want a habit tracker. I can add habits, tick each one off for today, and see the last 7 days for each one, with a streak count. It should remember everything when I come back. I can delete a habit.",
    "operations": [
      {
        "id": "op-1",
        "kind": "update",
        "target": "Pages/Home",
        "intent": "The list, the add row and today's ticks. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      }
    ],
    "scroll": "page"
  }
}
```

## Transcript

_(no transcript was captured)_
