# HST-007 — The domain

**Opened 2026-10-07.** **Depends on HST-003.** **Status: cut by R7 (2026-11-06) to Cloudflare's registrar and a Worker's custom domain; the name ruled 2026-11-07 (`my-hearth.org`, Campus at `campus.my-hearth.org`); `--domain` built (§9); the purchase and the live run are Richard's. The rest (other registrars, the connector buying it, the human steps counted per run) parks with the research at the close.** Kind: plumbing.

## 1. The person sentence

> **The person says the name they want. Claude says whether it is free and what it costs a year, the person buys it on
> their own Cloudflare account, and the site answers at it with a certificate, without anyone learning what a DNS
> record is unless they ask.**

## 2. What exists

- Cloudflare Registrar, read 2026-10-07: `.com` at $10.46 a year, at cost, WHOIS privacy and DNSSEC included.
- Cloudflare's API covers zones and DNS records; registrar purchase is the step most likely to stay human (R2).
- DEP-005 handled a hostname and TLS for a box. Pages and Workers do their own certificates once the record points.

## 3. What to do

1. Availability and price from the connector, before any purchase, in a sentence the person understands.
2. The purchase: either the connector does it behind a confirmation that repeats the yearly price, or it opens the
   page and waits (R2 decides; build the guided path first, it is the one that cannot spend by mistake).
3. The records: the connector writes them for Pages, for a Worker route, and for a box, and explains each in one line.
4. The teaching: what the connector says as it goes is kept as copy (HST-009 grades it).

## 4. Acceptance criteria

1. Fixture A answers at a real domain on Richard's account over HTTPS, from the connector, with the human steps counted.
2. The same domain switched from Pages to a box and back, with only records changing.
3. The person-facing sentences are in this file and pass the content-authoring skill's read (memory: copy passes the
   skill).

## 5. Not this task

Any registrar but Cloudflare's. Email at the domain (a later row in HST-000's list, if it is there).

## 9. Cut to Cloudflare (session 14, 2026-11-07)

- **The name.** Richard: a domain he will really use, Hearth first, renamed (*"hearth isn't just email"*). RDAP the same
  day: 26 Hearth .coms taken; he chose **`my-hearth.org`** (free; `my-hearth.io` free too; the .com taken). Campus goes
  on the sub-address `campus.my-hearth.org`, so the bare name stays for the product.
- **Built:** `deploy.mjs … --domain <hostname>` (kept in the record for later deploys; `--no-domain` removes it) writes
  a Worker Custom Domain (`[[routes]] pattern = "…" custom_domain = true`): Cloudflare makes the DNS record and the
  certificate. The domain's zone must be on the same account; a CNAME already on the hostname refuses it (*Custom
  Domains*, read 2026-11-07). The site needs no rebuild: the Worker answers `nodegx-config.json` with the address the
  page was loaded from. Graded: jest (the route, six bad hostnames refused in words) and a `--dry-run`.
- **Price**, read 2026-11-07: Cloudflare Registrar sells at cost; a .com about $10.44–$11.17 a year (sources disagree
  after the .com increase of 1 November 2026). The dashboard shows the price before paying.
- **The human steps**, to count on the day: (1) register the name in the dashboard; (2) turn on email sending for it
  (HST-017's sender) and verify his own address; (3) one command. Each is counted and timed in NEXT-SESSION-PROMPT §0.

