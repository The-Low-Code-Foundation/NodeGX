# NSP-004 — The pilot five, and the go / no-go

**Opened 2026-09-29.** **Depends on NSP-003.** Ends by asking **R4**.
**Status: 📋 not started.**

## 1. The person sentence

> **Five nodes everyone uses have a spec, conform on the runtime, and we know — as a number —
> whether writing specs finds things the existing tests missed.**

## 2. The five, and why these

| node | why it is in the pilot |
|---|---|
| **Counter** | State, limits, three outcome signals, an asymmetric setter, and a known historic drift (FH-022) — the worked example |
| **Switch** | A latch; special-cased in `plan.ts` beside Counter (`isLatchType`) |
| **And** | Trivial on purpose — measures the *floor* cost of speccing a node |
| **Condition** | Value in, two signals and a boolean out; compiles away in the export (logic.test.ts Step 6) — sets up NSP-005's hardest case |
| **String Format** | **Dynamic ports** from a parameter — proves NSP-001's design for derived ports |

## 3. What to do

For each node:
1. Write the spec **from the runtime source**, citing the lines each rule came from in a comment
   (R3 (a): the runtime wins by default).
2. Hand scenarios for every edge named in the source's docblocks and in existing tests.
3. Run against the runtime adapter at the **deep** budget (10,000 sequences), locally, alone on
   the box.
4. Every divergence becomes a row in §6: the shrunk sequence, both traces, and a proposed answer —
   *spec wrong* / *runtime bug* / *intended*. **No runtime change in this task.**

## 4. Acceptance criteria

1. Five specs, each with all mutants killed (NSP-003 AC3), **each passing the catalog-parity gate** (R6: port
   names, kinds, display names, groups, descriptions, defaults, outcome ports equal the catalog's) and each
   with `ports(params)` where the node has dynamic ports (String Format, And — NSP-020's first two rows).
2. Each spec conforms on the runtime **or** every mismatch is a §6 row with its replay file.
3. **The pilot's numbers**, written in §6:
   - divergences found, by answer;
   - how many of those an **existing** test already caught (grep the test suites for the
     scenario — if one existed, the spec found nothing new);
   - time spent per node (a session log), and lines of spec per node.
4. **R4 asked in plain words** with those numbers, in the README's §7, and the recommendation.

## 5. How to read the result (for R4)

- **≥ 1 new divergence across the five**, or specs that cost well under a session per node:
  continue into the batches.
- **Zero new divergences and high cost**: narrow to T1 only, keep the runner as a tool for new
  nodes, and skip the batches.
- Either way NSP-005 and NSP-006 are worth doing: they answer a different question (whether
  targets become swappable), which the pilot's divergence count does not.

## 6. Built

*(empty)*
