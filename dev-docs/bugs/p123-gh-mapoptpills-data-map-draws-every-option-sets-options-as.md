---
id: P123-GH-MAPOPTPILLS
title: Data → Map draws every option set's options as empty pills
status: open
severity: low
area: nodegx-studio / Data → Map (editor/studio.html:6008)
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

The option set cards on Data → Map show a row of empty yellow chips. The chip text is
`String(o.display ?? o.value ?? '')`, but since P128-S2-OPTSETSHAPE (31892c3) a set's rows are `{ Label, Value }`, so
both are undefined. Measured on Greenhouse: `<span class="chip opt"></span>` ×5 for Room.

Fix (one line): read `o.Label ?? o.display ?? o.Value ?? o.value`. A regression of the Label + Value ruling.
