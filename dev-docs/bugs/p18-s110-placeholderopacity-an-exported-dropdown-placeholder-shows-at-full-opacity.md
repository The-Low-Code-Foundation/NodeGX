---
id: P18-S110-PLACEHOLDEROPACITY
title: An exported Dropdown's placeholder shows at full opacity
status: open
severity: low
area: export / Dropdown
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: net.noodl.controls.options.placeholderOpacity
---

Runtime: `Select.tsx` :184-185 dims the placeholder option. Export: `emit/style.ts` :143 tags the port `'control'` (consumed)
and `renderSelect` (`emit/component.ts` :5737-5752) never reads it; with a placeholder, items and an empty value the output is
identical.
