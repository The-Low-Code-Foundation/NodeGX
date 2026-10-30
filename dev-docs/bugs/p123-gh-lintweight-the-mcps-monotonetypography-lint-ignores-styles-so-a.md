---
id: P123-GH-LINTWEIGHT
title: The MCP's monotone-typography lint ignores styles, so a page whose weights come from styles is called unstyled
status: open
severity: low
kit: mcp
area: noodl-mcp / validation monotone-typography
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

Writing to Greenhouse's Plant page, the MCP reported "None of this page's 13 text nodes sets fontWeight, so every
word on it renders at the same weight". Every text wears a Style (Display, Title, Eyebrow 600…) that sets its weight.
Fix: read the node's variant's parameters before saying it sets nothing.
