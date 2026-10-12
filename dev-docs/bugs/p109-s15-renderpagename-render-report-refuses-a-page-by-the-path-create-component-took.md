---
id: P109-S15-RENDERPAGENAME
title: render_report / drive_page refuse a page asked for by the path create_component took ("Pages/Garden") or by its title ("Garden"); only "/Pages/Garden" or its route resolve
status: fixed
commit: bf82671af
phase: P109
task: ISL-034
severity: low
area: mcp + render harness / page lookup (scripts/devtools/render-report.js `resolvePageRequest`, :961)
found: P109 ISL-017 AC5 s15, 2026-10-04 (Claude Code over the stdio server)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-017-THE-DOOR-INSTALLS-A-KIT.md §8 s15; ISL-034 §8 s39
regression: packages/noodl-editor/tests-unit/isl-034/resolve-page-request.test.ts
---

An agent created `create_component({ path: "Pages/Garden", type: "page" })` — the door registered it as the start page,
route `/` — then asked `render_report({ page: "Garden" })` and was refused: *"Cannot render the page "Garden": no page
registered at that path. Registered pages: / (/Pages/Garden)."* It recovered on the next call, from the message.

Reproduced with the harness's own resolver on the agent's project (s15):

| asked | answer |
|---|---|
| `"/"` | ✅ the Garden page |
| `"/Pages/Garden"` | ✅ |
| `"Pages/Garden"` — the exact `path` every authoring tool takes | ❌ refused |
| `"Garden"` — the page's title | ❌ refused |

One turn lost per agent that meets it. The fix is in `resolvePageRequest`: accept the authoring path without its leading
slash, and a page's title when exactly one page has it (refuse naming both when two do). The refusal already lists the
routes, so nothing is silently wrong today — it is friction, not a wrong render.

**Fixed 2026-10-10 (P109 s39, ISL-034, `bf82671af`) as proposed.** Re-measured first at `1d7bbf1bf`: the resolver still
compared the request against `/Pages/Garden` only and never read the title. Now it takes the authoring path without its
leading slash, and a title exactly one page has. A title two pages share is refused and both are named. Spec 5/5, and
HEAD's file fails the three new claims.
