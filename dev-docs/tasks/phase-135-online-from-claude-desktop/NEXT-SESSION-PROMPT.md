# Phase 135 — next session prompt

**Written 2026-11-07 at the end of session 3 (Opus 5.5); §0 and §1.6 updated by session 4 (ODT-003).** Lane 10, a nice-to-have for the Beta, never ahead of lanes
9, 2 and 3. Read [the README](README.md), [ODT-002](ODT-002-THE-DEPLOY-THROUGH-THE-API.md) and
[ODT-000](ODT-000-THE-MEASUREMENTS.md) §5 first. P115's close-out (Richard's live steps, P115
`NEXT-SESSION-PROMPT.md`) is still open beside this; it is not this prompt's work unless Richard says so.

## 0. Where it stands

**ODT-002 is DONE** (`packages/nodegx-backend/cloudflare/deployApi.ts`, 17 tests, and LIVE: Richard redeployed
P115's `hst-campus` through the API at 22:46 CET 2026-11-07; after it 15/15, the 2 answers, the file uploaded just
before, the credential). The deploy's step 5 goes up through Cloudflare's API whenever this computer holds NodeGX's
sign-in, else wrangler (saying why).

**ODT-003 is BUILT (s4)**: [ODT-003](ODT-003-THE-BUILD-WITHOUT-A-BUNDLER.md). `@nodegx/mcp`'s pack now carries
`dist/cloudflare/deploy.cjs` + the prebuilt `worker.mjs`; a dry run on the installed extension's own Node, cloud
bundler and engine, where esbuild does not resolve, goes the whole way. **Next: its live grade** (ODT-003 §4: Richard
redeploys `hst-campus` through the kit; the session reads `deployment.json` and runs the checker with `--file`), **then
ODT-004** (the MCP tools; §2 of ODT-003 lists the env the tool sets).
🔴 The classifier refuses a session's live writes to Richard's account (P115 s13–15): write him the command, read the
result (`deployment.json`, `GET /admin/files`, `check-campus-deploy.mjs` are the session's).

**Measure first** (nothing is inherited):
```
node packages/nodegx-backend/cloudflare/sign-in.mjs status
python3 -c "import json,os;d=json.load(open(os.path.expanduser('~/.nodegx/cloudflare/hst-campus/deployment.json')));print(d['deploys'][-1], d['domain'])"
```
(`hst-campus`'s last deploy is `"via": "api"`, 21:46:39Z: anything later is someone else's.)

## 1. The order

1. ✅ **Run 4** (the custom domain): attaches and answers once public DNS has it; the probe's own early lookup was
   cached as "does not exist" (ODT-000 §5). The probe now waits on 1.1.1.1 first; ODT-002 owes the same rule.
2. ✅ **R3 RULED (Richard, 2026-11-07): the API**, wrangler does not ship (*"370MB extra is a lot"*).
3. ✅ **(a) loose port**: 8978 (unregistered) and `localhost` both accepted; 8977 stays the default as the
   cross-process guard (ODT-000 §5).
4. ✅ **The Claude Desktop drive of `cloudflare_sign_in`**: ODT-001 DONE (sign out, sign in, the page opened, Allow,
   found; ODT-001 AC5). The `nodegx-dev` config entry was removed after it; Richard switches the extension back on.
   The `.mcpb` is graded when a release carries the tool. P135-DESKTOP-NOTOOLS is open beside it.
5. ✅ **ODT-002, the deploy through the API**: built and graded live s3 (ODT-002 §4). Not yet live: the secrets
   call (`--new-admin-credential`), the domain detach (`--no-domain`).
6. 🔨 **ODT-003** (no bundler on the person's machine): built s4, the seam patch taken, `@nodegx/backend`'s rewrites
   gone (it uses the same builder). Live grade owed (§4 of the task). 🔴 The kit lives in a session scratchpad: if it
   is gone, rebuild it with `node packages/noodl-mcp/build-cloudflare-copy.mjs --out <dir>` and copy the extension's
   `cloud-bundle.cjs` + `package.json` beside it.

## 2. What session 3 did (2026-11-07)

| piece | state |
|---|---|
| `cloudflare/deployApi.ts` (`deployThroughApi`, `chooseRoute`) + step 5 of `deployCloudflare.ts` (`--wrangler`, `--account`) | ✅ 17 tests (`tests/p135-odt002-deploy-api.test.ts`), 3 mutants caught; the four Cloudflare suites 53/53 |
| a batch's answer used as the next batch's key (the protocol: the session's jwt for every batch) | ✅ fixed in `deployApi.ts` and, latent, in `probeWrites.ts` |
| `@nodegx/backend` anchors (`node --test` 3/3); dry run of Fixture C (26 files, 3 modules) | ✅ |
| the comparison with wrangler shipped (ODT-002 §5): ~15 KB against 369 MB | ✅ |
| the live redeploy of `hst-campus` (Richard) | ✅ 15/15 after, 2 answers, the file from just before opens; the session found the file's path itself with `GET /admin/files` |

## 2b. What session 2 did (2026-11-07)

| piece | state |
|---|---|
| `nodegx-backend/cloudflare/probeWrites.ts` + `sign-in.mjs probe-writes [--zone]` | ✅ 6 tests (`tests/p135-odt000-probe-writes.test.ts`), 2 mutants caught; run 3 times live by Richard |
| ODT-000 (c) writes, (e), consent page (the 10 ticked permissions) | ✅ §5 |
| `CLOUDFLARE_SCOPES` and the connector's words: `workers-scripts.edit` → `.admin` | ✅ backend 21 + noodl-mcp `odt001`/`toolDisclosure` 21 green |
| run 4 (domain answers once in public DNS), (a) loose port, the Desktop drive (ODT-001 ✅), R3 ruled (API) | ✅ |

## 3. Traps (also in memory `phase-135-online-from-claude-desktop.md`)

- 🔴 **Assets upload: every batch carries the SESSION's jwt**; only the LAST answer (201) carries the completion jwt.
  A fake that answers every batch with a jwt hides passing one batch's answer on as the next one's key.
- 🔴 A Worker that is there must get NO migration, even if the scripts listing leaves `migration_tag` out: an applied
  migration sent twice is refused, which would fail every redeploy.
- The deploy's record is written when the Worker is up, not at the end: a later failure must not make the next
  deploy refuse the person's own Worker as "not ours".

- 🔴 **Workers → Edit (`workers-scripts.edit`, "Workers Editor") cannot create a Worker through the API.** Admin can.
  `workers-scripts.write` ("Workers Scripts Write") is in the catalog with no dashboard row: untried.
- 🔴 Cloudflare's 403 on a Worker upload has NO error code, only "No access to the specified resource.": a refused
  scope looks the same as a refused feature. Narrow with a bare Worker.
- An asset hash is not checked against the content: sha256 cut to 32 hex was accepted (wrangler uses blake3).
- 🔴 Looking a hostname up before its record exists can leave a local "does not exist" for up to 30 min.
- The dashboard shows DISPLAY names; a client edit needs a client URL first; `invalid_scope` names only the FIRST
  disallowed scope; scripted `/oauth2/auth` requests get 403 (bot protection); refresh tokens ROTATE (refresh only
  inside `cloudflareAccessToken`); a driver that `spawnSync`s the CLI beside its fake deadlocks.
- `noodl-mcp` `instructions.test.ts` red on the backend tool count is P132-BST006GOLDEN, not P135's.
- Run the backend's jest with `--no-watchman --forceExit --runInBand` at `nice -n 19`.
