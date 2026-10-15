---
id: P18-S110-NOWRAP
title: Exported Text with Size Mode Content Size or Content Width wraps where the editor does not
status: open
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
