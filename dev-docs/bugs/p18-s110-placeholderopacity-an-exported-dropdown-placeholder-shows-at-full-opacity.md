---
id: P18-S110-PLACEHOLDEROPACITY
title: An exported Dropdown's placeholder shows at full opacity
status: fixed
commit: (s112)
regression: packages/nodegx-export/tests/the-dropdown-placeholder.test.ts
severity: low
area: export / Dropdown
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: net.noodl.controls.options.placeholderOpacity
---

Runtime: `Select.tsx` :184-185 dims the placeholder option. Export: `emit/style.ts` :143 tags the port `'control'` (consumed)
and `renderSelect` (`emit/component.ts` :5737-5752) never reads it; with a placeholder, items and an empty value the output is
identical.

**The default side (session 111).** The port's default is 0.5 (catalog), so this is not only an authored value. Every
exported Dropdown that shows a placeholder shows it at full opacity. The export spells the placeholder as a native
hidden, disabled `<option>` selected by `defaultValue=""` (`renderSelect`), and a closed native select does not
draw per-option styles. Carrying it means styling the select while its empty option is the checked one (for example
a module-CSS rule on `:has(> option[value=""]:checked)`), and opacity must apply to the text only, as the runtime's
`<span style={{ opacity }}>` does, not to the box. That is a design choice with golden churn on every placeholder
Dropdown, so it is not a cheap close. The cheap honest step, if the carry waits, is a note on every Dropdown with a
placeholder, because the default already differs.

**Fixed, session 112, rendered first** (`dev-docs/tasks/phase-18-code-export-v2/s112-placeholder-render/`). Three
Dropdowns: the visible fade is 0.5 / 1 / 0.3 in the runtime, 1 / 1 / 1 at HEAD, 0.5 / 1 / 0.3 patched. `computeRoleCss`
(`emit/style.ts`, role `select`) now gives a Dropdown with a placeholder a rule on `:has(> option[hidden]:checked)`
that mixes its text colour toward transparent by the opacity (clamped as CSS clamps it), and keeps the open list's
options at full colour; with no authored colour the colour is `FieldText`, which is what the select draws. A
non-literal opacity is said. No corpus Dropdown has a placeholder, so HLS-001 did not move. The one cost: the native
chevron is drawn in the text colour and fades too. The other differences the render shows (box size, chevron, the
default text colour) are not this row's: P18-S112-NATIVESELECT. In the parameter ledger the port is `gated`, not
reaching: it reaches only with a placeholder, which no probe context sets.
