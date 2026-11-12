# Beta S3 — the Cloudflare deploy in the kit (notes for the merge; delete after)

## Proposed CHANGELOG lines (not written into CHANGELOG.md)

- **New package `@nodegx/backend` 0.1.0** (`packages/nodegx-backend-npm`): `npx @nodegx/backend deploy cloudflare
  <app folder>` puts a full-stack NodeGX app (pages, backend, rules, roles, cloud functions, schedules) on the
  person's own Cloudflare account, one Worker, the same `workers.dev` address every time, nothing wiped on a redeploy.
  `sign-in cloudflare` (wrangler's own sign-in: one browser Allow), `whoami cloudflare`, `domain …`. No esbuild and no
  NodeGX checkout on the person's machine: the Worker is prebuilt at pack time; the site is built by `@nodegx/export`'s
  `nodegx deploy` over `@nodegx/preview`'s production engine (both dependencies).
- **Kit (`create-nodegx`)**: a new skill, `nodegx-putting-it-online`, and one paragraph in CLAUDE.md / AGENTS.md
  naming it and the command. The practice round no longer says storing data on Cloudflare "doesn't work yet".
- **learn.nodegx.io** "Putting your app online": Cloudflare is the free route for an app that saves data.

## Publish order (Richard)

1. `@nodegx/backend` 0.1.0 first (`npm publish` in `packages/nodegx-backend-npm`; its prepack builds and runs
   check-pack-paths). Its dependencies `@nodegx/export@^0.2.5` and `@nodegx/preview@^0.2.8` are on npm already.
2. Then `create-nodegx` at the next lockstep cut (version bump + `npm run stamp`: `profiles/` changed).
3. Then the learn site (`nodegx-learn/deploy/deploy.sh`): its page names `npx @nodegx/backend`, which must exist first.

## Merge notes

- `package-lock.json`: two entries added by hand (the new workspace and its link); `npm ls --package-lock-only` reads
  them. No `npm install` was run.
- `packages/nodegx-backend/cloudflare/` is NOT edited (a peer phase works there). The pack reaches two private
  functions and the usage line by bundle-time rewriting (`build.mjs` `deployCopy`); `test/bin.test.js` fails if the
  anchors move. The cleaner seam (an exported `bundleWorker`, `NODEGX_CLOUDFLARE_WORKER` read by `buildWorker`) is
  the 46-line patch described in the S3 report, for the `cloudflare/` owner to take or leave.
- The practice-round hunk ends on the line above "`npx nodegx-deploy` writes the folder to upload": an edit to that
  line (S2's HTML export) will conflict by adjacency; keep both.
- `create-nodegx` tests 30 and 38 (`npm create nodegx-vibe` / `-cline` … pinned to the same version) fail in this
  worktree only: `node_modules/create-nodegx` links to the PRIMARY checkout's package, whose practice round is the old
  one. They compare the primary's file with this branch's.
