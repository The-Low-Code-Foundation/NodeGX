# CMP-005 — Font family

**Opened 2026-09-24.** **Status: ✅ BUILT s1, CORRECTED s2 (2026-09-24).** s1: codec `token-codecs/fontFamily.ts` (AC1 as specs), a list drawn in each font with *preview unavailable* measured by canvas width, the kind-change line. 🔴 s2 ([CMP-007 rows 1 and 4](CMP-007-RICHARD-DRIVES-IT.md#4-rows)): the list offered 25 web fonts no project shipped and could not draw the project's own; it now offers only faces a visitor will see (the project's, drawn from its files; the three system stacks; the ten `validate_project` needs no file for), and AC2 is **driven** on the canvas (Georgia: 0 → 101 text elements in the preview, ⌘Z restores). Depends on CMP-001.

## 1. The person sentence

> **Someone changes their site's font by scrolling a list where every font is drawn in itself and
> clicking one — and the backup fonts that make it safe are kept for them without being mentioned.**

## 2. What to build (mockup: *Font and text size composers* board, left half)

- A preview heading + paragraph in the chosen font.
- Tabs: All / Sans / Serif / Mono. A list, each row drawn in its own font with a small sample and
  its kind. ~~The list is `COMMON_FONTS` plus whatever the project already uses~~ **s2: the list is
  the faces the project ships (module stylesheets, icon sets excluded) + the three system stacks +
  the faces every computer has (`validate_project`'s no-file list). A font the project does not
  ship is not offered: naming it writes a value the validator warns about and no visitor sees.**
- A line under the list: *"Backup fonts are added for you. They show while Inter loads, or if it
  can't."*
- *Another font…* opens today's font field behavior (any name). A Google Fonts browser or upload is
  P103.

⚠️ **A list "drawn in each font" can only draw the fonts the editor's own window can load.** The
editor renderer does not carry the project's Google-hosted or `noodl_modules` fonts; a row drawn
in a font that is not loadable silently falls back to the system font and *looks* like a choice
that was made. That is the empty-span problem in another coat
([[an-icon-component-renders-an-empty-span]]). For each row, check `document.fonts.check()` after
attempting a load from the project's font files (UPG-003 knows where they are) or the system; a
font that will not load draws its **name in the UI font with a small *preview unavailable* mark**,
never a silent fallback. AC3 grades this.

## 3. The codec (the stack)

A family token is a **lead font** and a **tail**. The composer edits the lead only.

- `Inter, ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'` →
  lead `Inter`, tail kept **exactly** (including the emoji fonts and the quote style).
- Changing to a font of the **same kind** keeps the tail. Changing kind (sans → serif) swaps the tail
  for that kind's default tail, taken from `--font-serif`/`--font-mono`'s own defaults. That is a
  rewrite, and the composer says so in one line before Apply.
- `--font-serif` and `--font-mono` default to a stack that **starts with a generic**
  (`ui-serif`, `ui-monospace`): lead = *"System serif"* / *"System mono"*.
- Quote the lead font only when its name has a space, in the quote style the tail already uses.

## 4. Acceptance criteria

1. The 3 defaults decode and re-encode byte-identical, and so does every family value in the
   templates (CMP-006 counts the projects).
2. On a drive: pick *Georgia* (s2: *Lora* is no longer offered) for `--font-sans`, Apply. Text on
   the canvas that wears it changes, and the saved value is `Georgia, ui-sans-serif, …` with the tail unchanged, **until** the kind-change
   line says otherwise.
3. The font list draws each name in its own font (a shot). A font that isn't installed says so
   rather than silently drawing in the fallback.
