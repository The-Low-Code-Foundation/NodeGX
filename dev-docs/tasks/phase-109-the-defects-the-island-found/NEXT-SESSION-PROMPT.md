# Next session — P109 session 1: Slice 0

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped 2026-10-01 at `27d891bf3`,
**0 of 25 built, nothing committed by the scoping session.**

## Read first

1. README §0 (the five readings), §4 (the board), §8 (rulings) and §9 (order).
2. The audit's "Scoping corrected this row" notes. When the task writers re-read the findings at HEAD, fifteen rows
   were corrected or sharpened: F02, F04, F08, F09, F10, F12, F15, F16, F20, F23, F25, F27, F28, F29 and F32. Trust the
   corrected reading, not the original sentence.

## Build, in this order (no ruling needed)

1. **ISL-025 W1 and W2.** The island's two loops move onto the existing `Repeat` node (`cg003Components.ts` Runner
   663-814, island 1729-1777). Its drives move from `noodl-preview/dist/nodegx-deploy.cjs` plus mtime guards to
   `nodegx deploy`, gated on its exit code. ⚠️ Coordinate with P108 session 5, which owns the template, so the two
   sessions do not both regenerate `templates/bot-garden`.
2. **ISL-001 (D85).** AC1 is RED at HEAD first. Read `foreach.tsx:456-458`: the queued refresh is not returned, so nothing
   waits for it. That cause is predicted from source and is not yet isolated.
3. **ISL-014 (D83)** and **ISL-011**, on their recommended routes.
4. **Measurements that decide a ruling:** ISL-002 AC1 (`states.ts:592` `|| 0`), ISL-018 AC2 and ISL-022 AC1.

Then ask Richard the rulings the next slice needs, in plain words (README §8).

## Facts the scoping session measured that are not in any task file

- 🔴 **Local `cline-dev` is 315 commits ahead of `origin/cline-dev`** (`3c628911c`, 09-22), so CI's `typecheck:mcp` has
  seen none of P105–P108. Pushing is Richard's decision. Tell him, and do not push unasked.
- The root `package.json` in the primary checkout is still a peer's uncommitted Nightbook manifest. Read scripts with
  `git show HEAD:package.json`.
- P91's README and P78's register both carried other sessions' uncommitted edits on 2026-10-01, so neither was written
  to. D85 and D83 name `NONE` as owner in the register; the first ISL-001 and ISL-014 commits set them to ISL.

## Product findings (README §7)

The rule this phase adds applies to this phase too. End the session with a "Product findings" section in this file that
lists each NodeGX defect or gap met, with its register row, or "none met".
