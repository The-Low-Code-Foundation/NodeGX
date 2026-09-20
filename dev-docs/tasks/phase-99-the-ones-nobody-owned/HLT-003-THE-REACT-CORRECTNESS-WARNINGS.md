# HLT-003 — The React correctness warnings

**13 events in 42 minutes. Small counts, but each one names a real bug rather than a style
preference — React only emits these when the rendered output is genuinely wrong.**

## 1. The person sentence

> **A list in the editor redraws without silently swapping two rows' identities, and a field that
> holds nothing is an empty field rather than an uncontrolled one.**

## 2. The four, as measured

| count | what React said | what it means here |
|---|---|---|
| **10** | *"Encountered two children with the same key, `%s`."* — the repeated key is `692d3658-f11a-10db-e6c8-6b000f774898` | 🔴 A list is keyed on an id that is **not unique within that list**. The value is a project entity id, so the same entity appears twice in one render — either legitimately (an instance placed twice) with the id used as a key anyway, or a duplicate nobody intends |
| **1** | *"Each child in a list should have a unique `key` prop."* | a different list, with no key at all |
| **1** | *"`value` prop on `%s` should not be null. Consider using an empty string … or `undefined` for uncontrolled"* | a controlled input handed `null`, so React flips it between controlled and uncontrolled |
| **1** | *"Cannot update a component (`%s`) while rendering a different component (`%s`)."* | a `setState` during another component's render |

⚠️ **`%s` is literal in the log** — the format string reaches the logger unformatted, so the
component names are **lost**. The first job is reading them off a live session, not off the log.
🔴 That is itself a finding: `bugtracker.ts` is swallowing React's arguments, which is why four
phases of logs cannot name the component ([[a-run-list-is-not-a-log]]).

## 3. Scope

**In:** the four warnings, and the `%s` logging defect that makes them hard to attribute.

**Out:** auditing every list in the editor for keys. Fix what fires; a sweep for keys nobody has
seen fire is farming.

## 4. Acceptance criteria

1. **(the number)** A driven session covering the surfaces these fired on logs **0** of all four.
   Log in `verdicts/HLT-003/<date>/`.
2. **The duplicate key is fixed at the identity, not by suffixing an index.** A key of
   `` `${id}-${i}` `` makes the warning go away and **keeps** the bug: React then cannot tell the
   rows apart across a reorder, which is the thing keys exist to do. The fix names what is actually
   unique per row.
3. ✅ **`bugtracker.ts` forwards React's substitution arguments**, so `%s` resolves to the component
   name in the log. A spec asserts a formatted message reaches the sink.
4. **A control that the list still renders both rows.** A duplicate key removed by dropping one of
   the two entries passes AC1 and loses a row.
5. `test:ci` at the floor; `typecheck:editor` 0.

## 5. Landmines

- 🔴 **Two nodes legitimately sharing an entity id is normal in this product** — an instance is
  placed many times. If that is what this is, the key is the wrong field, not the data.
- ⚠️ **These are 13 events from three surfaces.** Others almost certainly exist elsewhere; they get
  rows here when they are seen firing, not before.
