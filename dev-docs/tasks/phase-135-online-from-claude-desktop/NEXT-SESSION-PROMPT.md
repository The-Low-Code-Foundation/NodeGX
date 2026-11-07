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

1. **Run 4: the custom domain answering.** Run 3's `odt000.my-hearth.org` attached (200) but did not answer this Mac
   in 240 s ("fetch failed"). Suspect, unproven: session 2's `dig` of that name before the record existed (a local
   negative cache). `probe-writes` now uses a fresh `odt000-<4 hex>` name each run, records the network cause, and
   asks 1.1.1.1 over https. Richard runs `node packages/nodegx-backend/cloudflare/sign-in.mjs probe-writes --zone
   my-hearth.org` (live writes on his account: his yes, the classifier refuses it to the session). 🔴 Do NOT look the
   name up yourself before or during the run.
2. ✅ **R3 RULED (Richard, 2026-11-07): the API**, wrangler does not ship (*"370MB extra is a lot"*). Workers
   **Admin** on the consent page is the accepted cost.
3. **(a) loose port**: `… sign-in --port 8978` (an unregistered port). Accepted = `CALLBACK_PORT` can become `0`;
   refused (Cloudflare's own error page) = keep 8977. Then `--host localhost`. One click each, Richard's.
4. **The Claude Desktop drive of `cloudflare_sign_in`** (ODT-001 AC5's second half), connector built from this
   checkout with `NODEGX_CLOUDFLARE_CLIENT_ID` set (the constant stays EMPTY until ODT-005). Memory
   `desktop-built-in-node-is-a-helper.md`: grade the `.mcpb` in Desktop.
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
| the custom domain answering, (a) loose port, the Desktop drive | ❌ not run |

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
