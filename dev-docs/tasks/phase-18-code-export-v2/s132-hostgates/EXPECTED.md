# The Host Desk — what both arms must read, written before either ran (s132, 2026-10-21)

`tests/helpers/host-desk.ts`. Steps: Count A · Count A · Count B · Count A · Stamp · Say. Each row is every drawn Text
in document order: A.count · A.again · B.count · B.again · year · later · picked · timer · win · said.

From the runtime's own rules (`simplejavascript.ts`): a Function keeps `_this` per node, one object for the node's life;
a Run runs the body once; `Outputs.x = v` publishes once per change; Done after the run; a Set Variable in the Done chain
reads the output the run wrote. Two placements of a component are two nodes, so two `this`.

| after | A.count | A.again | B.count | B.again | year | later | picked | timer | win | said |
|---|---|---|---|---|---|---|---|---|---|---|
| load | count nothing | again nothing | count nothing | again nothing | year nothing | later nothing | picked nothing | timer nothing | win nothing | said nothing |
| Count A | 1 | 1 | · | · | · | · | · | · | · | · |
| Count A | 2 | 2 | · | · | · | · | · | · | · | · |
| Count B | 2 | 2 | 1 | 1 | · | · | · | · | · | · |
| Count A | 3 | 3 | 1 | 1 | · | · | · | · | · | · |
| Stamp | · | · | · | · | 1970 | yes | picked | set | window | · |
| Say | · | · | · | · | · | · | · | · | · | hello Ann |

(`·` = unchanged.) The export must read exactly these from the first press on. **Measured after the arms ran:** the runtime read every row as predicted; the export read every row from Count A on, and at load read `''` for the four Tally Texts (a wired Text with an authored text, before the wire delivers): filed as P18-S132-AUTHOREDTEXT (low, 16 such Texts in the templates), pinned by name in the spec's A2b. (The first desk read the counts through Variables, and both Tallies read "1" after one press on the runtime arm: a NodeGX Variable is one value app-wide by name. The Texts read the output directly now.) What each row kills:

- **A.count 3 after three presses**: a body run against a fresh `this` (no kept node, or `self` not handed to it) reads 1.
- **A.again = A.count**: two reads of one run in one chain; a body re-run at a read site under a fresh `this` reads 1 both
  times, under a kept `this` reads 1 then 2 (a second run) — either way not the runtime's pair.
- **B.count 1 while A.count is 2**: one `self` per node, not per component file or per module.
- **year 1970 / later yes / picked picked / timer set / win window**: the four other traits in one body, each read where
  the runtime reads it; the values are chosen so a true clock, a true random draw and a true `window` all compare.
- **said hello Ann**: the pure body is untouched by the slice (control).

The reactive variant (Tally's Run wire removed) is graded on the plan alone: "The tally" deferred with the sentence
"the script keeps state on `this` across runs and has no Run wire — a run on its inputs' arrival is EXP-019 slice 2".
