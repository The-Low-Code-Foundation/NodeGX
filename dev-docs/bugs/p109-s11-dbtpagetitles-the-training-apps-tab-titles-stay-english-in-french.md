---
id: P109-S11-DBTPAGETITLES
title: The Digital Bricks Training app's browser-tab titles stay in English when the app is in French
status: scheduled
phase: P109
task: ISL-037
severity: low
area: templates / digital-bricks-training (and -demo), Page `title`
found: P109 ISL-007 s11, 2026-10-03 (the first run of the new `typed-word-not-translated` warning over the repository's translating projects)
evidence: packages/noodl-editor/tests-unit/isl-007/typedWordNotTranslated.test.ts "the DBT template: eleven page titles"
---

The training app translates its words with 131 `Translation` nodes and 8 Language Bundles, but each page's **Title**
(the browser tab's name) is typed: "Your course", "Coaching",
"Lesson", "People", "Your data", "Your settings", "Sign in", "Stop emails", "Lesson preview", "The lesson kit", and
the brand "Digital Bricks Training". A French learner's tab says "Your course". `templates/digital-bricks-training-demo`
carries 6 of the same. Ten of the eleven are words; the brand reads the same in every language.

**Reproduce:** the census in the spec above, or `validate_project` on the template once the MCP's `dist` carries the
rule (warnings `typed-word-not-translated` on `Page.title`).

**Proposed:** a key per page title in each bundle, a Translation per page wired into the Page's Title, made
where the template is generated. Its generator is not under `packages/noodl-mcp/tests` (searched 2026-10-03): find
the owner before editing the template's files by hand.

## s45 (2026-10-11): blocked on P109-S45-WIREDTITLE

Re-measured: the template still ships 11 typed titles; it ships one locale (English), and `Data/Strings`'
`str_locales` is an empty seam, so no learner reads an English tab in a French app today. What a person meets is the
editor's warning on each title. Building it as proposed would not work: the Router sets the tab from the router
index's typed title and never reads a wired one ([P109-S45-WIREDTITLE](p109-s45-wiredtitle-a-page-title-from-a-wire-never-reaches-the-browser-tab.md)).
Fix that first, then wire `t_<page>_title` Translations (keys beside each page's namespace in `str_graph`) and
regenerate the demo.
