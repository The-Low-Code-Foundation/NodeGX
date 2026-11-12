# Architecture

## Page map

- **Home** (`Pages/Home`) — Reads ?id= from the link, greets the reader by name, two buttons (Count me in / Not this time) each save an Answer and then say it was saved. An unknown or missing id says the link is not recognised.
- **Owner** (`Pages/Owner`) — The owner signs in with email and password and sees every Answer (name, choice, when). Signed out, or signed in as anyone without the owner role, it shows no answers.

## Data model

### Reader

Someone on the newsletter list; their id is in the link they receive.

Fields:
- name
- email

### Answer

What a reader pressed on the landing page, saved against their id.

Fields:
- readerId
- readerName
- choice

## Backend contracts

Built-in backend. Reader rows are made by the owner; a reader's link carries their Reader id. Anyone may GET one Reader by id (the id in the link is the key), only the owner role may list them. Anyone may create an Answer; only the owner role may read Answers. Nobody updates or deletes from the page.

## Decisions

Considered during scoping and deliberately not done:

- **Readers looked up with a public find (list) on Reader** — Anyone could list every reader's name and email; a public GET by id gives the link holder their own row and nothing else.
- **A cloud function between the page and the records** — Not needed for this flow; collection permissions do the job, and a code node in a cloud function does not run on a Cloudflare Worker (P115-HST004-NOCODEGEN).

Left open:

> TODO: The one file upload: where the file lives online (R2 on Richard's account needs his go, it may ask for a card). Built after that ruling.

_Scoping record: `docs/decisions/000-initial-scope.md`._
