# HST-014 — The deploy command

**Opened 2026-11-05.** **Depends on HST-010…013.** **Status: 📋 not started.** Kind: product.

## 1. The person sentence

> **The person says "put it online"; Claude runs one command, and a full-stack app answers on their own Cloudflare
> account, the same address every time, without wiping what is already there.**

## 2. Why

Today a person would need what the spike does by hand: `site.mjs` (the interpreter site with the production viewer),
`seed-campus.mjs` (boots FRESH, which wipes), and `wrangler deploy` with a hand-written `wrangler.toml`
(Durable Object, assets, R2 binding). The spike's `worker.ts` holds the seams HST-010…012 turn into product options.

## 3. What to build

`nodegx deploy --cloudflare` (and the MCP's equivalent): the Worker entry as a product file (the host that passes
`loopbackFetch`, the store and the bucket), the site built with the production engine, the project's rules, roles and
collections applied to the running backend (never a fresh boot of a live one), the refusal alert (HST-004 §10)
carried over, and the warm-up at startup (HST-004 §9).

## 4. Acceptance criteria

1. Fixture C deployed by the command alone to a new Worker name on Richard's account, MUST 1–8 on his phone.
2. A second run of the command keeps every record, account and file.
3. No key or token in any uploaded or committed file (phase AC7).
4. (added s9, P115-S9-SITEROUTES) The page and the backend share one origin by the service's own route table, not a
   hand list: a GET on every route's first segment reaches the backend (the spike's list missed `mcp` and three more,
   and `security-enforcement`'s route walk caught `GET /mcp` answered by the page).
