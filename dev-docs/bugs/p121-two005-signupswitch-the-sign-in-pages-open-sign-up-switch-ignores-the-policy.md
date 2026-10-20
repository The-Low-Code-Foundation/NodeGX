---
id: P121-TWO005-SIGNUPSWITCH
title: The admin app's "An address nobody has used yet may create an account" reads on while the policy refuses every new account
status: open
severity: low
area: backend / admin app, Sign-in (`packages/nodegx-backend/src/admin/app/views/signin.tsx` :200, :237-240; the rule in `src/server/oauth-routes.ts` :633, :828)
found: P121 TWO-005 s11, 2026-10-15
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
