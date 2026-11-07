# HST-018 — Claude finds and buys the domain

**Opened 2026-11-07, session 14 (Richard: *"shouldn't we have a way that Claude can manage the domain finding and
purchase for the user? The more it's A to Z the more non tech people will like it"*).** **Depends on HST-007 §9,
HST-017.** **Status: ✅ built and graded against a scripted API (§3); the first real purchase is `my-hearth.org` (§4).**
Kind: product.

## 1. The person sentence

> **I tell Claude what my app is called; it finds a name that is free, tells me the price, and after I say yes the app
> is on it, with its emails coming from it.**

## 2. What was measured first (2026-11-07)

- **Cloudflare's Registrar API** (beta since 2026-04-15, *Registrar API* guide and changelog): search, check
  availability and price, register at cost, poll; transfers since 2026-09-30. It charges the account's **default
  card**, uses its **default registrant contact**, and is **non-refundable**. Cloudflare's guidance to agents: *"Always
  confirm the domain name and price before calling this endpoint."* Only a subset of endings is in the beta (`.com`,
  `.dev` in its examples; `.uk` refused `extension_not_supported_via_api`); `.org` and `.io` are not named.
- **`wrangler login` (4.157) cannot buy**: its 19 scopes have no registrar one. It **can** set up email: it holds
  `email_sending:write` and `email_routing:write`, and wrangler has `email sending enable <domain>` and `email routing
  addresses create <email>`.
- Other registrars with buying APIs exist (Porkbun, Name.com, Namecheap with a $50 balance and a whitelisted IP,
  GoDaddy, Dynadot), but a Worker's custom domain needs the zone on the same Cloudflare account, so buying on
  Cloudflare is one step where any other is three (buy, add the zone, move the nameservers).

**Ruled 2026-11-07 (Richard): build it now, and buy `my-hearth.org` through it.** That also answers README §8 R2 (may
the connector spend the person's money?): yes, only after the person said yes to the exact name and price.

## 3. Built and graded (session 14, Opus 5.5)

| piece | what |
|---|---|
| `cloudflare/registrar.ts` | the client (search, check, register, status, wait) and **`buyProblem`**: a purchase needs a check made just before it AND a confirmation repeating that check word for word (`<name> <first-year cost> <currency>`); otherwise no request is sent. Sentences for each refusal reason and each end state (`action_required` stops polling and says what Cloudflare needs) |
| `cloudflare/domain.mjs` → `domainCommand.ts` | `find <words>`, `check <names>`, `buy <name> [--confirm "…"] [--no-auto-renew]`, `status <name>`, `email <domain> [--to <address>]`. `buy` without `--confirm` prints the offer, the renewal, *"cannot be refunded"* and the exact sentence to say yes to. Auto-renew ON by default (an app whose name lapses stops, and its owner would not know why). Purchases written to `~/.nodegx/cloudflare/domains.json`. `email` runs the two wrangler commands with the deploy's own login |
| credentials | an API token with Registrar permission, from `CLOUDFLARE_API_TOKEN` or `~/.nodegx/cloudflare/registrar-token` (refused unless mode 600, never printed); the account is the one the token sees, `--account`, or `CLOUDFLARE_ACCOUNT_ID` |

**Graded:** `tests/p115-hst018-domain-purchase.test.ts` 12/12 against a scripted API that records every request: the
control buys (check right before, `{domain_name, auto_renew: true}`, 202 → polled → *"is yours until 2027-11-07,
renewed automatically each year"*, recorded); no confirmation, a moved price, another name's confirmation, a taken
name, an ending the beta cannot sell: **no POST to `/registrations`** in each; `action_required` stops and says why;
the token file at 644 refused; a non-domain refused before any call. Mutant: the confirmation comparison off → 3 red.

## 4. Left: the first real purchase (Richard)

1. Once, in the dashboard: a default card (Billing) and a default registrant contact (Domain Registration), if not
   there already; then **My Profile → API Tokens → Create Token → Custom token** with the account's Registrar
   permission at Edit and Account Settings at Read. Save it from his own terminal:
   `pbpaste > ~/.nodegx/cloudflare/registrar-token && chmod 600 ~/.nodegx/cloudflare/registrar-token` (a secret: never
   through a session).
2. A session runs `domain.mjs check my-hearth.org my-hearth.io` (no money): is `.org` in the beta, and its price today.
3. Richard says yes to the printed sentence; `domain.mjs buy my-hearth.org --confirm "<that sentence>"` (a purchase:
   his terminal, or his approval of the call).
4. `domain.mjs email my-hearth.org --to <his address>`, he clicks Cloudflare's link, then the deploy with `--domain
   campus.my-hearth.org --alert-to … --alert-from alerts@my-hearth.org` (HST-017's test email is the reading).
5. Count the human steps against session 14's hand route (dashboard purchase, dashboard onboarding): that is HST-007's
   measurement.

Not built: an MCP tool for it. The deploy itself is not an MCP tool yet (HST-014 §5.4 item 3, waiting on where the
engine lives, P112 R2); both become tools together. Today Claude drives both commands from a terminal.
