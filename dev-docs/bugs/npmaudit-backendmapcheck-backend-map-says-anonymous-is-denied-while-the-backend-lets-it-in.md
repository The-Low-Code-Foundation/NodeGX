---
id: NPMAUDIT-BACKENDMAPCHECK
title: Backend map says anonymous is denied while the backend lets it in
status: fixed
severity: high
area: backend-map / check
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
kit: backend-map
regression: dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/test/rules-off.test.mjs (13/13; 8 FAIL on HEAD's lib, the rules-on control passes on both)
---

`@nodegx/backend-map@0.1.0` `/api/check?table=Task` answers 'Someone not signed in … find allowed:false (rule "authenticated")' while `/api/map` reports `enforced:false, devOpen:true`, and an anonymous `curl POST /classes/Task` created and read a row. The permissions view claims a protection that is not on. Fix: when not enforced, every check must say so first.

**Fixed 2026-10-23 (opennoodl-d7).** Three answers said what the rule would do, not what the backend does, and all three
asked `/admin/permissions/check`, which judges the rule as written whether or not rules are on:

- the table panel's dry run (`lib/rules.mjs` `dryRuns`, `/api/check`): with rules off every answer is `allowed: true`,
  its `reason` starts "The backend is NOT enforcing its rules right now…", and the rule's own answer is kept as
  `ruleAllows`; the page puts that sentence above the list in a red box, not the green one.
- *Who sees how much?* (`lib/reach.mjs` `directly`): with rules off every table opens to everyone, so someone not
  signed in reaches every row, not 0.
- after a rule change (`verify`): "The backend is obeying it now." / the "Done. The backend obeys the new rule" toast
  become "…has it, but is NOT enforcing its rules right now: it keeps nobody out yet" (`enforced: false` on the result).

`rulesOff(be)` reads `/health`'s `security.enforced` / `security.devOpen`, the fields `/api/map` already reports.
`test/rule-change.test.mjs` 19 ok on a backend copy with rules on (unchanged: "someone not signed in is turned away
from reading"). Owed: `@nodegx/backend-map` 0.1.1 published (Richard's 2FA); 0.1.0 is what Studio pins.
