---
id: P121-TWO005-SIGNUPSWITCH
title: The admin app's "An address nobody has used yet may create an account" reads on while the policy refuses every new account
status: fixed
commit: (this session, the Beta sweep s6)
severity: low
area: backend / admin app, Sign-in (`packages/nodegx-backend/src/admin/app/views/signin.tsx` :200, :237-240; the rule in `src/server/oauth-routes.ts` :633, :828)
found: P121 TWO-005 s11, 2026-10-15
regression: packages/nodegx-backend/tests/admin-app/email-signin-views.test.tsx "policy closed: the magic-link switch reads off, cannot be pressed, and names the Permissions page; Save keeps the stored choice"
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-005-THE-COMMUNITY-APP.md §6
---

A link or a code may make a new account only when BOTH the Sign-in page's switch ("An address nobody has used yet may
create an account", `magicLink.allowSignup` / `emailCode.allowSignup`) AND the security policy's `signup` allow it
(`oauth-routes.ts` :633: `allowSignup && signupAllowedForAnonymous()`).

The community template's policy says `signup: nobody` (people ask to join through a function instead). Measured
2026-10-15 (`two-005-join.test.ts`): with the switch on, a link asked for an unknown address sends no mail and makes no
account. The policy wins, which is right.

The page doesn't say so. The switch defaults to on (`magic.allowSignup !== false`, :200) and nothing beside it names
the policy, so a builder reads that strangers may make accounts when they can't, or switches it on expecting sign-ups
that never come. Read in code, not rendered.

Fix, proposed: when the policy closes sign-up, show the switch off and disabled, with "The security policy closes
sign-up (signup: nobody)".

**Fixed (the Beta sweep s6, 2026-10-25), as proposed.** `GET /admin/auth` answers `signup: { open, rule }` (the same
`ruleAllows(signup, anonymous)` the link, code and provider routes AND in). When it is closed, the magic-link switch and
each provider's "Someone new may create an account" read off and cannot be pressed, with "Sign-up is closed on the
Permissions page: “Who can make an account” is Nobody. Nobody new gets an account this way until it opens." The stored
choice is not touched: Save sends it as it was, so it counts again when the policy opens. The six-digit code has no
sign-up switch on this page, so it has nothing to say.

**Graded.** `email-signin-views.test.tsx` 3 new (closed: off, disabled, the sentence, Save keeps `allowSignup: true`;
open: as stored, no sentence; the provider drawer): red 2/3 at HEAD, the open control green. `bmg-010-email-signin`
reads the field on a real server with `signup` put to nobody and back. Two mutants red (the server always open; a page
that overwrites the stored choice). Admin app + auth suites 20 suites 253/253, admin tsc clean. Not rendered in a browser.
