# ONT-001 — The vocabulary as a package

**Opened 2026-10-08.** **Depends on ONT-000 ✅, R1 and R2 — both ruled 2026-10-08** (README §9, ruled table). **Status: 🟡 built s2 (2026-10-08) — AC1 ✅, AC2 ✅, AC3 ✅, AC4 🟡 moved to ONT-008 (§6).**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Opus 5.5 is sufficient** — a format package following the `defineNode` pattern, with the kinds already written and a validator to grade it. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Opus 5.5; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


> **R1 amends §3.1:** the files live under the project's **`docs/`** folder (the project-docs folder the MCP already reads and writes, beside the backend schema and the data design), not in a new top-level `ontology/` folder — the ONT-001 session names the subfolder. **R2 adds to AC2:** nothing in the files names an engine *or a graph framework*; the format is plain JSON with its own schema. ONT-000's census found that every relation in the in-repo corpus is a string id and five kinds rest on one source: say so in each kind's declaration.

## 1. The person sentence

> **What I said about my world is saved with my project, in a form any tool can read, and nothing in it mentions a
> database engine.**

## 2. Why

README §1 reading 5: the project format carries no data model, and the schema lives only in the running backend. The
ontology needs one home that the agent writes, the editor reads, the backend manager reads and a home-made view reads.
R1 recommends the project's files; R2 recommends a property graph.

## 3. What to build

1. **The files.** An `ontology/` folder in a v2 project: `nouns.json` (node types with their properties, each property
   one of P104's eleven kinds), `relations.json` (typed edges: from, to, kind, answers, properties), and
   `vocabulary.json` pinned by version to the package that defines the kinds. Plain words are first-class: every noun
   and relation carries the sentence the person said.
2. **The kinds.** `@nodegx/ontology` (name to confirm; it may be an entry of `@nodegx/node-spec`): one declaration per
   kind from ONT-000's list, as `defineKind(decl)` with `questions` (ranked, each with the incident it prevents),
   `projection` (a pure function from answers to contract schema, ONT-003), and `mutants` (ONT-005). The declaration
   style follows `defineNode` so a stranger who read P107's format reads this one.
3. **The schema and the validator.** A ninth JSON Schema beside the eight in the format package; a validator that
   refuses a relation whose kind is not in the pinned vocabulary, an answer a kind does not ask for, and a noun with no
   sentence. Refusals say what was expected, in words.
4. **The writer.** The MCP's write rule (refuse when the files changed since read) over `ontology/`, through
   `@nodegx/project-contract`, so a home-made view writes safely.
5. **Describe.** `describe()` for a kind, as `describe()` for a node: its sentence, its questions, what it projects to.
   This is what a view's picker shows.

## 4. Acceptance criteria

1. A fixture project with `ontology/` passes the validator; one with an unknown kind, an unasked answer or a noun
   without a sentence is refused with the expected thing named.
2. `grep -r` over the package and the fixture for `sqlite`, `postgres`, `mongo` finds nothing.
3. The editor opens a project with an `ontology/` folder and changes nothing in it on save (P112 OWN-006's round trip,
   one fixture added there).
4. `describe()` of every kind renders in the P104 backend manager as a tile's long text without an edit.

## 5. Watch for

- **Do not grow a second format package.** NSP-021 and OWN-001 already name the home; the ninth schema joins the eight.
- **A kind's questions are data, not prose in a docblock** (memory: *a known hazard in a docblock is not a guard*).
  ONT-002 reads them by field.
- **The MCP budget.** This task adds files and a validator, not tools. R5 decides the one tool.

## 6. Built

**s2, 2026-10-08, Opus 5.5.** The decisions this task left to its session:

| left open | decided | why |
|---|---|---|
| the subfolder (R1) | **`docs/world/`** — `nouns.json`, `relations.json`, `vocabulary.json` | Richard's own word for it ("the person's world"); `ontology` is a word the person never says |
| the package name | **an entry of `@nodegx/project-contract`: `@nodegx/project-contract/world`** — not a new package, not `node-spec` | the format's named home (NSP-021, OWN-001); the package's charter is "facts about a project file more than one package has to agree on", which is exactly this; a new workspace package needed `package-lock.json` entries, and the lock carries a stale peer edit (Sep 24, it drops `node-spec`) that a commit would have swept |
| "beside the eight" | the ninth schema is **`schemas/world.schema.json` in `@nodegx/project-contract`** | OWN-001 has not started, so the eight are still in the editor; the ninth starts in the home and they join it |
| the vocabulary pin | `vocabulary.json` = `{ "vocabulary": "nodegx-world-kinds", "version": 1 }` | a version of the kinds, not of the package: the package is private and its version says nothing about the kinds |
| a property that is a link | **refused**: a property is one of P104's eleven kinds **less `link` and `links`** | a link is a relation with a kind and a sentence (R2); allowing both would let the mistake the graph removes back in |

**The files** (`packages/nodegx-project-contract/`): `world/kind.ts` (`defineKind`, the declaration type: `questions` as data with `id`, `ask`, `prevents`, `answer` shape, optional `changesKind`, and `from` = census / note / oral; `projection` as a pure function into the eleven field kinds; `mutants`; `evidence`; the picker `tile`), `world/kinds.ts` (the fourteen), `world/files.ts`, `world/vocabulary.ts` (`describe()`), `world/validate.ts`, `world/write.ts`, the barrel `world.ts`, `schemas/world.schema.json`, `tests/world.test.ts` + `tests/fixtures/world/` (a membership business, synthetic, eight relations over eight kinds). `npm test` in the package (36 tests) is now in `test:packages`; `npm run typecheck` there covers the tests too.

**The kinds are pinned to the census, not copied from it:** the test reads `kinds.hand.json` and `kinds.json` and requires the same fourteen ids in the same order, the sentence, distinction and projection words verbatim, the row count and sources per kind (303 total), a `thin` line exactly on the five one-source kinds and the one-row kind, one `oral` mutant per row of Richard's list under the kind the row names, and a `note` question on each kind a note is attributed to. 55 questions in all (44 from the census line, 6 from Richard's rows, 5 from the notes); every one names the incident it prevents.

**The validator** is hand-written with no dependency, so a page can run it; `schemas/world.schema.json` says the same structure to any other tool, and the test runs ajv over the fixture and over every structural refusal so the two cannot disagree. Beyond AC1's three refusals it refuses: an answer of the wrong shape; **an answer that means the relation is another kind** ("several: true" on a `belongs-to` → "then it is an is-on"); details on a kind that carries none; a `one-of` over a text property (the census's free-text mutant, refused by construction); a target of the wrong shape for the kind; a dangling noun; a vocabulary version it does not know ("will not guess at another"); a key the format does not have.

**The write rule** (`planWorldWrite`) is the MCP's `if_revision` rule for the three files, pure: a revision over the three texts; a write over existing files with no revision is refused (a writer that never read them cannot know what it replaces); a stale revision is refused with both revisions; an invalid world is refused with the validator's words; an unchanged file is not written (P109 ISL-019).

**Mutation, measured:** eight guards disabled one at a time (unknown kind, unasked answer, noun without sentence, `changesKind`, details on any kind, stale revision, unread overwrite, rewrite of unchanged files) — each turned a test red; restored byte-identical.

### The acceptance criteria

1. ✅ The fixture passes; the unknown kind, the unasked answer and the sentenceless noun are refused with `file`, `at`, `expected`, `found` and a sentence — and eleven more refusals.
2. ✅ The test greps the module, the schema and the fixture for engine and graph-framework names (sqlite, postgres, mongo, mysql, neo4j, cypher, gremlin, sparql, arangodb, dgraph, janusgraph, rdf, owl, gql) — none; a control proves the pattern fires.
3. ✅ **on the editor's save service** — `noodl-editor/tests/services/ProjectStructure/worldFilesSurviveSave.test.ts` (registered in that folder's `index.ts`): a v2 project with `docs/world/` opens with no warning and no extra component, and the world is byte-identical after a no-op save and after a save that edits, renames and removes components (the control: the edited component did change, the removed one did go). Run alone under one-worker jest: 23/23 with `ProjectStructureService.test.ts`; two sabotages of `saveProject` (delete `docs/world`, overwrite `nouns.json`) each turn it red. **And in the real runner:** `typecheck:editor-tests` exit 0; `npm run test:ci` (seed 08016, HEAD `6789e076`, fresh `test-results.json` 21:51) — 3005 specs, 1 failure, `SUB-006 rules nonexistent-port …` (a known-floor family, not this task's); the four P116 specs ran and passed. P112 OWN-006 is not built; the spec says it is that suite's fixture.
4. 🟡 **Not met as worded, and moved to ONT-008.** Measured: the backend manager's `KindPicker` (`nodegx-backend/src/admin/app/views/schema.tsx`) renders its tiles inline from its own `KINDS` constant; there is no tile component a list can be handed to, and the tile has three text slots (name, line, storage badge) and no long text. So nothing renders a relation kind there without an edit. What is true: `describe()` returns the tile's fields under the same names (`label`, `line`, `icon`) and the long text (`sentence`, ranked questions with what each prevents, `projectsTo`, `evidence` in words, e.g. *"1 field in 1 app — one row: a single field in one prototype"*). Showing it is ONT-008's surface.

### Found, for other tasks

- **ONT-002: the MCP cannot write these files today.** `write_project_doc` goes through the editor's `assertInsideDocs`, which refuses any path that is not `.md` (`docsText.ts:438`). An agent in Claude Code can write them with its own file tools; an agent on the MCP alone cannot. R5's one tool, or a widening of the docs containment to `docs/world/*.json` through `planWorldWrite`, is ONT-002's to decide — and the budget gate is measured first.
- **ONT-003: a projection already exists per kind, in the eleven field kinds, deterministic** (tested). It is a sketch for ONT-003 to grade against the contract, not the contract mapping; ONT-003 may replace any of it.
- **ONT-005:** every kind has at least one mutant seed; 19 in all (7 oral, 2 from the notes, 10 from the census).

