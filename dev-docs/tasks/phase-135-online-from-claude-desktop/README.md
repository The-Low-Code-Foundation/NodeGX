# Phase 135 — Online from Claude Desktop

**Scoped:** 2026-11-07, at HEAD `197b35c1d`, on Richard's ruling at the end of P115 session 14 (*"finish P115 and close
it, THEN scope 'Online from Claude Desktop'"*). **State:** 📋 SCOPED, not started. **Lane 10, after P115**; a
nice-to-have for the Beta, never ahead of lanes 9, 2 and 3. **Prefix: `ODT`.** **Read first:** this page, then
[P115 HST-018 §5–§7](../phase-115-online-on-your-own-account/HST-018-CLAUDE-FINDS-AND-BUYS-THE-DOMAIN.md), which
holds the readings this rests on.

## 1. Why (Richard, verbatim, 2026-11-07)

> "They're in Claude Desktop rocking out with a new app and they say 'let's get it online with CloudFlare'. What can
> Claude Desktop do to trigger the OAuth and save the token?"

> "newbies won't want to create several API keys and save them into .envs … No chance of a CloudFlare Oauth or
> something so they can just sign in and Claude can do the rest?"

P115 built the Cloudflare route as a product: one command puts a full-stack NodeGX app on one Worker on the Free plan,
on a domain Claude bought on a word-for-word yes. **Every step of it runs in a terminal**: `wrangler login`,
`cf auth login`, `node …/deploy.mjs`. This phase takes the terminal away.

## 2. The person sentence

> **No terminal:** "In Claude Desktop I said 'let's get it online with Cloudflare'. A Cloudflare page opened, I clicked
> Allow, I said yes to a price, and I got a link. No terminal, no key, no `.env`."

> **One consent screen:** "Cloudflare asked me once, in one page that named NodeGX and said what it would do: put my
> app online, store its files, buy a name, send email."

## 3. What is already there (measured 2026-11-07, so nobody re-derives it)

| # | fact | consequence |
|---|---|---|
| 1 | **The NodeGX extension (`.mcpb` 0.2.9, as installed in Richard's Claude Desktop) is 217 MB**: a Node binary (107 MB) and `studio/node_modules` (110 MB: `@nodegx/mcp`, `preview`, `backend-kit`, `backend-map`, `canvas-look`, `node-spec`, `project-contract`). **No npm, no `esbuild`, no `wrangler`, no `@noodl/nodegx-backend`.** | 🔴 Three things are missing, not one: the sign-in, the upload (wrangler), and the BUILD (esbuild + the backend's source). The sign-in is the smallest of them. |
| 2 | **P115's deploy needs all three** (`packages/nodegx-backend/cloudflare/deployCloudflare.ts`): `require('esbuild')` to bundle the Worker with the whole backend (:258), wrangler from a local install or else `npx --yes wrangler@4` (:326–331), which Desktop cannot run. | The deploy is rebuilt for Desktop, or its pieces ship in the bundle. ODT-002 and ODT-003 compare. |
| 3 | **wrangler 4.157's install is 369 MB** (P115's `spike-backend/node_modules`): `workerd` alone 145 MB, `wrangler` 15 MB, `miniflare` 12 MB. | Shipping wrangler would more than double the `.mcpb`. Cloudflare's API (script upload, assets, migrations, R2, custom domains) is the other way, and has no binary. |
| 4 | **The connector can already open the person's browser**: `openInBrowser` in `packages/noodl-mcp/src/tools/openStudio.ts:109` (Studio, the mini editor). | A `cloudflare_sign_in` tool needs no new mechanism to show the consent page (memory: use the existing mechanism). |
| 5 | **Claude Desktop has no URL-mode elicitation for a local connector** (HST-018 §7, read 2026-11-07: an open feature request, nothing shipped found). Its built-in OAuth is a REMOTE connector's own sign-in. | The sign-in is the connector's job: open the page, take the answer on a local callback. |
| 6 | **Cloudflare lets an app register its own OAuth client** (docs read 2026-11-07, *Create your OAuth client*, and the API `iam/oauth_clients` create): Authorization Code + PKCE, S256, no secret, for desktop and CLI apps. **Private** = the owning account only, no domain check. **Public** = any Cloudflare user, after a TXT record `cloudflare_oauth_client_publisher=…` on the client URL's domain (polled up to two days). 🔴 **Making it public is permanent, and once the domain is verified the client URL's domain cannot change.** Public needs a name, a logo URI, a verified client URI host and at least one non-identity scope. | Every reading can be taken on a private client on Richard's account first. The public step is a ruling (R2), with its permanence said. |
| 7 | **A Claude Desktop drive is the only grade of a `.mcpb`** (memory `desktop-built-in-node-is-a-helper.md`: Desktop's own Node is a helper, never grade the bundle on a real `node` alone). | ODT-006 is a drive in Desktop itself. |
| 8 | **`cf auth login` (Richard's cf 0.15.0) was granted** `registrar:write`, `registrar-domains.admin`, `email_sending:write`, `email_routing:write`, `workers_scripts:write`, `dns_records:edit` (HST-018 §6). | These scopes exist for Cloudflare's own first-party client. Whether a THIRD-PARTY client may be granted them is measurement (b). |

## 4. Tasks and order

| task | what | kind | depends on |
|---|---|---|---|
| ODT-000 | **The four measurements** on a PRIVATE OAuth client on Richard's account: (a) is a loopback redirect `http://127.0.0.1:<port>/…` accepted; (b) can a third-party client be granted registrar, Workers scripts, R2, DNS and email scopes; (c) does its access token upload a Worker, set a Durable Object migration, make an R2 bucket and attach a custom domain through the API, no wrangler; (d) how long the access and refresh tokens last. Plus (e): can the project's printed code go up as its own module beside a prebuilt Worker (multi-module upload), so no bundler runs on the person's machine. | measurement | R1 |
| ODT-001 | **`cloudflare_sign_in`**: the connector opens the consent page, takes the code on a loopback callback, keeps the token in the Keychain (or a `0600` file under `~/.nodegx`), refreshes it; the answer in Claude's words is "a Cloudflare page opened: click Allow". | product | ODT-000 (a), (d) |
| ODT-002 | **The deploy through Cloudflare's API**: what `wrangler deploy` does for P115's Worker (script + assets, the Durable Object class and its migration, the R2 binding, the email binding, the custom domain, the admin secret) as API calls, with P115's never-wipe-a-live-app guarantee kept. The comparison with wrangler shipped in the bundle (size, platforms) written beside it. | product | ODT-000 (c) |
| ODT-003 | **The build without a bundler on the person's machine**: the backend Worker prebuilt into the `.mcpb` (or published), the project's own parts (printed code, site files, automations) added at deploy; else `esbuild` shipped, with its size per platform. | product | ODT-000 (e) |
| ODT-004 | **The MCP tools**: find a domain, buy it (HST-018's `buyProblem`: the word-for-word yes stays in code, never in a prompt), set up email, deploy. One tool group, advertised the way the backend's are. | product | ODT-001…003 |
| ODT-005 | **The public client**: name, logo, the TXT record on the client URL's domain (`nodegx.io` is on Namecheap DNS), Cloudflare's verification read back, then public. Only after R2. | plumbing | ODT-001…004 green on the private client; R2 |
| ODT-006 | **The drive in Claude Desktop**: a fresh project, "let's get it online with Cloudflare", to a link that answers on a phone. Every human step counted (P115's measurement), and the words Claude said. | drive | ODT-004 (private client: Richard's account); ODT-005 for anyone else |

**Order:** ODT-000 first: its answers can remove whole tasks ((a) refused means a hosted callback page; (b) refused
means the registrar stays on `cf`; (c) refused means wrangler ships). Then ODT-001 and ODT-003 in parallel, ODT-002,
ODT-004, ODT-006 on the private client, and ODT-005 last.

## 5. Acceptance criteria

1. ODT-000's five readings are written down with the date, each from a real call on Richard's account.
2. From Claude Desktop, with no terminal opened at any point, a NodeGX project goes from "let's get it online with
   Cloudflare" to a link that answers on a phone; the human steps are one browser Allow and, for a domain, one yes.
3. No token, key or secret is in any project file, any `.env`, or any message Claude shows (searched).
4. A purchase happens only on the word-for-word yes, graded by the same tests as HST-018 through the MCP tool.
5. A redeploy from Desktop keeps every account, record, file and automation of the live app (P115 HST-014 AC2, rerun).
6. The `.mcpb` size before and after is written down, and the choice it reflects (API or shipped wrangler) is ruled.

## 6. Not this phase

- **A hosted NodeGX service** that deploys for people (UNI-008's free tier). The app stays on the person's account.
- **Other providers.** One that works completely first (DEP-006's rule).
- **The October research** (twelve runs, a box, a stranger timed): [`parked/online-the-twelve-runs/`](../../parked/online-the-twelve-runs/README.md).
- **Realtime on Cloudflare**, BUNDLEDROPS and EXPORTDATAPATH: still their owners' (P115 README §12).

## 7. Rulings (Richard's), plain words, recommendation first

| # | question | recommendation on 2026-11-07 |
|---|---|---|
| R1 | For ODT-000: the private OAuth client is created on your Cloudflare account. Will you click it together in the dashboard (Manage Account → OAuth clients), or make a short-lived API token with "OAuth Clients Write" for Claude to create it with? | The dashboard, once: no new key to look after, and the client's settings are visible to you. |
| R2 | Once it works on the private client: make NodeGX's client public? It is **permanent** (Cloudflare cannot make it private again), and its address domain is fixed once verified. | Yes, on `nodegx.io`, only after ODT-006 passes on the private client. |
| R3 | Ship wrangler in the extension (about +370 MB with its runtime, measured today; the extension is 217 MB) or deploy through Cloudflare's API? | The API, if ODT-000 (c) answers yes: no binary, and the bundle stays its size. |

## 8. Risks

- **Cloudflare refuses a third-party client a scope** (registrar is a beta). Then the domain stays on `cf auth login`
  (a terminal), and the person sentence loses "buy a name" until it is granted. ODT-000 (b) says which.
- **The API surface for Workers moves** (assets upload, migrations). wrangler absorbs that for its users; a direct
  caller absorbs it alone. ODT-002 pins the calls it uses and their doc dates.
- **Vendor readings decay.** §3 rows 5, 6 are from 2026-11-07 and are re-read on the day ODT-000 runs.

## 9. Sessions

| session | date | what |
|---|---|---|
| 0 | 2026-11-07 | Scoped (P115 session 15). §3 measured: the bundle's contents, wrangler's size, the deploy's needs, Cloudflare's client rules (two new: public is permanent; the domain is fixed once verified). |

**Estimate:** 5–7 sessions on the private client (ODT-000 1; ODT-001 and ODT-003 1–2; ODT-002 1–2; ODT-004 and
ODT-006 1), plus up to two days of Cloudflare's polling for ODT-005.
