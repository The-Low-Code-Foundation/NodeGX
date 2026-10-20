---
id: P18-S109-MAGICRETURN
title: An exported app's magic link signs nobody in — the exported client had no sign-in return leg
status: fixed
commit: 22c973bbb
severity: high
area: export / Request Magic Link (src/api/client.ts)
found: P18 EXP-011 §79, session 109, 2026-10-15
evidence: dev-docs/tasks/phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md §79.3 (finding 1) and §79.5 (control arm C2)
---

A person clicks the sign-in link a `Request Magic Link` sent them and lands back on the exported app still signed out.
The one-time code stays in the address bar (`?nodegx_auth=…`) and is never exchanged.

Where: the backend's magic-link callback, like its provider callback, hands the app a one-time code on the redirect
(`nodegx-backend/src/server/oauth-routes.ts`, `finishSignIn` → `withHandoffCode`). The runtime picks it up in
UserService's constructor (`_consumeAuthReturn` → `ParseAuthAdapter.consumeAuthReturn`: strip, then
`POST /oauth/exchange { code }`, then store the session). The exported client (`emitApp.ts` `clientModule`) had
`requestMagicLinkRequest` and `currentUrlWithoutAuthParams`, and no return leg at all. `Request Magic Link` has been
`translated` since EXP-011 §44 (session 72); no spec followed the link back.

Reproduce: `tests/the-sign-in-with.test.ts` §E "P18-S109-MAGICRETURN" — account-desk's emitted client with the leg cut
off stores no session and keeps the code in the URL. The §79 drive's control arm (C2) shows the same through a real
backend and a real browser.

Fix (EXP-011 §79): the client's return leg, transcribed from `ParseAuthAdapter.consumeAuthReturn` and run once when the
client is evaluated, ships wherever the app can start a sign-in that comes back to it: a `Sign In With` or a
`Request Magic Link`.
