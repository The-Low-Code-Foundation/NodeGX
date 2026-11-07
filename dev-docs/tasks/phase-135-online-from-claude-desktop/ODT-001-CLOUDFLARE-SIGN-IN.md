# ODT-001 — `cloudflare_sign_in`: one browser Allow from Claude Desktop

**Phase:** [P135](README.md) · **Kind:** product · **State:** ✅ DONE 2026-11-07 (session 2): every AC, AC5 driven in Claude Desktop by Richard. The client id
constant stays EMPTY until ODT-005 (public client, R2); the `.mcpb` carries the tool from the next `@nodegx/mcp` release.

## 1. What it is

The person, in Claude Desktop: *"let's get it online with Cloudflare"*. Claude calls `cloudflare_sign_in`; the
connector opens Cloudflare's consent page in their browser; they click Allow; Cloudflare sends the browser back to a
loopback address the connector is listening on; the connector exchanges the code and keeps the token on this
computer. Claude says *"A Cloudflare page opened in your browser: check what it asks for, click Allow."* No terminal,
no key, no `.env`.

## 2. Where it is

| piece | file |
|---|---|
| the flow, the file, the refresh, sign-out | `packages/nodegx-backend/cloudflare/signIn.ts` |
| the MCP tool (deferred `project` group, write-gated, beside `deploy_to_vm`) | `packages/noodl-mcp/src/tools/cloudflareSignIn.ts` |
| the same sign-in from a terminal, to measure (ODT-000) | `packages/nodegx-backend/cloudflare/sign-in.mjs` → `signInCommand.ts` |
| the domain command reads it first (when granted the registrar) | `domainCommand.ts` `domainCredential()` |
| tests | `nodegx-backend/tests/p135-odt001-cloudflare-sign-in.test.ts` (15), `noodl-mcp/tests/odt001CloudflareSignIn.test.ts` (3) |

## 3. Decisions, and the reading each rests on

- **Authorization Code + PKCE S256, no client secret, token auth `none`**: the only flow Cloudflare offers a desktop
  app (*Create your OAuth client*, last updated 2026-08-20; read 2026-11-07). No device grant for third parties, though
  the discovery document lists one (Cloudflare's own clients use it).
- **Endpoints** `https://dash.cloudflare.com/oauth2/{auth,token,revoke}` (*Integrate your OAuth client*, 2026-06-03;
  `/.well-known/openid-configuration` agrees). `NODEGX_CF_OAUTH_BASE` moves them for a test.
- **The redirect `http://127.0.0.1:8977/oauth/callback`, port FIXED** until ODT-000 (a) says whether Cloudflare
  matches a loopback port loosely (RFC 8252 §7.3). wrangler uses 8976. `NODEGX_CF_CALLBACK_PORT` moves it.
- **Scopes** (`CLOUDFLARE_SCOPES`), named as `GET /oauth/scopes` names them (read 2026-11-07 with Richard's `cf`
  sign-in, a GET: **403 scopes, every one below among them**): `user-details.read`, `account-settings.read`,
  `workers-scripts.edit`, `workers-kv-storage.write`, `workers-r2.write`, `workers-routes.write`, `zone.read`,
  `dns.write`, `email-sending.write`, `registrar-domains.admin`, plus `offline_access` for a refresh token (in the
  discovery document's `scopes_supported`, not in the catalog: ODT-000 (d) says whether it is needed or refused).
- **The token in `~/.nodegx/cloudflare/sign-in.json`, `0600` in a `0700` folder**, written to a temp file and renamed.
  Not the Keychain yet: the domain command and the deploy (Node, not the connector) read the same file, and the
  `security` CLI would put the token in a process's arguments. Revisit at ODT-004.
- **🔴 A refresh under a lock, the file re-read inside it.** Cloudflare's OAuth server is Ory Hydra shaped, and Hydra
  rotates refresh tokens (a second use can end the sign-in). Claude Desktop runs more than one connector process (two
  were alive on Richard's machine on 2026-11-07). Graded: three readers at once = ONE refresh request; the mutant that
  drops the re-read sends three (caught).
- **The call answers before the click.** It waits 45 s, then says "click Allow, tell me when it is done" while the
  address listens for ten minutes; the next call finds the result. A client's tool timeout cannot cut a person reading
  a consent page short.
- **No token in any answer.** Every answer field is safe to show; `cannot` says in words what was not allowed
  ("buy a domain"). Graded by searching every tool answer and the readings file for the scripted tokens.
- **Off until there is a client.** `NODEGX_CLOUDFLARE_CLIENT_ID` (a private client, ODT-000) or the constant
  `NODEGX_CLOUDFLARE_CLIENT_ID` in `signIn.ts` (empty until ODT-005, a ruling). Without either, the tool refuses:
  *"Signing in to Cloudflare from here is not switched on in this version of NodeGX yet."*

## 4. Acceptance criteria

1. ✅ (scripted) PKCE end to end: the verifier sent hashes to the page's challenge, the redirect sent to the token
   endpoint is the one in the page, no `client_secret` anywhere, the verifier never in the page address.
2. ✅ (scripted) An answer for another sign-in (wrong `state`) is refused and this one keeps waiting; Cancel on the
   consent page (`access_denied`) saves nothing and says so; a refused exchange saves nothing and says Cloudflare's
   reason; a taken port and an unanswered page are sentences.
3. ✅ (scripted) The token only in the 0600 file; one refresh for concurrent readers; a dead refresh token removes the
   file and asks for one more sign-in; sign-out revokes with the refresh token and removes the file.
4. ✅ (scripted) Through MCP: deferred (0 resident tokens: `toolDisclosure` green), found by `find_tools` "cloudflare",
   refused in words with no client, the page, the next call finds the sign-in, `cannot` in words, no token in any answer.
5. 🔨 **Real**: ✅ from a terminal on Richard's private client, 2026-11-07 (`sign-in.mjs`: signed in, 11/11 scopes, refresh
   rotates, probes 200; ODT-000 §5). ✅ **from Claude Desktop** (Richard, 2026-11-07 ~21:20 UTC; the checkout's server as a `nodegx-dev` config
   entry, Node 22, the client id in its env, the extension off): Claude's tool search "cloudflare sign in" loaded
   the tool; `status` said signed in; "sign me out of Cloudflare" → signed out and revoked at Cloudflare; "sign in to
   Cloudflare" → **the Cloudflare page opened in the browser** (Richard), Allow, "done" → Claude: signed in. The file
   read after: `signedInAt` 21:21:41 UTC, 11/11 scopes, renewable, mode 0600. Found beside it: P135-DESKTOP-NOTOOLS
   (the chat's first message was told NodeGX was not connected).
6. ✅ Cloudflare granted every scope asked for (ODT-000 (b)), so `cannot` is empty on that client.

## 5. Not here

The deploy through the API (ODT-002), the bundle (ODT-003), the domain and deploy tools (ODT-004), the public client
(ODT-005). Which account, when a sign-in sees several: ODT-004 (the domain command already refuses with a list).
