---
id: P116-ONT-003-two-systems
title: A noun that also exists in two other systems cannot be projected — both `exists-elsewhere` relations make a field called `idElsewhere`, and the projection refuses the world
status: fixed
commit: a54294a1d
severity: medium
area: project contract / the world projection (`packages/nodegx-project-contract/world/kinds.ts` `existsElsewhere.projection`)
found: P116 ONT-006 s9, 2026-10-09
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-006-WORKFLOWS-ARE-SENTENCES.md §6
regression: packages/nodegx-project-contract/tests/project.test.ts "has an id field per system, each named after its relation and each unique"
---

The enrolment note's world has a person who exists in the mailing system AND in the learning platform: two
`exists-elsewhere` relations from `person`. The kind's projection puts `{ name: 'idElsewhere', kind: 'text', unique }`
on the `from` noun for each, so the second is refused: `the relation "mailing" makes a field called "idElsewhere" on
Person, which already has one: two things would share one field.` A person known in two other systems is the common
case in the corpus (the ops team's member is in the CMS, the mailing system and the learning platform).

Measured 2026-10-09 while writing ONT-006's fixture (`tests/fixtures/world-verbs`): the fixture had to put the mailing
relation on the account instead, and says so.

Fix: name the field after the system — `fieldName(\`id in ${to}\`)` → `idInTheLearningPlatform` — or after the relation's id
(`learningId`). Either changes the projected field name, which `tests/fixtures/world/projected.json`,
`tests/fixtures/world-every-kind/projected.json` and `tests/mutants.test.ts` pin as `idElsewhere`, and the claim id
`person/idElsewhere-is-unique`; regenerate the two fixtures and re-read the ONT-005 survivor list (the `id-nowhere`
mutant names the field). The relation's id is the stabler name (a system's words can change; its id does not).

**Fixed 2026-10-09 (P116 s13, Opus 5.5)** — ONT-003 §6.8. The field is named after the relation's id:
`on-the-course-platform` → `onTheCoursePlatformId`, `mailing` → `mailingId`. The id and not the system's words,
because a reworded system must not rename what is stored, and `diffWorld` would not see that rename. Nothing outside
the package's fixtures held `idElsewhere` (measured), so no migration is owed. Goldens regenerated (the name is the only
change); `nodegx-project-contract` 202 / 202. Control: the old fixed name brings back this bug's refusal word for word.
