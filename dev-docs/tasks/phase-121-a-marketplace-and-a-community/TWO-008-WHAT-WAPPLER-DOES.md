# TWO-008 — What Wappler does

**Opened 2026-10-14.** **Depends on nothing.** **Status: ✅ done s1, 2026-10-14** (read; two rows filed, the rest owned elsewhere). Kind: research.
**Model:** Opus.

## 1. The person sentence

> **The builder said Wappler is a great tool and that we could look at it to make NodeGX better. We did, and NodeGX is
> better for apps like his because of it.**

## 2. What exists

- The builder's words (BRIEF.md). Nothing in the repo about Wappler (to check with a grep first).
- P86 (the community already built it) as the shape of a "what others have" survey.

## 3. What to do

1. From Wappler's public docs, site and community (no installs, no trial needed): what it offers for an e-commerce
   app and a community app. Payments, databases, user accounts, file uploads, server-side actions, deployment, and
   how a beginner is led through them.
2. For each: NodeGX has it (where), has it worse (how), or lacks it. Dated, with links.
3. Each "lacks it" or "worse" that matters for this phase's two apps becomes a row in P78's defect register, or a
   line in TWO-003 or TWO-005 if it's in scope there.

## 4. Acceptance criteria

1. The comparison table in this file, every row sourced and dated.
2. The rows that matter filed, each with its owner or NONE.

## 5. Not this task

Copying Wappler's design. Anything that needs a Wappler licence.

## 6. What was read, s1 (2026-10-14)

Wappler's site, docs and forum, read 2026-10-14 by a research agent (no install, no trial). **The NodeGX column was
measured in the repo afterwards**, not taken from the reading; one of the agent's guesses was wrong (sign-in, below).
Latest Wappler stable found: 7.9.5; Wappler 8's roadmap (community.wappler.io/t/66969, 2026-05-12) aimed at a beta in
September 2026, none found.

| area | Wappler (source) | NodeGX, measured 2026-10-14 |
|---|---|---|
| payments | **Stripe only**, many prebuilt actions; checkout from a server action holding the key; Stripe webhooks since 3.9.1, a Stripe CLI terminal to test them locally ([getting started](https://docs.wappler.io/t/getting-started-with-stripe-integration-in-wappler/31295), [webhooks](https://docs.wappler.io/t/getting-started-with-stripe-webhooks/31485)). Paystack: one forum thread (2019), none built. Flutterwave: nothing. Stripe Connect: no docs found. Pro only. | **Lacks it.** No provider at all (grep). Webhook trigger verifies `hmac-sha256` or a token only: Paystack's SHA-512 refused (**P121-TWO008-WEBHOOKSHA512**, TWO-004). |
| database | visual Database Manager, every change a Knex migration file; a visual query builder that switches to SQL; MySQL, Postgres, SQL Server, SQLite ([forum](https://community.wappler.io/t/database-manager-create-manual-migration/33791)) | Has it, differently: the backend manager's collections; P116's world → schema, with planned migrations (`nodegx-backend/src/migrate/`). No SQL view. |
| accounts | Security Provider (one user, a list, a table), Security Restrict per page/action, 18+ OAuth providers ([guide](https://docs.wappler.io/guided/security-provider-fundamentals)) | **Has it** (the agent guessed "narrower"; wrong): password, OIDC with a Google preset, GitHub, magic link (`nodegx-backend/src/auth/model.ts`), the six-digit email code's backend half (P119 SRK-001 s1); roles and a policy file. **Lacks** phone-number sign-in, which many people in West Africa use first; not filed (no one has asked; a note for TWO-009's play test). |
| uploads, images | server steps: resize, auto-orient, crop, save as format and quality; **resize in the browser before upload** ([thumbnail](https://docs.wappler.io/t/resize-image-and-create-a-thumbnail-on-upload/4802), [client resize](https://community.wappler.io/t/3112)) | Has the server half (S3 or local, `?thumb=` through `sharp`). **Lacks the browser half** (**P121-TWO008-UPLOADSHRINK**). |
| server logic | Server Connect: visual server actions, each an endpoint; a Node-only scheduler with reported bugs ([scheduling](https://docs.wappler.io/guided/node-js-scheduling-actions)); no general webhook trigger, Stripe's only | Has it and more: cloud functions, cron, db-change and webhook triggers with overlap policies. |
| realtime | Socket.IO, Node only, "refresh data on a server event" ([guide](https://docs.wappler.io/t/realtime-data-update-with-nodejs-and-websockets/28089)) | Has it (`RealtimeHub`). |
| PWA, offline, push | **No PWA**: requested since 2019 ([thread](https://community.wappler.io/t/pwa-support/10409)), on the 8 roadmap. Mobile through Capacitor; a beta local SQLite; push only as a community Firebase recipe | **Lacks it**, owned: P119 SRK-005 (manifest, service worker, push), P110 (0 of 14). Not filed again. |
| deploy | FTP/SFTP, Docker, DigitalOcean; a Resource Manager making servers on DigitalOcean, Hetzner ([docs](https://docs.wappler.io/t/managing-cloud-servers-with-resource-manager/43716)); Coolify asked for by users, unanswered ([thread](https://community.wappler.io/t/62118)) | Owned: P112 OWN-016 (ship it); TWO-011 (Coolify). |
| beginners | a 7-lesson "start here" that builds one Products page; in-app tours on the real panels; a clean starter; docs split how-to / reference / concepts ([learning curve](https://wappler.io/learning-curve)); "app starters" (CRUD, roles) only on the roadmap | Templates on the shelf (P78); this phase's two tutorials (TWO-007). Tours: P120's beginner's editor. |
| price | a paid desktop app, Pro about €39 a month; Stripe, the database tools and auth are Pro only ([pricing](https://wappler.io/pricing)) | Free and open source. |

**What it means for this phase.** Wappler doesn't cover his two apps better than NodeGX would: it has no African
payment provider, no split payments and no PWA. Where it is ahead and this phase needs it: **shrinking a photo before
upload** (filed, NONE owner, TWO-005 takes it if nobody has) and **testing a payment webhook locally** (a line added
to TWO-004 step 5). Starter apps for a marketplace and a community are what this phase makes; Wappler's are still on
its roadmap.

Filed: P121-TWO008-WEBHOOKSHA512 (owner TWO-004), P121-TWO008-UPLOADSHRINK (owner NONE). Not filed, owned elsewhere:
PWA and push (SRK-005, P110), deploy (OWN-016, TWO-011). Not filed, unasked: phone-number sign-in.
