---
id: BETA-S3-ADMINBUILD
title: "cloudflare deploy from a checkout: on a checkout or worktree where the backend was never built, step 3 dies with esbuild's 'Could not resolve ../../build/admin/tokens.css', not a sentence"
status: open
severity: low
area: "`packages/nodegx-backend/cloudflare/deployCloudflare.ts` `buildWorker` (the checkout path only; `@nodegx/backend` ships the Worker prebuilt)"
found: Beta sprint row S3, 2026-11-07, measuring the import graph of `cloudflare/*` in the `beta-s3` worktree
evidence: "esbuild of `cloudflare/worker.ts` with the backend's `shared` settings: `src/admin/AdminDashboardRoutes.ts:90` cannot resolve `../../build/admin/tokens.css` and `:92` `../../build/admin/app.js.txt`"
---

The Worker inlines the backend's admin dashboard, which `scripts/build-admin-app.js` writes into the gitignored
`packages/nodegx-backend/build/admin/`. `buildWorker` bundles `worker.ts` without running it first, so on a fresh
checkout or worktree (no `npm run build` in the backend yet) `node packages/nodegx-backend/cloudflare/deploy.mjs …`
gets through steps 1 and 2 and then throws esbuild's two resolve errors.

Not a stranger's path: `@nodegx/backend`'s pack runs `buildAdminApp()` before it builds the Worker (`build.mjs`).

Fix (the deploy owner's, `cloudflare/` is a live phase): call `buildAdminApp()` in `buildWorker` when
`build/admin/app.js.txt` is absent, as `packages/noodl-mcp/build-backend-copy.mjs` does, or refuse with the command
to run.
