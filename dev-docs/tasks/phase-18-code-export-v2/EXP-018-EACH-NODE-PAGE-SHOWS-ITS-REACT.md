# EXP-018 — Each node's page shows the React it exports to

**Opened 2026-10-17** at Richard's request, after the docs session that published the node specs, the Bubble
dictionary and "How export works" (commits `8e7853826`, `bc71e7f5c`, `46914024`, and the link commit after them).
**Lane 6, "then".** Low priority: a docs task, not an export defect. **Size: about one session.**

## 1. The person sentence

> **A developer reading a node's page sees the React code that node becomes when the app is exported.**

Richard, reading Counter's page: *"I don't see the code export section in the node reference updated, am I missing
something?"* The section says "Exports to React" and links to the worked example on `how-export-works.md`, which
covers only the seven node types in its counter page. Every other node's page says only its status.

## 2. What exists

- `scripts/generate-node-docs.js` `renderExportSection`: the status words from `packages/nodegx-export/coverage-ledger.json`
  and a link to the export page (the example's nodes link to its "What each node became" row,
  `scripts/export-doc/example.js`).
- `scripts/export-doc/build.js`: exports a sample project with `@nodegx/export` bundled from source (esbuild, as the
  package's own `build.mjs`) and renders the files. The same mechanism is what this task needs, per node.
- P107 NSP-005's export adapter already builds "the smallest graph that exercises one node"
  (`Component Inputs → [node] → Component Outputs`) and found which nodes have no drivable shape.

## 3. What to build

1. For each `translated` node type, a minimal fixture graph: the node, the wires that make it do something (a value in,
   a signal in, its output into a Text or a Component Output), generated from the catalog's ports where possible and
   hand-written where not. Keep the fixtures under `scripts/export-doc/nodes/` or generate them in memory.
2. Export each one and pick out the lines that belong to the node: the hook, the handler body, the library call, the
   JSX element. The emitter's provenance comments, where they exist (EXP-007), are the way to find them; a component
   diff against the same graph without the node is the fallback.
3. Render them in the node's **Code export** section: the fixture graph in one sentence, then the code.
4. A node that compiles away (String Format, Condition) shows the expression it became where its output lands. One
   that has no drivable shape on its own says so in plain words, as NSP-005 found for And, Condition and String Format.
5. `docs:nodes:check` stays a byte comparison: the examples must be deterministic (the exporter is: D6).

## 4. Acceptance criteria

- **AC1** Every `translated` node's page has either an example of its exported code or one sentence saying why it has
  none. Counted, not sampled.
- **AC2** Each example is produced by the exporter on every `npm run docs:nodes`, never pasted.
- **AC3** `docs:nodes:check` is clean and the docs site builds (`onBrokenLinks: 'throw'`).
- **AC4** The generator still runs in seconds (it is a check people run).

## 5. Traps already met

- The exporter is in a package other sessions edit. Bundling it from the working tree picks up their uncommitted
  edits. `scripts/bubble-dictionary/build.js` reads its converter from git `HEAD` for that reason; decide which this
  task needs before writing.
- A node set to its catalog default can be reported as a refusal (P18-USELABEL): leave defaults out of the fixtures.
- The ledger's notes are internal working notes (session numbers, task ids). Do not publish them as the explanation.
