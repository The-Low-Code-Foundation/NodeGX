---
id: P18-S105-KITHEAD
title: The export drops a kit's `browser.head` and `browser.styles`, which the deployed page writes into itself
status: open
severity: low
area: export / kits (`nodegx-export/src/parse/parseModules.ts` reads `browser.stylesheets` only; `src/emit/scaffold.ts` indexHtml)
found: P18 session 105, 2026-10-15 — fixing P109-S17-EXPORTKITDEPS, reading `buildInjectionTags` beside the export
evidence: "`@nodegx/module-inject` `buildInjectionTags` appends each `browser.head` entry verbatim and each `browser.styles` entry as a `<style>` to `<%modules_dependencies%>`; the export reads neither (`grep -n 'head\\|styles' src/parse/parseModules.ts` finds only `stylesheets`). Census 2026-10-15: 0 of 2001 `noodl_modules/*/manifest.json` on this machine use either, outside the injector's own test fixtures (`tests/testfs/module-inject/noodl_modules/code-a`)"
---

A kit manifest can put raw tags into the page (`browser.head`, each string written as is) and inline CSS
(`browser.styles`, each wrapped in `<style>`). The deploy injector writes both into `<%modules_dependencies%>`, beside
the dependency scripts that P109-S17-EXPORTKITDEPS now carries into the export. The export reads `browser.stylesheets`
and nothing else from `browser`, so a kit that relies on either works deployed and is missing its markup or its CSS
exported, with nothing in the report.

**Reach today: none.** No manifest on this machine uses either key, apart from the injector's own test fixture. The
first kit to use one is the first to meet it.

**Proposed:** carry both through the same seam as the dependencies (`parseModuleDependencies` reads the injector's
`toInjectModules` output, whose `browser` is the manifest's): `styles` as a `<style>` in the exported `<head>`, and
`head` either written into `<head>` verbatim or, because arbitrary markup is a thing the export cannot vouch for, named
in the export report. That second half is a choice for whoever builds it.
