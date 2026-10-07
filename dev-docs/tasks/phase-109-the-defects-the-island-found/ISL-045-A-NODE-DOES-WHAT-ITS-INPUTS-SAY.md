# ISL-045 — A node does what its inputs say, and one node's failure stays its own

**Status: ⬜ not started. Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 5 bugs
from the ledger (`dev-docs/bugs/`) that no phase owned: 2 medium · 3 low; 3 to ask. **Side:** noodl-viewer-react (Mounted, a component instance as a root, the error boundary), noodl-runtime (Variable), nodegx-node-spec (Dropdown)

## 1. The person sentence

**A component whose only visual node is another component draws, a Mounted input with no value yet keeps a gated screen hidden, a Variable gives back the objects it was given, a built-in node that throws blanks only itself, and the Dropdown's spec matches what a person sees after an empty list.**

## 2. Why these belong together

Runtime rows the Nightbook template (P78 TPL-011) and this phase's own sessions met, outside any Track F theme. INSTANCEROOT draws nothing (cause not isolated). MOUNTED, VARIDS and BUILTINBOUNDARY each change what a person sees in more than one reasonable way, so they are rulings. DROPDOWNEMPTYRESET is the spec, not the runtime.

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix. This table is
generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P78-TPL011-INSTANCEROOT](../../bugs/p78-tpl011-instanceroot-a-component-whose-only-visual-node-is-another-component-s-instance-draws-nothing.md) | medium | scheduled | A component whose only visual node is another component's instance draws nothing (cause not isolated) |
| [P78-TPL011-MOUNTED](../../bugs/p78-tpl011-mounted-a-wired-mounted-input-with-no-value-yet-leaves-the-node-mounted.md) | medium | needs-ruling | A wired Mounted input that has no value yet leaves the node mounted, so a gated screen flashes |
| [P78-TPL011-VARIDS](../../bugs/p78-tpl011-varids-an-array-of-objects-kept-in-a-variable-comes-back-with-an-id-on-each-object.md) | low | needs-ruling | An array of plain objects kept in a Variable comes back with an `id` on each object, which then gets saved |
| [P109-S22-BUILTINBOUNDARY](../../bugs/p109-s22-builtinboundary-a-built-in-node-that-throws-while-drawing-still-blanks-the-page.md) | low | needs-ruling | A built-in node that throws while it draws still blanks the whole page (kit nodes no longer do) |
| [P109-S21-DROPDOWNEMPTYRESET](../../bugs/p109-s21-dropdownemptyreset-the-dropdown-spec-keeps-the-hidden-option-selected-after-an-empty-list.md) | low | scheduled | The Dropdown spec thinks the hidden option is still selected after Items offered no options, so a person choosing the first option of the next list reads as a change the browser never raises |

## 4. Order of work

INSTANCEROOT first (isolate the cause), DROPDOWNEMPTYRESET with it (a spec fix, cheap). Ask MOUNTED, VARIDS and BUILTINBOUNDARY in one batch (BUILTINBOUNDARY: s22's recommendation was yes).

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line, and this task was written
  from the ledger without re-running them. Re-run each reproduction at HEAD before building. A row that no longer
  reproduces is closed in the ledger with the commit that fixed it, not fixed again.
- **A control on every fix:** the old code red on exactly the fix's arms.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:`).

## 6. Related work and collisions

- DROPDOWNEMPTYRESET is in a P107 spec: tell P107 (it may be writing node specs) and refresh the stranger hashes if the Dropdown spec moves (round 4 holds it).
- BUILTINBOUNDARY follows ISL-026's kit boundary (KITTHROWBLANKS, s22).

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled (P78-TPL011-MOUNTED, P78-TPL011-VARIDS, P109-S22-BUILTINBOUNDARY).
- **AC3** — every row ruled or written "as proposed" is fixed, one commit each (or one per shared mechanism), with its
  regression green.
- **AC4** — `node scripts/bugs.js` lists none of this task's rows as `open`, `scheduled` or `needs-ruling`.
