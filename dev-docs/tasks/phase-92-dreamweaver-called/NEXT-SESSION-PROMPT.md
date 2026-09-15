# Phase 92 — next session

**Written 2026-09-15 at the end of s6 (CHR-006, then Richard's rulings and the deploy).** Branch `cline-dev`.
Phase commits: `git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform half is **`f39d20f` in
`~/vscode_projects/nodegx-community`** (separate repo, no remote) — **deployed** to community.nodegx.io.

## The board, from the task files

| id | state |
|---|---|
| CHR-001 the before picture | ✅ committed without its PNGs (ruling) |
| CHR-002 the type scale | ✅ Richard: "Looks good" (s3), "the font change is nice" (s6) |
| CHR-003 one radius, one shadow, one box model | ✅ Richard: "fine" |
| CHR-005 one launcher page | ✅ Richard: "fine" — **except the Community tab** |
| CHR-006 the Templates tab gets its pictures | ✅ **Richard: WORTHY.** Live shelf carries the pictures (§6.7). Track A's surface is closed |
| CHR-007 the rows become descriptors | ✅ built s4, invisible by design |
| **CHR-012 the Community tab** | ⬜ **new, from Richard's look: "still looks like shit"** — task file written s6, not built |
| CHR-004, 008, 009, 010, 011 | ⬜ not built |

## First job: CHR-012, the Community tab

Richard, 2026-09-15, after looking at CHR-005: *"the community tab still looks like shit"*. Read
`CHR-012-THE-COMMUNITY-TAB.md` and look at `verdicts/CHR-005/2026-09-15/launcher-community-1368x900-{dark,light}.png`
first — the task is scoped from that picture, and the close is his look again. Put a screenshot in front of him
early (the s1–s4 lesson: foundations with nothing visible read as "still looks like shit").

## Then, in order

1. **Track B:** CHR-008 (R8 ruled), then CHR-009 (R6 trial, R7 tab). CHR-008 inherits from CHR-007: `focusGatePort`'s
   retry wants a `ref`, and the five hash clears exist because the hash cannot see expansion or undone values.
2. CHR-004 — smaller than scoped (CHR-005 retired three CSS-text pins; `drive.js` `CONTRAST` prototypes R3's gate).
3. CHR-006 remainders, no ruling needed: §3.6 plural chip labels; pictures for `site-builder` / `members-area`
   (a shot published with `set-live-template-cards.sh`'s pattern, or the §3.5 headless render).

## Still Richard's

1. CHR-007 declined AC4's "≤ 1 `_portsHash = undefined`" (CHR-007 §6.2) — do not quietly revisit.
2. R6 becomes final only on his look at CHR-009's screenshots; R7's marker-on-the-tab detail is proposed, not ruled.
3. The Projects tab's two full-width cards (BST-003 / UNI-001 placements) — ask before moving them.
4. Data, for P86/P78: `members-area`'s live summary is lowercase and fragmentary.
5. Which two template cards are big is ruled "fine for now" (pictured first) — revisit only if he raises it.

## What s6 settled, including where the handoff and the task file were wrong

- **Rulings (after s6):** CHR-006 WORTHY; CHR-005/CHR-003 fine; pictured-first "fine for now"; **the editor's
  screenshot beats the seeded template picture** (the current behaviour — AC2 closed as ruled); deploy approved.
- 🔴 "The shelf serves the shot the homepage already has" was false: `nodegx.io/demos/*.webp` is 404. The platform
  stores and serves the picture (`0029`, `GET templates/{slug}/thumbnail`).
- 🔴 The shelf is 7 rows, not "the five demo apps"; the fifth shot belongs to built-in `landing-pages`, which bundles it.
- 🔴 AC2's flow was misdescribed twice: creation opens the editor (not Projects), and the name is the typed one.
- 🔴 **The live cards were set WITHOUT a republish** (`set-live-template-cards.sh`): `publish-project-template.ts`
  ships the working copy as the payload, and `templates/rocket-school` held another session's uncommitted edits.
- ⚠️ Released 0.2.4 ignores the new fields — people see the pictures with the next editor build carrying `c4fbcde10`.
- The `~/.claude/next-session-state/…json` file held a P88 peer's handoff; this file is the phase's.

## Readings taken this session (2026-09-15, s6)

- Platform: `tsc --noEmit` EXIT=0; vitest (scratch DB) 5 files **193 / 193**, EXIT=0.
- Editor (tree `19a24dfd7` + CHR-006): `tsc -p packages/noodl-editor --noEmit` **EXIT=0**; jest over the 44 specs
  importing a changed module **1036 / 1036**; `chr-006/seed-template-thumbnail` 7 / 7.
- Ratchets unpiped: type / colors / tokens:css / icons:css **all EXIT=0**.
- **`test:ci`** (cache cleared, alone, seed 76339): **`2984 specs, 8 failures`**, fresh `test-results.json` (19:25:58),
  **the same eight by name** (`SUB-006` ×3, `SUB-011` ×3, `NDA-017` ×2). A reading of 8 with a different name is a regression.
- Deploy: `ops/deploy.sh` EXIT=0, stamp `ade0d28` → `f39d20f`, `0029` applied, neighbours 200 → 200.
- Live: four thumbnails 200 `image/webp` over TLS, Todo list bytes `cmp`-identical to the shot, versions and file
  counts unchanged, `members-area` 404 (CHR-006 §6.7).

## How to drive a launcher tab against a local community platform (recipe that worked in s6)

- `createdb -h 127.0.0.1 -U richardosborne <scratch>`; `cd ~/vscode_projects/nodegx-community && DATABASE_URL=postgres://richardosborne@127.0.0.1:5432/<scratch> npm run db:migrate`; seed; `PORT=3399 DATABASE_URL=… npx next dev -p 3399`.
- Back up and swap `COMMUNITY_URL` (`models/community/communityorigin.ts`) to `http://localhost:3399`; **revert and prove it with `git diff` (0 lines)**.
- Editor stack as in s5 (`NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 NOODL_USER_DATA_DIR=<profile> npm run start`). `{"settings":{"projects.lastCreateLocation":"<scratch dir>"}}` in the profile's `editorSettings.json` keeps the wizard off the native Browse dialog.
- 🔴 The renderer page is `file://…/src/editor/index.html`; the bundle is `http://localhost:8080/src/editor/index.bundle.js` — grep THAT to confirm a rebuild landed. A rebuild takes ~110s and the log shows "Disconnected! Trying to reconnect" meanwhile.
- Stop: the 8080 and 9333 listener pids, the profile's crashpad, the `next-server` + its `npm exec` parents; all four ports read 0 listeners; `dropdb`.
- 🔴 Production DB writes go through the ssh tunnel pattern in `release-0.2.2/publish-members-area.sh` / `set-live-template-cards.sh` — never a pasted connection string.

## Traps (details in the task files' §6)

- 🔴 One heavy job at a time.
- 🔴 Anything `TemplatesTabBody` (or `CommunityTabBody`) renders must be **hook-free**; a spec reaching `PrimaryButton` needs FLD-017's `Icon` `jest.mock`.
- 🔴 `Templates.tsx` may not name `needsBackend` (rel-013) — the tag is `TemplateChoice.backendLabel`.
- 🔴 A drive's text-regex state flag can match a different state's words (CHR-006's `unreadable` matched the partial notice).
- 🔴 A notification's "exit code 0" reports the wrapping subshell — the log's `EXIT=` line is the reading.
