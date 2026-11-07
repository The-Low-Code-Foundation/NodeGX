# Phase 135 — next session prompt

**Written 2026-11-07 at the end of session 2 (Opus 5.5).** Lane 10, a nice-to-have for the Beta, never ahead of lanes
9, 2 and 3. Read [the README](README.md), [ODT-000](ODT-000-THE-MEASUREMENTS.md) §5 and
[ODT-001](ODT-001-CLOUDFLARE-SIGN-IN.md) first. P115's close-out (Richard's three live steps, P115
`NEXT-SESSION-PROMPT.md`) is still open beside this; it is not this prompt's work unless Richard says so.

## 0. Where it stands

**The deploy works through Cloudflare's API with NodeGX's own sign-in, no wrangler** (ODT-000 (c) run 3, 2026-11-07):
P115's whole Worker shape (3 modules, SQLite Durable Object + migration v1, secret, assets with `run_worker_first`,
R2, observability, workers.dev, a custom domain attach, the `send_email` binding) went up, answered, and a redeploy kept
the Durable Object's row and the secret. Then everything was deleted. 🔴 It needs **`workers-scripts.admin`** (dashboard
Workers → **Admin**): with `workers-scripts.edit` (Workers → Edit) Cloudflare refuses ANY Worker, a bare one too (403
"No access to the specified resource."). `CLOUDFLARE_SCOPES` now asks `.admin`; Richard's client has Admin ticked and
his sign-in (`~/.nodegx/cloudflare/sign-in.json`, client `a05351f2868e068ab4caa13cdfaca9fe`) holds it.

**Measure first** (nothing is inherited): `node packages/nodegx-backend/cloudflare/sign-in.mjs status`, then `… probe`.
Expired or refused: Richard signs in again (`NODEGX_CLOUDFLARE_CLIENT_ID=a05351f2868e068ab4caa13cdfaca9fe node
packages/nodegx-backend/cloudflare/sign-in.mjs sign-in`, his browser click).

## 1. The order

1. ✅ **Run 4** (the custom domain): attaches and answers once public DNS has it; the probe's own early lookup was
   cached as "does not exist" (ODT-000 §5). The probe now waits on 1.1.1.1 first; ODT-002 owes the same rule.
2. ✅ **R3 RULED (Richard, 2026-11-07): the API**, wrangler does not ship (*"370MB extra is a lot"*).
3. ✅ **(a) loose port**: 8978 (unregistered) and `localhost` both accepted; 8977 stays the default as the
   cross-process guard (ODT-000 §5).
4. ✅ **The Claude Desktop drive of `cloudflare_sign_in`**: ODT-001 DONE (sign out, sign in, the page opened, Allow,
   found; ODT-001 AC5). The `nodegx-dev` config entry was removed after it; Richard switches the extension back on.
   The `.mcpb` is graded when a release carries the tool. P135-DESKTOP-NOTOOLS is open beside it.
5. **ODT-002, the deploy through the API**: `probeWrites.ts` is the blueprint (every call it makes is in ODT-000 §5,
   with its status). Replace `deployCloudflare.ts`'s `wrangler deploy` step; the redeploy uses no migration and
   `keep_bindings: ["secret_text"]`. ODT-003 (no bundler on the person's machine) next: (e) says a prebuilt Worker
   module beside a printed-code module uploads as it is.

## 2. What session 2 did (2026-11-07)

| piece | state |
|---|---|
| `nodegx-backend/cloudflare/probeWrites.ts` + `sign-in.mjs probe-writes [--zone]` | ✅ 6 tests (`tests/p135-odt000-probe-writes.test.ts`), 2 mutants caught; run 3 times live by Richard |
| ODT-000 (c) writes, (e), consent page (the 10 ticked permissions) | ✅ §5 |
| `CLOUDFLARE_SCOPES` and the connector's words: `workers-scripts.edit` → `.admin` | ✅ backend 21 + noodl-mcp `odt001`/`toolDisclosure` 21 green |
| run 4 (domain answers once in public DNS), (a) loose port, the Desktop drive (ODT-001 ✅), R3 ruled (API) | ✅ |

## 3. Traps (also in memory `phase-135-online-from-claude-desktop.md`)

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
