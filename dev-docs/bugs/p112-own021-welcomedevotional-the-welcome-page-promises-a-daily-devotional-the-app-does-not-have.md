---
id: P112-OWN021-WELCOMEDEVOTIONAL
title: The community app's Welcome page promises "the day's devotional", which the app doesn't have
status: open
severity: low
area: template / templates/gram `/Pages/Welcome`
found: P112 OWN-021 S8, 2026-10-20, on the released 0.4.2
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-021-THE-0.4.2-CUT.md §12
---

The Welcome page tells every visitor: "Members read the day's devotional, pray for each other and share what God is
doing." There is no devotional in the app (TWO-006, not built; OWN-021 §5 says the zip must not promise it;
`templates/gram/docs/SETTING-UP.md` lists it under "What isn't there yet"). A member who joins for it finds nothing.

Fix in the generator's Welcome words (`packages/noodl-mcp/tests/two005Pages.ts`): drop the devotional until TWO-006
lands, e.g. "Members pray for each other and share what God is doing." `npm run template:gram` and its specs.
