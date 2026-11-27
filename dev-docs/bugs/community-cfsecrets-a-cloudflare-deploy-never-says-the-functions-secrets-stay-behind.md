---
id: COMMUNITY-CFSECRETS
title: "`@nodegx/backend deploy cloudflare` never says the cloud functions' secrets stay behind, so a builder looks for them in Cloudflare's dashboard"
status: fixed
commit: uncommitted (working tree, 2026-11-27)
regression: packages/nodegx-backend/tests/community-cfsecrets-deploy-guide.test.ts
severity: medium
area: "`packages/nodegx-backend/cloudflare/deployCloudflare.ts` `applyEverything` and the closing lines of `deploy`; `packages/nodegx-backend-npm/README.md`, shipped in `@nodegx/backend`"
found: Community report via Richard, 2026-11-27. A builder deploying without an agent got the app up on Cloudflare, then could not find where to set the token their cloud function reads ("I can't find the nodegx backend here")
evidence: "Locally the token was set on the backend's Secrets page (or the app's `.env`). Neither travels with a deploy: `.env` is a hidden file the deploy leaves out, and the Secrets page writes the local data dir's `secrets.json`. The deployed backend keeps its own secrets in its Durable Object's `_nodegx_data_dir` table (`cloudflare/dataDirTable.ts`), set through its own `/_admin` Secrets page. The deploy's output names `/_admin` once, on its last line, and says nothing about secrets. The npm README has no word on secrets. The runtime's own Failure message is right (`service.ts` resolveFunctionSecret: 'A secret does not travel with a deploy'), but a builder only sees it when the function runs and the graph shows its Error."
---

A builder deploys an app whose cloud function reads a secret with a Secret node. Locally it works: the value is on
the backend's Secrets page, or in the app's `.env`. On Cloudflare the deploy passes all six steps and prints
"Online". The function then fails, because the deployed backend has no secrets. The builder looks in Cloudflare's
own dashboard (Workers → Settings → Variables and Secrets), where a NodeGX function secret never lives.

**Where.** Nothing in the deploy compares the secret names the functions read with the names the deployed backend
has. Its output names `<url>/_admin` only on its last line, as "the backend's dashboard", and never says secrets are
set there. None of the deploy's steps or refusals points at a guide.

**Proposed fix:**
1. After step 6, read the Secret nodes' `name` parameters from the functions bundle and `GET /admin/secrets` on the
   deployed backend. Print what is set and what is not. For each missing name, say whether the app's `.env` holds it
   (it stays on this computer) and point at `<url>/_admin#/secrets`, with where the admin credential is kept.
2. Print a link to a guide (`docs-site/docs/deploy/cloudflare.md`) at the start of the deploy, and with each step's
   refusal, at that step's section.
3. Add the secrets to the npm README.
