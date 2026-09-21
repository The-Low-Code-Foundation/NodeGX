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

---

## 6. ✅ BUILT — 2026-09-21 (session 3)

**All four at 0 on a driven session, each on a surface the drive proves it reached, each beside a
control that made the same counter fire.** `scripts/devtools/drive-hlt003-warnings.js`
(`--expect 0` / `--expect firing`). Full reading and evidence:
[verdict](./verdicts/HLT-003/2026-09-21/VERDICT.md).

### 🔴 §2 of this file was wrong in three ways, and the corrections are the useful part

1. **"`%s` is literal … the component names are **lost**" — they were never lost.** The old
   `bugtracker.ts` joined *every* console argument onto the message, so the arguments reached the
   file all along: the setState warning already said `VisualCanvas ComponentBoard ComponentBoard`
   in plain text. What was missing was **substitution**. §2's "first job — reading them off a live
   session" was not needed for that class at all.
2. **The name that IS missing is one React never passes.** React 19 gives the duplicate-key warning
   **only the key** and no component stack. No formatting fix recovers it; it exists only inside the
   `console.error` call, on `ReactSharedInternals.getCurrentStack`. That — not `%s` — is why four
   phases could not attribute this.
3. **"the repeated key is a project entity id" — it is the launcher's stored row id.** The bursts
   start ~2s after launch, ~10s **before** any project opens, and all 62 events measured across two
   sessions carried one key. The canvas was never involved.

### What the four turned out to be

| class | cause |
|---|---|
| duplicate key (10) | `Launcher/views/Projects.tsx` keyed on `project.id`; **two different projects share one stored `id`** in `recently_opened_project.json`, and **one directory is registered twice** — so *neither* field was unique |
| setState in render (1) | `ComponentBoard`'s render-phase `buildBoardExport` → `NodeGraphModel.addRoot` → a global event → `usePreviewStrip`'s listener → `setState` on `VisualCanvas` |
| null `value` (1) | `GenericInputProperty` guarded a missing value in its initial state and **not** in the effect that syncs it |
| missing `key` (1) | `VisualStates` mapped with no key **and an `eslint-disable react/jsx-key` on the line**; a second owner, `ComponentTree`, reached `key={undefined}` |

### Acceptance criteria, as met

1. ✅ 0 of all four, with reach recorded per class (104 launcher cards, board + 2 frames, the
   property input, 3 visual-state rows). A 0 on an unreached surface is reported **UNGRADED** by the
   drive, never as a pass.
2. ✅ Fixed at the identity: the launcher row keys on its **directory** (a row *is* a project
   directory), visual states key on `state.name`. No index suffix anywhere.
3. ✅ `bugtracker.ts` substitutes placeholders **and** appends React's component stack; 11 specs in
   `tests-unit/hlt-003/consoleFormat.test.ts`, and the formatted entries naming
   `LauncherCardGrid` are in the verdict directory.
4. ✅ Both colliding projects still render — 10 specs in `tests-unit/hlt-003/recentProjectRows.test.ts`,
   the first of which is exactly the lazy-fix trap this AC was written for.
5. ✅ `typecheck:editor` 0; `test:main` 526/526 suites and 8418/8418 tests, exit 0.
6. **(added while building)** 🔴 **Re-keying on the directory required de-duplicating by directory
   in the same change.** Alone it would have *started* a duplicate-key warning on the
   double-registered directory — §5a's rule, paid in advance rather than discovered by a drive that
   only counted the cured class.
7. **(added while building)** ⚠️ **The `id` collision has consequences this task deliberately did
   not fix** — a click on either colliding card opens the *other* project, and backend ownership and
   git auth are keyed on that same id. Filed as its own row (HLT-011), because re-minting a durable
   ownership id is a decision, not a repair.

### Landmines found, for whoever drives next

- 🔴 **React dedupes "Cannot update a component while rendering" to ONCE per renderer session.**
  Re-entering the board is silent whether it is fixed or not, so that arm is only meaningful on a
  board not yet mounted in that renderer.
- ⚠️ **`.logs/dev.log` is the dev launcher's mirror of the RAW console args, not `bugtracker`'s
  sink** — it still prints `%s` after AC3, by design. AC3's evidence is `<userData>/debug/log-*.txt`.
- 🔴 **`timeout` is not installed on this machine**, so any `timeout … grep -r` returns nothing
  silently and reads exactly like "the string is absent".
