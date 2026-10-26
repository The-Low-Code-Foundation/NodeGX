# BKO-001 — Workflows and triggers live in the project's files, and a backend is a copy of them

**Phase:** [127](README.md). **Ruling:** R1 (the files are the truth). **Packages:** `nodegx-backend`, `noodl-mcp`
(the tools, provision, `deploy_to_vm`, `what_changed_since`), `nodegx-preview` (`nodegx-deploy`'s ignores).

## The defect

An agent that adds "every morning at 9, send reminders" writes it to the running backend only
(`/admin/triggers` → the backend's `triggers.json`; `/admin/workflow-defs` → its `workflow-defs/`). The project does
not have it. So:

- it is not in git, and a teammate who clones the project does not get it;
- Studio cannot draw it from the project;
- a fresh backend provisioned from the project starts without it;
- a VM ship probably goes out without it. `deploy_to_vm` names the app, the backend, functions and rules. **Measure
  this first** and file it in `dev-docs/bugs/` as its own row if it holds.

## The shape (the security file's, kept)

`nodegx.security.json` already solved the same problem for rules (SB-015, `nodegx-backend/src/security/projectPolicy.ts`).
Reuse its decisions, not a new grammar:

1. **One file at the project root, in the backend's own shape:** `nodegx.automations.json` =
   `{ "workflows": [ <WF-001 definition>… ], "triggers": [ <WF-005 trigger>… ] }`. It is validated by the backend's own
   validators (the ones `workflow-defs/` and `triggers.json` load with), so there is one grammar and nothing to drift.
   The name is open until the first commit; `automations` is the word a person uses for both.
2. **No secret in the file.** A webhook's secret stays in the backend's `secrets.json`; the file references it by id
   (the convention `SecretsStore.ts:28` describes).
3. **A first start seeds from it** when the data dir has none, and refuses loudly on an invalid file, exactly like
   `applyProjectPolicy`. `--project-dir` already reaches the backend for this.
4. **Every write the agent makes goes to both**: `create_/update_/delete_backend_workflow`, `create_/update_/
   delete_backend_trigger`, `set_backend_trigger_enabled`. **Backend first** (it validates), then the file patched
   by id. If the file cannot be written, the backend is put back and the refusal is returned. This is the map's rule
   (`editor/lib/rules.mjs` `setTableRule`): both or neither. The file is created when the project has none.
4b. **Rules too** (found while scoping, P127-BKO001-BACKENDONLY): `set_collection_permissions` and its clear write
   only the backend, so an agent-built app has no `nodegx.security.json` (measured in OWN-026 test 2). They now patch
   the project's rules file by collection, the same way. Enforcement (`set_backend_enforcement`) stays a backend
   switch. It is not copied into the file, because `start.js` refuses a ship whose rules are switched off.
5. **Drift is said, not hidden.** An existing backend whose workflows or triggers differ from the file (made before
   this change, or edited on the admin page) is reported by `get_project_info` / `session_status` with both ways to
   agree, as Studio's Data tab does for a field.
6. **They travel.** `deploy_to_vm` and `nodegx-deploy --full-stack` ship the file and the target backend loads it.
   `what_changed_since` lists a change to it. The publish ignores that missed `nodegx.security.json`
   (P123-STU008-BACKENDPUBLIC) do not miss this file.

## Design decisions read from the code (s1)

- The file holds the backends' **write** shapes, not their stored ones: `WorkflowInput` (`workflow/types.ts`) and
  `TriggerInput` (`triggers/registry.ts`). Timestamps, `status` (last fired, fire count) and the routes' decorations
  (`effectiveOverlapPolicy`, `scheduleWords`) are left out, so a run never changes git.
- Seeding goes through `WorkflowRegistry.upsert` and `TriggerRegistry.upsert`, not a raw file copy. That way a
  webhook seeded onto a fresh backend gets a secret minted the way a new one does (`registry.ts:726`), and every
  definition is checked by the same validator. A seeded webhook's new secret is named in the start log, because the
  sender needs it. `update_backend_trigger` with `rotateSecret` is how the person reads one.
- A seed happens only when the backend has **no** workflows and **no** triggers. When both sides have some and they
  differ, that is drift, reported and never merged.
- The deploy follows `start.js`'s rules pattern: ship `backend/nodegx.automations.json`, decide install / replace /
  unchanged by checksum (`deployed-automations.json`), move the old `triggers.json` and `workflow-defs/` aside on
  replace, and let the backend seed from `--project-dir`.

## Acceptance

1. On the todo template copy, an agent creates a daily trigger and a two-step workflow through the MCP tools. Both are
   in `nodegx.automations.json` and on the backend, and `git diff` shows them.
2. A second backend provisioned from that project has both. Run the trigger's function by hand and it runs.
3. A write the backend refuses (an unknown step kind) leaves the file as it was.
4. A trigger with a webhook: the file holds no secret, and the secret is returned once, as today.
5. `deploy_to_vm` to the throwaway VM: the trigger and the workflow are listed on the VM's backend
   (`/admin/triggers`, `/admin/workflow-defs`). Read the VM ship's state before the change first, as the control.
6. A backend whose triggers were added by hand before this change: `session_status` names the drift and both fixes.
7. The test suites for `nodegx-backend` and `noodl-mcp` stay at their floors. New specs cover seed, both-or-neither,
   no-secret, and drift.

## Notes for the session that takes it

- Start by reading `projectPolicy.ts`, `config.ts:projectDir`, `provision.ts:493,865`, the `WorkflowSubsystem` and
  `TriggerSubsystem` loaders, and `deployToVm.ts`'s folder writer.
- The MCP tool surface has a token budget (memory: MCP 8,200 gate). The change should add no new tool. It changes
  what existing tools write.
- A new project file is read by the editor, Studio and the kit. Grep for `nodegx.security.json` readers, because each
  is a place the new file may owe a twin.

## Session log

### s1 (2026-10-26): built and graded; AC5 and AC6 open

| commit | what |
|---|---|
| `0275990c3` | nodegx-backend: `automations/projectAutomations.ts` (validate with the backend's own checks, seed through the registries' upserts, all or nothing, never into a backend with its own, drift as sentences); wired in `service.ts` at 2.61, before the scheduler starts |
| `6d64e5426` | noodl-mcp: `backend/projectFiles.ts` (`writeBoth`: backend first, then the file patched by id, the backend put back when the file cannot be written; only for the project's bound backend, and the answer's `project` field says which). Rules (`set_collection_permissions`, `reset_…`), triggers (create, update, enabled, delete) and workflows (create, update, delete). The pure shape moved to `automations/shape.ts`, because the validator reaches the workflow engine, which noodl-mcp cannot load. No tool description changed |
| `78b8a528e` | the deploy: `fullStack.ts` ships the file (`reading.automations`, reported by `deploy_to_vm`), `start.js` install / replace / unchanged / none by checksum (`deployed-automations.json`; replace moves `triggers.json` and `workflow-defs/` aside and keeps `secrets.json`), `--project-dir` when rules or automations install; the rules notice is silent when the two rule files are the same; `DEFAULT_IGNORE_ENTRIES` keeps the file off the public site |
| `8494038c5` | the preview engine's full-stack spec, run against an engine rebuilt from this checkout |

Graded: `p127-project-automations` 17/17 (mutant: seeding off = the service specs red); `p127ProjectFiles` 7/7
against a real backend (mutant: never the project's backend = 7/7 red); `dep-002-full-stack-folder` +
`sb015-project-policy` green beside them (60/60; mutant on `planAutomations` = 4 of 5 red, the "none" control green);
`dep-002-full-stack-deploy` 9/9; `deploy-ignores-backend-files` 5/5. Full noodl-mcp suite 4978/4995. The 12 red are the
same 12 with this change taken out (templates, Chrome drives, corpus counts: the checkout's own state that day).
Backend neighbours (sb015, triggers, workflow, scheduler, isl039, bmg-008) 428/428.

**Against the acceptance list:** AC1 ✅ (the MCP spec, a real backend: the file and `git diff` show them). AC2 ✅ in
parts: a started service seeds from the file, and provision passes `--project-dir` on every start
(`provision.ts:498`); not yet driven end to end with `provision_backend`. AC3 ✅ (both-or-neither spec; an unknown
step kind is refused by `refuseUnservedKinds` before anything is written). AC4 ✅ (no secret in the file; still returned
once). **AC5 open:** the VM ship is graded with `start.js`'s stand-in backend and the engine spec, not on the
throwaway VM. **AC6 open:** drift is computed (`diffAutomations`) and logged by the backend at start, but
`session_status` / `get_project_info` do not say it yet. AC7 ✅ above.

**What does not reach Richard yet:** Claude Desktop runs the `noodl-mcp` dist, and a provisioned backend runs the
backend bundle. Both need a rebuild from a clean worktree (the CCN rule) or a release before any of this is live
there. Ask before rebuilding the Desktop dist.

**A trap met:** `make-worktree.sh` symlinks a package's `dist/` to the primary checkout's, so `node build.mjs` in the
worktree wrote the PRIMARY `noodl-preview/dist/nodegx-deploy.cjs` from worktree sources (dropping a peer's uncommitted
validation edits from the bundle). It was rebuilt from the primary's sources at once (11:35). The memory line "BUILD→PRIMARY"
meant exactly this.

**Also not covered yet:** a proposal accepted in the old editor's Workflows panel, and an edit on the backend's
admin page, write the backend only. Both show up as drift once AC6 reports it.
