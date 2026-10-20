---
id: P18-S110-NOWRAP
title: Exported Text with Size Mode Content Size or Content Width wraps where the editor does not
status: fixed
commit: (s112)
regression: packages/nodegx-export/tests/the-white-space-arms.test.ts
severity: low
area: export / Text
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: Text.sizeMode
---

Runtime: `Text.tsx` :81-86 — Content Size / Content Width switch `white-space` from `pre-wrap` to `pre`. Export: no
`white-space` anywhere in `emit/style.ts`; a long Text with Content Size emits identically. (Width / Height filtering by Size
Mode is honoured, `style.ts` :647-655.)

**Wider than this row's title (session 111, by reading both sides).** `Text.tsx` sets `white-space` on *every* Text, in
three arms: `nowrap` (plus `overflow: hidden`) under a truncating Text Overflow, `pre` under Content Size / Content
Width, and otherwise `pre-wrap` with `overflow-wrap: anywhere`. The export emits no `white-space` or `overflow-wrap`
anywhere: a search of all of `packages/nodegx-export/src` finds none. So the default arm differs too. A line
break typed into an exported Text collapses into a space, runs of spaces collapse, and a long unbroken word overflows
where the editor breaks it. Separately, an ellipsis Text Overflow reaches the DOM with nothing to truncate. Not
yet rendered. The fix is one rule per arm in `emit/style.ts`'s Text role, and it touches every Text in the corpus
golden (HLS-001), so it is sized as its own step, not a cheap close. Severity stays `low` until a render
measures the default arm.

**Fixed, session 112, and rendered first.** `emit/style.ts` now emits the runtime's three arms on every `Text` (by type: the
deprecated Label shares the role and sets none), and Text Overflow is carried (`text-overflow`, plus `overflow: hidden`
unless clip already set it). The line break was lost before CSS: `jsxText` printed a literal bare, and JSX turns a
line break into a space. It now takes the string form wherever JSX would rewrite a character. Rendered in one Chrome:
runtime, HEAD's export and the patched export, four Texts (`dev-docs/tasks/phase-18-code-export-v2/s112-nowrap-render/`).
HEAD differed on all four. Patched equals the runtime on every measured field, except that the runtime draws no "…"
for Ellipsis, its own defect (P18-S112-FLEXELLIPSIS). HLS-001: 103 CSS modules moved, 0 TSX.
