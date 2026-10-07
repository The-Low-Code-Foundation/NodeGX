# ISL-046 — The templates and the garden kits carry no defect of their own

**Status: ⬜ not started. Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 7 bugs
from the ledger (`dev-docs/bugs/`) that no phase owned: 2 high · 1 medium · 4 low. **Side:** templates (planning, Nightbook and its desktop installer, the training demo), the library Date picker, the garden kits

## 1. The person sentence

**Opening a project never rewrites it, Nightbook's next version installs over the last, a date picker clears with its record, the generators wire only ports a script reads, and the garden kits draw cleanly.**

## 2. Why these belong together

Defects in what we ship rather than in the product. The planner adds another "→ " to a project's stored next move each time it is opened. Nightbook 0.0.4 will not install over 0.0.3 on either tablet. The library Date picker keeps a picked day when the next record's day is empty too. Two generators keep wires into inputs nothing reads. The garden's Blocks node has an invalid font shorthand, and the 3D workshop draws two meter chips on top of each other.

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix. This table is
generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P78-TPL010-MOVEARROW](../../bugs/p78-tpl010-movearrow-opening-a-project-writes-the-chip-arrow-into-its-stored-move.md) | high | scheduled | Opening a project in the planner adds another "→ " (or "✓ Wed 30 · ") to its stored next move, every time |
| [P78-TPL011-INSTALLER](../../bugs/p78-tpl011-installer-nightbook-0-0-4-will-not-install-over-0-0-3-on-the-tablets.md) | high | scheduled | Nightbook 0.0.4 will not install over 0.0.3 on either tablet ("Nightbook cannot be closed") |
| [P78-D81](../../bugs/p78-d81-the-library-date-picker-keeps-a-picked-day-when-the-next-record-s-day-is-empty-too.md) | medium | scheduled | The library Date picker keeps a picked day when the next record's day is empty too |
| [P109-S19-TPL011UNREADID](../../bugs/p109-s19-tpl011unreadid-nightbooks-openenvelope-wires-an-id-its-script-never-reads.md) | low | scheduled | Nightbook's generator wires the envelope id into a Function that never reads it, and the door now refuses the build |
| [P109-S19-DEMOSTUBWIRES](../../bugs/p109-s19-demostubwires-the-training-demos-stubbed-functions-keep-wires-to-inputs-they-never-read.md) | low | scheduled | The training demo's stubbed Functions keep wires into inputs they no longer read |
| [P108-S9-BKFONT](../../bugs/p108-s9-bkfont-the-blocks-css-font-shorthand-with-inherit-is-dropped.md) | low | scheduled | The Blocks node's line and zoom buttons use `font:800 14px inherit` — an invalid shorthand the browser drops, so they render at the default weight and size |
| [P108-S7-METERS3D](../../bugs/p108-s7-meters3d-two-parts-meter-chips-overlap-in-the-3d-workshop.md) | low | scheduled | In the 3D Workshop on her land, the spa's two parts' meter chips are drawn on top of each other |

## 4. Order of work

MOVEARROW and INSTALLER first (high: data damage, and a family that cannot update). Then D81. Then the two wire rows, BKFONT, METERS3D.

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line, and this task was written
  from the ledger without re-running them. Re-run each reproduction at HEAD before building. A row that no longer
  reproduces is closed in the ledger with the commit that fixed it, not fixed again.
- **A control on every fix:** the old code red on exactly the fix's arms.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:`).

## 6. Related work and collisions

- 🔴 **P78 (templates) and P108 (the island) are live** and write these templates and kits. Check `git status` on each template before editing; regenerate with the template's own generator, never by hand.
- Sibling: [ISL-037](ISL-037-THE-TEMPLATES-CARRY-NO-SHAPE-THE-PRODUCT-WARNS-ABOUT.md). INSTALLER needs the tablets: a reading with the family, like P108 IW-009.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled (none today).
- **AC3** — every row ruled or written "as proposed" is fixed, one commit each (or one per shared mechanism), with its
  regression green.
- **AC4** — `node scripts/bugs.js` lists none of this task's rows as `open`, `scheduled` or `needs-ruling`.
