---
id: P18-S110-BREAKPOINTS
title: Exported Columns breakpoints apply under Auto Fit, and a bare-number breakpoint emits invalid CSS
status: open
severity: low
area: export / Columns
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: (no port silent — found while adjudicating net.noodl.visual.columns breakpoints)
---

Two halves, both in `emit/style.ts` :1011-1022. (1) With Sizing = Auto Fit the runtime ignores the breakpoints
(`Columns.tsx` :246-251); the export still emits the `@container` rules, so a narrow container's tracks differ. (2) A breakpoint
stored as a bare number (`mediumBreakpoint: 700`) emits `@container (max-width: 700)`, which browsers drop silently;
`parseProject.ts` :582 makes a dimension only from `{value, unit}`.
