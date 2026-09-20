# 000 — Initial scope

_Recorded 2026-09-19T20:51:45.054Z, from the scoping conversation held before this project was created._

> This conversation was ended before a scope was agreed. What is written below is what had been
> established at that point — nothing here was inferred to fill the gaps.

## What was asked for

> The backend work is underway in NodeGX to turn DB Training into a NodeGX template. Can you attack the front end work to get the template started please?

## What was decided

**The app.** A learning platform with no course catalogue: the learner's own project is the spine of their curriculum, and lessons are projected onto it per learner. This template is the front-end half — the sticker-book design system, a lesson kit of section renderers, and the learner's pages over a fixture lesson — with the seam where Richard's NodeGX backend plugs in left as one Static Data node.

**Who it is for.** Language trainers and small-business learners reading a lesson about their own project; trainers who open the template to change the look, the fixture lesson or a section renderer; and Richard, wiring the NodeGX backend behind it.

**Pages.**

- Home — The front door: the product name, one line, one coral button into the course.
- Course — The learner's course: the fixture lesson's title and its steps as a list, one button into the lesson.
- Lesson — The lesson as a workshop: title and hook, the L48 stepper (every step reachable, no numerals), the active step's sections as knots on the thread rendered by dbt-lesson.Section, and the step-close with one way forward.

**Records.**

- Lesson — One generated lesson for one learner: a title, a hook, a landing, 3-5 steps that INDEX a flat sections array (every section claimed exactly once). — title, hook, landing, steps[] {id,title,goal,unlocks,sectionIds[]}, sections[] {id,kind,...} — steps index sections by id
- Section — One member of the closed 19-kind palette (reading, callout, answer_capsule, code_block, quiz, activity, mermaid, svg_diagram, chart, interactive_widget, annotated_screenshot, curated_video, human_recording, audio, voice_interaction, capture, prep_pack, artifact_challenge, handover_pack). AI content is DATA; the kit's nodes are the only thing that turns it into UI. — id, kind, the kind's own fields

**Backend.** Deliberately none in this sprint. The backend (collections, functions, auth, the model calls) is being built separately by Richard in OpenNoodl phases 96-98. Every page here reads a Static Data fixture; the seam is that one node and one Logic component.

**Rules for this project.**

- Every colour, spacing and font parameter is var(--token); no hex in any component parameter (this repo's invariant 9).
- The product's own token names (--paper, --ink, --thread, --edge...) are aliases of NodeGX's semantic tokens, defined once in noodl_modules/dbt-lesson/styles.css.
- Every string that reaches a model or a learner is rendered through the kit's one sanitised markdown path; no second markdown path.
- Nothing gates, nothing scores, nothing paints red: a wrong quiz answer shows feedback in ink; --warm is for encouragement and human recording only; --go means done.
- No numerals in the stepper on screen (aria-label only); every step is reachable at any time.
- The lesson is 3-5 steps indexing a flat sections array; a section id that does not resolve throws by name rather than rendering wrong.
- No fetch in any kit node: a node emits an output port and the graph decides where it goes.

## What was considered and rejected

This is the section with the longest shelf life. It is what stops the next reader — or the next
assistant — helpfully rebuilding something that was deliberately left out.

- **Renaming the product's 8,271-line stylesheet's token names to NodeGX's** — rejected: The kit's nodes and the lifted CSS read the product names; an alias block is one seam and costs nothing, a rename costs every rule.
- **Bundling mermaid, recharts and the widgets into the kit now** — rejected: mermaid alone is ~2MB; whether the template pays that is a decision, not a default. Placeholders carry the data so the seam is visible.
- **A second React or a second markdown renderer inside the kit** — rejected: Phase 69's single-React guarantee, and this repo's one-markdown-path rule: react-markdown + rehype-sanitize + remark-gfm are bundled with React external.
- **Building pages against a NodeGX backend now** — rejected: It does not exist yet; a page bound to a fixture is the same page with one node swapped when it does.

## Deliberately out of scope

- The backend, every write, auth and the model calls (Richard's, in flight)
- i18n — every string is a node parameter until a string-table kit exists
- The coach's surfaces, the assistant dock, the confusion control, signals, onboarding
- Rendering mermaid, recharts charts, the five interactive widgets and TTS audio — placeholders carrying their data, with the reason in the kit README
- A dark theme

## Still open

> TODO: Does the template ship the projection prompts as node parameters a trainer can edit (the evaluation §5's footgun question) — Richard's call when the backend lands.
> TODO: Which of the four placeholder kinds (mermaid, chart, widgets, TTS) are worth their bundle weight in a template.
> TODO: Whether the template's directory name and shelf category are 'digital-bricks-training' / data-app, or Richard wants another.

## Proposed build plan

Produced from the scope above and handed over unexecuted — no components were authored during
scoping. Review it before building.

1. **create `Pages/Course`** — The learner's course: the fixture lesson's title and its steps as a list, one button into the lesson. Works with the Lesson record described in docs/ARCHITECTURE.md. Sibling pages in this app: Home, Lesson. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
2. **create `Pages/Lesson`** — The lesson as a workshop: title and hook, the L48 stepper (every step reachable, no numerals), the active step's sections as knots on the thread rendered by dbt-lesson.Section, and the step-close with one way forward. Works with the Lesson and Section records described in docs/ARCHITECTURE.md. Sibling pages in this app: Home, Course. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
3. **update `Pages/Home`** — The front door: the product name, one line, one coral button into the course. Sibling pages in this app: Course, Lesson. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.

<!-- The same plan, for the editor to read back if it is offered again. Safe to delete. -->

```json nodegx-plan
{
  "version": 1,
  "plan": {
    "request": "The backend work is underway in NodeGX to turn DB Training into a NodeGX template. Can you attack the front end work to get the template started please?",
    "operations": [
      {
        "id": "op-2",
        "kind": "create",
        "target": "Pages/Course",
        "intent": "The learner's course: the fixture lesson's title and its steps as a list, one button into the lesson. Works with the Lesson record described in docs/ARCHITECTURE.md. Sibling pages in this app: Home, Lesson. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-3",
        "kind": "create",
        "target": "Pages/Lesson",
        "intent": "The lesson as a workshop: title and hook, the L48 stepper (every step reachable, no numerals), the active step's sections as knots on the thread rendered by dbt-lesson.Section, and the step-close with one way forward. Works with the Lesson and Section records described in docs/ARCHITECTURE.md. Sibling pages in this app: Home, Course. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-1",
        "kind": "update",
        "target": "Pages/Home",
        "intent": "The front door: the product name, one line, one coral button into the course. Sibling pages in this app: Course, Lesson. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      }
    ],
    "scroll": "page"
  }
}
```

## Transcript

_(no transcript was captured)_
