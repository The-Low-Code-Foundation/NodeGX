---
id: P123-GH-NOTOKENS
title: Studio cannot set the app's colours or fonts: no style variables, four fonts
status: needs-ruling
severity: medium
area: nodegx-studio / Styles (design tokens, fonts)
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

Bubble has style variables (a palette, fonts). Studio reads the project's design tokens but cannot add or change one,
and the runtime ships its own blue defaults (--primary #2563eb…). The font menu offers Inter, system-ui, Georgia,
Menlo (and what is already used); no web font can be added. Greenhouse's green palette is hex inside each Style,
and its type is Georgia + the system stack. Meanwhile the MCP lints every Studio-written px and hex as
"raw-spacing-literal" (56 warnings on one page): Studio and the agent disagree on what a good page is.
Ruling wanted: a palette and fonts in Styles (writing `designTokens`), and whether Studio should write tokens.
