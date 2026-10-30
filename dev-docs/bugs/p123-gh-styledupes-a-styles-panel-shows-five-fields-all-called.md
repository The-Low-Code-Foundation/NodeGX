---
id: P123-GH-STYLEDUPES
title: A style's panel shows five fields all called "Corner Radius" (and Border Style, Width, Colour) with no side named
status: open
severity: low
area: nodegx-studio / Styles tab property list
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

The Styles tab edits a style with the raw port list. Per-side ports share the display name, so a Group style shows
"Corner Radius" ×5, "Border Style" ×5, "Border Width" ×5, "Border Color" ×5; only the tooltip says which is the
top-left corner or the bottom edge. Fix: the Design panel's grouped radius / border controls, or the side in the label.
