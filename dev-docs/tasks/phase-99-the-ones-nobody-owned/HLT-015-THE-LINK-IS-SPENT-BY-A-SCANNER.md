# HLT-015 — The link is spent by a scanner

✅ **BUILT 2026-09-21 (P99 s12), AC1–6. AC7 is the DBT stream's (its L171).** On a real socket,
3 `curl` GETs and 1 Chrome load of a fresh link: 200 *"Sign in to …"*, no cookie, no redirect,
token row byte-identical, **0** sessions. HEAD: the 1st GET signed in and Chrome met *"Sign-in link
expired"*. §2 measured TRUE. The shipped email carried the defect's sentence too, and now does not.
[Verdict](./verdicts/HLT-015/2026-09-21/VERDICT.md).

🔴 **Opened 2026-09-21 from the Digital Bricks Training stream (its sprint 49), at Richard's
request** — asked whether the template should accept NodeGX's magic-link flow or fix it in core, he
chose core: *"Fix it in NodeGX core."* Measured by reading the source; §4's first criterion is the
drive that confirms it.

## 1. The person sentence

> **Someone whose company scans every link in their inbox before they see it can still sign in with
> the link they were sent — because opening a link never spends it; only the person pressing the
> button does.**

## 2. What it is, measured 2026-09-21 by reading (`cline-dev` HEAD `25ec21f11`)

- **The GET consumes.** `GET /auth/magic-link/callback?token=` →
  `OAuthRoutes.magicLinkCallback` → `this.deps.tokens.consumeRow(token, 'magic')`
  (`packages/nodegx-backend/src/server/oauth-routes.ts` ~618–621). The token is spent and the
  session minted on the request the link itself makes.
- **Consequence, concretely:** Microsoft Defender Safe Links, Mimecast, Proofpoint and similar
  follow every URL in an incoming message before delivery. On those mailboxes the link is spent
  before the person clicks it and they meet *"Sign-in link expired"* — every time, with nothing to
  tell them why. Worse the other way round: anything that fetches the link (a preview bot, a
  shared-link unfurler) is **signed in** as that person.
- **The Digital Bricks Training product fixed exactly this** (its task L122, 2026-09-02): a GET
  renders a landing page and consumes nothing; only a POST from that page redeems. Driven there with
  three curl GETs and two browser loads on one link: no session cookie and the token still unused
  each time.
- `docs/runtime/BACKEND-AUTH.md` §Magic links tells authors *"Anyone who opens it is signed in"* —
  true, and that sentence is the defect stated as documentation.

## 3. The shape, decided

1. **`GET /auth/magic-link/callback?token=` becomes read-only.** It checks the token *without
   consuming it* (a `peekRow` beside `consumeRow` in the token store — it must not extend or touch
   the row) and renders a small page from the existing error-page renderer's styling: *"Sign in to
   <app>"*, one button, and nothing else. An unknown, expired or spent token renders the existing
   *"Sign-in link expired"* page — the same body for all three, so the page is not an oracle.
2. **`POST /auth/magic-link/callback`** (form body `token`) consumes and does exactly what the GET
   does today — the same linking rule, the same `nodegx_auth` exchange, the same redirect.
3. **The page's button is a plain HTML form POST**, no JavaScript, so it works in every mail
   client's in-app browser and under a strict CSP.
4. **Rate limits move with the consume**: `auth:magic-consume` applies to the POST; the GET gets its
   own looser bucket (a scanner may fetch a link several times).
5. **No new port, no new node, no editor change.** `Request Magic Link` is unchanged; an app that
   uses it gets the fix by upgrading its backend.
6. The docs sentence *"Anyone who opens it is signed in"* is rewritten to say what is now true.

**Not in this task:** a typed one-time code beside the link (the product has one — L122 §5.1 — but
it is a feature, not the defect); a dev console link when SMTP is absent (the email docs name a local
mail-capture server as a non-goal; an SMTP sandbox is the stated answer).

## 4. Acceptance criteria

1. **Before the change, on the running backend:** `curl` GET of a fresh link → a session is minted
   and the token is spent (the next GET renders *expired*). Recorded as the control.
2. **After:** three `curl` GETs and one browser load of a fresh link → **no `Set-Cookie`, no
   `nodegx_auth` in any redirect, the token row unchanged** (read off the token table, not inferred).
3. The page's POST signs in and lands where the old GET landed; a **second** POST renders *expired*.
4. Unknown, expired and spent tokens render **byte-identical** GET bodies.
5. The full auth suite green; a new test pins *"the GET handler cannot reach `consumeRow`"* —
   demonstrated failing by name with the old call restored.
6. `BACKEND-AUTH.md` no longer says that opening the link signs you in.
7. Driven end to end from the Digital Bricks Training template's sign-in page (its L171): request,
   read the link out of an SMTP sandbox, curl it twice, then sign in in a browser.

## 5. Owner and neighbours

Built from the DBT stream as a dependency of that template's L171, **in its own commit with only
this task's paths staged** (the HLT-014 precedent: a peer session edits the rest of the tree).
