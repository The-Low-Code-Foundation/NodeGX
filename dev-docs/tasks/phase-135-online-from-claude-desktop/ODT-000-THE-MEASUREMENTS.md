# ODT-000 — the measurements, on a private OAuth client on Richard's account

**Phase:** [P135](README.md) · **Kind:** measurement · **State:** 🔨 (a) (b) (d) and the reads of (c) TAKEN 2026-11-07 (§5); (c) writes and (e) next.

## 1. Taken before the client (2026-11-07, read-only)

| reading | how | answer |
|---|---|---|
| the endpoints | Cloudflare docs *Integrate your OAuth client* (2026-06-03) + `GET dash.cloudflare.com/.well-known/openid-configuration` | `/oauth2/auth`, `/oauth2/token`, `/oauth2/revoke`; `scopes_supported` lists `offline_access`, `offline`, `openid` |
| the flows | *Create your OAuth client* (2026-08-20) | third parties: Authorization Code only; desktop/CLI = PKCE S256, auth `none`. No device grant, though the discovery document lists one |
| (b) part 1: is each scope in the catalog a client is made from | `GET /client/v4/oauth/scopes` with Richard's `cf` sign-in (a GET) | **403 scopes; every one ODT-001 asks for is there**, `registrar-domains.admin` included. Whether a PRIVATE third-party client is GRANTED them is part 2, below |
| can the `cf` sign-in create the client (no R1) | its grant (read from its file, scopes only) | **no**: no OAuth-clients scope in it. R1 stands |
| an account switch that can block it | *Authorizing an application* | Manage Account → Members → Settings → *Public OAuth App access* can turn third-party apps off for an account (it says "public": whether it touches a private client is unread) |
| redirect rules (loopback, http, port) | the docs | **not stated anywhere** → reading (a) |

## 2. Richard's steps (R1: the dashboard, recommended)

1. dash.cloudflare.com → **Manage Account → OAuth clients → Create client**.
2. Name **NodeGX (test)**. Response type **code**. Grant type **authorization_code** (and **refresh_token** if it is a
   choice). Token authentication method **none** (PKCE). Redirect URLs, both:
   `http://127.0.0.1:8977/oauth/callback` and `http://localhost:8977/oauth/callback`.
   If the form refuses an `http://` or loopback address, **that refusal is reading (a)**: copy its words.
3. Scopes. 🔴 The dashboard shows DISPLAY names, not the ids (Richard, 2026-11-07: "the scopes in the doc don't match
   what I have in CF"); "Write" in the catalog is "Edit" in the dashboard. All required:

   | id (what `signIn.ts` asks for) | dashboard row → box |
   |---|---|
   | `workers-scripts.edit` | **Workers** → Edit (the row with Admin / Edit / Content Read / Metadata Read). 🔴 The catalog also lists `workers-scripts.write` ("Workers Scripts Write"), but the dashboard offers NO such row (Richard, 2026-11-07): asked for at first, changed to `.edit`. Whether Edit uploads a Worker with a Durable Object migration, or that needs Admin, is ODT-000 (c) |
   | `workers-kv-storage.write` | Workers KV Storage → Edit |
   | `workers-r2.write` | Workers R2 Storage → Edit (not R2 Data Catalog, not R2 SQL) |
   | `workers-routes.write` | Workers Routes → Edit |
   | `zone.read` | Zone → Read |
   | `dns.write` | DNS → Edit |
   | `email-sending.write` | Email Sending → Edit |
   | `registrar-domains.admin` | Registrar Domains → Admin |
   | `account-settings.read` | Account Settings → Read |
   | `user-details.read` | User Details → Read |

   `offline_access` is not in the catalog (only in the discovery document); tick it only if offered. Anything ticked
   differently: `sign-in --scopes a,b` asks for exactly those, and `CLOUDFLARE_SCOPES` follows the reading.
4. Keep the **Client ID** (not a secret). If a client secret is shown, the method is not `none`: don't paste the secret anywhere.
5. From the repo root:
   ```
   NODEGX_CLOUDFLARE_CLIENT_ID=<the id> node packages/nodegx-backend/cloudflare/sign-in.mjs sign-in
   node packages/nodegx-backend/cloudflare/sign-in.mjs refresh
   node packages/nodegx-backend/cloudflare/sign-in.mjs probe --domain my-hearth.org
   ```
   Every reading lands in `~/.nodegx/cloudflare/odt000-readings.json` (no token in it); a session writes them up from there.

## 3. The readings to write (§5 below, each dated, each from a real call)

- **(a)** the redirect: accepted on `127.0.0.1:8977`? Then `sign-in --port 8978` (an unregistered port): accepted =
  Cloudflare matches loopback ports loosely, the port can be `0`; refused = keep it fixed. Then `--host localhost`.
- **(b)** part 2: the consent page's text (what it says NodeGX wants), and `Granted` vs `NOT granted`.
- **(c)** reads: `probe` (scripts, R2, KV, subdomain, custom domains, zones, the registration). The WRITES (upload a
  Worker with a Durable Object migration, make an R2 bucket, attach a custom domain) are ODT-000 (c) part 2: a probe
  Worker on Richard's account, his run, written when (a) and (b) are in.
- **(d)** access token lifetime, refresh token present, and whether a refresh rotates it (`refresh` says).
- **(e)** multi-module upload (printed code beside a prebuilt Worker): with (c) part 2.

## 4. If a reading says no

(a) refused → a hosted callback page on `nodegx.io` that hands the code to the loopback address. (b) registrar
refused → the domain stays on `cf auth login` (a terminal), the person sentence loses "buy a name". (c) refused →
wrangler ships in the bundle (R3).

## 5. Readings (2026-11-07, Richard's account, private client `…dfaca9fe` "NodeGX", client URL `https://nodegx.io`)

R1 done by Richard in the dashboard. Raw readings: `~/.nodegx/cloudflare/odt000-readings.json` (no tokens).

| reading | answer |
|---|---|
| **(a)** loopback redirect | ✅ `http://127.0.0.1:8977/oauth/callback` accepted (both runs came back to it, the refusal too). Loose port (`--port 8978`) and `localhost`: not yet run |
| **(b)** scopes granted to a private third-party client | ✅ **all 11**: `offline_access user-details.read account-settings.read workers-scripts.edit workers-kv-storage.write workers-r2.write workers-routes.write zone.read dns.write email-sending.write registrar-domains.admin`, `registrar-domains.admin` included |
| (b) the scope names | 🔴 the dashboard's **Workers → Edit** box = `workers-scripts.edit`. `workers-scripts.write` (in the catalog) has NO dashboard row. First run REFUSED `workers-scripts.edit` because the box was not saved (the form wanted a client URL first: `nodegx.io` accepted); Cloudflare redirects back `invalid_scope` naming the FIRST disallowed scope in request order, before any page is shown |
| **(c)** reads with the token | ✅ 200 on `/user`, `/accounts` (1), Workers scripts (6), R2 buckets, KV namespaces (1), Workers subdomain, Workers custom domains (1), zones (1), the `my-hearth.org` registration. WRITES not yet: part 2 |
| **(d)** lifetimes | access token **3599 s**; refresh token **yes** (with `offline_access`); a refresh **ROTATES** the refresh token (the lock in `signIn.ts` is load-bearing) |
| (e) multi-module upload | not yet: with (c) part 2 |
| the consent page's words | not recorded: ask Richard what it showed (name, shield, the permission list) |

🔴 **An instrument that refused everything:** probing `/oauth2/auth` scope by scope from Python (no redirects followed) answered **403 with no Location for every scope, `openid` included**: Cloudflare's bot protection, not the client's scopes. Void. Only a browser run reads the client.
