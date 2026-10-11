# ISL-046 — The templates and the garden kits carry no defect of their own

**Status: 🟢 s45 (2026-10-11): 7 of 9 fixed — MOVEARROW `96059a380` (ruled s45 "fix the old planner now"), SECONDVISIT `eafa1b4af` (s45); BKFONT `4af47a07a`, DEMOSTUBWIRES `6d8323ef4` (s42), D81 `37f35c8c4`, METERS3D `050ca561b` (s43), ROUTINEREFUSAL `9cb99b205` (s44). Still waiting, neither buildable here: INSTALLER the tablets, TPL011UNREADID P78's untracked Nightbook pile. Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 7 bugs
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
| [P78-TPL010-MOVEARROW](../../bugs/p78-tpl010-movearrow-opening-a-project-writes-the-chip-arrow-into-its-stored-move.md) | high | fixed | Opening a project in the planner adds another "→ " (or "✓ Wed 30 · ") to its stored next move, every time |
| [P78-TPL011-INSTALLER](../../bugs/p78-tpl011-installer-nightbook-0-0-4-will-not-install-over-0-0-3-on-the-tablets.md) | high | scheduled | Nightbook 0.0.4 will not install over 0.0.3 on either tablet ("Nightbook cannot be closed") |
| [P78-D81](../../bugs/p78-d81-the-library-date-picker-keeps-a-picked-day-when-the-next-record-s-day-is-empty-too.md) | medium | fixed | The library Date picker keeps a picked day when the next record's day is empty too |
| [P109-S19-TPL011UNREADID](../../bugs/p109-s19-tpl011unreadid-nightbooks-openenvelope-wires-an-id-its-script-never-reads.md) | low | scheduled | Nightbook's generator wires the envelope id into a Function that never reads it, and the door now refuses the build |
| [P109-S43-ROUTINEREFUSAL](../../bugs/p109-s43-routinerefusal-a-refused-routine-date-s-sentence-stays-on-the-next-routine.md) | medium | fixed | Pick an end date before a routine's start and open another routine: the refusal sentence is still there |
| [P109-S19-DEMOSTUBWIRES](../../bugs/p109-s19-demostubwires-the-training-demos-stubbed-functions-keep-wires-to-inputs-they-never-read.md) | low | scheduled | The training demo's stubbed Functions keep wires into inputs they no longer read |
| [P109-S43-SECONDVISIT](../../bugs/p109-s43-secondvisit-on-a-second-visit-to-the-3d-workshop-its-meter-chips-are-never-measured.md) | low | fixed | In the flat Garden's Workshop (a tablet too slow for 3D) the spa's two parts' meter chips cover each other |
| [P108-S9-BKFONT](../../bugs/p108-s9-bkfont-the-blocks-css-font-shorthand-with-inherit-is-dropped.md) | low | scheduled | The Blocks node's line and zoom buttons use `font:800 14px inherit` — an invalid shorthand the browser drops, so they render at the default weight and size |
| [P108-S7-METERS3D](../../bugs/p108-s7-meters3d-two-parts-meter-chips-overlap-in-the-3d-workshop.md) | low | fixed | In the 3D Workshop on her land, the spa's two parts' meter chips are drawn on top of each other |

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

## 8. Record

### s42 (2026-10-11) — 2 of 7

| row | state | what happened |
|---|---|---|
| BKFONT (low) | ✅ `4af47a07a` | measured in Chrome on the kit's exact rules: both buttons computed `400 13.3333px` (dropped); longhand gives `800 14px` and `800 20px / 40px`. Rebuilt with the kit's `build.mjs`; `cg001GardenKit` "BKFONT" reads every `font` shorthand in the built kit, red on HEAD's |
| DEMOSTUBWIRES (low) | ✅ `6d8323ef4` | `validate_project` on the committed demo: 4 errors (one more than the ledger counted). The builder drops wires into a stand-in's `in-…`; regenerated → 0; `check-demo.mjs` [3b] guards it. HEAD's builder run first as a control: it differed from the committed demo only in the privacy strings, which the regeneration now carries (the template changed in `f3318b205`) |
| MOVEARROW (high) | ⏸ ruling | Its own file: Richard set Planning aside on 2026-10-05, the todo list's Projects tab already repairs the stored text and keeps its rows off record ids, and the planner fix is wanted "if Planning is ever brought back". A plain-words question for Richard below. Not built |
| INSTALLER (high) | ⏸ tablets | Needs the family's tablets (like P108 IW-009). And `templates/nightbook/` is **untracked**, with its kit and 14 generator specs: a loose P78 pile last worked on 2026-09-30. Not touched |
| TPL011UNREADID (low) | ⏸ P78's pile | Its generator is in the same untracked Nightbook pile. Not touched |
| D81 (medium) | ⏸ design + P78 | The ledger's one line (compare with `S.committed`) would wipe a person's pick whenever any other input re-runs the script, so the fix needs a read of whether a Function re-runs on an identical `Value`, or a `Clear` signal the templates wire. The picker ships in five templates and a library prefab, and republishing them runs through P78's uncommitted publish script. Not built |
| METERS3D (low) | ⏸ 3D drive | Needs the Workshop in Garden 3D driven before and after (`drive-iw007-touch.js --mode 3d`). Not built unseen |

### s43 (2026-10-11) — D81 fixed, ROUTINEREFUSAL found

| row | state | what happened |
|---|---|---|
| D81 (medium) | ✅ `37f35c8c4` | Measured first, the first time it was driven: an identical `Value` re-runs no Function (DEF-046), so the ledger's one line could never have worked. A pulse wired into a Function input reaches the script as `true` then `false` in one pass. Built: a `Reset` signal on the picker, counted like `mounted`. Red on HEAD in two places: the prefab drive's new §11, and a new drive on `todo-list-demo` (Pilates' refused end date showed on the tablets). Both green after. Regenerated: the prefab, `todo-list`, `todo-list-demo`, `planning` and `planning-demo`. Nightbook's copy is in P78's untracked pile and was left alone |
| ROUTINEREFUSAL (medium, new) | ⏸ scheduled | Found by D81's drive: the routine pane's refusal sentence follows the person to the next routine. Not a one-wire fix (the sign-in form's constant-false Condition would silence a second refusal). Filed with the proposal |
| METERS3D (low) | ✅ `050ca561b` | `chipLifts` (garden-3d-kit): chips placed lowest first, and a chip that meets one already placed goes just over it. The touch drive gains METERS, red on HEAD in both Workshops. After: Pip's (the row's shot) green; every other clause as on HEAD (28/31 against 27/31; BUILD and PAY are `P109-S18-TOUCHBUILD`) |
| SECONDVISIT (low, new) | ⏸ scheduled | Cobble's Workshop, the second visit, stayed red: every chip cached `0 × 0` though drawn at a real size, so they were measured before layout and never again. A `ResizeObserver` that asked for a frame changed nothing and was taken out. Filed with what to read next |

### s44 (2026-10-11) — ROUTINEREFUSAL fixed

| row | state | what happened |
|---|---|---|
| ROUTINEREFUSAL (medium) | ✅ `9cb99b205` | Re-measured first: still fired. Three commands had the shape, not one (Set routine dates, Set schedule's Add time, Set deadline). `command()` gains `refusalAbout`: the guard publishes each verdict as a new object `{ about, error }`, and a small Function (`SAY_REFUSAL_SCRIPT`) says it only while `about` is open. The D81 drive gained three arms: two red on HEAD's template, 7/7 after. Control: a mutant comparing verdicts by value turns exactly the "said again" arm red. Set deadline is graded by the unit spec, not driven. Regenerated `todo-list` and `todo-list-demo` |

### s45 (2026-10-11) — SECONDVISIT and MOVEARROW fixed

| row | state | what happened |
|---|---|---|
| SECONDVISIT (low) | ✅ `eafa1b4af` | Read on the second visit, as s44 asked: a probe copy of the touch drive listed every Garden 3D root, waited, forced a frame. Cobble's Workshop had **no 3D root**: under software GL the island falls back to the flat Garden and keeps that choice, so the chips were garden-kit's, and "cached 0 × 0" was a 3D-only field read on 2D chips. The defect is the flat Garden's: chips placed by CSS inside each tile, wider than a tile, never kept apart. `chipLifts` moved into garden-kit (one copy); the Garden node's layout pass lifts a plot chip that would cover another. Red on HEAD's kits; after, METERS green in all four Workshops (3D mode 29/31, flat 28/31; the other reds TOUCHBUILD's, as on HEAD). Pip's flat Workshop needed a lift too |
| MOVEARROW (high) | ✅ `96059a380` | Asked a third time in plain words with the cost; **ruled "fix the old planner now"**. Run for the first time (it was a trace): the card's script twice over a runtime `Model`, rows set into one runtime `Collection` with `keepPlainRowsApart`, gives `→ → Offer the add-on`. Every list the planner draws now gives a row its own id (card, day columns, carry list, and the block sheet's next actions, found by a census: they wrote `label`/`ink`/`edge` onto the todo action). The project guard strips the prefixes on save. No store clean-up: TPL-008-PJ's carry-over empties `Project.move` on the shared backend. 101/101, each list check and the consequence with mutant arms. Not driven deployed; `planning-demo` not republished to nodegx.io |

