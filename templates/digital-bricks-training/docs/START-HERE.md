# Digital Bricks Training

A learning platform with no course catalogue: the learner's own project is the spine of their
curriculum, and every lesson is written for it. This template is the **front-end half**, built
entirely out of NodeGX nodes — the sticker-book design system, a lesson kit of section renderers,
the learner's three pages, and the first of the coach's — reading fixtures until a backend is
connected.

Press **Run**. Home → *Open your course* → *Open the lesson*. Every step is a live chip; nothing is
locked, numbered or scored. Home → *See it as their coach* opens **People**, the coach's roster.

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
- **Data/Fixture roster** — the coach's people, as `getRoster()` would return them: every account,
  nullable derived fields, in the server's order. Its outputs (`people`, `count`) do not change.
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

## Every string has one owner

Every learner-facing string on the three pages is one entry in **`Data/Strings`**, and the language
is one value: the `Language` parameter on the **`i18next` node in `App`**. Change that one value and
the page changes language. Nothing else in the graph decides it —
`tools/check-language-owner.py` fails the build if anything tries.

`Data/Strings` holds **three** nodes and they are not interchangeable:

| node | what it holds | who writes it |
|---|---|---|
| *"EDIT — this is every word on screen"* | the lesson kit's 80 strings | **generated** by `library/modules/dbt-lesson/build.mjs` from `src/kit.js` — do not hand-edit |
| *"EDIT — this template's own page copy"* | these pages' 19 headings and labels | **you**, here and nowhere else |
| *"EDIT — a second locale goes here"* | one key per language code | **you**, when you add a locale |

English is the **base**; a locale is an **overlay on top of it**. So a key you have not translated
renders English rather than a raw key or a blank — for the kit and for the graph's `Translation`
nodes alike, by one rule in one place. Adding a locale is adding one key to the overlay node:
nothing else in the graph names a language.

**There is one locale — English.** The switch has been driven against a second, throwaway locale
and works: a kit string and a `Translation` string both changed in one page load, the tab title
followed, interpolation (`{product}`, `{label}`) still filled, and every key the throwaway locale
left out came back English. Switching back restored all four pages byte-identically. **No human
translation has been written or reviewed by anyone**, so this template is i18n-**ready**; it is not
a template in two languages.

### What the table does NOT own yet, and it is deliberate

Two kit nodes — **`RatingGauge`** and **`PaceTracker`** — are still handed no copy object, so the
handful of strings they draw themselves render the kit's built-in English whatever the language is.
Everything else on all four pages changes language.

`/course`'s timeline labels and `Logic/Standing`'s sentences used to be on this list too; TASK-L163
moved them, which is what gave `/course` a string table at all. `Pages/Lesson` and `Pages/Course`
both show the shape to copy: a `/Data/Strings` instance, a `Variable` named `language`, and the copy
folded into each repeated row.

## And one value decides WHO IS READING

A coach and their client read the **same programme**, assembled once, and must not read the same
sentences: *"You've finished 7 things"* is right for one of them and wrong for the other. So
`Data/Strings` takes an **`audience`** — `learner` or `coach` — and the coach's words are an
**overlay on the English base, exactly as a locale is**. Thirty override keys replace sixty-five
duplicated strings, and a neutral one (`Lesson`, `Brief`, `Review`, `goal`) keeps a single owner
and cannot drift between audiences. The overlay lives under a `coach` key in the same node you
write page copy in.

**There is no default.** Every `/Data/Strings` instance says who is reading, and an instance that
does not throws by name rather than quietly serving the learner's words to somebody else —
`tools/check-coach-voice.py` catches it before the page does.

That tool also catches the failure this whole arrangement creates. A locale miss falls back to
English: wrong language, right meaning, and visible. **A voice miss falls back to the LEARNER's
sentence** — it tells a coach *"Your coach hasn't written this one up yet"* about their own review,
which is grammatical, in the right language, and invisible. So it resolves the coach's bundle the
way the graph does and fails on any string that still addresses the reader as the learner.

**A learner's programme and a coach's differ in exactly two ways**, both ported from the product:
a learner's drops every `signal` (our inference about their confusion — `Logic/Ordered timeline`
does it, which is the projection's own layer), and a learner's row does not draw a `message` (a
conversation belongs to the thread — `TimelineRow` does it, which is the renderer's layer). Nothing
else differs, and the entries are loaded once for both on purpose.

## The coach's roster

**`Pages/People`** answers *"who am I responsible for"* — not *"who has done the work"*, because
the people it must not hide are the ones who most need a coach. It lists every account, including
somebody who signed up and never finished setting up.

- **`Logic/Roster filter`** is the whole of it: programme, then cohort, then a search, as a pure
  reduction over rows already in memory. It never fetches and never reorders. Its second Function
  computes what the two selects offer from the people alone — **a Dropdown handed a new `items`
  array resets itself to its default**, so options recomputed on every filter change snap the
  select straight back to "Everyone".
- **The programme filter's default hides a person only when EVERY programme they have is
  finished — never because they have none.** Getting that backwards hides every learner who has
  not been enrolled yet. `tools/check-roster.mjs` runs the graph's own scripts against the fixture
  and fails by name if it happens.
- A select appears **only when it can change the list**. It is never disabled.
- Nothing on a row is a verdict: a count of steps (never `0 of 0`, never a percentage),
  *"No activity yet"* rather than *"never"*, and a waiting-for-a-reply line that is **a date, not a
  count**. No pace, rating or ranking column, ever — comparing learners is the one thing a roster
  would do most naturally and must not do.
- **A name is not a link yet.** It opens the learner's page, and that page does not exist yet
  (TASK-L165). A control that goes nowhere is worse than a name.

**The gate is not here.** In the product the roster is behind the staff check, and a learner can
never reach it. This template has no sign-in, so the Home button is how you see the coach's side —
in a real deployment that is the backend's job, never a button. And because a template's fixtures
are project data, **the trainer's private labels (`coachLabel`) are in the page source of every
page**, though they render on the roster alone. With a backend, the roster arrives from a gated
query and they are nowhere else.

## What is a placeholder, and why

Four renders carry their data in a dashed box instead of drawing it: **Mermaid** diagrams (the
library is ~2 MB), **Chart** (recharts is another large bundle), the five **interactive widgets**
(each a React component of its own), and **Audio's text-to-speech** (needs a server). An
**annotated screenshot** whose storage key nothing serves yet shows the key rather than a broken
image. The kit README says which and why.

## What is not here yet

The backend and every write, sign-in and the staff gate, **the coach's page about one learner**
(`Pages/Learner` — the roster is here, the page it opens is not yet), the
assistant, the confusion control, onboarding — and a **second locale**: see "Every string has one owner" above for
exactly which strings the table owns today and which are still English in place.

## Licences

react-markdown, rehype-sanitize, remark-gfm: MIT. DOMPurify: Apache-2.0 / MPL-2.0. Grandstander and
Nunito: SIL Open Font License 1.1 (the licence files travel beside each font).
