# HST-017 — The page says why, and the builder is told

**Opened 2026-11-07, session 14 (README §8 R8).** **Depends on HST-014.** **Status: ✅ built and graded on workerd,
session 14 (§3); live waits on Richard's domain and redeploy (§4).** Kind: product.

## 1. The person sentences

> **When my app goes over its free allowance, a visitor reads why instead of a broken page, and I get one email.**

## 2. Why, and what was measured first (2026-11-07)

HST-004 §10 built a refusal email for the Fixture B Worker, where the line was CPU (1102: a call over ~2 s on Free).
On the product Worker (HST-014) the backend runs in a Durable Object, which has **30 s of CPU a call on Free as on
Paid** (*Durable Objects limits*, read 2026-11-07), and live it uses 1–54 ms (`wrangler tail`, HST-014 §5.6); the front
Worker routes in 0–6 ms. So the 1102 is out of reach. What a deployed app meets is the **account's daily allowance**
on Free: 100,000 requests (Workers and objects each), 100,000 rows written, 5M rows read, 13,000 GB-s, reset 00:00
UTC. Cloudflare says only *"further operations of that type will fail with an error"*: the wording is unpublished.

**R8, Richard 2026-11-07:** *catch it, say it, email* (chosen over also triggering it once on purpose, which would stop
every Worker on his account until midnight UTC, and over leaving it out). The email goes through the domain bought for
HST-007 (Cloudflare's own sending, free to a verified address), not Resend's shared sender that Gmail filed under All
Mail (HST-004 §10.5).

## 3. Built and graded (session 14, Opus 5.5)

| piece | what |
|---|---|
| `cloudflare/front.ts` | the Worker's request handling, with its bindings handed in (pure: graded in jest). Every call into the object goes through `fromBackend`: a throw is answered `503 {code, error}` (the backend's own error shape, so a Record or Query node's failure carries the sentence) with `x-nodegx-refusal`, then told after the answer (`waitUntil`). When the object cannot even say its routes, a file the site has is still served, and a page **to a browser opening one** (`Sec-Fetch-Mode: navigate` / `Accept: text/html`); a data call keeps the sentence |
| `cloudflare/refusal.ts` | `refusalKind` (any of "exceed", "limit", "quota", "allowance", "too many" = the daily allowance; else the backend failing: nothing waits for one wording), the two sentences, the email with **Cloudflare's own words** in it (so the first real one teaches the next session the wording), once a UTC day per kind (this isolate + the Cache API, best effort: a second email on a busy day is the worst case; only a SENT email closes the day), one log line per refusal (`nodegxRefusal`) |
| `/__nodegx/alert-test` | POST, admin credential only (404 otherwise, same-length compare): the test email |
| `deploy.mjs --alert-to <address> --alert-from <address on a Cloudflare domain>` (`--no-alert`) | kept in the record; `[[send_email]] name = "ALERT_EMAIL"` + `NODEGX_ALERT_FROM/TO`; one test email when the addresses are new (live), every `--local` run, with the words *"if it is in Spam or only in All Mail, mark it Not spam"* |

`worker.ts` keeps the object and calls `handleRequest`.

**Graded.**
- `tests/p115-hst017-refusal.test.ts` 10/10: the words; once a day across "isolates" (memory forgotten, the cache
  remembers) and again the next UTC day; a failed send (`E_SENDER_NOT_VERIFIED`) leaves the day open; the config; and
  the front Worker with a backend that throws (a control that answers; a refused data call → 503 sentence + one email;
  the object unreachable → page, engine file, and a data call's 503; the test door 404 without the credential).
  **The suite caught a defect in the first version**: with the route table unreadable, `/classes/Reader` (no dot) was
  answered with the app's HTML. Mutant: the backend call un-awaited (its rejection escapes the `try`) → 2 red.
- HST-014's suite 14/14 (`--domain` and the addresses in the config).
- **workerd** (`--local`, Fixture B copy, `--alert-to owner@example.com --alert-from alerts@my-hearth.org`): the Worker
  built with the catch answers as before (`GET /classes/Reader` 200); the test door 200; workerd's `send_email`
  binding *"called with MessageBuilder: From: "NodeGX" <alerts@my-hearth.org>, To: owner@example.com, Subject: … will
  tell you here if it goes over its plan"*; the command printed *"A test email went to owner@example.com"*.
- **Not graded: a real refusal.** By R8 none is triggered on purpose; the first one is read from the email's quoted
  words and the Worker's log, and the sentence's classifier is checked against them then.

## 4. Left

1. Live: Richard's steps in NEXT-SESSION-PROMPT §0 (the domain, email sending on it, his address verified, the redeploy
   with `--alert-to/--alert-from`). The test email arriving in his Inbox is the reading.
2. Not caught, by Cloudflare's design: the **Worker's own** 100,000 requests a day (refused before the Worker runs).
   With `run_worker_first = true` every file the page loads is a Worker request; counting a page view, and whether
   `run_worker_first` can be narrowed to the backend's families, is a measurement for after the close.
