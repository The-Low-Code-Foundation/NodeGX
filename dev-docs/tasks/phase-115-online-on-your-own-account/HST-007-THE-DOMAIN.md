# HST-007 — The domain

**Opened 2026-10-07.** **Depends on HST-003.** **Status: 📋 not started.** Kind: plumbing.

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
