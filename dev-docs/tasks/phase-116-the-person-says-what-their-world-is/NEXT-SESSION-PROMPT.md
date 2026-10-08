# Phase 116 — next session

**Written 2026-10-08, end of s1.** ONT-000 is built (14 kinds, 303 rows, 8 sources; `npm run ontology-census:check`
green with and without the private corpora). Its step 5 (Richard's Bubble list, oral) and rulings R1–R7 are open.
The README's board is §7; what the census found is §13 and the task file's §6.

## Before anything

1. `npm run ontology-census:check` — must be green. Regenerating with the private corpora needs their paths on the
   command line (`--acme`, `--tirion`, `--sentinel`, `--private`; the private folder is a sibling of the checkouts and
   its README has the full command). Never write a private path or row into the repo.
2. Read [README.md](README.md) §13 and [KINDS.md](KINDS.md) before touching ONT-001: the vocabulary's first mutant
   is the whole in-repo corpus (every relation is a string id), and planning's model spans projects (R1).
3. **R1 and R2 are needed before ONT-001.** Ask Richard in plain words (memory: no R-numbers as the content; say what
   the thing is). The README's recommendations are the proposed answers. R3 before ONT-004.

## The first task

If R1 and R2 are ruled: **ONT-001**, the vocabulary as a package — one `defineKind` per kind in `kinds.hand.json`,
with its `questions` taken from the kind's question line and the three notes, `projection` from its `projectsTo`
line, `mutants` from ONT-005 once the oral list exists. Five kinds rest on one source; say so in their declaration.

If not ruled: **ONT-004 needs only R3** — the path operation; the fixture is depth 5 (ONT-000 §6), relational
adapters first. Or take Richard's Bubble list down (ONT-000 step 5) and seed ONT-005.

## Not yet

Do not write `ontology/` files until R1 and R2 are ruled. Do not add an MCP tool until R5 is ruled and the budget
gate is measured (memory: five budgets, eight free). Do not read the lessons backend's live schema without its admin
token (ONT-000 §6 item 5 says it is owed).

## Memory

The phase memory is `ontology-is-the-spec.md`; its pointer is on the Phases line of `MEMORY.md`. Update at the end of
the session; size-check the index (17,510 UTF-16 units).
