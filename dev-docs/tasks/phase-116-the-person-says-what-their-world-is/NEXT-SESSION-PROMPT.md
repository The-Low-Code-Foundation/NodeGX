# Phase 116 — next session

**Written 2026-10-08, end of s1.** ONT-000 is ✅ (14 kinds, 303 rows, 8 sources; Richard's Bubble list taken — seven
mutants; `npm run ontology-census:check` green with and without the private corpora). **R1–R7 are ruled** (README §9,
the ruled table, in Richard's words). The README's board is §7; what the census found is §13 and ONT-000 §6.

## Before anything

1. `npm run ontology-census:check` — must be green. Regenerating with the private corpora needs their paths on the
   command line (`--acme`, `--tirion`, `--sentinel`, `--private`; the private folder is a sibling of the checkouts and
   its README has the full command). Never write a private path or row into the repo.
2. Read README §9's ruled table and §13, and [KINDS.md](KINDS.md): the files go under the project's `docs/` folder
   (R1), the format names no engine and no graph framework (R2), the brief is never loaded for a landing page (R5).

## The first task

**ONT-001, the vocabulary as a package** — ready. One `defineKind` per kind in `kinds.hand.json`, its `questions`
from the kind's question line, the three notes and the oral rows that name it; `projection` from `projectsTo`;
`mutants` seeded from the oral rows (ONT-005 makes them executable). The files: `docs/<subfolder>/nouns.json`,
`relations.json`, `vocabulary.json`, a ninth JSON Schema in the format package, the validator, the MCP write rule.
Five kinds rest on one source and one on one row: each declaration says so.

In parallel if a second session is free: **ONT-004** needs only R3 (ruled) — the path operation, fixture depth 5.

## Not yet

Do not add an MCP tool until the budget gate is measured (R5 ruled the shape; the gate is five budgets, eight free).
Do not write the "mandatory project-docs folder" rule into DIRECTION.md without Richard reading it there first — it
is recorded under R1 as a candidate. Do not read the lessons backend's live schema without its admin token.

## Memory

The phase memory is `ontology-is-the-spec.md`; its pointer is on the Phases line of `MEMORY.md`. Update at the end of
the session; size-check the index (17,510 UTF-16 units).
