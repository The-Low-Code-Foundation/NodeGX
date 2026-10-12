---
id: P116-S23-CARDCHECKS
title: The Schema card's ONT-003 spec (`admin-app/ont-003-card.test.tsx`) was red from s19 to s23 — it words every projected rule as "is one of", and an all-or-none rule has no list
status: fixed
commit: ebdac4827
severity: low
area: tests / `packages/nodegx-backend/tests/admin-app/ont-003-card.test.tsx` `asListed()`, against `@nodegx/project-contract/world` `schemaPushes` (a projected check is a union since ONT-011 step 2, s19)
found: P116 s23 (Opus 5.5), 2026-10-11 — the first whole backend `npx jest` P116 has run since s17 (the band does not include `admin-app/`)
evidence: "ONT-003 AC3 — the card shows a projected collection in the person's words › Person" → `TypeError: Cannot read properties of undefined (reading 'join')` at `rule.oneOf.join`; the every-kind world's `Person` carries an `allOrNone` check (s19's `onlyWhen`)
regression: packages/nodegx-backend/tests/admin-app/ont-003-card.test.tsx "ONT-003 AC3 — the card shows a projected collection in the person's words"
---

The product was right: the card reads `allOrNone` (`views/schema.tsx`), and the route words every check through the
runtime's `describeCheck`. The spec carried its own copy of that wording, written when every projected check was a
`oneOf`, and it broke the day s19 added the all-or-none rule. **Fixed (s23):** the spec words a rule with
`describeCheck`, the route's own function, so there is one wording and no copy to drift.

The third of its kind (`P116-S19-STALEGOLDEN`, `P116-S20-STALEMSG`): a spec outside the band P116 runs. The backend's
`admin-app/` specs are not in the band; a change to the projection owes them a run.
