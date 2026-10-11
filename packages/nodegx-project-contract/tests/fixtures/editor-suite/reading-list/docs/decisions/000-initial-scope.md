# 000 — Initial scope

_Recorded 2026-10-11T18:30:51.881Z, from the scoping conversation held before this project was created._

## What was asked for

> I want a little app to keep track of the books I'm reading and the ones I want to read next.

## What was decided

**The app.** A personal reading list: books I am reading, have read, and want to read.

**Who it is for.** One person, on their phone, adding a book when they hear of it and ticking it off when done.

**Pages.**

- Home — The list, grouped by status, with a way to add a book
- Book — One book: change its status or remove it

**Records.**

- Book — One book on the list — title, author, status

**Backend.** none — kept on the device

## What was considered and rejected

> TODO: No alternatives were weighed. If one was and it is missing here, add it.

## Deliberately out of scope

- sharing lists with other people

## Still open

Nothing was left open in the conversation.

## Proposed build plan

Produced from the scope above and handed over unexecuted — no components were authored during
scoping. Review it before building.

1. **create `Pages/Book`** — One book: change its status or remove it Works with the Book record described in docs/ARCHITECTURE.md. Sibling pages in this app: Home. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
2. **update `Pages/Home`** — The list, grouped by status, with a way to add a book Works with the Book record described in docs/ARCHITECTURE.md. Sibling pages in this app: Book. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.

<!-- The same plan, for the editor to read back if it is offered again. Safe to delete. -->

```json nodegx-plan
{
  "version": 1,
  "plan": {
    "request": "I want a little app to keep track of the books I'm reading and the ones I want to read next.",
    "operations": [
      {
        "id": "op-2",
        "kind": "create",
        "target": "Pages/Book",
        "intent": "One book: change its status or remove it Works with the Book record described in docs/ARCHITECTURE.md. Sibling pages in this app: Home. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-1",
        "kind": "update",
        "target": "Pages/Home",
        "intent": "The list, grouped by status, with a way to add a book Works with the Book record described in docs/ARCHITECTURE.md. Sibling pages in this app: Book. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      }
    ],
    "scroll": "page"
  }
}
```

## Transcript

_(no transcript was captured)_
