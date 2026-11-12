---
id: P123-GH-403WORDS
title: Page data refused for a visitor says "nobody may read them yet" when the rule is Anyone signed in
status: open
severity: low
area: nodegx-studio / Page data panel (Last run)
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

Plant's rule was "Anyone signed in"; the preview was not signed in. The page data panel said: "refused by the
backend (403) · The backend let this page read no Plant rows: nobody may read them yet. A new data type starts
closed; say who may read it." That points the person at Privacy, which is already right. Fix: when the rule allows
signed-in people and nobody is signed in, say so ("only people signed in may read Plant; the app is not signed in").
