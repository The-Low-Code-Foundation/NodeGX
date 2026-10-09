# ISL-050 — A column layout never blanks the page

**Status: 🟡 s32 (2026-10-09): 2 of 3 fixed — C133 `8d2fe2678`, C134 `73d7696ec` (§7); C132 ruled ("Read the number as pixels"), not built.** Scoped s30 (2026-10-08) at `caee8df0b`. **Source:** 3 bugs P107 NSP-016 s60 filed on the Columns
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
| [P107-C133](../../bugs/p107-c133-a-medium-or-small-layout-that-is-not-a-string-blanks-the-page.md) | Columns | high | **fixed** `8d2fe2678` | as proposed | A Columns whose Medium Layout or Small Layout holds a number (or any value that is not a string) blanks the page when the container narrows into that band |
| [P107-C132](../../bugs/p107-c132-a-number-wired-into-medium-below-or-small-below-is-refused-until-a-size-is-typed-there.md) | Columns | medium | scheduled | ruled 2026-10-08: "Read the number as pixels" | A number wired into a Columns' Medium Below or Small Below is refused unless a size was typed into that port first, and a number after a var(--token) is refused on any size port |
| [P107-C134](../../bugs/p107-c134-auto-fit-with-min-column-width-equal-to-minus-the-gap-blanks-the-page.md) | Columns | medium | **fixed** `73d7696ec` | as proposed | A Columns on Auto Fit whose Min Column Width plus Horizontal Gap is 0 (Min 16, Gap −16) blanks the page — the column count divides by zero |

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

## 7. Session 32 (2026-10-09) — the Columns never blank the page

**AC1:** C133 and C134 re-measured at the session's HEAD: both known rows still fired. **AC2:** C132 was ruled on P107's rulings
page (2026-10-08, "Read the number as pixels") — this file still said "ask first".

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C133 | `8d2fe2678` | `pickBreakpointLayout` reads Medium and Small Layout through `readColumnLayoutString` (a number as its text, anything else no layout); the band is still picked only by a truthy layout, so `0` stays inert. Known row and both `WITHHELD` entries gone. Columns spec **v2** (a band layout must read as one); a scenario added for a list, an object and a blank string | runtime 48 / 49 at seeds 13 and 20732 (C134's known row); mutants 82 / 82; control red on exactly the C133 scenario; the new scenario fails against v1 |
| C134 | `73d7696ec` | `calcAutoFit`: a step at or below 0 is one column, and never more columns than children (`resolveColumnLayout` passes `children.length`) — CSS `auto-fit`'s collapse, so fewer children than fit means wider columns. Known row gone | runtime 49 / 49 at both seeds; mutants 82 / 82; control red on exactly the C134 scenario; `nda-006` clamp cases (the base does not compile them); viewer Columns tests 105 / 105 |

**What s32 found:** a ruling read literally can move a case its author never meant: "a number as its text" makes `0` the layout
`"0"`, which would have turned an inert band on. The spec's intent (R11) and every release keep `0` inert, so the band keeps its
truthiness test and the value is read after it. And a generated sequence, not a recorded scenario, was the only thing that reached a
list or an object as a band layout — a scenario now does.

**Left (1): C132** — ruled. The fix is in the runtime's generic size merge (node.ts :430-437 / `setInputValue`), so every visual node
with a size port moves with it: re-grade every visual spec at both seeds, not only the Columns.
