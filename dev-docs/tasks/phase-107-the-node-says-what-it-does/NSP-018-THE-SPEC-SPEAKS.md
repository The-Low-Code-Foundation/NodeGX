# NSP-018 — The spec speaks: port descriptions and `get_node_type` come from the spec

> **Grown by R6 (2026-09-30):** not only descriptions — the **catalog itself** (`node-catalog.json`:
> ports, types, defaults, groups, display names, enum labels, dynamic-port mechanisms) is *generated
> from the specs* for every specced node, and the runtime's registration is graded against it rather
> than being its source. The catalog-parity gate in `packages/nodegx-node-spec/tests/catalog-parity.test.ts`
> (s1) is the per-node precondition; `get_node_type` answers per-instance ports from NSP-020's
> `ports(params)`. The extractor in `scripts/node-catalog/` keeps running for the unspecced remainder
> and a merge prefers the spec — one catalog, two sources, the spec winning where it exists.

**Opened 2026-09-29.** **Depends on NSP-011.**
**Status: 🟡 s72 (2026-10-09): AC1, AC3, AC4, AC5 met; AC2 built and counting — 4 of 507 input reducers have their words (Counter), the typecheck gate waits for the rest.**

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

## 5. Built — s72, 2026-10-09

**AC1 ✅ — the catalog takes a specced node's descriptions from its spec.** `scripts/node-catalog/generate.js`
loads the registry from source (`scripts/node-spec/load-specs.js`, now shared with `spec-ledger.js`), writes each
specced port's description from the spec, and **throws in both modes** when the runtime's registration says other words,
naming the node, the port, the runtime file and both sentences. Outcome ports (`done`, …) are derived, not declared,
and keep the runtime's words. Before: `catalog:check` exit 0. After: exit 0, the catalog byte-identical (no description
disagreed). **Plant:** "or does nothing" → "or quietly does nothing" in the runtime's `counter.ts` only → `catalog:check`
exit 1 with the Counter · input "increase" disagreement; restored by `cp`, `cmp`-identical. CI: the `node-catalog` job in
`pr.yml` runs `catalog:check` (comment added). The parity test's description half now holds by construction.

**AC2 🟡 — `Patch.says`, the rules generator, the count.** `says?: string` on `Patch` (spec.ts): the case a branch answers,
in words. `scripts/node-spec/rules.js` reads every `defineNode({ type }).on({ … })` from the TypeScript AST and turns
each said branch into `<case> → <the pulses, then the outcome>; <a sibling's pulse this branch lacks> stays silent`:

```
increase: at Max Value with Limits Enabled → Unchanged; Count Changed stays silent
increase: otherwise the count goes up by one → Count Changed, Done
startValue: after the first: only where Reset returns to → Count Changed stays silent
```

The case is the author's; everything after the arrow is the spec's structure. Nothing that runs a spec reads `says`
(`shapeOf` builds a branch's shape from named keys only). `generate.js` writes the lines as the catalog node's
`rules: { [inputPort]: string[] }`, and `catalog:merge` carries them to the enriched catalog. `spec-ledger` prints the
count: **`in words: 4 of 507 input reducers … 1 spec(s) fully: Counter`**, and names the two specs the source read can't
see (Add / Remove Record Relation, built in the `relationNode` factory). `--json` has `said`.
**Why the gate is not on yet:** making `says` required, measured on the whole registry, gives **510 `tsc` errors**
(`tsc` reports per reducer, so there are more branches than that). The gate is a one-line flip (`says?` → `says`) once
the count reads 507 of 507. Limits: input reducers only (`afterInputs`, `world`, `person` patches are not read yet), and
a `says` must be a literal in the patch's own object literal (the reader throws on anything else).

**AC3 ✅ — `get_node_type` returns Counter's rules.** `NodeTypeDetail.rules` (noodl-mcp `catalog.ts`) on
`detail:"full"`, and on the `ports` path **narrowed to the asked ports** (`ports: ["increase"]` gets `increase`'s two
lines). **Not on the default summary**, on purpose: CMP-006 measured 45 real calls (26 default, 18 `ports`, 1 full), so
`ports` is the path that reaches agents. The summary's size is a measured contract (AWP-005 §2), and a big visual node's
rules can't be priced until it has them. `tests/nsp018RulesOnTheWire.test.ts` (5 tests) has an arming check, and its
negative summary assertion is there to be overturned with a measurement. **Plant:** the `detail.rules =` line removed →
the two relay tests red, the other three green; restored, `cmp`-identical. Budgets: `toolDisclosure` reads `[surface]
8261 tokens / 20 resident tools — 19 under the 8280 budget`. No tool description changed (a result field is free).
`cmp006…`, `cmp009…` and `toolDisclosure` are green beside it (4 suites, 54 tests).

**AC4 ✅ — `docs:nodes:check` clean.** It was **red before this work** with two stale pages (`visual/page-stack.md`,
`visual/for-each.md`), from P109's ISL-048 (`c22c9aceb`) and ISL-049 (`a5d6abb33`), which regenerated the enriched catalog
and not the pages. Regenerated: the diff is exactly those two pages. After the rules landed, the catalog and enriched
regenerated with a Counter-only diff (`rules`, +17 / +10 lines), and `catalog:merge:check` and `docs:nodes:check` are clean.
The docs pages don't render `rules` yet (§6).

**AC5 ✅ — `idioms`.** `Idiom { says, example }` and `NodeDecl.idioms?` (spec.ts). Eighteen specs carry them: the 13 T1
nodes of NSP-011 and the pilot five. `spec-ledger` prints `idioms: 18 of 108 specs`, and **`--check` fails a T1 NSP-011
spec without one.** Plant: Or's renamed away → `"Or" is a T1 node NSP-011 specced and its spec has no idioms"` and
exit 1; restored. **R11 note:** `idioms` is the one place React names belong in a spec (`useState`, `useEffect`). It
describes the code a node *replaces*, not the node's behaviour, and the task's own example is React.

## 6. Left

1. **AC2's words for the other 503 reducers**, batch by batch (the pilot five's other four first, then NSP-011's 13). Then
   flip `says?` to `says` in `Patch`, which is the typecheck gate. Every patch-returning function then owes one, so decide
   first whether `afterInputs` / `world` / `person` patches get read as rules too.
2. **The record-relation pair:** the rules reader can't see reducers written inside `relationNode`. Teach it the factory,
   or move `says` up to the factory's call site.
3. **The default summary:** price `rules` on it once a dozen specs have their words (CMP-006's method: weight by real
   call traffic), then overturn or keep the negative assertion in `nsp018RulesOnTheWire.test.ts`.
4. **The docs pages** (`scripts/generate-node-docs.js`) could render `rules` under the port table. That's the "docs"
   half of the person sentence.
