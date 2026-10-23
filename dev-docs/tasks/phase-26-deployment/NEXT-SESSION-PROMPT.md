# Phase 26 — next session (BOARD lane 5, the VM push)

**Written 2026-10-23, after DEP-002 s3.** Read [BOARD.md](../../BOARD.md) §2 lane 5, then
[DEP-002](./DEP-002-LOCAL-FULLSTACK-BUNDLE.md) "Session 3". That section is the state; this page is the order of
work.

**Done:** s1, the backend serves the app on its own origin (`--serve-app`). s2, `nodegx-deploy --full-stack` writes
one folder (`app/`, `backend/`, `start.js`). s3, OWN-016's `ship-to-vm.sh` + `provision-app.sh` ship that folder to
a VM (`/opt/<app>`, data in `/var/lib/<app>/data`, Caddy proxies everything but the admin paths), graded in a
throwaway VM container. `start.js` gained `--data-dir` and `--check`, refuses dev-open rules, and installs the project's rules whenever a
deploy brings different ones (Richard's ruling, 2026-10-23; DEP-002 s3 "Ruled").

**P26-VMOPEN is closed:** lingo.nodegx.io ran with every access rule off. Richard switched them on
(2026-10-23, measured `enforced: true`), so it can be reshipped with the new scripts.

**Next, in order:**

1. **`deploy_to_vm` in `@nodegx/mcp`:** SSH to a host the person names, the folder as a service, the URL back. The two
   scripts are its spec. `dist/backend/folder/` already ships in the MCP's and the preview's prepack. Grade it
   against the container (DEP-002 s3 has the Dockerfile and run line). 🔴 SSH to a real server is classifier-refused;
   a local container is not.
2. **`nodegx deploy --full-stack`** at the front door (`nodegx-export/src/cli/args.ts` `parseDeploy`).
3. **The popup (step 6)**, three destinations. A packaged editor has no `package-deploy.js` or launcher on disk:
   `extraResources` beside `Resources/nodegx-backend/cli.js`.

**Traps:**
- The checkout's `noodl-editor/src/external/deploy` is from December. Drive with the runtime built into scratch
  (`OUT_PATH=<s>/eng/external npx webpack --config webpack-configs/webpack.deploy.prod.js` in viewer-react) and the
  engine at `<s>/eng/nodegx-deploy.cjs`. Backend and launcher: `node packages/noodl-mcp/build-backend-copy.mjs --out
  <s>/backend`, then `NODEGX_BACKEND_ENTRY=<s>/backend/cli.js`. The launcher is taken from beside `cli.js` FIRST:
  rebuild that folder after editing `start.js`. `ship-to-vm.sh` takes the engine as
  `NODEGX_DEPLOY_CMD="env NODEGX_BACKEND_ENTRY=… node <s>/eng/nodegx-deploy.cjs"`.
- `start.js` with no port takes the first free from 3000, and :3000 is OWN-026's. Pass `--port`.
- Shipping to the container adds `[127.0.0.1]:22722` to `~/.ssh/known_hosts`; remove it at teardown
  (`ssh-keygen -R '[127.0.0.1]:22722'`), with the container (`docker rm -f nodegx-shiptest`).
