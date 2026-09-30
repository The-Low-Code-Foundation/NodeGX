# NSP-021 — The second editor

**Opened 2026-09-30 (s1), from Richard's ruling that the editor is a target (README §1, R6).**
**Depends on NSP-018, NSP-020.** The phase's last thesis test, beside NSP-006.
**Status: 📋 not started.**

## 1. The person sentence

> **Everything the Electron editor knows about a node, a second editor learns from the same files,
> and a graph authored in either opens in the other with no difference a person can see.**

## 2. The second editor already exists

`packages/noodl-mcp` is an editor with no screen: it creates components, sets parameters, connects
ports, validates, registers pages and renders reports — over a wire, for an agent. It is the cheapest
possible proof that the editor is exchangeable, because it is already exchanged. What it is **not**
yet is independent: today it learns node types from the catalog that is generated from the runtime,
and per-instance ports from a viewer or from editor-side adapters.

## 3. What to build

1. **Census the editor's knowledge.** Every question the Electron editor asks about a node type or
   instance — ports, defaults, groups, descriptions, enum labels, dynamic ports, connection validity
   (the catalog's `typecasts`), inspect text, visual-ness, allowed children — and where the answer
   comes from today (runtime registration, viewer message, editor adapter, catalog). A table, in this
   folder, generated where it can be.
2. **One answer per question, from the spec.** For each row: the spec field or function that answers
   it (NSP-018 for descriptions and the catalog, NSP-020 for ports, this task for the rest —
   `typecasts`, `allowAsChild`, `inspect`). Editor-adapter code that encodes node knowledge moves into
   the spec or is recorded as *editor-only with a reason*.
3. **The round trip.** A project authored through the MCP server from spec-derived information only,
   opened in the Electron editor: no diagnostics, no port differences, no "unknown port" warnings; and
   the reverse — a project authored in the editor, read back through the MCP server, describes every
   node identically. Graded by a drive, like NSP-006.

## 4. Acceptance criteria

1. The knowledge census exists; every row names its source today and its source after.
2. For the specced nodes, no row's answer comes from the runtime's registration code or a viewer
   message — a gate reads the census.
3. The round trip passes on the templates (rank by the product surface) with a diff of zero ports.
4. README §1's third sentence is graded by this task and NSP-006 together, and the R4-style question
   is asked with the numbers: *what would a replacement editor still need from this repo?* The answer
   should be a list of files in `nodegx-node-spec` and `nodegx-project-contract`, and nothing else.

## 5. Watch for

- Memory: *two `.mcp.json` writers* (P66) and *a new node type owes `noodl-mcp` too* — the MCP
  server has its own gates (`toolDisclosure` budget: 8 tokens free). Anything that grows a tool
  description pays there.
- The project file format is `@nodegx/project-contract`'s; do not grow a second one here.

## 6. Built

*(empty)*
