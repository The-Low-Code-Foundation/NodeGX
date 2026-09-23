# Phase 100 — next session (written end of s4, 2026-09-23)

Read the [board](README.md) §5–§6 and [UPG-003](UPG-003-TEXT-STYLES-BECOME-TOKENS.md) first. 0.3.0 still
**waits on P101** (R7, the properties panel move) — nothing here cuts the release.

## Where s4 left it

**Done and verified:** UPG-003 built, `f6503e521` + `11bb0a390`. A 0.2.x project's text styles become
typography tokens on open (R3/R8), font files included via `noodl_modules/text-style-fonts` (R9), the
folder copied to `<project>.before-0.3` first (R10), a sticky toast says so (R2), saved on open so it
happens once. `upgradeOnLoad.ts` is UPG-002's seam for every later 0.3.0 break.

**Readings taken 2026-09-23 at `11bb0a390`:** editor `test:main` 545 suites / 8,623 tests exit 0;
`tsc -p packages/noodl-editor --noEmit` exit 0; `tests-unit/upg-003` 30/30, 17 mutants each killed;
corpus 245,358 checks, 0 differences, re-run no-op. Drives on copies of *Landing page test V2* and
*Noodl Starter Template* — identical render, change-once for size and font, backup byte-identical.
⚠️ **`test:ci` (Electron) was NOT run.**

**Where the handoff chain was wrong:** HLT-020 §2 counted node wearers only (variants add 1,765
layers) and never saw that 98% of styles name a font file — which is what produced R9. The P100
board's "UPG-003 converts to Looks" was superseded by R8 in s3 and is now built as tokens.

## Ordered next steps

1. **UPG-003 §6, in order:** (a) library/prefab import still mints text styles — convert on import
   (editor import engine + `noodl-mcp/libraryTools`), or accept the next-open conversion and say why;
   (b) look at the Styles panel's Typography group holding the new tokens (quoted family values,
   `--x-color` under Palette Colors); (c) `noodl-mcp` `checkFontFaces` against a quoted family;
   (d) drive the backup-failure path (read-only parent dir) — it is graded on source order only;
   (e) run `test:ci` once, beside no other heavy job.
2. **UPG-001 §4 remainder** — §3.4's `_variant` rendering drive, the port class beyond `name:` edits,
   the validator rules added since `v0.2.4`, the exporter; and §3.5's `nonexistentPort` corpus count.
   Each new break joins `UPGRADES` in `upgradeOnLoad.ts`, not a bespoke report.
3. **UPG-004** — `packages/noodl-editor/package.json` has sat at `0.3.0` **uncommitted since s2**;
   commit it with the literal checks the row owes (never root `package.json`, lockfile, prefab
   `library.json`s).
4. UPG-006/007/008 once P101 lands.

## Richard's, not the agent's

- **UPG-002 AC3:** open one of his own 0.2.x projects (a copy) in a 0.3.0 dev build and say whether the
  toast tells him what he needs. The agent's screenshot is not his look.
- Whether the **20 of 193** legacy projects with a *wired* text style port (LearnBook among them)
  keeping all their text styles is acceptable for 0.3.0 — built that way because a wire can pick any
  style at runtime; not put to him as a ruling.
