# ODT-003 — The build without a bundler on the person's machine

**Phase:** [135](README.md) · **Kind:** product · **Depends on:** ODT-000 (e) ✅ · **State:** 🔨 BUILT 2026-11-07
(session 4), graded on the installed extension's own Node, cloud bundler and engine (§3); the live redeploy through
it is Richard's command (§4).

## 1. What was missing

Claude Desktop's extension (the `.mcpb`, 217 MB) is `@nodegx/mcp` and `@nodegx/preview` with a Node binary: no npm,
no esbuild, no backend source, no `@nodegx/export` (README §3 row 1). The deploy (`deployCloudflare.ts`) has three
build steps; measured on the installed extension 2026-11-07:

| step | what it needs | in the extension? |
|---|---|---|
| 1. cloud functions | `cloud-bundle.cjs` (the editor's bundler; no esbuild inside) | ✅ `@nodegx/mcp/dist/cloud-bundle.cjs` |
| 2. the site | `nodegx deploy` (`@nodegx/export`) over `@nodegx/preview`'s engine | the engine ✅ (`NODEGX_DEPLOY_CLI` in its manifest, a **production** viewer, 1.81 MB); `@nodegx/export` ✗ |
| 3. the Worker | esbuild + `worker.ts` + the whole backend's source | ✗ |

## 2. What was built

Nothing in the Worker is the app's own: the app's code goes up as two modules of its own beside it (`printed-code.mjs`,
`app.mjs`; ODT-000 (e), live). So the Worker is built **once, when the package is packed**, by the deploy's own
function, and the deploy copies it.

| file | what |
|---|---|
| `nodegx-backend/cloudflare/deployCloudflare.ts` | the seam (`deployCloudflare-seam.patch`, taken): `bundleWorker(outfile, plugins, esbuild)` exported; `buildWorker` copies `NODEGX_CLOUDFLARE_WORKER` when set and says so; `wranglerCommand` exported; the usage line names `NODEGX_CLOUDFLARE_COMMAND`. The site: `nodegx deploy` when there is one, else the engine itself (`siteThroughEngine`, as `deploy_to_vm` runs it), keeping the two refusals `nodegx deploy` adds (a report not `ok`, a blank site) |
| `noodl-mcp/build-cloudflare-copy.mjs` | `dist/cloudflare/deploy.cjs` (0.22 MB) + `worker.mjs` (4.89 MB, 1.17 MB gzipped) + the backend's LICENSE; `@nodegx/mcp`'s prepack/postpack, `files` |
| `nodegx-backend-npm/build.mjs` | `@nodegx/backend`'s pack builds the same pair with it: the text rewrites, the esbuild alias and `src/prebuilt-worker.cjs` are gone; its bin calls `wranglerCommand` |
| `nodegx-backend/tests/p135-odt003-prebuilt-worker.test.ts` | 3 tests, 3 mutants caught (prebuilt ignored; blank site believed; the command route never giving way to the engine) |

**What ODT-004's tool sets** (the npm bin's `deployEnvironment` is the model): `NODEGX_CLOUDFLARE_WORKER` =
`<mcp>/dist/cloudflare/worker.mjs`, `NODEGX_CLOUD_BUNDLE` = `<mcp>/dist/cloud-bundle.cjs`, `NODEGX_DEPLOY_CLI` (the
manifest already sets it), then `require('<mcp>/dist/cloudflare/deploy.cjs').main(args)`. No `--viewer`: the
extension's engine carries the production viewer. Never `--local` (that is wrangler's workerd).

## 3. The grade (2026-11-07)

| reading | answer |
|---|---|
| the copied pair, the extension's Node (`node/bin/node`), its `cloud-bundle.cjs`, its engine, in a temp folder where `esbuild` does not resolve: dry run of Fixture C | ✅ exit 0, 27 files, 7.82 MB, the site from the **production** viewer; `dist/` = `worker.mjs` (byte-identical to the prebuilt) + `app.mjs` + `printed-code.mjs` |
| the checkout's route (`deploy.mjs`, bundles) and `@nodegx/backend`'s bin (prebuilt), same fixture | ✅ both 27 files; the checkout's Worker = the prebuilt once module path names are normalised (0 lines differ) |
| the Worker's imports | ✅ `./app.mjs` and `./printed-code.mjs`, nothing else |
| `check-pack-paths` (mcp, backend) | ✅ no machine path |
| suites | ✅ P135 + P115 deploy suites **96/96**; `@nodegx/backend` `node --test` 3/3 |
| `@nodegx/mcp` tarball | **+5.1 MB unpacked** (deploy 221 KB, Worker 4.9 MB, LICENSE): the `.mcpb` 217 → ~222 MB (P135 AC6). esbuild shipped instead would be a native binary per platform |

## 4. The live grade (Richard's commands; the session reads the result)

The prebuilt Worker has not yet answered on Cloudflare. Redeploying `hst-campus` with **only** the extension's Node,
cloud bundler and engine plus the two new files is the extension's route, minus the MCP tool (ODT-004). Baseline
read by session 4 at 23:0x CET: 14/14, 2 answers, deploy 6 (`via: api`, 21:46:39Z).

From the repo root (the kit was built by session 4 in its scratchpad; any `node build-cloudflare-copy.mjs --out <dir>`
plus the extension's `cloud-bundle.cjs` and `package.json` is the same):
```
node dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/check-campus-deploy.mjs ~/.nodegx/cloudflare/hst-campus --upload
EXT="$HOME/Library/Application Support/Claude/Claude Extensions/local.mcpb.the-low-code-foundation.nodegx"
K=<the kit>
(cd "$K" && NODEGX_CLOUDFLARE_WORKER="$K/worker.mjs" NODEGX_CLOUD_BUNDLE="$K/cloud-bundle.cjs" \
  NODEGX_DEPLOY_CLI="$EXT/studio/node_modules/@nodegx/preview/dist/nodegx-deploy.cjs" \
  "$EXT/node/bin/node" -e "require('./deploy.cjs').main(process.argv.slice(1)).then(c=>process.exit(c))" \
  "$PWD/dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/c-campus" --name hst-campus)
```
Expect step 3 to read *"the prebuilt Worker (nothing bundled on this computer)"* and step 5 *"through its API"*. The
session then runs the checker with `--file <the path the upload printed>`.

| reading | answer |
|---|---|
| the redeploy through the kit | ⏳ |
| `check-campus-deploy.mjs … --file …` after | ⏳ |

## 5. Acceptance

1. ✅ A deploy runs where no esbuild resolves and no backend source exists, with the extension's own Node, bundler and
   engine (§3; test 1).
2. ✅ The Worker is built once by the deploy's own function; the checkout, `@nodegx/backend` and `@nodegx/mcp` ship the
   same one (§3).
3. ✅ The engine's refusals stop the deploy when it is run without `nodegx deploy` (test 3).
4. ✅ The size it adds is written down (§3).
5. ⏳ A live redeploy through the kit keeps every account, record and file (§4).
