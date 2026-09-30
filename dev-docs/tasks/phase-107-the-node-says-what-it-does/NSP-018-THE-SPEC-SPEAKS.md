# NSP-018 — The spec speaks: port descriptions and `get_node_type` come from the spec

> **Grown by R6 (2026-09-30):** not only descriptions — the **catalog itself** (`node-catalog.json`:
> ports, types, defaults, groups, display names, enum labels, dynamic-port mechanisms) is *generated
> from the specs* for every specced node, and the runtime's registration is graded against it rather
> than being its source. The catalog-parity gate in `packages/nodegx-node-spec/tests/catalog-parity.test.ts`
> (s1) is the per-node precondition; `get_node_type` answers per-instance ports from NSP-020's
> `ports(params)`. The extractor in `scripts/node-catalog/` keeps running for the unspecced remainder
> and a merge prefers the spec — one catalog, two sources, the spec winning where it exists.

**Opened 2026-09-29.** **Depends on NSP-011.**
**Status: 📋 not started.**

## 1. The person sentence

> **What a person reads in the property panel and the docs, and what an agent reads over MCP,
> comes from the same spec the tests grade — so it cannot say one thing while the node does
> another.**

## 2. What to build

- **Descriptions from the spec.** Each spec port carries its `doc` string; for a specced node, the
  catalog (`catalog:generate` → `node-catalog.json`) takes the description from the spec, and a
  gate fails if the runtime definition's `description` differs from it. The runtime keeps its
  field (the editor reads it), but the spec is where it is edited.
- **Rules in words.** From each reducer's branches, a short generated list — *"Increase: at Max
  Value with Limits Enabled → Unchanged, Count Changed stays silent"*. Generated from the spec's
  structure plus a one-line `says` on each branch, never free prose.
- **`get_node_type` returns the rules** for specced nodes, inside the MCP tool budget.
- **`idioms` — the code this node replaces** (optional field on a spec). A short list of the
  hand-written code shapes that do what the node does, each one line with a tiny example:

  ```ts
  idioms: [
    { says: 'a number in state with +1 / −1 / reset handlers', example: 'const [n, setN] = useState(0)' },
    { says: 'a clamped counter', example: 'setN((n) => Math.min(n + 1, max))' },
  ],
  ```

  **Nothing in this phase reads it.** It is the lookup table a future *import your app into a
  canvas* agent would need (README §8) — which node to reach for when it meets a pattern in
  someone's React — and it is cheapest to write while the person writing the spec has the node's
  behaviour in their head. It is not served by `get_node_type` (it would spend the MCP budget on
  a feature that does not exist yet).

## 3. Acceptance criteria

1. For every specced node, the catalog description equals the spec's; editing only the runtime's
   description fails the gate (planted, shown).
2. Every reducer branch has a `says` line; a branch without one fails the spec's typecheck.
3. `get_node_type` for Counter includes its rules; the MCP tool-surface budget gates stay green
   (memory: *5 budgets, 8 free* — read them, don't assume the headroom).
4. `docs:nodes:check` stays clean after regenerating (memory: a regenerated artefact can delete a
   hand edit — diff before and after).
5. `idioms` is typed and optional; the ledger reports how many specced nodes carry it (a count,
   not a gate), and every T1 node specced in NSP-011 has at least one.

## 4. Watch for

- Memory: *a documentation sentence can grade the code it describes — move the code, not the
  sentence.* When a description and the spec disagree, the spec (read from the code) wins, and the
  description changes.
- Memory: *a stale MCP `dist/` hides a merged vocabulary field.* Rebuild the MCP package before
  reading what `get_node_type` returns.

## 5. Built

*(empty)*
