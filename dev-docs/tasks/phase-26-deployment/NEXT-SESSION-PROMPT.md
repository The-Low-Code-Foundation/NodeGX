# Phase 26 — next session (BOARD lane 5, the VM push)

**Written 2026-10-23, after DEP-002 s4.** Read [BOARD.md](../../BOARD.md) §2 lane 5, then
[DEP-002](./DEP-002-LOCAL-FULLSTACK-BUNDLE.md) "Session 4". That section is the state; this page is the order of
work.

**Done:** s1, the backend serves the app on its own origin (`--serve-app`). s2, `nodegx-deploy --full-stack` writes
one folder (`app/`, `backend/`, `start.js`). s3, `ship-to-vm.sh` + `provision-app.sh` ship that folder to a VM
(`/opt/<app>`, data in `/var/lib/<app>/data`, Caddy proxies everything but the admin paths); a reship brings the
project's rules (Richard's ruling). **s4, `deploy_to_vm` in `@nodegx/mcp`**: the agent ships it in one call, graded by
17 unit rows and driven 5 of 5 through the MCP client against the throwaway VM. `provision-app.sh` now lives in
`packages/nodegx-backend/deploy/vm/` and ships in `dist/backend/vm/`.

**Later on 2026-10-23 (opennoodl-d7):**
- **Studio's Publish points at `deploy_to_vm`** (nodegx-studio STU-071, R10): Publish asks *where* (a folder, or a
  server of your own); the server path is a form (server, address, name, port, ssh key/port) and then
  `deploy_to_vm` through the MCP server. Gate `npm run check:server` 16/16. Its pinned `@nodegx/mcp` 0.2.2 has no tool
  and says so in words. A real ship from Studio waits on the release (item 1).
- **P26-SKELSHIP, `deploy_to_vm` half:** a project whose every page is still create_project's placeholder is refused
  before the box is touched; `allow_empty: true` ships it anyway. 🔴 Reshipping lingo (the OWN-016 fixture) needs
  `allow_empty: true` now. The engine half (`nodegx-deploy`, which Studio's folder Publish and `ship-to-vm.sh` use) is
  still open in the ledger.
- **NPMAUDIT-LOCALPATH fixed** (5e1535c59): a worktree build of `@nodegx/mcp` or `@nodegx/preview` no longer prints
  `../../../../OpenNoodl/…` or `/Users/…`, and both `prepack`s end with `check-pack-paths.mjs`. So the release in item 1
  can be built from a clean worktree (the recipe in P125's handoff) without leaking the machine.

**Next, in order:**

1. **Publish what a stranger needs.** `deploy_to_vm` from an npm install runs `npx @nodegx/preview nodegx-deploy`, and
   preview 0.2.4 predates `--full-stack` (measured), so it refuses. A preview and an MCP carrying s2–s4 is a
   release: Richard's call (lane 1 owns the publish and NPMAUDIT's rows; say so to him, do not publish).
2. **`nodegx deploy --full-stack`** at the front door (`nodegx-export/src/cli/args.ts` `parseDeploy`).
3. **The popup (step 6)**, three destinations. A packaged editor has no `package-deploy.js` or launcher on disk:
   `extraResources` beside `Resources/nodegx-backend/cli.js`.
4. **The runbook** a stranger follows (a VM from a provider, `ssh-copy-id`, DNS, then the agent's call), and a second
   provider. lingo.nodegx.io can be reshipped with `deploy_to_vm` by Richard (a real server is classifier-refused).

**Traps:**
- Driving: the checkout's `noodl-editor/src/external/deploy` is from December, so copy the engine beside a runtime
  built into scratch (recipe at the end of DEP-002 s4). Rebuild `<s>/backend` after editing `start.js` or
  `provision-app.sh`? Only `start.js`: the tool reads the provision script from the checkout under jest.
- The drive's first arm needs a container whose `authorized_keys` does NOT hold the key: start a fresh container
  every full run (`-t` runs one arm on a live one).
- `start.js` with no port takes the first free from 3000, and :3000 is OWN-026's. The tool always passes one.
- Teardown: `docker rm -f nodegx-shiptest`, `ssh-keygen -R '[127.0.0.1]:22722'`.
