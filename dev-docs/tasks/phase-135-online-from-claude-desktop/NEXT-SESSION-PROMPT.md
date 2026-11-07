# Phase 135 — next session prompt

**Written 2026-11-07 at the end of session 1 (Opus 5.5).** Lane 10, a nice-to-have for the Beta, never ahead of lanes
9, 2 and 3. Read [the README](README.md), [ODT-000](ODT-000-THE-MEASUREMENTS.md) §5 and
[ODT-001](ODT-001-CLOUDFLARE-SIGN-IN.md) first. P115's close-out (Richard's three live steps, P115
`NEXT-SESSION-PROMPT.md`) is still open beside this; it is not this prompt's work unless Richard says so.

## 0. Where it stands

The Cloudflare sign-in works for real. NodeGX's own **private** OAuth client on Richard's account (client id
`a05351f2868e068ab4caa13cdfaca9fe`, not a secret, name "NodeGX", client URL `https://nodegx.io`): the browser page,
Allow, the token back on `http://127.0.0.1:8977/oauth/callback`, **11/11 scopes granted** (registrar included), access
token 3599 s, refresh token present and **rotated on every refresh**, nine read probes 200. Richard's sign-in is in
`~/.nodegx/cloudflare/sign-in.json` (0600); every reading in `~/.nodegx/cloudflare/odt000-readings.json` (no tokens).

**Measure first** (nothing is inherited): `node packages/nodegx-backend/cloudflare/sign-in.mjs status` (signed in?
renewable?), then `… probe` (still 200s?). A refresh token unused for long may have died: if `status`/`probe` says
expired, Richard signs in again (`NODEGX_CLOUDFLARE_CLIENT_ID=a05351f2868e068ab4caa13cdfaca9fe node
packages/nodegx-backend/cloudflare/sign-in.mjs sign-in`, run in the background so a session can wait for his click).

## 1. The order

1. **Ask Richard what the consent page showed** (the name, the shield colour, the permission list): the screen every
   person will meet. Into ODT-000 §5.
2. **ODT-000 (c) writes + (e)**, through Cloudflare's API with the sign-in's token, NO wrangler: a throwaway Worker
   (`odt000-probe`) uploaded as a multi-module script with a Durable Object class and its migration (the shape P115's
   `deployCloudflare.ts` deploys, a few lines of it); an R2 bucket made and deleted; a custom domain
   (`odt000.my-hearth.org`) attached and detached; then everything deleted. Write it as a script beside
   `signInCommand.ts` (e.g. a `probe-writes` verb), each call's status and Cloudflare error code recorded.
   🔴 **These are live writes on Richard's account: his yes, and expect the auto-mode classifier to refuse them to the
   session (P115 s13–s15 refused every live Cloudflare write).** Hand him the command; read the result from the
   readings file. If `workers-scripts.edit` cannot upload or migrate, that is the reading (then Workers → Admin).
   The answer decides R3 (ship wrangler or not).
3. **(a) loose port**: `… sign-in --port 8978` (an unregistered port). Accepted = Cloudflare matches loopback ports
   loosely → `CALLBACK_PORT` can become `0`; refused (Cloudflare's own error page, nothing comes back) = keep 8977.
   Then `--host localhost`. One browser click each, Richard's.
4. **The Claude Desktop drive of `cloudflare_sign_in`** (ODT-001 AC5's second half): the connector built from this
   checkout with `NODEGX_CLOUDFLARE_CLIENT_ID` set (the client constant stays EMPTY until ODT-005), the tool reached by
   "sign in to Cloudflare" in Desktop, Allow, the next message finds it. Memory `desktop-built-in-node-is-a-helper.md`:
   grade the `.mcpb` in Desktop, never on a plain `node`.
5. Then ODT-002 (the deploy through the API) and ODT-003 (no bundler on the person's machine), on (c)'s answers.

## 2. What session 1 did (2026-11-07): done vs written

| piece | state |
|---|---|
| `nodegx-backend/cloudflare/signIn.ts` (PKCE S256, loopback callback, 0600 file, refresh under a lock, sign-out revokes) | ✅ 15 tests (`tests/p135-odt001-cloudflare-sign-in.test.ts`), 2 mutants caught (lock re-read, state check) |
| `noodl-mcp/src/tools/cloudflareSignIn.ts`, `cloudflare_sign_in` (deferred `project` group, write-gated, 0 resident tokens) | ✅ 3 tests + `toolDisclosure` green; ❌ not driven in Desktop |
| `cloudflare/sign-in.mjs` → `signInCommand.ts` (`sign-in|status|refresh|probe|sign-out`) | ✅ driven end to end on a fake Cloudflare, then for real |
| `domainCommand.ts` `domainCredential()` prefers NodeGX's sign-in when granted the registrar | ✅ tested; HST-018's 17 still green |
| ODT-000 (a) fixed port, (b), (d), (c) reads | ✅ real, ODT-000 §5 |
| ODT-000 (c) writes, (e), loose port, consent page words | ❌ not run |

## 3. Traps (also in memory `phase-135-online-from-claude-desktop.md`)

- 🔴 The dashboard shows DISPLAY names: **Workers → Edit = `workers-scripts.edit`**; there is no row for the catalog's
  `workers-scripts.write`. A client edit is not saved until a client URL is filled (`https://nodegx.io` accepted).
- 🔴 Cloudflare redirects back `invalid_scope` naming the FIRST disallowed scope in request order, before any page is
  shown: a refused run tells you one scope, not all of them.
- 🔴 Scripted requests to `dash.cloudflare.com/oauth2/auth` get **403 for everything** (bot protection, `openid`
  included): void. Only a browser run reads the client.
- 🔴 Refresh tokens ROTATE (measured): never refresh outside `cloudflareAccessToken` (its lock), or two connector
  processes can end the sign-in.
- 🔴 A test driver that `spawnSync`s the CLI while serving the fake Cloudflare in the same process deadlocks.
- `noodl-mcp` `instructions.test.ts` is red on the backend tool count (golden 67, served 69): filed
  P132-BST006GOLDEN, not P135's. `noodl-mcp` typecheck has two filed reds in other files: grep for yours.
- Run the backend's jest with `--no-watchman --forceExit --runInBand` at `nice -n 19`.
