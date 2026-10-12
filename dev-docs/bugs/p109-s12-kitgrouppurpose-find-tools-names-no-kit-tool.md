---
id: P109-S12-KITGROUPPURPOSE
title: create_node_kit is deferred in a find_tools group whose purpose line says nothing about kits
status: fixed
commit: e310b68a7
severity: low
area: mcp / toolGroups.ts ('project' group), the kit docs page
found: P109 ISL-015 AC5 s12, 2026-10-03 (the stranger round)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-015-A-KIT-AUTHOR-READS-THE-TRAPS-BEFORE-MEETING-THEM.md §8 s12
regression: packages/noodl-mcp/tests/kitTools.test.ts
---

The stranger saw 20 tools, none of them `create_node_kit`, and never called `find_tools`. The group that holds it
(`project`) describes itself as "list the NodeGX projects on this machine; create a new project elsewhere on disk;
read an imported project's conversion report", so nothing in the resident surface says a kit scaffold exists, and the
docs page named only the editor's menu (fixed s12: the page now names `create_node_kit` and the group). Proposed:
add "scaffold a node kit" to the group's purpose, measured against the AWP-006 surface gate (57 tokens of headroom
in August). Lower stakes since `P109-S12-KITONDISK`: a hand-written kit now works.

**Fixed (P109 s13, 2026-10-04):** the `project` group's purpose now reads "…create a new project elsewhere on
disk; scaffold a node kit; read an imported project's conversion report." Surface 8,255 → 8,261 tokens (6 spent,
19 free under 8,280, `toolDisclosure.test.ts`). The regression reads `find_tools`' advertised description, the
resident sentence the stranger met: green with the change, red (`saysNodeKit: false`) with the old purpose.
