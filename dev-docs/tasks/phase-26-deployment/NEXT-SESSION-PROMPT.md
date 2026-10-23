# Phase 26 — next session (BOARD lane 5, the VM push)

**Written 2026-10-23, after DEP-002 s1.** Read [BOARD.md](../../BOARD.md) §2 lane 5, then
[DEP-002](./DEP-002-LOCAL-FULLSTACK-BUNDLE.md) from "Session 1" down. That section is the state; this page is the
order of work.

**Done:** the backend serves a deployed app on its own origin (`node cli.js serve --serve-app <dir>`), driven on
the todo list across a restart. The deploy's `serve.js` refuses a NUL byte (P26-SERVENUL).

**Next, in order:**

1. **DEP-002 s2, the folder.** `scripts/package-deploy.js` supplies the backend artifact the deploy copies
   (one packaging path); the layout `app/`, `backend/cli.js`, `start.sh`/`start.cmd` (a Node ≥ 22.13 check with
   the version in the message; not port 8080); the project's `nodegx.security.json` carried beside the backend and
   passed as `--project-dir`; DEPLOY.md (`build/deploy-guide.ts`, PROGRESS D21) extended for the full-stack mode,
   leading with the 403 default; the permissions decision written down. Grade: deploy, `./start.sh` in a fresh
   shell with no `npm install`, the same drive as s1.
2. **The popup (step 6)**, three destinations, the two unbuilt ones naming DEP-003 and DEP-004/005.
3. **Then the lane's goal: `deploy_to_vm`**, an MCP tool over OWN-016's `ship-to-vm.sh` shape, the bundle and
   backend as one process behind Caddy (which also serves the no-domain case `CADDY=off` leaves unserved). Graded
   headless against a throwaway VM. 🔴 SSH that changes a server is refused by the auto-mode classifier; Richard
   runs it, or grants a rule.

**Traps from s1:** the checkout's `noodl-editor/src/external/deploy` was built before DEP-001, so a deploy made
from the checkout today does not read `nodegx-config.json`. Build the runtime into scratch with `OUT_PATH` and run
a copied engine (the recipe is in DEP-002 §s1 and the `l5-vm` memory). Never hold :3000 (OWN-026's lock).
