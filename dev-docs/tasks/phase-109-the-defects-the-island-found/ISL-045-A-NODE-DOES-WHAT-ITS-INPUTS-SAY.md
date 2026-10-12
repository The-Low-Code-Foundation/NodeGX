# ISL-045 — A node does what its inputs say, and one node's failure stays its own

**Status: ✅ s44 (2026-10-11): closed — 4 fixed, 1 closed as not reproducible. DROPDOWNEMPTYRESET `d08eada79` (Dropdown v7), INSTANCEROOT `dad3a9c33` (isolated to the deploy's export), MOUNTED `64ceb2746` (a quiet note + Mounted's help, re-ruled after the warning was counted at 409 template fires), BUILTINBOUNDARY `42699d261` (cost measured first); VARIDS dug as ruled and closed `wontfix` (its path is gone; both runtime mechanisms read at the code Nightbook ran, neither adds an id). Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 5 bugs
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
| [P78-TPL011-INSTANCEROOT](../../bugs/p78-tpl011-instanceroot-a-component-whose-only-visual-node-is-another-component-s-instance-draws-nothing.md) | medium | fixed | A component whose only visual node is another component's instance draws nothing (cause not isolated) |
| [P78-TPL011-MOUNTED](../../bugs/p78-tpl011-mounted-a-wired-mounted-input-with-no-value-yet-leaves-the-node-mounted.md) | medium | fixed | A wired Mounted input that has no value yet leaves the node mounted, so a gated screen flashes |
| [P78-TPL011-VARIDS](../../bugs/p78-tpl011-varids-an-array-of-objects-kept-in-a-variable-comes-back-with-an-id-on-each-object.md) | low | wontfix | An array of plain objects kept in a Variable comes back with an `id` on each object, which then gets saved |
| [P109-S22-BUILTINBOUNDARY](../../bugs/p109-s22-builtinboundary-a-built-in-node-that-throws-while-drawing-still-blanks-the-page.md) | low | fixed | A built-in node that throws while it draws still blanks the whole page (kit nodes no longer do) |
| [P109-S21-DROPDOWNEMPTYRESET](../../bugs/p109-s21-dropdownemptyreset-the-dropdown-spec-keeps-the-hidden-option-selected-after-an-empty-list.md) | low | fixed | The Dropdown spec thinks the hidden option is still selected after Items offered no options, so a person choosing the first option of the next list reads as a change the browser never raises |

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

## 8. Session log

### s44 (2026-10-11) — two fixed, AC1 for four

| row | state | what happened |
|---|---|---|
| DROPDOWNEMPTYRESET (low) | ✅ `d08eada79` | Re-measured with the bug's scenario added: the runtime still differed at event 16 (62/63). The spec had one value, `''`, for two states HTML treats differently: the hidden option selected (a fresh element; it carries `selected`) and nothing selected (the selected option left and no enabled one remained). `domSelected` gains `null`; v7, `migration: none`. Runtime 63/63, mutants as before; a control scenario for the other state; golden check holds. Stranger round 4's engine followed v6's text and gets the same rule, marked not the stranger's line; hashes refreshed; round 4 passes 63/63 |
| INSTANCEROOT (medium) | ✅ `dad3a9c33` | Isolated by a new drive (`isl045-instanceroot-drive`): rendered from disk, every shape drew; deployed, a component whose only node is an instance and whose `nodes.json` has no `visualRoots` key drew nothing. The deploy exports a project it never registers (R20), so the instance is unresolved, and an unresolved root counted only if recorded (GAM-014). `isVisualRoot` now answers from the project when nothing was recorded. GAM-014's spec gains two arms (red on the pre-fix engine in exactly the fix's arm); 13 templates deploy byte-identically with both engines; editor `test:ci` at P112's floor (1, SUB-006's suggestion order) |
| MOUNTED (medium) | ⏸ ruling | Re-measured: still fires. A Group gated by a Variable nobody sets is drawn; controls false/true/no wire as expected (`isl045-mounted-drive`) |
| VARIDS (low) | ⏸ ruling | Re-measured: does not reproduce in its nearest shape (Function → Set Variable array → Variable → For Each + read-back): plain both ways, no `id` (`isl045-varids-drive`). The question becomes "close it as not reproduced?" |
| BUILTINBOUNDARY (low) | ⏸ ruling | Not re-measured: the two built-ins known to throw while drawing (C65, C70) are fixed, and no other is known. The question is a design one and stands as s22 wrote it |

**s44, after the rulings (asked in one round):**

| row | state | what happened |
|---|---|---|
| MOUNTED | ✅ `64ceb2746` | Ruled "warn when building". Counted before building, the warning would fire 409 times on the templates. Re-asked with the number and ruled "a quiet note and Mounted's help": the info `gate-starts-shown`, and the description, in 17 spec copies, the catalogs and 26 docs pages. Nothing that runs changes |
| BUILTINBOUNDARY | ✅ `42699d261` | Ruled "same as kit parts". `withNodeBoundary` in `NoodlReactComponent.render()`; `node/render-failed`. ISL-026's spec now grades a built-in; red with the line put back. Cost measured first: about 5–10 µs per node at mount, about 2–4 ms on the largest template first page (409 elements). Reaches apps with the next viewer runtime build |
| VARIDS | ✅ closed (wontfix) | Dug: Nightbook's s3/s4 For Each is gone (never committed); `Collection.set` and `Model.create` at `d57a11668` write nothing into the caller's objects. Ruled "close it, with the readings". Was: ruled: dig | "Dig into Nightbook's exact path". Its generator is in P78's untracked pile (`tpl011Components.ts` `tnFeelVar` / `tnFeelSet` / `tnFeelLoad`, and `tpl011Face.ts:120`). Next: drive Nightbook's own Tonight page and read the feelings payload `savePage` sends |
