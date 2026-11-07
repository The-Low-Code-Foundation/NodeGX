# ODT-002 — The deploy through Cloudflare's API

**Phase:** [135](README.md) · **Kind:** product · **Depends on:** ODT-000 (c) ✅ · **State:** 🔨 BUILT 2026-11-07
(session 3), graded on a scripted Cloudflare; **the live redeploy (§4) is Richard's command**, because the classifier
refuses a session's live writes to his account (P115 sessions 13–15).

## 1. What

P115's deploy put the app up with `wrangler deploy`, which Claude Desktop cannot run (no npm, no wrangler; README §3),
and Richard ruled R3 on 2026-11-07: **the API, wrangler does not ship** (*"370MB extra is a lot"*). So step 5 of
`deployCloudflare.ts` now goes through Cloudflare's API whenever this computer holds NodeGX's own sign-in (ODT-001),
with the calls `probeWrites.ts` made live in ODT-000 §5.

| file | what |
|---|---|
| `packages/nodegx-backend/cloudflare/deployApi.ts` | `deployThroughApi` (the upload) and `chooseRoute` (API or wrangler, and why) |
| `packages/nodegx-backend/cloudflare/deployCloudflare.ts` | step 5 picks the route; `--wrangler`, `--account`; wrangler's path kept as `wranglerDeploy` |
| `packages/nodegx-backend/tests/p135-odt002-deploy-api.test.ts` | 17 tests on a scripted Cloudflare that keeps state between deploys |

## 2. The calls (all made live by `probeWrites.ts`, ODT-000 runs 3–4, unless marked)

| # | call | when |
|---|---|---|
| 1 | `GET /accounts` | no `--account` / `CLOUDFLARE_ACCOUNT_ID`; two accounts or more ⇒ refused, listed |
| 2 | `GET /accounts/{a}/workers/subdomain` | always; none ⇒ refused in words (the dashboard asks for one once) |
| 3 | `GET /accounts/{a}/workers/scripts` | always: is the Worker there, its `migration_tag` (wrangler reads the same list). Read live by `sign-in.mjs probe` (200, 6 Workers, ODT-000 (c) reads); whether it carries `migration_tag` was not recorded: the code does not depend on it (§3) |
| 4 | `POST /accounts/{a}/r2/buckets` | the Worker is new, or the record says first deploy; "already exists" (10004 / 409) is fine |
| 5 | `POST …/scripts/{n}/assets-upload-session` | always: the manifest; Cloudflare answers with the files it lacks |
| 6 | `POST …/workers/assets/upload?base64=true` | one per batch Cloudflare names, each with the SESSION's jwt; the last answer (201) carries the completion jwt |
| 7 | `PUT …/workers/scripts/{n}` | the modules in `dist/` (main first) and the metadata below |
| 8 | `PUT …/scripts/{n}/secrets` | only `--new-admin-credential` on a Worker that is there. ⚠ unmade by the probe |
| 9 | `POST …/scripts/{n}/subdomain` | always: workers.dev on |
| 10 | `GET`/`DELETE …/workers/domains` | the record had a domain this deploy no longer names: detached from THIS Worker only. ⚠ unmade by the probe |
| 11 | `GET /zones?name=…`, `PUT …/workers/domains` | `--domain`: the zone found from the name, longest first |
| 12 | `GET https://cloudflare-dns.com/dns-query` | after the attach: waits (180 s) until PUBLIC DNS has the name; this machine never looks it up |

The metadata: `main_module: worker.mjs`, `compatibility_date 2026-10-01`, `nodejs_compat`, the bindings
`BACKEND` (the SQLite Durable Object), `ASSETS` with `run_worker_first`, `FILES` (R2) when there is a bucket,
`ALERT_EMAIL` (`send_email`) and the two addresses as `plain_text` when there is an alert, observability on: what
`wranglerConfig.ts` writes for wrangler, field for field.

## 3. The never-wipe rule (P115 HST-014 AC2), as the API sees it

- **A new Worker**: migration `v1` (`new_sqlite_classes: ["NodegxBackend"]`) and the credential as the `secret_text`
  binding (run 3, upload 1).
- **A Worker that is there**: NO migration, `keep_bindings: ["secret_text"]`, the secret not sent (run 3, upload 2:
  the row and the secret kept). No migration even when the listing leaves the tag out: a deploy that passed the
  "ours" check made it with `v1`, and an applied migration sent twice is refused, which would fail every redeploy.
- **A Worker of the name this computer never deployed** (no live deploy in `deployment.json`): refused before any
  write. wrangler would have replaced it.
- **The record is written the moment the Worker is up** (`onWorkerUp`), before the steps that can still fail
  (workers.dev, a new credential, the domain): otherwise the next deploy would refuse the person's own Worker as
  "not ours".
- A refusal of the upload itself leaves the app online as it was, and says so. A bare 403 (no code: ODT-000 runs
  1–2) is named as the sign-in lacking Workers Admin.
- **The domain link** is handed out only once public DNS has the name (ODT-000 run 4); otherwise the deploy says to
  open it in a few minutes, not before.

**Which way:** `chooseRoute`: `--local` ⇒ `wrangler dev` (it is workerd on this computer); `--wrangler` ⇒ wrangler;
no NodeGX sign-in ⇒ wrangler, saying so (so `@nodegx/backend` 0.1.0, which signs in with wrangler's own login, is
unchanged: its build anchors in `deployCloudflare.ts` are kept, `node --test` 3/3); a sign-in without
`workers-scripts.admin` ⇒ refused in words (*sign in again, or `--wrangler`*), never handed to wrangler quietly.

## 4. The live grade (Richard's commands; the session reads the result)

The app: **P115's Campus, `hst-campus`, live since 2026-11-06 and put up five times by wrangler.** Redeploying it
through the API is P135 AC5 (a redeploy keeps every account, record, file) and the switch from wrangler at once.

Baseline, read by session 3 at 22:5x CET 2026-11-07: `check-campus-deploy.mjs ~/.nodegx/cloudflare/hst-campus` **14/14**,
the owner reads **2 answers**.

From the repo root:
```
node dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/check-campus-deploy.mjs ~/.nodegx/cloudflare/hst-campus --upload
node packages/nodegx-backend/cloudflare/deploy.mjs dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/c-campus \
  --name hst-campus --viewer ~/.nodegx/cloudflare-viewer
```
Expect step 5 to read *"Up to Cloudflare, through its API, with your NodeGX sign-in"*, then *"Worker hst-campus:
updated (its data and its credential kept)"*. Every site file is sent once (the hash is sha256, not wrangler's blake3,
so Cloudflare has none of them under the new names). The session then runs the checker with `--file <the path the
upload printed>`: **14/14, 2 answers, the file still opens** = AC5 on the API.

| reading | answer |
|---|---|
| the redeploy's step 5 output | ⏳ |
| `check-campus-deploy.mjs … --file …` after | ⏳ |

Not graded live yet: the secrets call (8), the domain detach (10), a NEW Worker made by this route (the probe made
one: run 3), and `--domain` on the real deploy (P115's step 3 can now run through the API, without `NODEGX_WRANGLER`:
Richard's choice, P115's close-out).

## 5. The comparison R3 was ruled on (measured 2026-11-07)

| | the API (built) | wrangler shipped in the `.mcpb` |
|---|---|---|
| added to the bundle | **~15 KB** (`deployApi.ts` + `signIn.ts`, esbuild, minified 14.5 KB) | **369 MB** (wrangler 4.157 install; `workerd-darwin-arm64` alone 140 MB, `wrangler` 15 MB, `miniflare` 12 MB) |
| platforms | any Node 20+ (`fetch`, `FormData`, `Blob`, `crypto`) | workerd is a native binary per platform (`@cloudflare/workerd-{darwin-arm64,darwin-64,linux-64,linux-arm64,windows-64}`): one `.mcpb` per platform, or all of them |
| when Cloudflare's API moves | NodeGX absorbs it (README §8): the calls are pinned in §2 with their reading dates | wrangler absorbs it |
| `--local` (workerd on this computer) | not offered: stays wrangler's | yes |

The extension is 217 MB today (README §3 row 1). **Still owed (ODT-003):** the Worker's BUILD on the person's
machine (esbuild + the backend's source); this task replaced the upload only.

## 6. Acceptance

1. ✅ The deploy goes up through the API with NodeGX's sign-in, no wrangler: scripted (17 tests, 3 mutants caught:
   a redeploy sending the migration, the "ours" refusal off, the domain not waited for in public DNS).
2. ⏳ A live redeploy of `hst-campus` through the API keeps every account, record and file (§4).
3. ✅ Nothing it says holds the token, the credential or the account id (test 1).
4. ✅ The comparison with wrangler shipped is written (§5).
5. ✅ `@nodegx/backend`'s pack anchors still hold (`node --test` 3/3) and the deploy's dry run on Fixture C still
   builds (26 files, 3 modules).
