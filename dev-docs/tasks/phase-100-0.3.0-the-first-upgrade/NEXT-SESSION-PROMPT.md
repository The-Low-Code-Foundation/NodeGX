# Phase 100 — next session (written end of s5, 2026-09-23)

Read the [board](README.md) §5–§6 and [UPG-003](UPG-003-TEXT-STYLES-BECOME-TOKENS.md) §6–§7 first. 0.3.0 still
**waits on P101** (R7, the properties panel move) — nothing here cuts the release.

## Where s5 left it

**Done and verified (committed this session):**
- 🔴 **A regression s4 shipped, fixed.** `import-engine/apply.ts` loaded the import source a second time
  *with* the upgrade (s4 pinned only `analyze.ts`). Driven on HEAD `5053f489f`: installing `page-header` —
  one of **16 of 46** shipped prefabs that wear a text style — backed up the prefab's **cache** folder, raised
  "This project was upgraded" about it, and grafted parts wearing `var(--title-large-*)` the project never
  got (the install's own toast: *"they will draw unstyled"*). After: tokens defined in the target with the
  style's values, font face in the target's module, cache untouched, no toast.
- ✅ **UPG-003 §6(a)** — an imported part's text styles arrive as typography tokens, converted **against the
  target's tokens** (reuse equal, `-2` on a clash, source tokens never travel, skipped styles left alone), in
  the editor import **and** `noodl-mcp install_prefab`. §6(b) Styles panel looked at; §6(c) `checkFontFaces`
  now judges custom `typography-family` tokens (it saw only the 3 defaults); §6(d) backup failure **driven**.
- ✅ **UPG-004** — `packages/noodl-editor/package.json` `0.3.0` committed. Checked: root `package.json` still
  `1.1.0`, no prefab `library.json` moved, no `'0.2.4'` literal in editor/MCP source. 🔴 `package-lock.json`
  carries a one-line `0.2.4→0.3.0` for the editor workspace — **left uncommitted on purpose**
  (`PUBLISH-0.2.2.md` §2: the lock's version is not validated by `npm ci`; `v0.2.0` shipped a release behind).

**Readings taken 2026-09-23 on the s5 tree:** editor `test:main` **545 suites / 8,631 tests, exit 0**;
`tsc -p packages/noodl-editor --noEmit` exit 0; `noodl-mcp` `tsc --noEmit` exit 0; `tests-unit/upg-003`
**38/38**, `cmp-008` 56/56, `noodl-mcp tests/libraryTools` 15/15; **12 new mutants, each killed**.
✅ **`test:ci` (Electron), alone, cache cleared: `3033 specs, 8 failures`, seed 71901, fresh `test-results.json`
22:04 — exactly the floor by name** (SUB-011 ×3, SUB-006 ×3, NDA-017 ×2). 🔴 Its FIRST run (seed 50154) read 12: four
import specs asserted text styles landing as text styles (updated to the tokens they now become), and one of them opened
the committed fixture `tests/testfs/import_proj5` **in place** — since s4 that load upgraded it, writing
`import_proj5.before-0.3/` and a font module **into the repo** (deleted; the spec now reads it `{ upgradeOnLoad: false }`
and asserts no backup appears). s4's "`test:ci` NOT run" hid exactly this.
⚠️ `noodl-mcp` full suite: **131 suites, 10 red, 20 tests — none mine**, each attributed by control:
CMP-004 ×2 (a committed `icon.png`, `1fad0cad7`, 09-11), cn004 + nodeIdAllocation (red with `fontFaces.ts` at
HEAD too), D54 / DEF-038 / CMP-001 (no contact with anything touched), tpl008/tpl010 (a peer's uncommitted edits).

**Where the handoff chain was wrong:** s4 wrote "the import engine reads a source project unconverted" — true
of **one of its two loads**. The s4 NEXT prompt offered "accept the next-open conversion" for §6(a); measured,
that open would back up a 0.3-native project and tell its owner it "was upgraded", once per install+reopen.

## Ordered next steps

1. **UPG-001 §4 remainder** — §3.4's `_variant` rendering drive, the port class beyond `name:` edits, the
   validator rules added since `v0.2.4`, the exporter; §3.5's `nonexistentPort` corpus count. Each new break
   joins `UPGRADES` in `upgradeOnLoad.ts`. 🔴 **For every break, drive the IMPORT path as well as the open** —
   s5's regression lived on a load the open-drive never took.
2. `budget.json:61` `whats-new-feed-404 ≤ 2` → 0 (needs a renderer-errors run: own dev stack, alone).
3. UPG-006/007/008 once P101 lands.

## Richard's, not the agent's

- **UPG-002 AC3:** open one of his own 0.2.x projects (a copy) in a 0.3.0 dev build and say whether the
  toast tells him what he needs.
- Whether the **20 of 193** legacy projects with a *wired* text style port keeping all their text styles is
  acceptable for 0.3.0 (not put to him as a ruling).
- 📝 Worth a look, not a ruling: a style's tokens land in two Styles-panel groups (family/size/leading under
  *Typography*, colour among the colours), not grouped by style.
