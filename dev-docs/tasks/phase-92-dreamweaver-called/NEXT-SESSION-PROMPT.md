# Phase 92 — next session

**Written 2026-09-15 at the end of s2 (CHR-002).** Branch `cline-dev`. Phase commits: `2225624e1`
(scoping + CHR-001 + rulings), `0a4c53e24` (ratchet), `9706a1a81` (the type scale), then this
handoff's docs commit.

## The board, from the task files

| id | state |
|---|---|
| CHR-001 the before picture | ✅ committed **without its 14 PNGs** (Richard's ruling; they are on this disk only, sha256 in `manifest.json`) |
| CHR-002 the type scale | ✅ built, AC1–5 ✅ (§6.2). **Awaits Richard's look** at `verdicts/CHR-002/2026-09-15/` |
| CHR-003 … CHR-011 | ⬜ none built |
| R1 | ✅ ruled as proposed, **≤ 6** sizes, graded on the **visible text-bearing** count |
| R2–R8 | proposed, not ruled (README §4) |
| C3 (guest sees internal KPIs) | ruled "hide from guests", **filed on P75's board** (`TASKS.md`, "Ruled 2026-09-15"); not ours |

## First job

1. **Show Richard CHR-002's before/after**, one message, and ask for the look:
   Templates 6 → **5** text sizes, Group panel 7 → **2**, both themes. Three calls he may overrule,
   all in CHR-002 §6.1: **12.5 → 12** (not 13); **`body` stays 12** (§3.3 said 13); scope widened to
   `styles/propertyeditor/` and three `style.css` rules, because the panel's 9px lived there.
2. **Then build CHR-003** (one radius, one shadow, box-sizing, dead fonts). No ruling named.
   🔴 Re-read every row of its §2 **at HEAD** first — they are a sweep's readings.
3. If CHR-003 turns out to need a ruling, build **CHR-007** (Ports → row descriptors): no ruling,
   behaviour-identical, pinned by the existing panel specs.
4. **CHR-004 is now unblocked by dependency** (CHR-002 ✅) but names **R3** — ask before building it.

🔴 Do not farm the 8 `test:ci` reds below. Do not re-take the before picture.

## `test:ci` is not at "floor 4" any more — read by NAME

`9706a1a81`, seed 39393: **`2984 specs, 8 failures`**, none CHR-002's. AIX-006's four were fixed in
`4ce67963a`. The eight are **P88's**: SUB-006 ×3 + SUB-011 ×3 (`nonexistent-port` on fixtures, GAM-019
`4bb438165`) and NDA-017 ×2 (Expression's `evaluateAtLoad`, GAM-001/002/003 `89e533625`). GAM-019's own
file says its `test:ci` run is still owed. A reading of 8 with a **different** name is a regression.

## How to re-measure (any ratchet, CHR-011)

- **Static:** `npm run type` (baseline 727; the three CHR-001 scopes read 0 / 0 / 0). Lower with
  `npm run type:baseline` in a commit of its own.
- **Rendered:** `verdicts/CHR-001/2026-09-15/capture.js` + `measure.js`, **unchanged**, per CHR-002
  §6.2 AC1: fresh `cp -R` fixtures, a seeded `NOODL_USER_DATA_DIR` profile, `NOODLPORT=8674`,
  `NOODL_REMOTE_DEBUG_PORT=9333`, then `window.resizeTo` to **1368×781** before `capture.js`.
  🔴 A task that changes chrome needs **its own build** (dev stack), not the packaged app.
  Check App `nodes.json` md5 before/after (`4373f147…`).

## Traps (details in CHR-002 §6.4, CHR-001 §6.5)

- 🔴 **`npm run dev:debug` sweeps peers' `drive-deployed.js` servers** (it killed the one on 8765 in
  s2). **Dry-run the sweep first**; if a peer is named, launch with `packages/noodl-editor`
  `npm run start` (never sweeps) and stop with `kill -KILL` of the watchdog, then each process group.
- The dev window opens at 1368×**900**; `Browser.getWindowForTarget` does not exist in Electron.
- A click inside the open node picker inserts a node and autosaves. Hovering the Design-mode
  preview leaves its tooltip up.
- zsh does not split an unquoted `$VAR` list: `for p in $SET` iterates once.
