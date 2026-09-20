# Brief

## What this app is

A learning platform with no course catalogue: the learner's own project is the spine of their curriculum, and lessons are projected onto it per learner. This template is the front-end half — the sticker-book design system, a lesson kit of section renderers, and the learner's pages over a fixture lesson — with the seam where Richard's NodeGX backend plugs in left as one Static Data node.

## Who uses it

Language trainers and small-business learners reading a lesson about their own project; trainers who open the template to change the look, the fixture lesson or a section renderer; and Richard, wiring the NodeGX backend behind it.

## Deliberately out of scope

- The backend, every write, auth and the model calls (Richard's, in flight)
- i18n — every string is a node parameter until a string-table kit exists
- The coach's surfaces, the assistant dock, the confusion control, signals, onboarding
- Rendering mermaid, recharts charts, the five interactive widgets and TTS audio — placeholders carrying their data, with the reason in the kit README
- A dark theme

_Agreed in the initial scoping conversation; the full record, including what was considered and rejected, is in `docs/decisions/000-initial-scope.md`._
