# 000 — Initial scope

_Recorded 2026-11-05T13:42:52.265Z, from the scoping conversation held before this project was created._

## What was asked for

> HST-001's whole flow: records by id, a login for the owner to read them, one file upload. Online it must: keep the records across a redeploy; let the owner read them and nobody else; serve the file. (P115 HST-002, Fixture C row, quoted from the task file: no person typed this request.)

## What was decided

**The app.** A newsletter landing page that greets a reader by the id in their link and saves their answer against that id, plus an owner page where the owner signs in to read every answer and upload one file. It is P115's Fixture C: a full-stack app graded online on Cloudflare.

**Who it is for.** Readers who tap a link in a newsletter on their phone (they never sign in), and the one owner who signs in to read who answered what.

**Pages.**

- Home — Reads ?id= from the link, greets the reader by name, two buttons (Count me in / Not this time) each save an Answer and then say it was saved. An unknown or missing id says the link is not recognised.
- Owner — The owner signs in with email and password and sees every Answer (name, choice, when). Signed out, or signed in as anyone without the owner role, it shows no answers.

**Records.**

- Reader — Someone on the newsletter list; their id is in the link they receive. — name, email
- Answer — What a reader pressed on the landing page, saved against their id. — readerId, readerName, choice

**Backend.** Built-in backend. Reader rows are made by the owner; a reader's link carries their Reader id. Anyone may GET one Reader by id (the id in the link is the key), only the owner role may list them. Anyone may create an Answer; only the owner role may read Answers. Nobody updates or deletes from the page.

**Rules for this project.**

- No code nodes (Function, Expression, Script) anywhere: they do not run on a Cloudflare Worker
- Colours and spacing as design tokens, never raw values

## What was considered and rejected

This is the section with the longest shelf life. It is what stops the next reader — or the next
assistant — helpfully rebuilding something that was deliberately left out.

- **Readers looked up with a public find (list) on Reader** — rejected: Anyone could list every reader's name and email; a public GET by id gives the link holder their own row and nothing else.
- **A cloud function between the page and the records** — rejected: Not needed for this flow; collection permissions do the job, and a code node in a cloud function does not run on a Cloudflare Worker (P115-HST004-NOCODEGEN).

## Deliberately out of scope

- Readers signing up or signing in
- Editing or deleting answers from the page
- Sending the newsletter itself (Fixture B covers the hook to the mailing list)
- Being a good-looking page (HST-002: not making them good)

## Still open

> TODO: The one file upload: where the file lives online (R2 on Richard's account needs his go, it may ask for a card). Built after that ruling.

## Proposed build plan

Produced from the scope above and handed over unexecuted — no components were authored during
scoping. Review it before building.

1. **provision `App backend`** — Give this project a built-in backend that runs on this computer. Collections: Reader, Answer. People sign in, so it keeps user accounts. The conversation said: Built-in backend. Reader rows are made by the owner; a reader's link carries their Reader id. Anyone may GET one Reader by id (the id in the link is the key), only the owner role may list them. Anyone may create an Answer; only the owner role may read Answers. Nobody updates or deletes from the page.
2. **create `Pages/Owner`** — The owner signs in with email and password and sees every Answer (name, choice, when). Signed out, or signed in as anyone without the owner role, it shows no answers. Works with the Answer record described in docs/ARCHITECTURE.md. Sibling pages in this app: Home. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
3. **update `Pages/Home`** — Reads ?id= from the link, greets the reader by name, two buttons (Count me in / Not this time) each save an Answer and then say it was saved. An unknown or missing id says the link is not recognised. Works with the Reader and Answer records described in docs/ARCHITECTURE.md. Sibling pages in this app: Owner. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.

<!-- The same plan, for the editor to read back if it is offered again. Safe to delete. -->

```json nodegx-plan
{
  "version": 1,
  "plan": {
    "request": "HST-001's whole flow: records by id, a login for the owner to read them, one file upload. Online it must: keep the records across a redeploy; let the owner read them and nobody else; serve the file. (P115 HST-002, Fixture C row, quoted from the task file: no person typed this request.)",
    "operations": [
      {
        "id": "op-1",
        "kind": "provision",
        "target": "App backend",
        "intent": "Give this project a built-in backend that runs on this computer. Collections: Reader, Answer. People sign in, so it keeps user accounts. The conversation said: Built-in backend. Reader rows are made by the owner; a reader's link carries their Reader id. Anyone may GET one Reader by id (the id in the link is the key), only the owner role may list them. Anyone may create an Answer; only the owner role may read Answers. Nobody updates or deletes from the page.",
        "provision": {
          "name": "App backend",
          "collections": [
            {
              "name": "Reader",
              "columns": [
                {
                  "name": "name",
                  "type": "String"
                },
                {
                  "name": "email",
                  "type": "String"
                }
              ]
            },
            {
              "name": "Answer",
              "columns": [
                {
                  "name": "readerId",
                  "type": "String"
                },
                {
                  "name": "readerName",
                  "type": "String"
                },
                {
                  "name": "choice",
                  "type": "String"
                }
              ]
            }
          ],
          "needsAuth": true
        }
      },
      {
        "id": "op-3",
        "kind": "create",
        "target": "Pages/Owner",
        "intent": "The owner signs in with email and password and sees every Answer (name, choice, when). Signed out, or signed in as anyone without the owner role, it shows no answers. Works with the Answer record described in docs/ARCHITECTURE.md. Sibling pages in this app: Home. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-2",
        "kind": "update",
        "target": "Pages/Home",
        "intent": "Reads ?id= from the link, greets the reader by name, two buttons (Count me in / Not this time) each save an Answer and then say it was saved. An unknown or missing id says the link is not recognised. Works with the Reader and Answer records described in docs/ARCHITECTURE.md. Sibling pages in this app: Owner. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      }
    ],
    "scroll": "page"
  }
}
```

## Transcript

_(no transcript was captured)_
