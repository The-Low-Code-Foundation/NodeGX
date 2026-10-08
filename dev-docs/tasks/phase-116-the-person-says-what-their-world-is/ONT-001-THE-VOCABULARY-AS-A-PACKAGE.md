# ONT-001 — The vocabulary as a package

**Opened 2026-10-08.** **Depends on ONT-000 ✅, R1 and R2 — both ruled 2026-10-08** (README §9, ruled table). **Status: 📋 ready to start.**

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

*(empty)*
