# NSP-009 — The ratchet: spec coverage in PR CI

**Opened 2026-09-29.** **Depends on NSP-004.**
**Status: ✅ built (s64, 2026-10-09): `npm run spec-ledger` counts the line the board counted by hand — 124 of 147 on the runtime, 2 on the export, 1 exempt, 22 owed — and `spec-ledger:check` holds it in the PR workflow (the `node-catalog` job). AC1–AC4 met (§5). s63 began it with `exemptions.json`.**

## 1. The person sentence

> **The number of nodes whose behaviour is written down and checked can only go up, and a new node
> cannot enter the picker without a spec or a written reason.**

## 2. What to build

`npm run spec-ledger` (script: `scripts/node-spec/spec-ledger.js`), the sibling of
`picker-coverage.js`:

```
SPEC COVERAGE: 5 of 147 picker nodes conform on the runtime (3.4%); 5 on the export; 0 exempt
  by tier:  T1 5/41 · T2 0/18 · T3 0/40 · T4 0/22 · T5 0/20 · T6 0/6        (illustrative)
```

- **Population:** the census (NSP-000) — picker, non-deprecated.
- **Counts as specced** only if: the spec exists, every mutant is killed, and the node conforms on
  the target at the R5 budget. A spec with a surviving mutant is **not** counted.
- **Exempt** needs a reason string in `exemptions.json`, and exemptions are printed, never hidden.
- A **floor** in `spec-ledger.json`, ratcheting both ways exactly as `pickerCoverageFloor` does: a
  fall fails, and a rise fails until the floor is raised in the same commit.
- **New-node gate:** a picker node in the catalog with neither a spec nor an exemption fails CI.
  This is the "new nodes ship specced" rule, mirroring phase 18's "new nodes ship exportable".

## 3. Acceptance criteria

1. `spec-ledger --check` runs in the PR workflow and fails on a planted fall and a planted
   unraised rise (both shown).
2. Adding a fake picker node to a **copy** of the catalog fails the new-node gate with the node's
   name in the message.
3. The ledger's per-tier totals equal the census's (cardinality, both directions).
4. The CI step's duration is printed and stays inside R5's budget.

## 4. Watch for

- Memory: *a run list is not a log — a 19 s run died before the gates.* Read the step's duration
  and exit status, not a green tick.
- Memory: *a red count gate ⇒ count the artefact; never bump the literal — use the constant.*

## 5. Built

**s64, 2026-10-09.** `scripts/node-spec/spec-ledger.js`, `spec-ledger.json` beside `tiers.json`, `npm run spec-ledger[:check]`,
a step in `.github/workflows/pr.yml` after `export-ledger:picker`, and `packages/nodegx-node-spec/tests/spec-ledger.test.ts` (10 tests,
each plant beside a control that passes on the same copies).

```
SPEC COVERAGE: 124 of 147 picker nodes conform on the runtime (84.4%); 2 on the export, inside a declared reach (Counter, Switch); 1 exempt; 22 owed
  by tier:  T1 46/46 · T2 11/11 · T3 22/39 · T4 27/27 · T5 18/19 (+1 exempt) · T6 0/5
  counted:  104 by a spec in the registry · 20 by an N graph scenario's claims
```

**How it counts** (the script's header has every rule):

- **A spec** — the type is a key of the registry (`src/nodes/index.ts`), loaded from SOURCE (transpiled in memory; `dist/` can be stale).
- **The graph** — an `N` graph scenario makes a CLAIM about the node: a claim's subject is a node of that type, or a component instance,
  which credits the `Component Outputs` inside it. A node only placed in a scenario to drive another is not graded by it. Measured
  first: by placement alone the count is the same 20, and the one node never a claim subject is Component Outputs, graded through its
  instance in t08. 19 T4 nodes and On App Error (T2) count this way; the other 8 T4 nodes have specs.
- **The export** — `EXPORT_REACH`'s keys, read from the AST of nodegx-export's test helper (requiring it would load the exporter).
- The script's reading equals the s63 board's hand count, tier by tier.

**"Counts only if every mutant is killed and it conforms at the R5 budget" — the script does not run the suites; the workflow already
does.** The `test-packages` job runs noodl-runtime `test/node-spec/conformance.test.ts`, which plays EVERY registered spec at 200 with
the mutants and fails on a divergence, a failed scenario, a surviving or unreached mutant, and `graph.test.ts`, which fails on a claim
that does not hold. A spec that does not conform is a red PR and cannot land, so a spec in the registry is a graded spec. Re-running
the batch in the ledger step would repeat the workflow's longest step (~15 minutes) to recompute a fact it established. Known rows
count as conforming, as the board always counted them — they are printed in each report. The other option (a results file the suite
writes and the ledger reads) was rejected: a recorded result goes stale the moment a peer's commit moves a spec, and its mtime is the
only honest field. An engineering choice, not a ruling — no question for Richard.

**The new-node gate needs `owed`.** 22 picker nodes have no spec today, by plan: NSP-017's five escape hatches and NSP-022's seventeen
cloud-only nodes. A gate reading "no spec and no exemption fails" would be red on its first run. `spec-ledger.json` `owed` names each
with the task that writes it — the written reason the person sentence allows. A picker node with no spec, no graph claim, no exemption
and no `owed` entry fails, named; an `owed` node that is graded now, not a picker node, or also exempt fails too. Adding to `owed` is a
reason in the diff, as an exemption is.

**AC1** — planted fall (floor one above the reading) and planted unraised rise (one below) each exit 1 with `SPEC COVERAGE FELL` /
`ROSE` and the numbers; the export floor the same way; the control (floor at the reading) exits 0. **AC2** — `zz.NSP009.FakeNode`
added to a COPY of the catalog fails `NEW-NODE GATE: picker node "zz.NSP009.FakeNode" (Fake Node) has no spec, …`; owed, it passes the
gate (and the census still wants it tiered). **AC3** — the per-tier totals and the names are compared with census.json both ways: a
row dropped from a census copy and a census row that is not a picker node each fail, named. A picker node with no tier fails too.
**AC4** — the step prints its duration (`holds at 124/147 … (1350 ms)`); R5's budget is the 200 sequences the `test-packages` job
plays, which this step does not add to. R5's local deep run is `npm run spec-ledger -- --deep "<type>[,<type>]"` (10,000, shrink on,
`-w 2`, one spec list at a time — never the whole registry on the shared box).

**Not in CI: `spec-census:check`.** The census counts test files that quote each type name, so ANY peer's new test would make it stale
and redden an unrelated PR. The ledger compares only what a node's tier and the catalog decide (byTier and the names), which moves
only when the picker does.
