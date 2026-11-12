---
id: P112-OWN026-ROUTEPARAMNOTDONE
title: render_report says "NOT DONE … Fix them and render again" for pages whose address takes a parameter, which aren't broken
status: fixed
severity: medium
area: mcp / render_report (render grading, unreachable pages)
kit: mcp
found: P112 OWN-026 Mistral lab, 2026-10-25 (the render-proof mock on t2-nodegx-c03's project)
evidence: /Users/Shared/nodegx-lab/own026-mocks/mistral-render/t2-nodegx-c04-tap/ (the render_report result); dev-docs/tasks/phase-112-your-own-nodegx/own-026/MISTRAL-PLAN.md §6
commit: fix(p112-own026-routeparamnotdone), 2026-10-25
regression: packages/noodl-mcp/tests/vib007RenderGate.test.ts "does not make a clean render NOT DONE, and is still named with the tool that reaches it"
---

An app whose pages take a route parameter (`game/{childId}/{tables}`, `race/{childA}/{childB}/{tables}`,
`tables/{childId}`) gets this as the first line of every `render_report`:

```
NOT DONE — 3 routed pages nobody looked at: /Pages/Table Picker (its urlPath "tables/{childId}" takes a route
parameter, which this harness has no value for); … Fix them and render again.
```

The pages aren't broken. The harness can't supply a parameter (`render_report` has no argument for one), so nothing
the agent changes in those pages can turn this into DONE. The only way out the message offers, "Fix them", is a
change to a working design, or another render that says the same thing. `drive_page` can reach those pages by
tapping through from a page without parameters, and the message doesn't say so.

Seen by Mistral Large 4 (t2-nodegx-c03, blind run): it read the same line from three renders. The grading tests
already pin the reason text (`nodegx-export/tests/hls007-render-grading.test.ts:111`,
`noodl-editor/tests-unit/el-009/page-selection.test.ts:107`); only the verdict and the instruction are wrong.

Fix, small: for a page left out only because of a route parameter, don't count it towards NOT DONE. Say "not
rendered (needs a parameter): drive_page can reach it by tapping from <a page that links to it>". Larger: let
`render_report` take example parameter values per page.

## Fixed (2026-10-25)

`renderVerdict.ts` keeps a page left out only because its `urlPath` takes a parameter (render-report.js's own test,
`/[{}]/`) in its own list, `parameterPages`. It no longer counts towards NOT DONE; every verdict, done or not, names it
and the tool that reaches it:

```
Rendered, and the render is clean. 1 page takes a route parameter, so this render could not open it: /Pages/Table
Picker ("tables/{childId}"). Nothing is wrong with it for that, and it does not block; prove it with drive_page — tap
through from the page that opens it, or a {navigate: "/tables/<a real childId>"} step.
```

(`drive_page`'s `navigate` step goes to any address without checking the router, so the second route is real.) Every
other unmeasured page still blocks, and the control test pins that a parameter page beside one stays NOT DONE with
only the other page as the fix. Write doors' completion payloads carry the list as `pagesNeedingARouteParameter`.
Not done: the larger fix (`render_report` taking example values per page).
