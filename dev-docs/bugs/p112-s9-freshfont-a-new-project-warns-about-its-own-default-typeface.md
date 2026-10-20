---
id: P112-S9-FRESHFONT
title: "A project `create_project` has just made fails its own first check with a warning: the default `--font-sans` names Inter, which nothing ships"
status: fixed
severity: low
area: validation / `font-face-not-shipped` (`noodl-editor/src/editor/src/validation/diagnostics.ts`, P88 GAM-016) against the default design tokens; `noodl-mcp/src/tools/createProject.ts` `writeProjectSkeleton` writes no tokens
found: P112 OWN-011 s9, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §7
kit: mcp
regression: packages/noodl-mcp/tests/own018StarterAssets.test.ts "create_project writes the starter set; the vocabulary lists it and the first check has no font warning"
commit: 00e569472
---

The stranger run of OWN-011: `create_project` (installed from a tarball, run under `npx`, a clean folder), then
`validate_project` on the result, before anyone has authored anything:

```
"summary": { "errors": 0, "warnings": 1, ... }
"code": "font-face-not-shipped", "location": { "component": "/App" },
"message": "`--font-sans` names \"Inter\" first, and nothing in this project declares that face ..."
```

The skeleton declares no tokens, so the warning is about the product's default theme, not anything the person or their
agent did. It is the first diagnostic a new person's agent reads, and its suggestion (ship a font folder in
`noodl_modules`) is work nobody asked for. Not measured: whether the editor's own new-project path draws the same
warning (it starts from the same defaults), and how many templates override `--font-sans` and so never show it.

**Fixed 2026-10-14 (lane 1, `00e569472`) by NOSTARTERASSETS:** a made project now ships Inter in `noodl_modules/inter`, so its first `validate_project` has no `font-face-not-shipped`. The same test removes `noodl_modules/inter` and sees the warning come back (the control).
