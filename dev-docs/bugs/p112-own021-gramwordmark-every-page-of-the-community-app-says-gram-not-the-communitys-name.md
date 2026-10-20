---
id: P112-OWN021-GRAMWORDMARK
title: Every page of the community app says "gram" at the top, not the community's name
status: open
severity: medium
area: template / templates/gram `/UI/Bar`
found: P112 OWN-021 S8, 2026-10-20, on the released 0.4.2
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-021-THE-0.4.2-CUT.md §12
---

The first admin names the community when setting it up ("The community's name"). The Welcome page shows that name under
the bar, but the bar itself, on every page a member sees (the feed, a post, the queue, Sign in), says **gram**: the
template's working name, a fixed Text in `/UI/Bar` (`brWord`, `packages/noodl-mcp/tests/two005Pages.ts:169`).

Fix in the generator, as the marketplace did for R13: read the Community row's name into an app-wide variable and wire
the wordmark to it (the marketplace's `NAME_VARIABLE` / `NAME_LOAD`, `two003Pages.ts`). `npm run template:gram`, its
specs, a drive that checks the bar after setup. Until then the setup page says the bar reads "gram" and where to change
it.
