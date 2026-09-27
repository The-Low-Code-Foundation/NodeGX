# Architecture

## Page map

- **Home** (`Pages/Home`) — The front door: the product name, one line, one coral button into the course.
- **Course** (`Pages/Course`) — The learner's course: their project, where they're at, the lesson card (their next openable path step), the programme, pace, trajectory and dossier.
- **People** (`Pages/People`) — The coach's roster.
- **Learner** (`Pages/Learner`) — The coach's page about one learner: their programme, the activity log, what they must produce.
- **Lesson** (`Pages/Lesson`) — The lesson as a workshop: title and hook, the L48 stepper (every step reachable, no numerals), the active step's sections as knots on the thread rendered by dbt-lesson.Section, and the step-close with one way forward.

## Data model

### Lesson

One generated lesson for one learner: a title, a hook, a landing, 3-5 steps that INDEX a flat sections array (every section claimed exactly once).

Fields:
- title
- hook
- landing
- steps[] {id,title,goal,unlocks,sectionIds[]}
- sections[] {id,kind,...}

Relationships:
- steps index sections by id

### Section

One member of the closed 19-kind palette (reading, callout, answer_capsule, code_block, quiz, activity, mermaid, svg_diagram, chart, interactive_widget, annotated_screenshot, curated_video, human_recording, audio, voice_interaction, capture, prep_pack, artifact_challenge, handover_pack). AI content is DATA; the kit's nodes are the only thing that turns it into UI.

Fields:
- id
- kind
- the kind's own fields

## Backend contracts

Sprint 49 (L169) puts the data in a NodeGX backend: `backend/schema.json` (25 collections, one per product table a page reads), `backend/seed.json` (generated from the fixtures, nothing derived stored), and `nodegx.security.json` (every collection closed to every client, no public sign-up, a `staff` role). The pages still read the fixtures; L170 adds the four read functions (`course`, `lesson`, `roster`, `learnerProgramme`) and L171 swaps each `Data/Fixture *` component's `Static Data` for a call to one. See `docs/decisions/005-the-backend-reads.md`.

## Decisions

Considered during scoping and deliberately not done:

- **Renaming the product's 8,271-line stylesheet's token names to NodeGX's** — The kit's nodes and the lifted CSS read the product names; an alias block is one seam and costs nothing, a rename costs every rule.
- **Bundling mermaid, recharts and the widgets into the kit now** — mermaid alone is ~2MB; whether the template pays that is a decision, not a default. Placeholders carry the data so the seam is visible.
- **A second React or a second markdown renderer inside the kit** — Phase 69's single-React guarantee, and this repo's one-markdown-path rule: react-markdown + rehype-sanitize + remark-gfm are bundled with React external.
- **Building pages against a NodeGX backend now** — It did not exist yet; a page bound to a fixture is the same page with one node swapped when it does. *(Superseded by sprint 49, which is that swap.)*

Left open:

> TODO: Does the template ship the projection prompts as node parameters a trainer can edit (the evaluation §5's footgun question) — Richard's call when the backend lands.
> TODO: Which of the four placeholder kinds (mermaid, chart, widgets, TTS) are worth their bundle weight in a template.
> TODO: Whether the template's directory name and shelf category are 'digital-bricks-training' / data-app, or Richard wants another.

_Scoping record: `docs/decisions/000-initial-scope.md`._
