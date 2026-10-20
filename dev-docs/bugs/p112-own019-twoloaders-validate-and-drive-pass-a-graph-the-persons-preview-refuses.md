---
id: P112-OWN019-TWOLOADERS
title: "validate_project and drive_page passed a graph the person's packed preview refuses — the server reads nodes.json flat, the preview walks `children`, and a child listed twice is fine to one and fatal to the other"
status: fixed
phase: P112
task: OWN-019
severity: medium
area: noodl-mcp validation vs noodl-preview loading (`validate_project`, `drive_page`, the preview's diagnostics)
found: P112 OWN-019 s2, 2026-10-13 (the Sonnet yardstick for `sentence-pack.txt`, kit tgz14)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s2); P112-OWN019-DUPCHILD
regression: packages/noodl-mcp/tests/own019TwoLoaders.test.ts "a child listed twice in its parent (the DUPCHILD shape, written by hand) is an error"
commit: 9e40fc5ab
kit: mcp
---

The graph P112-OWN019-DUPCHILD wrote (each child of `Pages/Home` listed twice in its parent's `children`) was
reported clean by every instrument the agent has — `validate_project` 0 errors, `drive_page` passing 11 times — and
refused outright by the packed `@nodegx/preview` the person runs: 38 `duplicate-node-id` errors and no page.

The writer is fixed, so this shape no longer comes from the server. The open half is the disagreement itself: the
agent's checks and the person's preview do not read a component the same way, so any other shape one loader
tolerates and the other refuses will again read as "done" to the agent and as a broken app to the person. Wanted:
`validate_project` reports what the preview's gate would (at least a `children` entry listed twice, or naming a node
of another parent), or the drive refuses to pass a page the preview would not draw.

**Fixed 2026-10-14 (lane 1, `9e40fc5ab`).** The preview's read moved unchanged into `noodl-preview/src/readProject.ts`. `validate_project` runs it and the preview's `validateLegacyProject`, and reports every error that gate raises and the flat pass did not, worded as the preview's refusal. One read, imported, not a second copy. `drive_page` is unchanged: it drives what the preview builds. Known consequence: a kit-rooted component (P112-S14-KITROOTDEPLOY, still open) now shows in `validate_project` as the refusal it is in the preview and in deploy.
