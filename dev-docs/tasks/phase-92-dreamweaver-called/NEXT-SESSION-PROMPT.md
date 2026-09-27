# Phase 92 — next session

**Written 2026-09-18 at the end of s34.** Branch `cline-dev`, HEAD `ca37d40bd`.
`git log -- dev-docs/tasks/phase-92-dreamweaver-called` for the phase's history.

s34 in one paragraph: **Richard ruled every open question the phase had, one of them twice, and the
thing that blocked CHR-011's build for two sessions is gone.** The swatch-edge finding is built; §3.3
is closed as measured-and-declined; CHR-008's conversions are ruled back IN and now outlive the
phase; the unowned 09-16 pile turned out to be P78/TPL-008's date-picker work — live in production
and never committed — and Richard ruled it wanted, so it is committed. **The working tree now holds
nothing but P93's in-flight TVW-002 files.** CHR-011 is still the only task between this phase and
its close, and what it needs is now one hour of a free box, not a negotiation.

⚠️ Peers: **P93 / TVW** (finishing `VisualCanvas`, `ThemeManager`, `main.js`, the viewer frame —
said ~15 minutes at 13:10) and **P95 / Rocket School** (`library/modules/game-kit`,
`templates/rocket-school/**`, repeated generator runs — heavy, and queued behind P93).
🔴 Commit through a temporary index and **`git reset -q -- <your paths>` on the real index
afterwards**. Three commits this session did exactly that and the index was empty after each.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 007, 012, 013 | ✅ closed |
| CHR-009, CHR-010 | ✅ closed s33 on Richard's look |
| CHR-004 | 🟡 ✅ §3.3 **closed s34** (§9.2), ✅ swatch edge **built s34** (§9.1). Left: **a popout surface for the look gate**, and the gate **re-run** over the swatch fix |
| CHR-008 | 🟡 **Richard ruled s34: fix undo and convert all 37** (§11). The undo re-seed defect is the first job. **This outlives the phase** |
| **CHR-011** | ⬜ **STILL THE ONLY THING BETWEEN THIS PHASE AND ITS CLOSE** — and now it is just the build |

## What to do next, in order

1. **CHR-011 — take the pictures.** Read **§7.5**, which is the recipe, and **§7.4**, which lists
   what is already written and committed so this session is short:
   - `verdicts/CHR-011/capture.js` — CHR-001's flow, reading CHR-001's own `measure.js` so the two
     runs cannot drift, counting both shadow sentences, asserting its preconditions.
   - `verdicts/CHR-011/build-page.js` and `verdicts/CHR-011/2026-09-18/index.html`, which already
     says **0 of 14 after-shots taken** and carries the before column and both number tables.
   ⚠️ **Neither script has met a running renderer.** Expect the first run to find instrument faults
   before product ones. 🔴 `git status` first: the tree must be clean, or the `.app` is not HEAD.
2. **The look gate re-run** over the swatch fix (`--surface=property-panel` on an `Icon` node, both
   themes). Until it is run, CHR-004 §8's `Icon` row is *fixed at the token level*, not green.
3. **A popout surface for the look gate** (CHR-004 §8's last line) — P94 is about to rework exactly
   those pickers, which is the argument for doing it before P94 rather than after.
4. **CHR-008's undo defect** — §10.8 names the next diagnostic: a render counter inside
   `TextAreaWidget`, then the same undo. It separates *never re-rendered* from *re-rendered with a
   stale parameter* in one run. 🔴 Do not start a second conversion first.

## Readings at the end of s34 (2026-09-18, at `24d2a282c` unless said otherwise)

- **All five ratchets green, gated on the exit status with no pipe:** `type` −3 raw px vs baseline ·
  `colors` 16 = 16 · `icons:css` 0 over 332 stylesheets · `icons:font` 0 over 3,187 files ·
  `tokens:css` green over 333 stylesheets. `typecheck:editor` clean.
- `npx jest tests-unit/nat-001` from **`packages/noodl-editor`**: **260 tests, exit 0**, with the new
  swatch row; its mutant reddens both theme arms and the distinct-pairings guard.
  `tests-unit/chr-004` + `nat-001` + `nat-003`: **332 tests, 5 suites, exit 0**.
  `tests-unit/chr-009` + `fb-018`: **114 tests, 13 suites, exit 0**.
  🔴 Name the directory with the count — a root `npx jest` reads **`Tests: 0 total`**, which is the
  wrong runner, not a clean board.
- For the committed orphan pile: `noodl-mcp` tpl008 gates **43/43**, `nodegx-backend` syn003 +
  tpl008-todo-drive **21/21** (64 s), `noodl-runtime` LocalSQLAdapter **90/90**,
  `library:date-picker -- --check` and `library:check` exit 0, `typecheck:mcp` / `typecheck:runtime`
  / backend `tsc` exit 0.
- ⚠️ **`library:icons:check` exited 1** — `no icon: modules/game-kit`. ✅ **Fixed by P95 in `a85a74be7`,
  79/79, exit 0.** 🔴 **My attribution was wrong and P95 measured it:** I named `fd7cc4700`, which
  touches only `kit.js` and its generated index. The icon gate (`45d8f4c66`) predates game-kit's shelf
  entry (`6384bf321`), and `game-kit/icon.png` has never existed in git history — so the entry was one
  short from the day it was added, not from P95's work. **A red gate plus a recent commit in the same
  area is not attribution** ([[a-url-filtered-capture-attributes-nothing-to-a-producer]]).
- **NOT run:** `test:ci`, and no drive of any kind — P93 held the box and had a dev stack up for the
  window in which either would have run.

## Rulings Richard gave in s34

1. **CHR-011's build WAITS for a free machine** — over building a private clone now (~1 hour of the
   box) or packaging the checkout as it stands.
2. **The colour swatch gets a visible edge.** Built: `border-strong` → `border-control`,
   1.499:1 → 3.897:1 dark, 1.387:1 → 3.373:1 light.
3. **CHR-008: fix undo and convert all 37** widgets.
4. **CHR-004 §3.3: rewrite all 18** — *then, re-asked from §7.7's measurement,* **close the row.**
   See the trap below; the second ruling is the one that stands.
5. **The 09-16 orphan pile is wanted** — checked and committed as `ad40fc9cb` + `e1352b58a`.

## Traps (s34's own)

- 🔴 **I asked Richard from a task's HEADLINE and he ruled on a fiction.** CHR-004 §3.3's headline
  says "18 places check a CSS class name"; §7.7, in the same file, had already measured that as two
  different things and neither was 18 (~180 `byClass` call sites across ~40 files, which is the
  runner's house style; and 18 opt-in sites for the `:global` hook, whose removal changes the look
  of four popout surfaces). One of his rulings was spent before the re-ask. **Read the measurement
  section, not the headline, before quoting a number to him.**
- 🔴 **A "clean worktree build" would build the PRIMARY tree.** `make-worktree.sh`'s own header says
  `lerna exec` resolves the package root to primary even when launched from a worktree, and
  `build-editor.ts` is `npx lerna clean --yes` + `npx lerna exec --scope noodl-editor`. A standalone
  `git clone` is the correct isolation; a worktree is not.
- 🔴 **`build-editor.ts` gates on `git diff --numstat`** — *unstaged tracked* changes only. Untracked
  and staged files do not refuse it. And the box-taking step is not electron-builder: it is
  `build:editor:_editor` doing `npx rimraf ./node_modules` + `npm install` at the repo root.
- 🔴 **Two peers answered the same question with opposite facts** — one said the box was theirs for
  hours, the other offered me the next 40 minutes, within a minute of each other. Neither was lying;
  neither knew about the other. **Ask all of them, and reconcile before acting on either.**
- 🔴 **An unowned pile is not evidence of abandonment.** This one was in production. Three sessions
  disowned it and each was right; what none of us did was READ it — TPL-008's own notes were sitting
  inside the pile, saying what it was, what it graded and where it was deployed.
- ⚠️ `verdicts/CHR-011/capture.js` and `build-page.js` were written from the source, never run
  against a renderer. Treat their first run as an instrument drive.
