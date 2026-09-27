# BMG-010 — Email and Sign-in: a template editor, SMTP presets, and a provider wizard

**Opened 2026-09-24** (README §2 row 7). **Depends on BMG-001.**
**Status: ✅ built and driven s11, 2026-09-25 — §6.**

## 1. The person sentence

> **Someone edits the welcome email in a box with the names they can drop in, sees it rendered,
> and sends it to themselves. They set up "Sign in with Google" by following three steps that
> start with the URL Google will ask for, and never type a scope.**

## 2. What is wrong, measured

**Email** (`index.html:2417-2531`):
- SMTP is a fair form (host, port, user, password, from, base URL, TLS, verification switches)
  with a real *Send test email*. No presets: a person setting up Gmail, Resend, Postmark, SES
  or Mailgun looks up host and port elsewhere.
- **Templates cannot be edited.** The card shows id, *overridden/default* chip, the subject, and
  *Reset to default* (`:2470-2489`). `PUT /admin/email/templates/:id` and
  `GET …/:id/preview` exist (`admin-email.ts`); the editor's `EmailPanel.tsx` edits them (BMG-012
  deletes it).

**Sign-in** (`:1840-2059`):
- Providers table with the callback URL and *Copy URL* — the one thing BAK-004 got right
  (`:1841` docblock) — but the **provider modal** is nine fields at once: Preset, Provider id,
  Button label, Issuer URL, Client id, Client secret, **Scopes (space separated)** (`:2019`),
  Enabled, May create accounts. The preset fills scopes as a string (`:2006`).
- **Redirect allow-list** is a textarea, one origin per line (`:1901`).
- Magic links: fine (switch, minutes, signup switch).

## 3. What to build

### 3.1 Email
- **Provider presets** above the SMTP form: *Gmail / Google Workspace · Resend · Postmark ·
  Amazon SES (region picker) · Mailgun · Brevo · Other*. Picking fills host, port, TLS and
  the username hint (*"an app password, not your Google password"*), and shows the link to
  where that provider issues the credential. The values are a table in the app with a spec;
  nothing is fetched.
- **Templates**: each card opens a drawer: **Subject**, **Body** (a plain text area with a
  toolbar of **placeholder chips** — the placeholders the template engine supports, read from
  the backend: measure `email/` for the list; clicking a chip inserts it at the caret), a
  **Preview** pane rendered by `GET …/:id/preview` on every change (debounced), **Send me this**
  (test send with this template to the admin's address), *Reset to default* in a danger row.
  HTML editing stays behind *Edit HTML* for the 1%.
- The verification policy switches move under a heading **When someone signs up**.

### 3.2 Sign-in
- **Add provider** becomes a three-step wizard:
  1. **Which** — tiles: Google · GitHub · Microsoft · Apple (if the OIDC preset list has it;
     measure `auth/` presets) · *Another OpenID Connect provider*.
  2. **Register with them** — *the callback URL, first*, big, with **Copy**, and the exact
     steps for that provider in words (*"In Google Cloud → Credentials → Create OAuth client →
     Web application → paste this as an Authorised redirect URI"*), with a link to the console.
  3. **Paste back** — Client id, Client secret, and **What we may read** as checkboxes from the
     preset's scope list (*name and email* ticked and locked for sign-in; extras such as
     *profile picture* optional), plus *May create new accounts* and *Enabled*. Issuer URL only
     on the OIDC path. Provider id derived from the preset (editable under *advanced*).
- **Redirect allow-list** becomes **Where your app lives**: `Chips` of origins with validation
  (*must start with https:// or http://localhost*), one sentence on what it protects against.
- The providers table stays; a *not ready* provider says which of the three steps is missing.

## 4. Acceptance criteria

1. Picking *Resend* fills host/port/TLS and the test send succeeds against the email subsystem's
   test transport (`email-*` tests show the seam); the values table has a spec.
2. Editing the verification template's subject and body, previewing, and sending: the sent
   message (test transport) equals the preview; *Reset* restores the default and the chip says
   *default*.
3. Every placeholder chip inserts a token the engine renders (spec over the list the backend
   exposes; a chip for a name the engine does not know cannot exist).
4. The Google wizard produces the same provider record the old modal produced for the *google*
   preset (spec: fixture equality), with scopes as an array from checkboxes.
5. An origin chip `example.com` (no scheme) is refused inline; `https://app.example.com` is
   accepted and read back from `GET /admin/auth`.
6. `auth-config`, `auth-oidc-http`, `auth-github`, `email-*` suites green.
7. 🔴 No space- or line-separated text field on either page.

## 5. Watch for

- The callback URL depends on `baseUrl` and warns when it fell back (`:1854`); the wizard's step
  2 must show that warning *before* the URL, or a person registers the wrong one.
- The client secret is write-only (`hasClientSecret`, `:1990`); the wizard's edit path shows
  *(unchanged)* as today.
- Template HTML is rendered server-side; the preview route is the only renderer. Do not render
  in the page.

## 6. Built (s11, 2026-09-25)

**Where — backend:** `email/templates.ts` — **`TEMPLATE_VARIABLES`** (the `{{names}}` each template's real sender
supplies: reset + verify from `email-routes.ts`, magic link from `oauth-routes.ts`; a name, a label, a sample),
**`sampleVariables(id)`** (the ONE sample set a preview and a test send render with), `templateTokens`.
`server/admin-email.ts` — `GET /admin/email/templates` decorates each entry with **`variables`**; `GET
…/:id/preview?subject&text&html` renders an UNSAVED draft from the query (a blank field falls back, as a save does);
`POST /admin/email/test {to, template, …draft}` renders the draft over the effective template with the preview's
samples and sends it, answering `sent` (`TestSendResponse`) — same route, so the audit action and the read-only
refusal cover it. `server/admin-auth.ts` — `GET /admin/auth` answers **`callbackUrlTemplate`** (`…/oauth/{id}/callback`,
built by the same function as every row's URL) so the wizard can show the URL to register BEFORE anything is stored.
`email/EmailConfigState.ts` — the not-configured sentence points at the Email page, not the editor panel BMG-012
deletes. **No new route** (tally stays `admin: 93`); nothing new to audit.
**Where — app:** **`smtpPresets.ts`** — the table (Gmail / Google Workspace · Resend · Postmark · Amazon SES with
`SES_REGIONS` · Mailgun · Brevo · Other: host, port, TLS, what Username and Password are IN WORDS, the page where the
credential is issued), `presetFor(host)` (the stored host reopens on its tile, SES with its region), `fillFrom`.
**`providerWizard.ts`** — `TILES` (Google · GitHub · Another OpenID Connect provider — the backend's three presets;
Microsoft and Apple are NOT presets, §7), `scopeBoxes` (a box is a GROUP of scopes with a sentence — identity locked,
profile optional, a GitHub identity box; an unknown scope on a saved provider is its own optional box, never dropped),
`scopesFrom`, `draftFor`/`draftFrom`/`draftId` (google → `google`, an OIDC name → its slug, editable under
*Advanced*), `idProblem` (the server's `ID_PATTERN` + reserved ids), **`wizardPayload`** (AC4), `draftProblem`,
`registerSteps` (each provider's console words), `stepMissing` (derived from the record, not the reason's text),
`originProblem`/`normaliseOrigin` (AC5: https, or http on loopback; a pasted page URL keeps its origin).
`views/email.tsx` — provider tiles that fill host/port/TLS and hint both credentials with the link; *When someone
signs up* as two switches; template cards in words (*Password reset · Verify your email · Sign-in link*) with **Edit**
→ a drawer at `#/email/<id>`: Subject, a **placeholder bar** of chips from `variables` (a click inserts `{{name}}` at the
caret of the field last focused — `insertToken`, pure), Body, a **Preview** pane asked of the server 300 ms after every
change and shown as TEXT (§5: nothing is rendered in the page), *Edit HTML* behind a disclosure with the rendered HTML
as source, **Send me this** (an address dialog, remembered), Save, *Reset to default* in a danger row (confirmed).
`views/signin.tsx` — the **three-step wizard** in a drawer at `#/signin/new` / `#/signin/<id>`: WHICH (tiles + the
button label, the issuer URL for OIDC), REGISTER WITH THEM (the base-URL fallback warning FIRST, then the callback URL
big with **Copy**, a link to the console, the steps in the provider's own words, *Advanced: the id*), PASTE BACK
(client id, secret with *(unchanged)* on an edit, **What we may read** as boxes, two switches); the table says
*Missing — Step N: …* on a not-ready row; **Where your app lives** = `Chips` (`normalise` prop added) over
`originProblem`. `ui/styles.css` — `.tiles.providers`, `.placeholder-bar`, `.preview-pane`, `.wizard-steps`, `.callback-url`.

**Not built, and why:** *Microsoft* and *Apple* tiles — `auth/model.ts` PROVIDER_PRESETS has google, github, oidc
only (§3.2 said "if the OIDC preset list has it"); an Entra preset needs a tenant in its issuer and Apple's is not a
plain OIDC client secret, so both are §7 candidates, not a tile that would save a record that cannot sign in. **Per-
template placeholder for the Send Email node's own variables** — those are the node's (`service.ts` spreads
`request.variables`), not the template's; offering them would be a chip the built-in flows never fill.

**Specs:** `tests/bmg-010-email-signin.test.ts` (over sockets: AC3 the variables per template pinned BY NAME against
the senders, every default's tokens on its list, every sample renders non-empty; AC1 the table's invariants + Resend
through the config route and the test transport; AC2 an unsaved draft previews from the query and *Send me this* puts
the SAME words on the wire, nothing saved; save → edited, reset → default; 404 in words; AC4 `wizardPayload` equals
the old modal's payload verbatim and the stored record equals what the old shape stored, secret never echoed; a
box left unticked drops only its scope; AC5 the page's rule and the server's; `callbackUrlTemplate` builds every
row). `tests/admin-app/email-signin-views.test.tsx` (jsdom: AC1 the tiles fill and hint, SES by region, the sign-up
heading; AC7 no textarea / no "separated" on either page, drawer open or closed; `presetFor`; AC3+AC2 the chips are
the backend's list, a click inserts at the caret in the focused field, the preview request carries the draft and the
pane shows the server's words as text, Save sends three fields; `insertToken`; AC4 the wizard end to end with the
old modal's payload; §5 warning before the URL, edit opens on step 3 with *(unchanged)*; the OIDC path derives and
edits the id; AC5 chips; `stepMissing`; the model). `admin-dashboard.test.ts` — the external-origin gate names the
six credential pages as a REVIEWED set held equal to the table, and ignores a scheme-only fragment in a sentence.
**Drive:** `drives/bmg010/run.sh ac seed` (LOCKED backend, no email, no providers, the bmg005 SMTP sink) — **42/42
checks, no page errors**; shots `shots/bmg010-*.png`; readings `drives/bmg010/readings.json`.
**Gate:** `npm run typecheck` exit 0 (both configs); bundle 85,835 gzip (budget 160,000); AC6 suites `auth-config`,
`auth-oidc-http`, `auth-github`, `auth-linking`, `email-config/flows/mailer/secrets/templates/tokens` green;
`ops-rate-limit` tally unchanged; full `npx jest --maxWorkers=4` **197 suites PASS, 1 FAIL, 1 skipped (`fed-003-live-cache`), 2375 tests, 335 s** (2026-09-25, s11) — the one FAIL was `tpl002-notifications` pinning the OLD not-configured sentence (*Backend Services panel*), repointed at the new one and 29/29 alone.

**What each AC measured:**
1. *Resend* tile → `#smtp-host` smtp.resend.com, port 465, TLS ticked, the hint *Username: The word resend. Password:
   An API key from Resend* with the link to resend.com/api-keys; Gmail says *an App password, not your Google
   password*. Pointed at the sink (Other · 127.0.0.1:2526), Save → `GET /admin/email/config` configured; *Send test
   email* → one message in the sink to me@drive.test. Over sockets the Resend values go through the config route and
   the test transport.
2. `#/email/verifyEmail`: subject *Hello {{username}} from {{appName}}*, body *Go here: {{verifyUrl}}…* → the pane
   read *Hello jane.doe from Your App* / the sample URL (the server's rendering, text only); *Send me this* → the
   sink's message had that exact subject and, quoted-printable decoded, that exact body, while `isOverridden` was
   still false; Save → `effective.subject` equals the draft and the card chip says *edited*; *Reset to default* (a
   confirm) → the shipped subject and the chip *default*.
3. The chips were exactly the route's `variables` for verifyEmail (name and label), with no *expiresIn* (its sender
   does not supply one); clicking every chip into an emptied body gave `{{appName}}{{username}}{{verifyUrl}}` and the
   preview rendered each as its sample with none empty.
4. Which (Google, label prefilled) → Register (callback URL equal to `callbackUrlTemplate` for `google`, the base-URL
   warning ABOVE it, Google's four steps, the console link) → Paste back (two boxes: identity locked on, profile on;
   no scope field; Add disabled until both pasted) → `GET /admin/auth` held `{id, kind:oidc, displayName:Google,
   enabled, clientId, issuer:accounts.google.com, scopes:[openid,email,profile], allowSignup}` with the secret set and
   never echoed. A GitHub row saved without a secret read *not ready · Missing — Step 3: the client secret*, and its
   Edit opened on step 3 with *(not set)*.
5. `example.com` + Enter → *An origin starts with https:// (or http://localhost while you develop) — e.g.
   https://example.com*, no chip; `https://app.example.com/after/signin?x=1` → the chip *https://app.example.com*;
   Save policy → `redirectAllowList: ["https://app.example.com"]` read back.
6. See Gate.
7. Both pages, drawers closed and open: zero textareas on the pages (the drawer's two are the body and the HTML —
   prose); no control whose words say *separated*, *per line*, *one per* or *comma*.

## 7. Candidates this task surfaced (§6 of the README)

- **Microsoft Entra and Apple as tiles** — Entra needs a tenant id in the issuer (`login.microsoftonline.com/<tenant>/v2.0`;
  `common` breaks strict issuer checks), Apple signs its client secret as a JWT from a key — each a preset with one
  more field, not a code path, but neither is in `PROVIDER_PRESETS` today.
- **The magic-link template's `expiresIn` comes from `ttlMinutes`** at send time; the preview says *15 minutes*
  whatever the policy says. A preview that reads the configured TTL would be one line in `sampleVariables`.
