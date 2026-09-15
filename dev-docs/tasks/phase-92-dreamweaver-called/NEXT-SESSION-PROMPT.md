# Phase 92 — next session

**Written 2026-09-15 at the end of s3 (CHR-003).** Branch `cline-dev`. Phase commits so far:
`2225624e1` (scoping, CHR-001, rulings), `0a4c53e24` + `9706a1a81` (CHR-002), `f25d5816f` (radii and
shadows), `57512511d` (fonts), `965ce9cbb` (`PrimaryButton` border), then this handoff's docs commit.

## The board, from the task files

| id | state |
|---|---|
| CHR-001 the before picture | ✅ committed without its PNGs (ruling; sha256 in `manifest.json`) |
| CHR-002 the type scale | ✅ **Richard looked in the dev editor, s3: "Looks good."** The three §6.1 calls (12.5 → 12, `body` at 12, widened scope) stand |
| CHR-003 one radius, one shadow, one box model | ✅ built s3, AC1–4 ✅, AC5 in §6.3. Not yet looked at by Richard — the verdicts are in `verdicts/CHR-003/2026-09-15/` |
| CHR-004 … CHR-011 | ⬜ none built |
| R1 | ✅ ruled |
| R2–R8 | proposed, not ruled (README §4) |

## First job

1. **Build CHR-007** (Ports → row descriptors). No ruling, behaviour-identical, pinned by the existing
   panel specs as characterisation. 🔴 Re-read every `·` row of README §3 it builds on **at HEAD** —
   CHR-003's §2 was wrong four ways (§6.1 there).
2. **CHR-004 names R3** — ask Richard before building it. CHR-003 found that `border-sweep/` pins
   which token an edge uses, not radii, so nothing from CHR-003 is waiting in it.
3. Offer Richard CHR-003's look when it is convenient (Projects and Templates, both themes, in
   `verdicts/CHR-003/2026-09-15/`); do not block CHR-007 on it.

🔴 Do not farm the P88 `test:ci` reds. Do not re-take the before picture.

## `test:ci`

**`965ce9cbb`, seed 39393, cache cleared, run alone: `2984 specs, 8 failures`** — the same eight by
name as at `9706a1a81` (CHR-003 §6.3 AC5): `SUB-006` ×3, `SUB-011` ×3, `NDA-017` ×2, all P88's. One
`NDA-017` is "Text Input has no checkbox port", the other Expression's static inputs. **A reading
with a different name is a regression; compare by name, never by count.** When P88 repairs those
fixtures the floor becomes 0.

## How to drive the chrome (CHR-003's recipe, cheapest that works)

- One dev stack, launched from `packages/noodl-editor` with `npm run start` (never sweeps a peer):
  `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 NOODL_USER_DATA_DIR=<scratch>/profile`, the profile
  seeded with `firstRunLegal.json`, `editorSettings.json` and a `recently_opened_project.json` that
  points at **fresh `cp -R` copies** of `Landing page test V2` and `Reading Shelf` from
  `~/vscode_projects/NodeGX test projects/`. App `nodes.json` md5 `4373f147…` before and after.
- 🔴 **Resize after every reload**: `window.resizeTo(outerWidth + (1368-innerWidth), outerHeight +
  (781-innerHeight))`, then check `innerHeight`. A reload resets to 900 and `capture.js`'s canvas
  coordinate then misses the Group.
- Light theme without a second stack: `document.documentElement.setAttribute('data-theme','light')`
  after load (what `ThemeManager.ts:175` does); check each shot's `renderedTheme` in the manifest.
- **Stop it by process group** (the Electron with `--user-data-dir=…/profile` → its pgid → `kill
  -TERM -pgid`, then `-KILL`, then its crashpad handler). Ports 9333 / 8674 / 8080 free after.

## Traps (details in CHR-003 §6.5, CHR-002 §6.4)

- 🔴 **Richard, s3: "Stop sucking up the entire CPU."** Jest beside a renderer rebuild (a 73 MB bundle,
  160s) took the load to 20. One heavy job at a time; tear the stack down between drives; run
  `test:ci` alone.
- 🔴 A probe element inside a `display: flex` row stretches to the row — `align-items: flex-start`.
  A tie between two arms grades nothing without an arm that must differ.
- 🔴 Parallel Bash calls share one working directory; a `cd` in one breaks relative paths in the
  others. Absolute paths.
- 🔴 A repo grep for a token counts the built `index.bundle.js` copies (5–6× inflation). Count source.
- `npm run dev:debug` sweeps peers' `drive-deployed.js` servers — use `npm run start` in the package.
- A click inside the open node picker inserts a node and autosaves; `capture.js` leaves the picker
  open at the end (`picker closed: false`) — reload before driving anything else.
