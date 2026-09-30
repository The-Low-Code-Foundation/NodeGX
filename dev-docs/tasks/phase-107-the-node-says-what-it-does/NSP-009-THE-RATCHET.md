# NSP-009 — The ratchet: spec coverage in PR CI

**Opened 2026-09-29.** **Depends on NSP-004.**
**Status: 📋 not started.**

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

*(empty)*
