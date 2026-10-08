# Phase 116 — next session

**Written 2026-10-08, end of s2.** ONT-000 ✅. R1–R7 ruled (README §9). **ONT-001 🟡 built**: the vocabulary is
`@nodegx/project-contract/world` (an entry of the format's home, not a new package), the files are `docs/world/nouns.json`,
`relations.json`, `vocabulary.json`; 14 kinds pinned to the census by test, 55 questions, 19 mutant seeds, a validator,
the `if_revision` write rule (`planWorldWrite`), the ninth schema (`schemas/world.schema.json`). ONT-001 §6 has every
decision and what measured it.

## Before anything

0. **Model check.** Every task file names its model under the status line. ONT-003 wants Opus 5.5. ONT-004 wants
   **Fable 5.1 for the operation's semantics and the capability cells**, Opus 5.5 for the adapters. On the wrong model,
   stop and say so in one line before any work.
1. `npm run ontology-census:check` and `npm test` in `packages/nodegx-project-contract` (36) — both green.
## The next tasks

- **ONT-003, the projection is a function** (Opus). Each kind already has a `projection` into P104's eleven field kinds,
  deterministic and tested — a sketch, not the contract mapping. ONT-003 maps it onto `@noodl/backend-contract` and grades
  it on two adapters; it may replace any kind's sketch. Read `world/kind.ts` (`Projection`, `ProjectedField`) first.
- **ONT-004, paths join the contract** (Fable for semantics). Needs only R3; fixture depth 5.

## Found in s2, owned elsewhere

- **The MCP cannot write `docs/world/`** (`assertInsideDocs` refuses non-`.md`): ONT-002's call, written in its §5.
- **ONT-001 AC4 moved to ONT-008:** the backend manager's tile has no long-text slot and no way to be handed a list.

## Not yet

No MCP tool until the budget gate is measured. The "mandatory project-docs folder" rule is a DIRECTION.md candidate
only (R1). Do not read the lessons backend's live schema without its admin token.

## Memory

`ontology-is-the-spec.md`; its pointer is on the Phases line of `MEMORY.md`. Size-check the index (17,510 UTF-16 units).
