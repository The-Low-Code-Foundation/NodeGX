# Phase 26 — next session (BOARD lane 5, the VM push)

**Written 2026-10-23, after DEP-002 s4.** Read [BOARD.md](../../BOARD.md) §2 lane 5, then
[DEP-002](./DEP-002-LOCAL-FULLSTACK-BUNDLE.md) "Session 4". That section is the state; this page is the order of
work.

## 2026-10-24 (opennoodl-d7): published, and driven from npm

**Item 1 below is done.** Richard published 0.2.6 on 2026-10-23 night: `@nodegx/mcp` 0.2.6, `create-nodegx` 0.2.6,
`@nodegx/preview` 0.2.5 (its tarball carries `--full-stack`: `dist/backend/folder/start.js`, `dist/backend/vm/provision-app.sh`),
`@nodegx/backend-map` 0.1.1.

**The stranger's path, driven** against the throwaway VM (image `nodegx-shiptest-vm`, a fresh container, my own key
added with `docker exec -i`): `@nodegx/mcp@0.2.6` installed from npm into an empty folder, a fresh HOME, no checkout, no
`NODEGX_DEPLOY_CLI`; a copy of `templates/todo-list` at HEAD; a stdio MCP client calling `find_tools` then
`call_tool(deploy_to_vm)`:
- **ship, no domain:** 29.4 s, `engine: "npx"` (the engine fetched by npx), 23 files, the project's rules installed
  (SB-015, `devOpen: false`), health 200, app 200. On the box: unit active; sign-up 201 with a session; a task with that
  session 201; a visitor's `_User` 403 and `Task` "Permission denied".
- **reship with `domain: shiptodo.localhost`:** 6.9 s, rules "unchanged", `url: https://shiptodo.localhost`, Caddy
  answers https 200 (`--resolve …:8443`), the account logs in and its task is still there.
- **a folder name with a space** ("Studio Todo"): shipped, 8.8 s.
- **Studio's Publish → a server of your own** (`publishToServer`, nodegx-studio): shipped with node on PATH (8.8 s);
  **refused in 0.4 s with Finder's PATH** ("The deploy engine (npx) gave no report", P123-STU071-NONPX); fixed in
  nodegx-studio ce96af6 (Studio hands the server its own engine), then shipped in 6.4 s, `engine: "env"`.
- Teardown done (`docker rm -f nodegx-shiptest`).

**Next for lane 5:** (a) a real provider, by Richard (the classifier refuses a real server from this side): the runbook
[YOUR-OWN-SERVER.md](../../../docs/runtime/YOUR-OWN-SERVER.md) followed by someone who is not us; (b) `nodegx deploy
--full-stack` at the front door (item 2); (c) the popup (item 3); (d) OWN-016 AC2, the shipped app on Richard's phone.
`deploy_to_vm`'s npx fallback could say "no npx on this PATH" instead of "gave no report" (noted in NONPX).

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

**The npm 0.2.6 cut, packed 2026-10-23 night (opennoodl-d7), waiting on Richard's publish.** Richard: "yes" to the
release. Prep `71af37b55` + `b7deafca0` (versions, pins, lockfile, CHANGELOG "npm packages 0.2.6"); packed in a clean
worktree at the pushed `3055514b7` under HEAVY.lock, its linked `dist/` entries replaced by real folders first.
`check-pack-paths` stopped the first two packs (the backend bundle and the render harness still leaked worktree
paths; fixed in `eeb51872a` and `3055514b7`). Tarballs in
`/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/npm-0.2.6-tarballs/`:

| tarball | shasum (sha1) | bytes |
|---|---|---|
| `nodegx-preview-0.2.5.tgz` | `bc475e0b8d9bec5fb1875fbfb76784cf9705cb3b` | 6,099,108 |
| `nodegx-mcp-0.2.6.tgz` | `5c72a6373fffa5ebc8e333d3c3aafd6caa001124` | 12,199,457 |
| `create-nodegx-0.2.6.tgz` | `1aa0576e97c05946bcb344383d2bc67d35d59754` | 43,135 |
| `create-nodegx-vibe-0.2.6.tgz` | `5fb41aeacc1a827795965bab674ed6eb8d2bc818` | 13,641 |
| `create-nodegx-cline-0.2.6.tgz` | `54a7f38d7c90932542914abf968ac1cf09ce0e45` | 13,967 |

Smoke from the tarballs, empty HOME, outside the checkout, on a copy of the todo-list template: `nodegx-deploy
--full-stack` exit 0 (app/, backend/ with LICENSE, app/NODEGX-LICENSE.txt); `node start.js --port 8797` health 200,
app 200, the licence file 200, a sign-up 201, a clean stop; `@nodegx/mcp --version` 0.2.6, `--graph` exit 0
(10,419 lines), `deploy_to_vm` in the bundle, `dist/backend/` holds LICENSE, cli.js, folder/, vm/; `create-nodegx
my-apps` exit 0 pinning `@nodegx/mcp@0.2.6`. `publishable.js` 6 packages / 0 problems; `bugs.js gate core` 0
blockers. **Richard's terminal (2FA):** `scripts/own/publish-npm.sh
/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/npm-0.2.6-tarballs` (preview before mcp, so
`deploy_to_vm`'s `npx @nodegx/preview@latest` finds `--full-stack`), and `@nodegx/backend-map` 0.1.1:
`cd dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor && npm publish --access public`. After: `npm view`
each shasum against the table; nodegx-studio's pins to `@nodegx/mcp` 0.2.6, `@nodegx/preview` 0.2.5,
`@nodegx/backend-map` 0.1.1, `npm run vendor`, every gate; the changelog page (nodegx-web's deploy, Richard's
rsync). Not driven: `deploy_to_vm` from the npm install against a server (the throwaway VM recipe above).

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
