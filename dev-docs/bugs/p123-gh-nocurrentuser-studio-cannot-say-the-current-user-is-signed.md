---
id: P123-GH-NOCURRENTUSER
title: Studio cannot say "the current user is signed in": no current user in ⚡ or a branch's condition
status: open
severity: medium
area: nodegx-studio / ⚡ value menu, Branch condition
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

Bubble's most common condition ("Current User is logged in") has no counterpart. On a page with no User node, ⚡
offers Page data, Option sets, Elements and Logic: nothing about who is signed in. Greenhouse's Home guard
("When Home is loaded → if nobody is signed in → Go to Sign in") was only possible by typing JavaScript into the
composer: `!Noodl.Users.Current`.

Fix: a "Current user" group in ⚡ (is signed in, email, id, their fields), drawn from a User node Studio adds.
