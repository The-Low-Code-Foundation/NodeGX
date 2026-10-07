# ISL-042 — A cloud function deploys, runs, and says when it will not

**Status: ⬜ not started. Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 5 bugs
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
