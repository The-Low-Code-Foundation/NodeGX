---
id: P112-OWN021-SAMEEMAIL
title: Setting up either template with the email of the backend's admin account is refused, and the page doesn't say why
status: open
severity: medium
area: template / templates/marketplace `setUpMarketplace`, templates/gram `setUpCommunity`
found: P112 OWN-021 S8, 2026-10-20, on the released 0.4.2
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-021-THE-0.4.2-CUT.md §12
---

The first time a builder opens the backend's admin app (Backend Services → Manage data & settings), it asks them to
**Create your admin account** ("…and in your app, where this account is in the admin role"). A builder types their own
email. Then they open the app, press Set up, and type the same email as the first admin. Both templates refuse:

- marketplace: "This marketplace could not be set up with that."
- community app: "This community couldn't be set up with that."

Nothing says the email is the problem. Driven on 0.4.2, both apps, with the same token, name and password: the same
email is refused, a different email is set up at once.

**Why.** Both setup functions create the first admin with Create User, and an existing account for the email answers
`unchanged`, which is refused on purpose ("it may be somebody else's", `packages/noodl-mcp/tests/two005Cloud.ts:168`;
the marketplace's `setUpMarketplace` the same). The refusal text is the generic one.

**Fix.** Now: both setup pages say to use an email that isn't the backend admin account's (done with this bug, in
`templates/marketplace/docs/SETTING-UP.md` and `templates/gram/docs/SETTING-UP.md`). Later, in the generator: once the
setup token has matched, the person is the builder, so the refusal can say "That email already has an account on this
backend (perhaps the admin app's). Use another one." Through `npm run template:marketplace` / `template:gram`, with
their specs.
