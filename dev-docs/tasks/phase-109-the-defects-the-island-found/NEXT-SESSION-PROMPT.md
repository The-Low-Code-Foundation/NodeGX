# Next session — P109 session 11

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 10 (2026-10-03, on `cline-dev`, `5ff15228b`):** **ISL-023 built and closed**: every `template:*` runs
`scripts/template-gate.js` first (the generator's own files typechecked, and a source scan for a stray backtick and
a `${…}` inside a produced comment, each named by file and line; nothing is written on a red). **6 of 25 closed.**
Session 9: ISL-003 ruled "Each list keeps its rows", built and closed; ISL-007 AC7's catalog half.

## Read first

1. ISL-023 §8 s10: why the gate checks only the generator's own files (zod in `noodl-mcp/src` exhausts a 4 GB heap
   under the root's options), and AC4: the old produced-string gates are blind to a bare backtick PAIR (ts-jest with
   `diagnostics: false` emits the cut script; two of three stayed green).
2. ISL-003 §8 s9 and ISL-007 §8 s9 if you pick up ISL-007 AC6 (below).
3. Bugs filed: `P109-S10-TYPECHECKMCP` (CI's `typecheck:mcp` red with 8 spec-file errors, listed), `P109-S9-CMP001RATE`.

## Do, in this order

1. **ISL-007 AC6's open question** (ask in plain words, mechanism first): should the validator warn about a typed word
   on a page in a project that carries the translation add-on? What counts as opted in, and which ports count (s7 read
   46 of 334 island texts that did not switch, unclassified — classify them before asking).
2. **ISL-015's three rulings** (where the kit-trap list lives, the token advice, the gate's shape): no other task left
   is buildable without a ruling, so ask these with ISL-007 AC6, one question each, in plain words.
3. **ISL-009's export half**, only when `nodegx-export/src/emit/component.ts` is committed by P18 (still a pile on 10-03).
4. **ISL-019's remainder:** AC6 (needs `noodl-mcp` dist rebuilt — in a worktree: `src/cloud/bundleEntry.js` has a
   peer's uncommitted edit), AC7 (the trailing-newline byte first).
5. **Round 3 questions**, mechanism first: ISL-016, ISL-017, ISL-021, ISL-008, ISL-010, ISL-018's open case,
   `P109-S8-ARRAYFILTERPATH`. Then the ISL-022 follow-ups and the s4 bugs.

## Decisions for Richard (not yours)

- `P109-S8-ARRAYFILTERPATH`; ISL-018's open case; Round 3 above; ISL-007 AC6's warning; ISL-015's three. Pushing
  `cline-dev` is his call (and the push meets `P109-S10-TYPECHECKMCP` in CI).

## Facts measured in session 10 that are not in a task file

- **`template:planner` names a file the working tree deletes**: a peer's uncommitted TPL-010 rename (planner →
  planning, files dated 09-23/09-26, no `template:planning` script). `npm run template:gate` is red for it alone; the
  spec reads only generators whose entry exists. Not touched.
- **`ts-node -T` DOES report a syntax error** (TS1005 at the right line); only a type error passes it. The audit's
  "names a file two files away" is the jest path: ts-jest transpiles through the error.
- **A file with a syntax error is never bound**, so `node.parent` is unset in it: a TypeScript-API tool must not walk
  parents there (the gate's first locator crashed on exactly that, and only in a one-file program).
- `cg003Template.test.ts` carries a peer's uncommitted P108 s9 hunk (`guRend3dKept`); s10 committed its own comment
  through a temporary index around it.

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
