# Phase 92 — next session

**Written 2026-09-15 during s7 (CHR-012, the Community tab).** Branch `cline-dev`. Phase commits:
`git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform half is `~/vscode_projects/nodegx-community`
(separate repo, no remote), deployed at `f39d20f`.

⚠️ `~/.claude/next-session-state/…json` holds a **P88 peer's** handoff; this file is the phase's.

## The board, from the task files

| id | state |
|---|---|
| CHR-001 the before picture | ✅ committed without its PNGs (ruling) |
| CHR-002 the type scale | ✅ Richard: "Looks good", "the font change is nice" |
| CHR-003 one radius, one shadow, one box model | ✅ Richard: "fine" |
| CHR-005 one launcher page | ✅ Richard: "fine" — except the Community tab (⇒ CHR-012) |
| CHR-006 the Templates tab gets its pictures | ✅ Richard: WORTHY; live shelf carries the pictures |
| CHR-007 the rows become descriptors | ✅ built s4, invisible by design |
| **CHR-012 the Community tab** | 🟡 **built s7** — R9 + R10 ruled, drive signed out (two passes), **awaits Richard's look** + the signed-in drive (§7.5) |
| CHR-004, 008, 009, 010, 011 | ⬜ not built |

## First job

1. **If Richard has not looked:** put `verdicts/CHR-012/2026-09-15/prod-signed-out-v2/v2-community-{bench,chat,replays}-1368x900-{dark,light}-top.png`
   (and pass 1's `prod-signed-out/*-700x500-*`) in front of him. His word closes CHR-012 or scopes the next pass.
2. **AC1's signed-in drive** (CHR-012 §7.5 item 2 — everything is prepared):
   - `cd ~/vscode_projects/nodegx-community && DATABASE_URL=postgres://richardosborne@127.0.0.1:5432/chr012_community npx tsx scripts/seed.mjs`
     (it DROPS `public` in that DB and runs every migration — scratch DB only).
   - `PORT=3399 DATABASE_URL=… npx next dev -p 3399`; swap `COMMUNITY_URL` in `models/community/communityorigin.ts`
     to `http://localhost:3399` (**backup at `<s7 scratch>/chr012/communityorigin.ts.bak`; revert and prove with
     `git diff` = 0 lines**).
   - Editor on a COPY of `<s7 scratch>/chr012/profile-signed-in` (session file `{"token":"dev-session-ada","handle":"ada-builds"}` —
     the seed inserts that hash itself). Drive: `NOODL_REMOTE_DEBUG_PORT=9333 node drive.js <out> --prefix=local-signed-in-`.
   - Then the same against the signed-out profile, so the two heads differ by one field.
   ⚠️ The s7 scratchpad may be gone in a new session — the profile is two small files, recreate it.
3. The rail panel drive (chip now 28px there) and 700×500 after pass 2; `test:ci` at the floor; commit.

## Then, in order

1. **Track B:** CHR-008 (R8 ruled), then CHR-009 (R6 trial, R7 tab). CHR-008 inherits from CHR-007: `focusGatePort`'s
   retry wants a `ref`, and the five hash clears exist because the hash cannot see expansion or undone values.
2. CHR-004 — smaller than scoped (CHR-005 and CHR-012 retired several CSS-text pins; `drive.js` `CONTRAST` prototypes R3's gate).
3. CHR-006 remainders, no ruling needed: §3.6 plural chip labels; pictures for `site-builder` / `members-area`.

## Still Richard's

1. **CHR-012's look** (above).
2. CHR-007 declined AC4's "≤ 1 `_portsHash = undefined`" (CHR-007 §6.2) — do not quietly revisit.
3. R6 becomes final only on his look at CHR-009's screenshots; R7's marker-on-the-tab detail is proposed, not ruled.
4. The Projects tab's two full-width cards (BST-003 / UNI-001 placements) — ask before moving them.
5. Data, for P86/P78: `members-area`'s live summary is lowercase and fragmentary.
6. R9 moved D21's health readout off the launcher; **where we read it instead** (platform admin / debug view) is unbuilt and unscoped.

## What s7 settled, including where the handoff and the task file were wrong

- **Rulings (Richard, 2026-09-15): R9 — the health readout leaves the user's screen; R10 — the guest banner is a line in the page head.**
- 🔴 CHR-012 §2 cited `views/Community.tsx` and `components/community/*` under `preview/launcher/`; the view is at
  `preview/launcher/Launcher/views/Community.tsx` and the vocabulary at `noodl-core-ui/src/components/community/`.
- 🔴 The "D21 grader" §6 warned about is **three specs** (`nat-005`, `rel-019`, `fb-006`) asserting the words — no
  script. They now assert R9's absence beside a control that drew.
- 🔴 `Chip`'s ✓ was in the accessible name; FB-002 hid it on the old pill. `Chip` now carries `aria-hidden` (Templates and Learning gain it).
- 🔴 `tokenContrast` grades an `rgba` wash as opaque: `primary` vs `primary-bg` scored **1:1**. Composite it
  (`parseColorAlpha` + `composite`) over the named ground — the pill spec now does.
- 🔴 Anything importing `views/Community.tsx` now needs FLD-017's `Icon` stub (five specs got it). `jest.mock` placed
  mid-file is hoisted and works.
- The first drive found what jest could not: a second button style left in Chat's river, and row rules 12px wider than the column.

## Readings taken this session (2026-09-15, s7, tree `675f12f9d` + CHR-012)

- jest over the 32 suites importing a changed module: **32 / 32, 887 / 887**, EXIT=0; after pass 2, the five affected dirs **14 / 14, 480 / 480**.
- `tsc -p packages/noodl-editor --noEmit` **EXIT=0**; `type` / `colors` / `tokens:css` / `icons:css` **EXIT=0**; `type:baseline` core-ui 127 → 124.
- Drives: pass 1 20 shots, pass 2 6 shots, both EXIT=0 — CHR-012 §7.4.
- **Not taken:** `test:ci`; the signed-in drive; the rail.

## Traps

- 🔴 One heavy job at a time. The s7 dev stack ran on 8080 / 9333 / 8674 — tear it down (listener pids, then `lsof -sTCP:LISTEN` reads 0).
- 🔴 A peer's untracked `tests-unit/validation/gam-022-a-wrapped-row-of-pills.test.ts` (P88) sits in the tree — never commit it with this phase.
- 🔴 Anything `CommunityTab` / `TemplatesTabBody` renders must be hook-free.
- 🔴 The drive's control classifier names only `RetryButton` as a link; `LinkButton` reads as "other". Extend it before trusting an "other" count.
- 🔴 A notification's "exit code 0" reports the wrapping shell — the log's `EXIT=` lines are the reading.
