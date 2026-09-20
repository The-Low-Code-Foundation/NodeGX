# Digital Bricks Training

A learning platform with no course catalogue: the learner's own project is the spine of their
curriculum, and every lesson is written for it. This template is the **front-end half**, built
entirely out of NodeGX nodes — the sticker-book design system, a lesson kit of section renderers,
and the learner's three pages — reading one fixture lesson until a backend is connected.

Press **Run**. Home → *Open your course* → *Open the lesson*. Every step is a live chip; nothing is
locked, numbered or scored.

## The first thing to change

Open **Data/Fixture lesson** and find the node labelled **"EDIT — this is the lesson"**. It is a
`Static Data` node holding a JSON array with one lesson:

```json
{
  "title": "…", "hook": "…", "landing": "…", "conceptId": "…",
  "steps":    [{ "id": "step-1", "title": "…", "goal": "…", "unlocks": "…", "sectionIds": ["s-01", "s-02"] }],
  "sections": [{ "id": "s-01", "kind": "answer_capsule", "text": "…" }, { "id": "s-02", "kind": "reading", "markdown": "…" }]
}
```

A lesson is 3–5 **steps** that index a flat **sections** array. Every id a step claims must exist,
exactly once — **Logic/Sections for step** throws by name on one that does not, rather than
rendering the step with a hole. The 19 section kinds and their fields are listed in
`noodl_modules/dbt-lesson/README.md`, and **Pages/Palette** draws every one of them once.

## The second thing to change

Open **Data/Fixture programme** and find the node labelled **"EDIT — this is the programme"**. It
holds the learner's whole programme: their project, the end they agreed with their coach, and every
entry on their timeline.

```json
{ "projectName": "…", "problemStatement": "…", "endsOn": "2026-12-18",
  "dimensions": [
    { "id": "dim-question", "programmeId": "prog-autumn", "label": "Asking a better question",
      "target": 8, "deliverableId": null, "position": 0, "archivedAt": null }
  ],
  "entries": [
    { "id": "lesson:what-an-api-is", "kind": "lesson", "at": "2026-09-02T11:15:00.000Z",
      "anchor": "what-an-api-is", "state": "done", "position": 2, "programmeId": "prog-autumn",
      "conceptId": "what-an-api-is", "title": "…", "rationale": "…", "status": "complete" }
  ] }
```

An entry's **id is namespaced by its kind** (`lesson:<conceptId>`, `session:<uuid>`): two tables
produce the same uuid space, and a key collision renders one row and drops the other. `at` is
**null** when an entry genuinely has no moment — a lesson nobody has done yet — which is honest
rather than a gap, and those rows are ordered by `position` inside their band.

**`state` has exactly three members: `done`, `now`, `ahead`.** There is no `overdue` and no
`missed`. A brief whose date has passed is still `now`, with its date on it.

**`dimensions` are the objectives the coach and the learner agreed**, each with the target it was
agreed at. A rating lives on the session or the review it was given at (`ratings: [{dimensionId,
score}]`), and **a rating whose event has no write-up for the learner is not drawn at all** — a
number alone is a verdict; a number with what the coach wrote beside it is coaching. An ARCHIVED
objective stays on the chart: the ratings were really given, and dropping them would be the chart
omitting points without saying so.

**Logic/Standing** turns all of that into the three panels above the programme — two counts in a
sentence, the pace line, and one gauge per objective. Every rule in it is ported from the product's
own pure modules and names the file it came from. Two of its properties are worth knowing before
you edit anything:

- **The counts render for everyone; the charts do not.** No agreed end and nothing booked means no
  horizon, and then there is no pace panel and no trajectory panel at all — a pace line against a
  schedule nobody agreed to is a deadline this product invented and then measured somebody against.
  Counts of your own finished work need no deadline to be true, so they stay.
- **`total` is computed and never rendered.** `done` and `remaining` are two numbers a learner can
  read on their own. Beside each other with a total they become `"6 of 12"`, which is a verdict
  wearing a count's clothes.

**Logic/Ordered timeline** is what turns that array into the page: the band order, the two
`ahead` headings, which rows arrive folded, and the one line a folded row shows. Every rule in it
is ported from the product's own code and says so.

## Where the backend plugs in

Nothing in this template fetches. The seam is two places:

- **Data/Fixture lesson** — replace its `Static Data` node with a query; the component's outputs
  (`title`, `hook`, `landing`, `steps`, `sections`) do not change.
- **Data/Fixture programme** — the same, for the learner's timeline: its outputs (`projectName`,
  `problemStatement`, `endsOn`, `entries`, `dimensions`) do not change either.
- **Lesson/Section row** — the kit's `Section` node emits `Acted`, `Saved` (+ `Field`, `Value`),
  `Submitted` (+ `Content`), `Write requested`, `Listen requested` and the rest. They are wired to
  the row's outputs and nowhere else yet. Wire them to Cloud Functions when they exist.

## How it is built, in the graph

- **`noodl_modules/dbt-lesson/`** is the lesson kit: one node per section kind and a `Section`
  dispatcher, over ONE sanitised markdown path (react-markdown + rehype-sanitize + remark-gfm) and
  DOMPurify for the two SVG fields. AI content is data; these nodes are the only thing that turns
  it into UI. Its `styles.css` carries the product's design-token names as aliases of NodeGX's
  (`--ink: var(--foreground)`, `--thread: var(--primary)` …) and the lesson CSS lifted from the
  product's own stylesheet. **Do not delete it.** Its source is `library/modules/dbt-lesson/`.
- **`Pages/Course`** is the learner's home: their project, then where they are (counts, pace,
  objectives), then the lesson they are in, then their whole programme as one `For Each` over
  `Course/Timeline row`. The three panels are `Course/Where you're at`, the kit's `PaceTracker`,
  and a `For Each` over `Course/Trajectory row` — all four fed by one `Logic/Standing`.
- **`Pages/Lesson`** places the stepper (a `For Each` over `Lesson/Step chip`), the active step's
  sections (a `For Each` over `Lesson/Section row`, whose root IS the kit node so each row lands
  as a direct child of the `.lesson-layout` grid) and `Lesson/Step close`. Which step is open is
  one app variable, `dbtActiveStepId`, written by a chip or by the step close.
- **`Logic/Sections for step`** is the step index — one Function, one calculation.
- **The look** is the Styles panel: 37 project tokens (cream ground, ivory cards, 3px ink edges,
  the 4px pop, coral to press, teal for done, Grandstander 800 over Nunito). Both fonts are bundled
  in `noodl_modules/` (SIL OFL) and never fetched. There is no dark theme, on purpose.

Two mechanics worth knowing before you edit a page: a NodeGX `Button` paints its background and
colour inline, so a class alone cannot restyle one — set the two ports (the chips take theirs from
the row data); and a `Group` writes `display: flex` inline, so the lesson grid restates
`display: grid` in `styleCss`.

## What is a placeholder, and why

Four renders carry their data in a dashed box instead of drawing it: **Mermaid** diagrams (the
library is ~2 MB), **Chart** (recharts is another large bundle), the five **interactive widgets**
(each a React component of its own), and **Audio's text-to-speech** (needs a server). An
**annotated screenshot** whose storage key nothing serves yet shows the key rather than a broken
image. The kit README says which and why.

## What is not here yet

The backend and every write, sign-in, the coach's surfaces, the assistant, the confusion control
and the signals, onboarding — and **i18n**: every learner-facing string is either a node parameter
or one entry in the kit's `COPY` map, so a string table can replace them in one place when NodeGX
has one.

## Licences

react-markdown, rehype-sanitize, remark-gfm: MIT. DOMPurify: Apache-2.0 / MPL-2.0. Grandstander and
Nunito: SIL Open Font License 1.1 (the licence files travel beside each font).
