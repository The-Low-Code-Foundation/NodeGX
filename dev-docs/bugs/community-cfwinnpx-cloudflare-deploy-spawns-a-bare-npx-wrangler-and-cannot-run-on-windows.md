---
id: COMMUNITY-CFWINNPX
title: "`@nodegx/backend deploy cloudflare` cannot run wrangler on Windows: it spawns a bare `npx`, so step 5 fails with a blank reason and blames R2"
status: fixed
commit: 0b2d22df0
severity: high
regression: packages/nodegx-backend/tests/community-cfwinnpx-wrangler-on-windows.test.ts
area: "`packages/nodegx-backend/cloudflare/deployCloudflare.ts` `wranglerCommand` :406-416 and `wrangler` :418-424 (also the `dev` spawn :635), shipped in `@nodegx/backend`"
found: Community report via Richard, 2026-11-23, `npx @nodegx/backend@latest deploy cloudflare D:\marketplace` on Windows (cmd.exe)
evidence: "the user's output: `The bucket the-marketplace-files could not be made:` then an EMPTY line, then `(R2 must be enabled on the account; --no-bucket deploys without one.)`. Local reproduction of the mechanism: `spawnSync('npx-not-here', ['x'], {encoding:'utf8'})` → `{status:null, stdout:undefined, stderr:undefined, error.code:'ENOENT'}`, which `wrangler()` turns into `out: ''`, `status: 1`"
---

A Windows user runs the documented Cloudflare deploy. Steps 1 to 4 pass. Step 5 says the R2 bucket "could not be
made", gives no reason, and suggests R2 is not enabled. The real cause is that wrangler never started.

**Where.** `@nodegx/backend` does not depend on `wrangler`, so `wranglerCommand()` falls through to
`['npx', '--yes', 'wrangler@4']`. `wrangler()` passes that to `spawnSync` with no `shell`. On Windows npm's launcher
is `npx.cmd`. `spawnSync` cannot start a `.cmd` without a shell, so it returns `error: ENOENT` with no stdout or
stderr. `wrangler()` never reads `run.error`, so `out` is `''` and `status` is `1`. The bucket check then throws its
R2 hint over an empty reason.

**Every wrangler call fails the same way**, so `--no-bucket` does not help: `wrangler deploy` would fail with
"wrangler deploy failed (above)" and nothing above it. `deploy cloudflare --local` (`spawn(cmd, …)` at :635) fails
too.

This is the same mechanism as P78-D82 and P18-S104-PACKRUNTIMENPX (a bare `npx` spawn), in a third place. Unlike
those two, it reaches strangers, because it ships in the npm package.

**Workaround for a Windows user on `@nodegx/backend` before the release carrying 0b2d22df0** (point the deploy at a real wrangler, which `wranglerCommand` runs through
`process.execPath`):

```
npm install -g wrangler@4
wrangler login
set NODEGX_WRANGLER=%APPDATA%\npm\node_modules\wrangler\bin\wrangler.js
npx @nodegx/backend@latest deploy cloudflare D:\marketplace
```

**Proposed fix:**
1. On `win32`, run npx through node: `[process.execPath, path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'), '--yes', 'wrangler@4']` when that file exists. Otherwise use `shell: true` with quoted args. Spawning `npx.cmd` by name throws EINVAL on Node ≥18.20.2/20.12.2 (CVE-2024-27980).
2. In `wrangler()`, when `run.error` is set, put `run.error.message` into `out`. The bucket and deploy refusals then name the cause, and the R2 hint is printed only when wrangler actually ran and said so.
3. Sweep the rest of `cloudflare/` for the same spawn shape (`signInCommand.ts` already branches on `win32`).

**Fixed in 0b2d22df0.** `cloudflare/wranglerSpawn.ts` holds the choice (`wranglerCommandFor`) and the sentence
(`spawnFailure`). On win32 the last resort is `[node, …\node_modules\npm\bin\npx-cli.js, --yes, wrangler@4]`.
The file is looked for beside `node.exe`, else beside `npm_execpath`. If neither exists it is still a bare `npx`,
but its failure is now a sentence. The bucket step, `wrangler deploy`, `--local` (spawn's `error` event, which
had no listener) and the bin's `sign-in`/`whoami` all print "wrangler could not be started (<command>: ENOENT)"
and the NODEGX_WRANGLER way round. The R2 hint is printed only when wrangler ran. Not driven on a real Windows
machine: the test pins the command each platform gets, and reproduces the empty spawn result on this Mac.
**Released in `@nodegx/backend` 0.1.2, 2026-11-23** (`ed601bc13`, registry shasum `848c5bb63eb66a62f301090d324ef99483c4b7f9`,
the tarball tested). `npx @nodegx/backend@latest` serves it. The same fix reached `@nodegx/mcp` 0.2.12 and `create-nodegx`, `-vibe`, `-cline` 0.2.15 (which pin it) the same
day, as a hotfix on `release/kit-0.2.15` (`fee646302` = v0.4.5 plus `fa84ccd11`, this fix cherry-picked; registry
shasums match the tested tarballs). Folders made before keep the mcp version they pinned.
