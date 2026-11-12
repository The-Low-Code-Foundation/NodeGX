# ODT-000 — the measurements, on a private OAuth client on Richard's account

**Phase:** [P135](README.md) · **Kind:** measurement · **State:** 🔨 (a) (b) (d) and the reads of (c) TAKEN 2026-11-07 (§5); (c) writes and (e) ✅ on `workers-scripts.admin` (run 3, §5); `.edit` cannot create any Worker; the custom domain attaches, and answers once public DNS has it (run 4); (a) loose port ✅ (§5).

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
   | `workers-scripts.admin` (was `.edit`: ODT-000 (c) runs 1–3) | **Workers** → **Admin** (the row with Admin / Edit / Content Read / Metadata Read). 🔴 Edit (`workers-scripts.edit`, "Workers Editor") is refused every Worker upload. Older note: 🔴 The catalog also lists `workers-scripts.write` ("Workers Scripts Write"), but the dashboard offers NO such row (Richard, 2026-11-07): asked for at first, changed to `.edit`. Whether Edit uploads a Worker with a Durable Object migration, or that needs Admin, is ODT-000 (c) |
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
| **(a)** loopback redirect | ✅ `http://127.0.0.1:8977/oauth/callback` accepted. ✅ **Loose port (Richard, 2026-11-07 21:13 UTC): `http://127.0.0.1:8978/oauth/callback`, registered NOWHERE in the client, accepted, 11/11 granted**: Cloudflare matches a loopback redirect's port loosely (RFC 8252 §7.3). ✅ `http://localhost:8977/…` accepted, 11/11. The default stays 8977 on purpose: Claude Desktop runs two connector processes, and the fixed port is what refuses a second, parallel sign-in page (`port-busy`); `NODEGX_CF_CALLBACK_PORT=0` is safe whenever that guard is not wanted |
| **(b)** scopes granted to a private third-party client | ✅ **all 11**: `offline_access user-details.read account-settings.read workers-scripts.edit workers-kv-storage.write workers-r2.write workers-routes.write zone.read dns.write email-sending.write registrar-domains.admin`, `registrar-domains.admin` included |
| (b) the scope names | 🔴 the dashboard's **Workers → Edit** box = `workers-scripts.edit`. `workers-scripts.write` (in the catalog) has NO dashboard row. First run REFUSED `workers-scripts.edit` because the box was not saved (the form wanted a client URL first: `nodegx.io` accepted); Cloudflare redirects back `invalid_scope` naming the FIRST disallowed scope in request order, before any page is shown |
| **(c)** reads with the token | ✅ 200 on `/user`, `/accounts` (1), Workers scripts (6), R2 buckets, KV namespaces (1), Workers subdomain, Workers custom domains (1), zones (1), the `my-hearth.org` registration. Re-read 2026-11-07 20:19 UTC (session 2): all 9 still 200 after an automatic refresh |
| **(c)** writes, run 1 (Richard, 2026-11-07 20:25 UTC, `sign-in.mjs probe-writes --zone my-hearth.org`, `probeWrites.ts`) | R2 bucket **made** (200) and deleted (200): `workers-r2.write` writes. 🔴 **The Worker upload REFUSED: 403 "No access to the specified resource."** (no error code), and the assets upload session before it, same 403. The upload was P115's whole shape (3 modules, SQLite Durable Object + migration v1, secret, R2). Nothing else was made; clean-up complete. Not yet known: whether `workers-scripts.edit` can make ANY Worker or refuses only the migration: run 2 narrows it (a bare one-module Worker, then + the Durable Object) |
| **(c)** writes, run 2 (Richard, 2026-11-07 20:30 UTC, the same command with the narrowing) | 🔴 **A bare Worker (one module, no bindings, `main_module` + `compatibility_date` only) is refused too: 403 "No access to the specified resource."** So `workers-scripts.edit` cannot create ANY Worker through the API; it is not the migration. R2 made and deleted again; clean-up complete |
| the Workers scope ids (catalog re-read 2026-11-07 20:3x UTC with NodeGX's own token: 200, 403 scopes) | `workers-scripts.edit` = **"Workers Editor"** (dashboard Workers → Edit), `workers-scripts.admin` = **"Workers Admin"** (Workers → Admin), `workers-scripts.write` = "Workers Scripts Write" (no dashboard row), plus `.read`, `.content_read`, `.metadata_read`. Next: the client given Workers → Admin, a new sign-in asking `workers-scripts.admin`, run 3 |
| re-sign-in with Admin (Richard, 20:33 UTC) | Workers → Admin ticked in the client; `sign-in --scopes …,workers-scripts.admin,…` (`.edit` dropped): **all 11 granted**, token 3600 s, refresh token yes |
| **(c)** writes, run 3 (Richard, 2026-11-07 20:38 UTC, `workers-scripts.admin`) | ✅ **P115's whole shape went up through the API, no wrangler**: assets session 200 + content 201 (a **sha256** hash cut to 32 hex was accepted: Cloudflare does not check wrangler's blake3), the Worker 200 (3 modules, SQLite Durable Object + migration v1, secret, assets with `run_worker_first`, R2, observability), workers.dev on 200. Live on workers.dev at the first try (2.7 s): the Durable Object stored a row, R2 through the binding, the secret set, `nodejs_compat`, the page served. **Redeploy (upload 2, no migration, `keep_bindings: ["secret_text"]`): the row AND the secret kept**; the unchanged page was not asked for again (0 files). Custom domain attach 200; `send_email` binding accepted (200). Clean-up: domain 204, Worker 200, bucket 200 |
| (c) the custom domain answering | ❓ `odt000.my-hearth.org` did not answer this Mac within 240 s (81 tries, "fetch failed", the cause not recorded). Suspect, unproven: this session's `dig` of that name BEFORE the record existed left a "does not exist" in the local resolver. The probe now uses a fresh `odt000-<4 hex>` name each run, records undici's `cause`, and asks 1.1.1.1 over https right after the attach and after the wait: run 4 |
| (c) run 4 (Richard, 2026-11-07 21:03 UTC, fresh name `odt000-3075.my-hearth.org`) | Everything in run 3 again ✅ (upload, workers.dev first try, redeploy keeps the row and the secret, `send_email`, clean-up complete). The domain: **1.1.1.1 said NXDOMAIN (status 3) 1 s after the attach**; this Mac's every lookup for 240 s was `ENOTFOUND`; **1.1.1.1 resolved it after the wait** (172.67.133.13, 104.21.13.185). 🔴 So the probe's OWN first lookup, made before the record existed, was cached as "does not exist". The attach works; the first local lookup must wait for public DNS. `probeWrites.ts` now waits on 1.1.1.1 first (test + mutant). **ODT-002/006 owe the same rule**: the deploy must not hand the person the domain's link (their browser looks it up) before public DNS has it; workers.dev answers at once |
| **(d)** lifetimes | access token **3599 s**; refresh token **yes** (with `offline_access`); a refresh **ROTATES** the refresh token (the lock in `signIn.ts` is load-bearing) |
| ODT-001 in Claude Desktop, half 1 (Richard, 2026-11-07 ~21:15 UTC; the checkout's server as `nodegx-dev`, extension off) | ✅ Claude's tool search `"cloudflare sign in"` loaded `nodegx-dev:cloudflare_sign_in`; `sign_in` answered `signedIn: true`, 11 scopes, "You are already signed in to Cloudflare on this computer." (the port test's sign-in). No page opened, so the Allow path in Desktop is half 2: sign out, then sign in. 🔴 The chat's FIRST message ("open my Puppy test 3 project") was answered "the NodeGX tools aren't connected here" with no search: filed P135-DESKTOP-NOTOOLS |
| **(e)** multi-module upload | ✅ run 3: `worker.mjs` importing `./printed-code.mjs` and `./app.mjs`, each part `application/javascript+module`, `main_module` in the metadata: both modules loaded on the live Worker |
| the consent page's words | Richard, 2026-11-07: it listed **the 10 permissions ticked in the client** (the 11 granted minus `offline_access`, which has no permission row). The page's name and shield colour were not described |

🔴 **An instrument that refused everything:** probing `/oauth2/auth` scope by scope from Python (no redirects followed) answered **403 with no Location for every scope, `openid` included**: Cloudflare's bot protection, not the client's scopes. Void. Only a browser run reads the client.
