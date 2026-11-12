---
id: P127-S9-MUDDYPAWSGONE
title: The backend map's any-app test copies Richard's Muddy Paws project for two of its three apps, the folder is gone, and the map's npm test reds on a missing folder
status: fixed
severity: low
area: "dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/test/any-app.test.mjs `SITE` (the site and grooming apps)"
found: P127 s9, 2026-10-27, running the map's whole npm test after BKO-005's map half
evidence: "MEASURED: `npm test` → `FAIL site: the app to copy is at /Users/richardosborne/vscode_projects/NodeGX test projects/Muddy Paws` and the same for grooming; `ls 'NodeGX test projects'` holds OWN-019 Mistral apps, Puppy test 3, Tap Counter, leg003-drive; no folder named like it under vscode_projects."
owner: P127 s9
---

What a person sees: nothing. The map's gate for "any app, not only the training app" ran one app of three (todo) and
could not run the two that grade a site with no table and a backend with a Pointer and one group.

**Fixed (P127 s9, 2026-10-27), in the test.** `SITE` is Muddy Paws when it is on disk (or `MUDDY_PAWS`), else the
`templates/landing-pages` template, the same shape: pages, no table, no function, no rules file. Graded: any-app
all passed, the three apps run (todo, site, grooming), the training-word check over every panel of each.
