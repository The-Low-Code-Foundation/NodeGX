# CMP-005 — Font family

**Opened 2026-09-24.** **Status: ✅ BUILT s1 (2026-09-24): codec `token-codecs/fontFamily.ts` (AC1 as specs, plus the one-entry family UPG-003 mints); list drawn in each font with *preview unavailable* measured by canvas width, not `document.fonts.check` (driven: 39 rows, 14 drawn, 25 marked unavailable on this machine — AC3); kind-change line before Apply (AC2's tail rule as a spec).** Depends on CMP-001.

## 1. The person sentence

> **Someone changes their site's font by scrolling a list where every font is drawn in itself and
> clicking one — and the backup fonts that make it safe are kept for them without being mentioned.**

## 2. What to build (mockup: *Font and text size composers* board, left half)

- A preview heading + paragraph in the chosen font.
- Tabs: All / Sans / Serif / Mono. A list, each row drawn in its own font with a small sample and
  its kind. The list is `COMMON_FONTS` plus whatever the project already uses (a font a project
  ships is in the list even if it isn't common).
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
2. On a drive: pick *Lora* for `--font-sans`, Apply. Text on the canvas that wears it changes, and
   the saved value is `Lora, ui-sans-serif, …` with the tail unchanged, **until** the kind-change
   line says otherwise.
3. The font list draws each name in its own font (a shot). A font that isn't installed says so
   rather than silently drawing in the fallback.
