---
id: P123-STU-CHOICELOST
title: Once the app's backend runs, a Choice field declared in the project reads as Text everywhere in Studio
status: fixed
commit: nodegx-studio dfa84e7
severity: medium
area: nodegx-studio `editor/studio.html` allTypes / the type's table (`t.checks = live?.checks || declared…`)
found: STU-090, building Swapshop in Studio (opennoodl-33), 2026-10-29
evidence: Listing.category made as a Choice (Furniture, Books, Clothes, Electronics) before "Start a backend" showed "Choice"; after it, Data types and the map showed "Text"
---

The backend's own table came back with `checks: []`, and an empty array is truthy, so it replaced the project's
declared rules. Fixed in both places that read it (`live.checks` only when it has rules). **Still open:** the
provisioned table carries no `oneOf` rule, so the backend does not enforce the choice; the project's declaration is the
only place it lives.
