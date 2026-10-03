# Next session — P109 session 10

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 9 (2026-10-03, on `cline-dev`, `f2df328a0` … ):** ISL-003 **ruled "Each list keeps its rows", built and
closed** (Repeater + Static Data, doctrine, For Each page; deployed 6/6, control 3/3); ISL-007 AC7's catalog half ✅ (the
add-on's three nodes say what they do to an agent; they were dead URLs). **5 of 25 closed.**

## Read first

1. ISL-003 §8 s9: the census table (what "each list keeps its rows" would break: one prefab Function), the ruling with
   its question, **why it is built in the form that changes least** (a list keeps its own records only for ids another
   LIVE list holds; a single list is unchanged, so lookups by id still work), the Static Data catch (it converts its
   rows itself, and re-parses into a fresh collection: the list is the NODE), and AC5.
2. ISL-007 §8 s9: the door readings (`get_node_type` summaries, `list_node_types` queries) and AC6 read.
3. Bug filed: `P109-S9-CMP001RATE` (the doctrine's 33% corpus rate reads 39%; stale 25+ catalog commits; P85's gate).

## Do, in this order

1. **ISL-007 AC6's open question** (ask in plain words, mechanism first): should the validator warn about a typed word
   on a page in a project that carries the translation add-on? What counts as opted in, and which ports count (s7 read
   46 of 334 island texts that did not switch, unclassified — classify them before asking).
2. **ISL-009's export half**, only when `nodegx-export/src/emit/component.ts` is committed by P18 (still a pile on 10-03).
3. **ISL-019's remainder:** AC6 (needs `noodl-mcp` dist rebuilt — in a worktree: `src/cloud/bundleEntry.js` has a
   peer's uncommitted edit), AC7 (the trailing-newline byte first).
4. **Round 3 questions**, mechanism first: ISL-016, ISL-017, ISL-021, ISL-008, ISL-010, ISL-018's open case,
   `P109-S8-ARRAYFILTERPATH`. Then the ISL-022 follow-ups and the s4 bugs.

## Decisions for Richard (not yours)

- `P109-S8-ARRAYFILTERPATH`; ISL-018's open case; Round 3 above; ISL-007 AC6's warning. Pushing `cline-dev` is his call.

## Facts measured in session 9 that are not in a task file

- **`noodl-viewer-react` type-checks against `noodl-runtime/dist-types`, not the source** (its tsconfig `paths`). A new
  member on a runtime module reads `TS2339` in a viewer spec until `npm run build:types` in `packages/noodl-runtime`.
- **A row component in a corpus graph needs `ports: [{ name, plug: 'input' }]` on the COMPONENT**, as well as on its
  Component Inputs node, or the instance has no inputs and every row reads `undefined`.
- **A kit node's `docs` is the agent's summary** (`noodl-mcp/src/catalog.ts` `summaryOf`); an old module carrying a URL
  there tells an agent nothing. `list_node_types`' `query` is a substring match: "translate" did not find "Translation".
- **AWP-005's storefront basket (`nodeDocBudget.test.ts`) had 4 tokens free**: one more For Each anti-pattern line
  broke it. Count before adding enrichment to For Each, Group, Text and the other basket types.
- `search_project` returns locations only (no parameter values).
- The node docs generator still rewrites 27 stale pages; put them back from HEAD after `docs:nodes` (as s8).
- 🔴 `webpack-configs/webpack.deploy.dev.js` has `watch: true`: it compiles in ~10 s and never exits. Run it in the
  background and stop YOUR task after "compiled successfully" (never `pkill webpack` — a peer's may be running).
