# BMG-010 — Email and Sign-in: a template editor, SMTP presets, and a provider wizard

**Opened 2026-09-24** (README §2 row 7). **Depends on BMG-001.**
**Status: 📋 not started.**

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
