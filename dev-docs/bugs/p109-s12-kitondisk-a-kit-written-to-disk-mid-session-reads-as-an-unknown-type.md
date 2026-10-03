---
id: P109-S12-KITONDISK
title: A kit written to disk while the MCP server runs reads as "Unknown node type" until the server restarts
status: fixed
commit: 97a53c579
severity: high
area: mcp / kit overlay (kitOverlay.ts), every tool
found: P109 ISL-015 AC5 s12, 2026-10-03 (the stranger round)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-015-A-KIT-AUTHOR-READS-THE-TRAPS-BEFORE-MEETING-THEM.md §8 s12
regression: packages/noodl-mcp/tests/isl015KitOnDisk.test.ts
---

An agent given the kit docs page did what its first section says ("save it as `noodl_modules/my-kit/index.js`
… and it appears in the node picker") with its own file tools. The server had read the project's kits once, at
bind, and re-read them only after `create_node_kit` or a prefab install, so `get_node_type` answered
"Unknown node type" for the kit it had just written. The agent passed `allow_unknown_types`; its component's
root was then lost (see `P109-S12-SETROOTSOP`), `validate_project` said 0 errors, and the deployed page drew
nothing. A person editing a kit in their own editor beside a running agent meets the same thing.

**Fixed (s12):** `ensureProjectOverlayFresh()` (`kitOverlay.ts`), called by `guarded()` before every tool's
handler: the overlay is re-extracted when the kit folders' top-level files (name, size, mtime) differ from what
it was read from. This is D3's own sanctioned cache ("in-memory, per-server-session, keyed on module mtime"); the
CN-006 comment that read D3 as forbidding it is corrected. Spec red at HEAD (2/2), green after; a fresh server
on the stranger's project already knew the type (`isVisual: true`, root derived).
⚠️ A kit file in a SUBFOLDER edited alone is not seen until a top-level file changes too.
