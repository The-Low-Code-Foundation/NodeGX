---
id: P112-OWN021-GRAMWORDMARK
title: Every page of the community app says "gram" at the top, not the community's name
status: fixed
commit: (this session, OWN-024 s1)
severity: medium
area: template / templates/gram `/UI/Bar`
found: P112 OWN-021 S8, 2026-10-20, on the released 0.4.2
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-021-THE-0.4.2-CUT.md §12
regression: packages/noodl-mcp/tests/two005Name.test.ts "the bar’s wordmark takes the community’s name from the one variable"
---

The first admin names the community when setting it up ("The community's name"). The Welcome page shows that name under
the bar, but the bar itself, on every page a member sees (the feed, a post, the queue, Sign in), says **gram**: the
template's working name, a fixed Text in `/UI/Bar` (`brWord`, `packages/noodl-mcp/tests/two005Pages.ts:169`).

Fix in the generator, as the marketplace did for R13: read the Community row's name into an app-wide variable and wire
the wordmark to it (the marketplace's `NAME_VARIABLE` / `NAME_LOAD`, `two003Pages.ts`). `npm run template:gram`, its
specs, a drive that checks the bar after setup. Until then the setup page says the bar reads "gram" and where to change
it.

**Fixed (2026-10-20, OWN-024 s1), template-side** (so the zip carries it on 0.4.2 too). `two005Pages.ts`
`GRAM_NAME_LOAD` / `GRAM_NAME_VARIABLE` (`communityName`): `/UI/Bar` reads the `Community` row's name on mount and the
wordmark takes it from the variable, as the marketplace's R13. Before set-up the bar is empty. `npm run template:gram`.
Specs: `two005Name.test.ts` (the script, 4 mutants; the bar wired to the variable; no Text says "gram"; red on the
committed template), and `two-005-join-drive.test.ts` now waits for the bar's first line to read "Grace Chapel" after
set-up (55 s, green). `docs/SETTING-UP.md`'s "says gram" paragraph is now "shows the community's name".

**Driven on 0.4.3 (OWN-024 §6):** the bar reads the community's name on a phone and a tablet.
