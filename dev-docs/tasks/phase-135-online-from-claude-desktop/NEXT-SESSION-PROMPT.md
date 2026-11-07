# Phase 135 — next session prompt

**Written 2026-11-07 at the end of session 3 (Opus 5.5).** Lane 10, a nice-to-have for the Beta, never ahead of lanes
9, 2 and 3. Read [the README](README.md), [ODT-002](ODT-002-THE-DEPLOY-THROUGH-THE-API.md) and
[ODT-000](ODT-000-THE-MEASUREMENTS.md) §5 first. P115's close-out (Richard's live steps, P115
`NEXT-SESSION-PROMPT.md`) is still open beside this; it is not this prompt's work unless Richard says so.

## 0. Where it stands

**ODT-002 is built** (`packages/nodegx-backend/cloudflare/deployApi.ts`, 17 tests): the deploy's step 5 goes up
through Cloudflare's API whenever this computer holds NodeGX's sign-in, else wrangler (saying why). What is left of it
is **the live grade, Richard's command** (ODT-002 §4): a redeploy of P115's live `hst-campus` through the API, read
before and after with `check-campus-deploy.mjs`. Baseline (s3, 2026-11-07 ~22:50 CET): **14/14, the owner reads 2
answers.** 🔴 The classifier refuses a session's live writes to Richard's account (P115 s13–15): write him the
command, read the result.

**Measure first** (nothing is inherited):
```
node packages/nodegx-backend/cloudflare/sign-in.mjs status
python3 -c "import json,os;d=json.load(open(os.path.expanduser('~/.nodegx/cloudflare/hst-campus/deployment.json')));print(d['deploys'][-1], d['domain'])"
```
A last deploy with `"via": "api"` means Richard ran ODT-002 §4: run the checker with `--file <path>` (he has the
path from `--upload`; ask only for that) and write the readings into ODT-002 §4. No `via` = not run yet.

## 1. The order

1. ✅ **Run 4** (the custom domain): attaches and answers once public DNS has it; the probe's own early lookup was
   cached as "does not exist" (ODT-000 §5). The probe now waits on 1.1.1.1 first; ODT-002 owes the same rule.
2. ✅ **R3 RULED (Richard, 2026-11-07): the API**, wrangler does not ship (*"370MB extra is a lot"*).
3. ✅ **(a) loose port**: 8978 (unregistered) and `localhost` both accepted; 8977 stays the default as the
   cross-process guard (ODT-000 §5).
4. ✅ **The Claude Desktop drive of `cloudflare_sign_in`**: ODT-001 DONE (sign out, sign in, the page opened, Allow,
   found; ODT-001 AC5). The `nodegx-dev` config entry was removed after it; Richard switches the extension back on.
   The `.mcpb` is graded when a release carries the tool. P135-DESKTOP-NOTOOLS is open beside it.
5. 🔨 **ODT-002, the deploy through the API**: BUILT s3. Left: the live grade (ODT-002 §4, Richard's command), then
   its readings written. Not yet live: the secrets call (`--new-admin-credential`), the domain detach (`--no-domain`).
6. **ODT-003 next** (no bundler on the person's machine): (e) says a prebuilt Worker module beside a printed-code
   module uploads as it is; `@nodegx/backend`'s `src/prebuilt-worker.cjs` is that idea already, at pack time, and
   [`deployCloudflare-seam.patch`](deployCloudflare-seam.patch) is the seam it wants (README §4).

## 2. What session 3 did (2026-11-07)

| piece | state |
|---|---|
| `cloudflare/deployApi.ts` (`deployThroughApi`, `chooseRoute`) + step 5 of `deployCloudflare.ts` (`--wrangler`, `--account`) | ✅ 17 tests (`tests/p135-odt002-deploy-api.test.ts`), 3 mutants caught; the four Cloudflare suites 53/53 |
| a batch's answer used as the next batch's key (the protocol: the session's jwt for every batch) | ✅ fixed in `deployApi.ts` and, latent, in `probeWrites.ts` |
| `@nodegx/backend` anchors (`node --test` 3/3); dry run of Fixture C (26 files, 3 modules) | ✅ |
| the comparison with wrangler shipped (ODT-002 §5): ~15 KB against 369 MB | ✅ |
| the live redeploy of `hst-campus` | ⏳ Richard's command |

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
