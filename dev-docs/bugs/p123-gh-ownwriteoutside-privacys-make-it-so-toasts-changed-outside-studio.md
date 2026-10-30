---
id: P123-GH-OWNWRITEOUTSIDE
title: Privacy's Make it so toasts "changed outside Studio" about Studio's own write
status: open
severity: low
area: nodegx-studio / Privacy, file watcher
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

Pressing Make it so on Plant's rule wrote nodegx.security.json and Studio toasted "nodegx.security.json changed
outside Studio — redrawn". Nobody else wrote it. Fix: mark the write as Studio's own before the watcher sees it.
