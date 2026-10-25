---
id: P112-S7-TEXTDEFAULTS
title: "A Text dropped from the node picker carries layout defaults the editor's own validator calls 2 errors and 4 warnings — width and height \"auto\", flexShrink and flexGrow Text never reads, minWidth \"0\" read as 0%"
status: fixed
severity: medium
area: editor / element configs (`packages/noodl-editor/src/editor/src/models/ElementConfigs/configs/TextConfig.ts` `defaults`, stamped by `ElementConfigRegistry.applyDefaults` from `NodePicker.utils` `createNodeFunction` and `NodeOperations`)
kit: editor-suite
regression: packages/noodl-editor/tests/models/PickerLookValidates.test.ts "Text keeps its typography tokens and wears no layout key"
found: P112 OWN-006 s7, 2026-10-10 — the editor suite's Electron adapter (OWN-006 AC3), taking the picker's path, on all three fixtures (small, todo-list, planning)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-006-THE-EDITOR-SUITE.md §6.3; the suite's semantic-validator check named 6 diagnostics the reference's save does not have, and the editor's `SemanticValidator` on a Text with exactly the picker's defaults reads them
---

STYLE-002's `TextConfig.defaults` stamps eleven parameters on every Text a person adds from the picker. Five are
layout keys whose comment calls them a bug fix ("Text elements previously defaulted to width: 100%"). The editor's
own `SemanticValidator`, run on a Text carrying exactly those defaults:

- `error invalid-parameter-value` — `width`: *expects a number or { "value", "unit" } object. Got the string "auto".*
- `error invalid-parameter-value` — `height`: the same.
- `warning inert-dimension` — `height` is inert: the node sizes itself to its content.
- `warning unknown-parameter` — `flexShrink`: *Text has no input port "flexShrink", so this parameter is never read.*
- `warning unknown-parameter` — `flexGrow`: the same.
- `warning unitless-dimension` — `minWidth` "0": *a bare number, so it renders at "0%"*.

So a person who builds a page by hand and then asks an agent to check the project gets two errors per Text, on
values the person never set. The six typography values (`var(--font-sans)`, `var(--text-base)` …) draw no diagnostic.

**Not measured:** what the runtime does with a `width` parameter of `"auto"`. The runtime's Text already sizes to its
content by itself (`noodl-viewer-react/src/nodes/visual/text.ts` `defaultCss.width: 'auto'`), so the five layout keys
look redundant at best. Measure before fixing; the likely fix is to drop those five keys from `TextConfig.defaults`
and keep the typography tokens. Whether a Text an agent adds should wear the same look as one a person drops (the MCP
adds none) is a separate question (OWN-006 §6.3).

**Plain words:** *"Every text box you drag in from the node list arrives with five settings the editor's own checker
says are wrong, so an agent checking your project reports errors you never made."*

**Fixed (the Beta sweep s9, 2026-10-25).** Measured first, as the row asked: `"auto"` is not a size, so Text's width
setter keeps its declared 100% and raises `dimensions/not-a-dimension`; Text has no `flexShrink`/`flexGrow` port
(`noodl-viewer-react/tests/p112-s7-textdefaults-width-auto.test.ts`, 4/4 on the real setter). The "fix" never sized
anything, and a Text in a row already shares it (`Layout.size` turns a percentage width along the row into flex-grow
with shrink), so dropping the five keys changes no rendering. Kept: the six typography tokens.

The spec grades every registered config and every variant, and found the same class beside Text: TextInput's
`width: '100%'` / `height: 'auto'` (2 errors, inert anyway), `cursor` on Button and Checkbox, `borderWidth: '0'` on five
Button variants with no border style. All removed. The style vocabulary (what `get_style_vocabulary` teaches an agent)
loses exactly those keys, so agents stop being taught Text `width: "auto"` and TextInput `width: "100%"`, both of which
the write door refuses. **Left:** `boxShadow` on three Button variants, still never read on a dropped Button, because
the vocabulary turns it into `boxShadowEnabled` for an agent's Button: BETA-S9-BUTTONSHADOW (a ruling).

Graded: `tests/models/PickerLookValidates.test.ts` red 5 of 6 on HEAD's configs → 23/23 (mutant: `width: 'auto'` back
in TextConfig reddens 12 Text arms); `ElementConfigRegistry.test.ts` (two assertions moved off `cursor`); tests-unit
def-001, sty-002, def-041, aib-001 151/151; viewer-react button/icon variants 50/50; mcp vocabulary files 89/89; editor
tsc and `tsconfig.tests.json` clean. Not run: `electronAdapter.test.ts` (Electron `test:ci` only; its picker-look case
derives the look from `applyDefaults`, so it follows the change).
