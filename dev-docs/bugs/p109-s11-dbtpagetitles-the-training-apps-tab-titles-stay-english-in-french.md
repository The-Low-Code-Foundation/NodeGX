---
id: P109-S11-DBTPAGETITLES
title: The Digital Bricks Training app's browser-tab titles stay in English when the app is in French
status: fixed
commit: e215a0452
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

## Fixed s46 (2026-10-11, `e215a0452`): the tab was already translated; the warning was the defect a person met

🔴 **The title above was never true of the tab.** Every page already translated it: a `Translation` (or, on `/learner`
and `/preview`, a computed value) fed a JavaScript node that called `Noodl.SEO.setTitle`, built in the source repo's
TASK-L161 precisely because the Router ignored a wired Title (CONVENTIONS said so). s45's re-measure counted the 11
typed titles and did not open the relays. What a person met was the editor's warning on each typed fallback.

With P109-S45-WIREDTITLE fixed (`edda6427b`), the eleven title sources are wired into the Page nodes and the eleven
relays are deleted; the typed Title stays as the fallback. The census in the spec above now reads `{}` (was 11);
`docs/CONVENTIONS.md` and `tools/check-strings.py` say how titles work now; the demo was regenerated (HEAD's builder
first, clean, as the control) and `check-demo.mjs`, `check-strings.py`, `check-learner-page.mjs` pass.

**Measured on the demo in a browser**, four arms, with four titles marked `[fr] ` in scratch copies so a wire and a
typed fallback read differently: HEAD's bundle with the relays (production today), the fixed bundle with the relays,
and the fixed bundle with the wires all read `[fr] Your course`, `[fr] Lesson`, `[fr] People`, `[fr] The lesson kit`;
the wires on HEAD's bundle read the typed English. So a site built on an engine older than `edda6427b` shows the typed
titles: the live demo's publish recipe swaps in the live site's `noodl.deploy.js`, which must carry the fix before the
demo is republished. `/learner`'s computed title did not fire in any arm (not graded).
