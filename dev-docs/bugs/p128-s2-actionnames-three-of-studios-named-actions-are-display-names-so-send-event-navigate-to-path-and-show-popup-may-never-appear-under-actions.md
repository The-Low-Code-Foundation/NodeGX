---
id: P128-S2-ACTIONNAMES
title: "Three rows of Studio's `ACTIONS` are display names (`Send Event`, `Navigate To Path`, `Show Popup`) where the node types are `Event Sender`, `PageStackNavigateToPath`, `NavigationShowPopup`, so the step menu's filter (`libIndex.has(t) || hasSpec(t)`, keyed by type name) may drop them from Actions"
status: open
severity: low
area: "nodegx-studio `editor/studio.html` `ACTIONS` 4468–4472, `addActionMenu` 4484 (`named`), `libIndex` 1263 (keyed by `t.name`)"
found: P128 S2 (CCN-010), 2026-10-27, pinning Studio's vocabulary in noodl-mcp `src/studio/vocabulary.ts`
evidence: "READ, NOT MEASURED. The catalog's type names are `Event Sender`, `PageStackNavigateToPath`, `NavigationShowPopup` (`packages/noodl-types/src/node-catalog-enriched.json`); `libIndex` is `new Map(lib.nodetypes.map((t) => [t.name, t]))`, so `libIndex.has('Send Event')` is false unless the runtime registers that name. Whether `hasSpec('Send Event')` is true was not measured (`editor/specs.js` is served, not on disk). The measurement: open the step menu in `npm start` on a page with a button and look for 'Send an event', 'Go to a URL path', 'Show a popup' under Actions."
owner: none
task: P128 S6 (STU-084 exports Studio's vocabulary as `editor/vocabulary.json`; the type names go there)
regression: none yet
---

If they are dropped, the three still appear under "Every other node" by their type's display name, so nothing is
unreachable; the named Actions rows and their wording are what is lost. noodl-mcp's pinned copy lists both spellings,
so CCN-010's note does not depend on which is right. S6, exporting the vocabulary, should export type names.
