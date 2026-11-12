---
id: P123-GH-POINTS500
title: A page data condition "is (a link)" with no value yet is a 500 from the backend
status: open
severity: low
area: backend / query (pointsTo with an empty value)
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

Creating page data "every Watering where plant is (a link)" before its value is set: the panel's Last run read
"refused by the backend (500)". An unfinished condition is the caller's mistake (400 with a reason), not a server
error; and Studio could hold the query until the condition has a value.
