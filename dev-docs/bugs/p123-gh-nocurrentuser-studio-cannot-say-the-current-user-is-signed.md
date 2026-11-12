---
id: P123-GH-NOCURRENTUSER
title: Studio cannot say "the current user is signed in": no current user in ⚡ or a branch's condition
status: fixed
commit: nodegx-studio fcb1b81
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

## Fixed 2026-11-02 (nodegx-studio fcb1b81)

⚡ offers a **Current user** group wherever it lists values (a field's ⚡, a branch's *Set the condition…*, the composer's *Insert a value*, page data's where): *Current user is signed in* (the User node's `authenticated`), their email, id and the User type's own fields. A pick places one User node on the page (`metadata.currentUser`, a value source Studio chips, vocabulary kind `currentUser`, re-pinned in NodeGX's MCP) with its wire in one edit; an existing User node is reused. Gate rows in `check:editor`: the group is offered; a pick on a page with no User node places one, Studio's own, wired to the Text; it is not listed as Logic on this page; one Undo takes both off. Studio gates, one at a time on 2026-11-02: editor 259/259, data 91/91, hosted 46/46, functions 695/695 + 50/50, the rest green (check:app could not run: the screen was locked, see P123-STU008-APPCHECKPUBLISH).
