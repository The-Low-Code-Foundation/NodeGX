# ISL-042 — A cloud function deploys, runs, and says when it will not

**Status: ✅ s42 (2026-10-11): closed — 5 of 5 fixed, each re-measured first (all five still fired) and graded with a control: SECRETSCAN `ac78efb4b`, D84 `ba530fd11`, SUCCESS `b978cf353`, BUNDLEWIRES `65394174a`, R10 `535bd63d0`. Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 5 bugs
from the ledger (`dev-docs/bugs/`) that no phase owned: 3 high · 2 medium. **Side:** package-deploy secret scan, the headless cloud-function bundler (noodl-mcp deploy_cloud_functions), workflow bundle validation, the editor validator, the cloud-component → MCP tool description

## 1. The person sentence

**A backend with cloud functions builds and deploys, a function wired so it can never fire is refused before it ships, and each function's MCP tool says what that function does.**

## 2. Why these belong together

The road from a cloud function in the editor to a running endpoint. The secret scan refuses every backend build because of the backend's own placeholder text. The headless bundler fails when loading the project logs a line. A function wired from `success` passes validation and never fires; a bundle whose wires reach nothing loads clean and every call hangs 30 seconds. Every cloud component's MCP tool carries the same generic description.

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix. This table is
generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P78-DBT-SECRETSCAN](../../bugs/p78-dbt-secretscan-package-deploy-s-secret-scan-refuses-every-backend-build-on-its-own-placeholder.md) | high | scheduled | package-deploy's secret scan refuses every backend build because of the backend's own error-message placeholder |
| [P78-D84](../../bugs/p78-d84-the-headless-cloud-bundler-fails-when-the-project-s-load-logs-a-line-fix-uncommitted.md) | high | scheduled | The headless cloud-function bundler fails when loading the project logs a line (the fix is uncommitted) |
| [P99-HLT016-SUCCESS](../../bugs/p99-hlt016-success-a-cloud-function-wired-from-success-validates-clean-and-never-fires.md) | high | scheduled | A Cloud Function wired from `success` passes validation with 0 errors and never fires |
| [P78-DBT-BUNDLEWIRES](../../bugs/p78-dbt-bundlewires-a-function-bundle-whose-wires-reach-nothing-deploys-clean-and-hangs-30-seconds.md) | medium | scheduled | A function bundle whose wires reach nothing deploys and loads clean, and every call hangs 30 seconds |
| [P96-FED005-R10](../../bugs/p96-fed005-r10-a-cloud-component-s-description-never-reaches-its-mcp-tool.md) | medium | scheduled | A cloud component's description never reaches its MCP tool, so every tool says "Run the cloud function X" |

## 4. Order of work

SECRETSCAN and D84 first (they stop every deploy). Then SUCCESS and BUNDLEWIRES (silent dead functions). Then R10.

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line, and this task was written
  from the ledger without re-running them. Re-run each reproduction at HEAD before building. A row that no longer
  reproduces is closed in the ledger with the commit that fixed it, not fixed again.
- **A control on every fix:** the old code red on exactly the fix's arms.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:`).

## 6. Related work and collisions

- 🔴 **D84 says its fix is uncommitted.** Find that pile before writing a fix (memory: *a loose pile may be live*). Read its task file and the mtimes.
- R10 is P96 FED-005's door; SUCCESS is the editor validator P99 found it in.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled (none today).
- **AC3** — every row ruled or written "as proposed" is fixed, one commit each (or one per shared mechanism), with its
  regression green.
- **AC4** — `node scripts/bugs.js` lists none of this task's rows as `open`, `scheduled` or `needs-ruling`.

## 8. Record

### s42 (2026-10-11) — 5 of 5

**AC1:** every row re-measured at HEAD before building, and all five still fired. D84 did **not** reproduce on its
named fixture (d40's load rewrites nothing, so nothing logs); it did on a format-4 project the migration rewrites.

| row | commit | what changed | graded by |
|---|---|---|---|
| SECRETSCAN (high) | `ac78efb4b` | the storage URL example reads `USER:PASS`; `build.js` exports its config | `nodegx-backend/tests/isl042-secretscan.test.ts`: bundles the service to a temp dir and runs the packager's scan; red on the old text, planted known-firing arm |
| D84 (high) | `ba530fd11` | `src/childLogsToStderr.js`, loaded first by the cloud bundler and the kit extractor (adopts the 2026-09-26 pile); `build-cloud-bundle.mjs` + `build-common.mjs` | `noodl-mcp/tests/isl042ChildStdout.test.ts`: both children built from source; red 2/2 with HEAD's entries |
| SUCCESS (high) | `b978cf353` | `nonexistentPort` errors on a Cloud Function port the runtime never mints (`cloudFunctionCanMint` in `derivedPortTargets.ts`) | `noodl-mcp/tests/isl042CloudFunctionPorts.test.ts` via `validate_component` and `create_component`; red 3/3 |
| BUNDLEWIRES (medium) | `65394174a` | `workflow/bundleWiring.ts`: deploy refuses on-disk wire spelling (400), warns on an undeclared helper port; start logs both | `nodegx-backend/tests/isl042-bundle-wires.test.ts`; red on its 2 fix arms |
| R10 (medium) | `535bd63d0` | the cloud bundle carries `description`; the MCP tool leads with it; DBT's deploy tool carries it | backend + door specs, each red on its description arm |

**Corpora (false positives):**
- SUCCESS: 24 v2 projects on this machine with a Cloud Function, saved ports stripped so every wire was judged, gave
  0 new errors on 296 `out-*` / `in-*` wires.
- BUNDLEWIRES: the same projects' real bundles (built by the current cloud bundler) gave 0 refusals and 0 warnings
  over 2,900 wires and 20 helper instances. On d40's bundle, emptying the helpers' ports gave 4 warnings and
  respelling one wire gave 1 refusal.

**Where the ledger or the plan was wrong:**
- **SUCCESS's resolving half already existed.** DEF-002's `connection-unknown-derived-port` checks `out-x` / `in-x`
  against the called function on the write path. A first version re-resolved them in `nonexistentPort` and was cut
  as a second pipeline for one fact. Left open, not built: that check runs on writes only, so `validate_project` on a
  project already on disk does not flag an undeclared `out-x`.
- **R10's fix is not in `exportComponent`** as the ledger proposed: that function also builds the public frontend,
  and a page's description would have shipped to every visitor. It is in `buildCloudBundleParts`.
- **The shipped MCP door still runs the old children** (`dist/`), until `P109-S36-STALEMCPDIST` (Richard's rebuild).
