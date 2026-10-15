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
