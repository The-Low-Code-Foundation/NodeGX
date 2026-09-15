# Phase 92 — next session

**Written 2026-09-15 at the end of s6 (CHR-006).** Branch `cline-dev`. Phase commits are listed by
`git log -- dev-docs/tasks/phase-92-dreamweaver-called`. s6 also committed **`f39d20f` in
`~/vscode_projects/nodegx-community`** (separate repo, no remote).

## The board, from the task files

| id | state |
|---|---|
| CHR-001 the before picture | ✅ committed without its PNGs (ruling) |
| CHR-002 the type scale | ✅ Richard looked, s3: "Looks good." |
| CHR-003 one radius, one shadow, one box model | ✅ built s3. **Not yet looked at by Richard** |
| CHR-007 the rows become descriptors | ✅ built s4, invisible by design |
| CHR-005 one launcher page | ✅ built s5. **Not yet looked at by Richard** (`verdicts/CHR-005/2026-09-15/`) |
| **CHR-006 the Templates tab gets its pictures** | 🟡 **built s6** — code, specs and drive done; AC2 half-met, AC4 needs a deploy. Task §6 |
| CHR-004, 008, 009, 010, 011 | ⬜ not built |

## First job: put CHR-005 and CHR-006 in front of Richard

Shots (gitignored by ruling, local only): `verdicts/CHR-005/2026-09-15/` and `verdicts/CHR-006/2026-09-15/`
— `templates-1368x900-{dark,light}-{top,bottom}.png` is the one to open first, beside `audit/demos-section.png`.
Four questions for him, each recorded in CHR-006 §6:

1. **The look** — WORTHY or not, both tabs.
2. **Which two cards are big.** Built: pictured cards first (Landing Pages + Todo list). The homepage has Rocket School + Todo list. Shelf order would put two big wireframes on top.
3. **AC2:** the template's picture is seeded into the new project's `thumbURI`, and the editor's own capture replaces it within a minute (creation opens the editor). Keep the capture winning, or keep the template picture until the first edit?
4. **AC4 — deploy and republish (outward-facing, his to approve):**
   ```
   cd ~/vscode_projects/nodegx-community && ops/deploy.sh 49.12.102.195      # runs 0029 before restart
   # then, with the production DATABASE_URL (tunnel, see the members-area memory), per template:
   npx tsx scripts/publish-project-template.ts rocket-school <OpenNoodl>/templates/rocket-school game "<live summary>" \
     --eyebrow "Game · ages 8–12" --thumbnail <OpenNoodl>/dev-docs/tasks/phase-92-dreamweaver-called/audit/demos/rocket-school.webp
   #   todo-list      → templates/todo-list,     data-app, "Productivity",       todo-list.webp
   #   pixel-dungeon  → templates/pixel-game,    game,     "Game",               pixel-dungeon.webp
   #   story-engine   → templates/story-engine,  game,     "Interactive story",  story-engine.webp
   ```
   ⚠️ A republish bumps `version` and replaces the payload with the working copy — `templates/rocket-school` has
   **P88's uncommitted edits in it today**. Republish only what the owner of that template agrees is ready, or pass
   the card alone by republishing from the same tree that is live. Then `curl` each listed `thumbnail` → 200 image (AC4).
   Until this happens every released editor draws wireframes: the live shelf sends no `thumbnail`.

## Then, in order

1. **Track B:** CHR-008 (R8 ruled), then CHR-009 (R6 trial, R7 tab). CHR-008 inherits from CHR-007: `focusGatePort`'s
   retry wants a `ref`, and the five hash clears exist because the hash cannot see expansion or undone values.
2. CHR-004 — smaller than scoped (CHR-005 retired three CSS-text pins; `drive.js` `CONTRAST` is a prototype of R3's gate).
3. CHR-006 remainders that need no ruling: §3.6 plural chip labels; the §3.5 headless render for `site-builder` /
   `members-area` (or publish shots for them).

## Still Richard's

1. The four CHR-006 questions above, and **CHR-005's and CHR-003's looks** — none blocks Track B.
2. CHR-007 declined AC4's "≤ 1 `_portsHash = undefined`" (CHR-007 §6.2) — do not quietly revisit.
3. R6 becomes final only on his look at CHR-009's screenshots; R7's marker-on-the-tab detail is proposed, not ruled.
4. The Projects tab's two full-width cards (BST-003 / UNI-001 placements) — ask before moving them.
5. Data, for P86/P78: `members-area`'s live summary is lowercase and fragmentary.

## What s6 settled, including where the handoff and the task file were wrong

- 🔴 **"The shelf serves the shot the homepage already has" was false**: `nodegx.io/demos/*.webp` is 404. The platform stores the picture (`0029`) and serves it.
- 🔴 **The shelf is 7 rows, not "the five demo apps"**; the fifth shot belongs to the built-in `landing-pages`, which now bundles it (`src/assets/images/templates/landing-pages.webp`).
- 🔴 **AC2's flow was misdescribed twice**: creation opens the editor (not Projects), and the manifest name is the one typed in the wizard.
- The handoff's state file (`~/.claude/next-session-state/…json`) held a **P88 peer's** handoff, not this phase's — this file is the phase's handoff.
- The Trap 4 spec "there never will be a thumbnail column" was reversed by R4; its no-picture half is kept with a control.

## Readings taken this session (2026-09-15, s6, tree = `19a24dfd7` + CHR-006)

- Platform: `tsc --noEmit` EXIT=0; vitest (scratch DB) 5 files **193 / 193**, EXIT=0.
- Editor: `tsc -p packages/noodl-editor --noEmit` **EXIT=0**; jest, 44 specs importing a changed module **1036 / 1036**, EXIT=0; `chr-006/seed-template-thumbnail` 7 / 7.
- Ratchets unpiped: type / colors / tokens:css / icons:css **all EXIT=0**.
- **`test:ci`** (cache cleared, alone, seed 76339): **`2984 specs, 8 failures`**, fresh `test-results.json` (19:25:58),
  **the same eight by name** (`SUB-006` ×3, `SUB-011` ×3, `NDA-017` ×2). A reading of 8 with a different name in it is a regression.
- Drive: AC1 on 8 shots, AC2 (disk consequence met, card replaced), AC3 both arms — numbers in CHR-006 §6.3.

## How to drive the Templates tab against a shelf that has pictures (recipe that worked in s6)

- `createdb -h 127.0.0.1 -U richardosborne <scratch>`; `cd ~/vscode_projects/nodegx-community && DATABASE_URL=postgres://richardosborne@127.0.0.1:5432/<scratch> npm run db:migrate`; publish with the script above against that URL; `PORT=3399 DATABASE_URL=… npx next dev -p 3399`.
- Back up and swap `COMMUNITY_URL` (`models/community/communityorigin.ts`) to `http://localhost:3399`; **revert and prove it with `git diff` (0 lines)**.
- Editor stack as in s5 (`NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 NOODL_USER_DATA_DIR=<profile> npm run start`). Put `{"settings":{"projects.lastCreateLocation":"<scratch dir>"}}` in the profile's `editorSettings.json` so the wizard never needs the native Browse dialog.
- 🔴 The renderer page is `file://…/src/editor/index.html`; the bundle is `http://localhost:8080/src/editor/index.bundle.js` — grep THAT to confirm a rebuild landed (`/index.bundle.js` is a 404). A rebuild after an edit takes ~110s and the log shows "Disconnected! Trying to reconnect" meanwhile.
- Stop: the 8080 and 9333 listener pids, the crashpad for the profile, the `next-server` + its `npm exec` parents; check all four ports read 0 listeners; `dropdb`.

## Traps (details in the task files' §6)

- 🔴 One heavy job at a time. s6: platform tsc → vitest → editor tsc → jest → platform + stack → drives → teardown → ratchets → `test:ci`.
- 🔴 Anything `TemplatesTabBody` renders must be **hook-free**; `LauncherCardShot` hides a broken image with `onError`, no state.
- 🔴 `Templates.tsx` may not name `needsBackend` (rel-013) — the tag is `TemplateChoice.backendLabel`.
- 🔴 In `drive.js` the `unreadable` flag matches the partial notice's words; the partial screen is the real one while built-in templates exist.
- 🔴 A notification's "exit code 0" reports the wrapping subshell — the log's `EXIT=` line is the reading.
