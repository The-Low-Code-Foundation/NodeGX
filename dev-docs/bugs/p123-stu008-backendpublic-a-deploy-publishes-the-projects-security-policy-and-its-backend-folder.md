---
id: P123-STU008-BACKENDPUBLIC
title: "A deploy publishes the project's `nodegx.security.json` and its `backend/` folder (seed data, fixtures, proposed triggers) to the public site"
status: open
severity: medium
area: deploy / default ignore rules (`packages/noodl-editor/src/editor/src/utils/compilation/build/ignore.ts` `DEFAULT_IGNORE_ENTRIES`, shared by the editor's Deploy and the npm engine `@nodegx/preview/dist/nodegx-deploy.cjs`)
kit: preview
found: P123 → NodeGX Studio STU-008 (Publish), 2026-10-20
evidence: ~/vscode_projects/nodegx-studio docs/SCOPE.md "Done (STU-008)"
---

A person publishes an app and its access rules and backend files go out with it. With `@nodegx/preview` 0.2.3's
engine (`node dist/nodegx-deploy.cjs <project> <out>`), measured 2026-10-20:

- the todo-list template's copy: `written` holds `nodegx.security.json`, the whole access policy (which collections
  anyone, a signed-in user or nobody may find, get, create, update and delete). The runtime does not read it: 0
  occurrences of `nodegx.security` in `external/deploy/noodl.deploy.js` or in the engine. The backend reads it from the
  project folder (`--project-dir`), never from the site.
- an app the Studio importer made from its backend-workflows fixtures: `written` also holds
  `backend/triggers.imported.json`, the triggers it proposes for the backend.
- `templates/digital-bricks-training` keeps its `backend/` (seed, fixtures, production config) out only because it
  ships its own `.noodlignore`. Task L183 measured the leak on 2026-09-30 (*"without this file a production build
  shipped backend/ (the demo world's seed and fixtures, the trainer's private labels included)"*) and fixed that
  template only. `templates/gram/backend/schema.json` and `templates/learn-with-simple-rick/backend/` have no such
  file.

This is the same kind of leak as P112-S13-AGENTFILES (fixed: `.mcp.json`, `CLAUDE.md`, `AGENTS.md`, `.claude/` are
now defaults), and the defaults already keep `docs/` and `nodegx.project.json` out as project source.

**Reproduce.** Copy `templates/todo-list`, run `node packages/noodl-preview/dist/nodegx-deploy.cjs <copy> <out>` (or
`npx -y --package @nodegx/preview nodegx-deploy`), and read `written` in the JSON report: `nodegx.security.json` is in
it, and `<out>/nodegx.security.json` is the policy.

**Proposed fix (small).** Add `nodegx.security.json` ("the backend's access policy: read by the backend from the
project, not by the app") and `backend/` ("the backend's own files: schema, seed data, fixtures, triggers") to
`DEFAULT_IGNORE_ENTRIES` with those reasons. Add a regression beside
`tests-unit/p112/deploy-ignores-agent-files.test.ts`. A project that does want one published can still say so in
its `.noodlignore` (`!backend/x`). NodeGX Studio's Publish runs this engine and inherits the fix when `@nodegx/preview`
is next published. Until then it reports these files to the person when the site carries them.

**Fixed 2026-10-22** (P26 session, at Richard's go-ahead). `/nodegx.security.json` and `/backend/` are in
`DEFAULT_IGNORE_ENTRIES` for every project, legacy and v2. They are **anchored to the project root**, so an
asset folder that happens to be called `backend` deeper down still ships. Regression:
`packages/noodl-editor/tests-unit/p123/deploy-ignores-backend-files.test.ts`.

⚠️ The proposal's opt-in was wrong in one detail. `!backend/x` does **not** re-include a file: the dialect is
gitignore's, and a negation cannot reach under an excluded folder. A project that wants them published writes
`!/backend/` (and `!/nodegx.security.json`), and the test pins both readings.

A folder deployed before this still holds the files. The next deploy into it reports them as excluded paths that
already exist, because a deploy never deletes them; they have to be removed by hand, and from any host they were
uploaded to.

