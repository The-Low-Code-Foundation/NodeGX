# ISL-050 — A column layout never blanks the page

**Status: ⬜ scoped s30 (2026-10-08) at `caee8df0b`, nothing built.** **Source:** 3 bugs P107 NSP-016 s60 filed on the Columns
(`net.noodl.visual.columns`) and handed to P109 under R16: 1 high · 2 medium, **1 to ask** (C132). **Side:** noodl-viewer-react (the
Columns component and node), the Columns spec (`packages/nodegx-node-spec/src/nodes/columns.ts`, v1).

## 1. The person sentence

**Whatever a wire carries into a Columns node, the page still draws: a value it cannot use falls back to the base layout, and a
number goes where a size goes.**

## 2. Why these belong together

P107 s60 rendered the Columns and drove it. A Medium or Small Layout that is not text throws in render and blanks the whole page
(C133, high); Auto Fit with Min Column Width plus Gap at 0 builds `new Array(Infinity)` and blanks it too (C134); a number wired into
Medium Below or Small Below is refused until a size has been typed there (C132).

## 3. The bugs

Generated from the ledger headers; **the ledger file is the source**.

| bug | node | severity | status | build | what a person sees |
|---|---|---|---|---|---|
| [P107-C133](../../bugs/p107-c133-a-medium-or-small-layout-that-is-not-a-string-blanks-the-page.md) | Columns | high | scheduled | as proposed | A Columns whose Medium Layout or Small Layout holds a number (or any value that is not a string) blanks the page when the container narrows into that band |
| [P107-C132](../../bugs/p107-c132-a-number-wired-into-medium-below-or-small-below-is-refused-until-a-size-is-typed-there.md) | Columns | medium | scheduled | **ask first** | A number wired into a Columns' Medium Below or Small Below is refused unless a size was typed into that port first, and a number after a var(--token) is refused on any size port |
| [P107-C134](../../bugs/p107-c134-auto-fit-with-min-column-width-equal-to-minus-the-gap-blanks-the-page.md) | Columns | medium | scheduled | as proposed | A Columns on Auto Fit whose Min Column Width plus Horizontal Gap is 0 (Min 16, Gap −16) blanks the page — the column count divides by zero |

**To ask** (with ISL-048's and ISL-049's batch): C132 — should a number on a size port that holds nothing (or holds a token) be read
as pixels.

## 4. Order of work

C133 first (high, as proposed: read Medium and Small Layout through `readColumnLayoutString`), then C134 (clamp the count to at
least 1 and at most the children). Both are KNOWN ROWS on the runtime target (`conformance.test.ts`; C133 also two `WITHHELD`
entries): the fix drops them and the scenario's `row` mark in the same commit. Then C132 as ruled.

## 5. Rules for every row

ISL-048 §5 and ISL-049 §5 hold: a control on every fix, the interpreter's mutants re-run at seeds 13 and 20732 before the runtime
grade, dead model removed before anything is declared.

## 6. Acceptance criteria

- **AC1** — every row re-measured at the session's HEAD before it is built.
- **AC2** — C132 asked in plain words and ruled.
- **AC3** — every row fixed, one commit each, its known row and withheld values dropped, a control red on exactly its scenarios.
- **AC4** — `node scripts/bugs.js --from P107` lists none of this task's rows as `open` or `needs-ruling`.
