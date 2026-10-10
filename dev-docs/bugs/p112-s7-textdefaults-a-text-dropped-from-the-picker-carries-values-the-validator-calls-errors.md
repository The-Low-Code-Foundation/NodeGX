---
id: P112-S7-TEXTDEFAULTS
title: "A Text dropped from the node picker carries layout defaults the editor's own validator calls 2 errors and 4 warnings — width and height \"auto\", flexShrink and flexGrow Text never reads, minWidth \"0\" read as 0%"
status: open
severity: medium
area: editor / element configs (`packages/noodl-editor/src/editor/src/models/ElementConfigs/configs/TextConfig.ts` `defaults`, stamped by `ElementConfigRegistry.applyDefaults` from `NodePicker.utils` `createNodeFunction` and `NodeOperations`)
kit: editor-suite
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
