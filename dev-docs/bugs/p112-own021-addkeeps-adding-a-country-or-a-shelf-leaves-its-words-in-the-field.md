---
id: P112-OWN021-ADDKEEPS
title: Adding a country or a shelf leaves what you typed in the field, inviting a second press
status: fixed
commit: (this session, OWN-024 s1)
severity: low
area: template / templates/marketplace `/Pages/Admin/WaysToPay`, `/Pages/Admin/Shelves`
found: P112 OWN-021 S8, 2026-10-20, on the released 0.4.2
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-021-THE-0.4.2-CUT.md §12
regression: packages/noodl-mcp/tests/two003AddKeeps.test.ts "Ways to pay: saveCountry’s done clears the Country and the Currency code, and nothing else does"
---

On Ways to pay, after **Add the country** the new country is listed ("Ghana · GHS"), but the Country and Currency code
fields still say "Ghana" and "GHS". On Shelves, after **Add the shelf** the field still says the shelf's name. A builder
can't tell whether it worked and may press again. Not measured: what a second press does (a second Ghana? refused?).

Fix in the generator (`two003Admin.ts`): clear the fields when the add succeeds, and check the duplicate case in the
spec.

**Fixed (2026-10-20, OWN-024 s1), template-side.** `saveCountry`'s and `saveShelf`'s `done` pulse the fields' `Clear`
(which also empties the field's Text output, so the gather script holds nothing either). A refusal keeps what was typed.
The second press was already answered: "There is already a country called Ghana." / "…a shelf called Cars."
(`two-003-checkout.test.ts`). Spec: `two003AddKeeps.test.ts` (red on the committed template, which has no Clear wire).
Not driven yet: the S8 re-drive on 0.4.3 looks at it.
