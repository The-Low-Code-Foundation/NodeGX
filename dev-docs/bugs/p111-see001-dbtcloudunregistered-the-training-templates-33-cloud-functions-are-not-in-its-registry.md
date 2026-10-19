---
id: P111-SEE001-DBTCLOUDUNREGISTERED
title: "The training template's 33 cloud functions are on disk but not in its registry, so the MCP cannot see them"
status: fixed
severity: medium
area: templates / digital-bricks-training (`components/_registry.json`); mcp / every component read (`V2ProjectStore.resolve`, `portProjectFromStore`)
found: P111 SEE-001 s1, 2026-10-19
evidence: dev-docs/tasks/phase-111-you-can-see-what-it-built/SEE-001-THE-HONESTY-NUMBER.md §7 (session 1)
regression: packages/noodl-mcp/tests/see001Honesty.test.ts
---

`templates/digital-bricks-training/components/` holds 82 component folders. Its `_registry.json` lists 49 of them.
The 33 it leaves out are all of `__cloud__/…`: the template's cloud functions (`saveLessonDraft`, `publishLesson`,
`copyLesson`, `shared/Programme`, …), written by the template's own tools in commit `0e8254baf` and earlier, and
deployed by `tools/deploy-functions.mjs`, which reads the folders. Every other template registers its cloud components
(gram 15, marketplace 21, members-area 8).

What a person sees: an agent connected to this project over MCP reads an app of 49 components (measured: the MCP's
project read, `portProjectFromStore`, returns 49). Read from the code, not driven: `list_components` lists the registry
and `get_component("__cloud__/saveLessonDraft")` resolves through the registry only
(`packages/nodegx-project-contract/format/store.ts` `resolve`), so neither reaches the cloud functions. Two of
the template's three largest Functions (`Rows → the programme`, 540 lines; `saveLessonDraft`, 368 lines) live in those
components. The honesty number differs by surface for this reason alone: the census (which reads the folders) says
**67.0%** known (578 known, 285 script); the MCP (which reads the registry) says **66.0%** (475 known, 245 script).
Not measured: whether the editor's importer also leaves them out.

The regression spec's AC1 asserts the gap is exactly these 33 `/#__cloud__/` components, so it goes red when they are
registered; the assertion then becomes "the MCP equals the census".

Proposed fix (small): add the 33 entries to the template's `_registry.json` (`type: "cloud"`, node and connection
counts), or make the template's tools register what they write. Then re-run `node scripts/see/census.js --check` (it
holds: the census reads the folders) and update `see001Honesty.test.ts`'s AC1 to equality.

**Fixed 2026-10-19:** the 33 `__cloud__/…` components are registered (`type: "cloud"`, node and connection counts read
from each folder, as members-area's are). `see001Honesty.test.ts`'s AC1 now asserts that all 82 are registered and that
`get_project_info` equals the census (7 / 7); it was red on the change before the assertion was rewritten. The honesty
ledger holds; the census moves only by the registry file's bytes; the templates' export gate holds (3 / 3). The editor
reads the same registry, so it should now show 67%; not driven again.

