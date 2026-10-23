# Phase 26 — next session (BOARD lane 5, the VM push)

**Written 2026-10-23, after DEP-002 s2.** Read [BOARD.md](../../BOARD.md) §2 lane 5, then
[DEP-002](./DEP-002-LOCAL-FULLSTACK-BUNDLE.md) from "Session 2" down. That section is the state; this page is the
order of work.

**Done:** s1, the backend serves a deployed app on its own origin (`--serve-app`). s2 (`ca6aeb1fe`),
`nodegx-deploy <project> <out> --full-stack` writes `app/`, `backend/` (bundle, cloud functions, the project's
rules), `start.js`/`.sh`/`.cmd`, `MANIFEST.json` and a DEPLOY.md that leads with who can read the data. `data/` is
never written by a deploy. Packaged by `package-deploy.js`, so a credential in a cloud function refuses the deploy.
Driven on todo-list and members-area.

**Next, in order:**

1. **The lane's goal, on the folder.** `own-016/ship-to-vm.sh` ships the `--full-stack` folder whole instead of a
   site plus a loose `cli.js`; `provision-app.sh`'s unit runs `node start.js --port <p> --no-admin` (still
   loopback, Caddy in front), the function secrets stay in `/etc/<app>/secrets.env`, and with no domain the
   backend serves the site itself. Then `deploy_to_vm` in `@nodegx/mcp`: SSH to a host the person names, the
   folder as a service, the URL back. `dist/backend/folder/` already ships in the MCP's and the preview's prepack.
   Graded headless against a throwaway VM. 🔴 SSH that changes a server is refused by the auto-mode classifier;
   Richard runs it, or grants a rule.
2. **`nodegx deploy --full-stack`** at the front door (`nodegx-export/src/cli/args.ts` `parseDeploy`, its deploy
   manifest and `--force`; `app/` and `backend/` are replaced wholesale, so the stale-file sweep is not needed
   under them).
3. **The popup (step 6)**, three destinations, the two unbuilt ones naming DEP-003 and DEP-004/005. A packaged
   editor has no `package-deploy.js` or launcher on disk: `extraResources` beside `Resources/nodegx-backend/cli.js`.

**Traps:**
- The checkout's `noodl-editor/src/external/deploy` was built in December (no `serve.js`, no DEP-001). Drive with
  the runtime built into scratch (`OUT_PATH=<s>/eng/external npx webpack --config
  webpack-configs/webpack.deploy.prod.js` in viewer-react) and the engine copied to `<s>/eng/`. The backend and
  launcher: `node packages/noodl-mcp/build-backend-copy.mjs --out <s>/backend`, then
  `NODEGX_BACKEND_ENTRY=<s>/backend/cli.js`. The launcher is taken from beside `cli.js` FIRST, so rebuild that
  folder after editing `start.js`.
- `start.js` with no port takes the first free from 3000, and :3000 is OWN-026's. In a drive, pass `--port`.
- The engine specs refuse to run on a bundle older than their sources: `node packages/noodl-preview/build.mjs
  --deploy-only` after an edit (formatting counts).
