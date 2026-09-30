# NSP-011 — Batch: logic, math, strings, variables, converters

**Opened 2026-09-29.** **Depends on NSP-004** (and R4 = continue).
**Status: 📋 not started.**

## 1. The person sentence

> **Every small node people wire together to make a decision — compare, invert, format, remap,
> hold a value — says what it does and is checked.**

## 2. The nodes (from the census)

**13**, from the census ([CENSUS.md](CENSUS.md), NSP-000, generated 2026-09-30). Regenerate the census; do not edit this list by hand.

- **T1 pure / state machine (13):** Boolean · Boolean To String · Color · Color Blend · Inverter · Log (`net.noodl.Log`) · Number · Number Remapper · Or · String · String Mapper · Substring · Value Changed

Census notes:
- **Boolean** — carries the coercion table — spec first
- **Color** — carries the coercion table — spec first
- **Log** — the console line is an effect routed to the world (NSP-007), checked not ignored
- **Number** — carries the coercion table — spec first
- **Number Remapper** — first node where units (C10) matter
- **String** — carries the coercion table — spec first
- **Value Changed** — defined by equality; the rule for objects, NaN and -0 feeds the canonicaliser

(The pilot five — Counter, Switch, And, Condition, String Format — are NSP-004's.)

## 3. What is special here

- **The four Variables** (Boolean, Color, Number, String) look trivial and carry the coercion
  table. Spec them first; every other node's `coerce:` rules lean on them.
- **Value Changed** is defined by *equality*, which needs a rule for objects, `NaN` and `-0`.
  Write the rule from the runtime, cite it, and put it in the canonicaliser (NSP-002) if it
  differs.
- **Number Remapper** is where **units** (C10) first matter.
- **Log** has a side effect (the console). Spec its outputs; route the console line to the world
  (NSP-007) as an effect, so it is checked rather than ignored.

## 4. Acceptance criteria (every batch)

1. Every node in §2 is **specced** by the ledger's definition (NSP-009: spec, mutants killed,
   conforms on the runtime at the R5 budget) **or exempt with a reason**.
2. Every node is run on the export adapter; each mismatch is a row in §6 routed to phase 18.
3. Every divergence from the runtime is a row with its replay file and a proposed R3 answer; no
   runtime change rides inside this task.
4. The ledger floor is raised in the closing commit, and the README's status line says the new
   number.

## 5. Watch for

- Memory: *a CSS property whose default equals the test value matches everything* — the same trap
  for scenarios: a scenario that writes a port's **default** proves nothing about that port.
  The generator must also write non-defaults.

## 6. Built

*(empty)*
