---
id: P123-STU-ACTIONALIASES
title: Three actions of Studio's workflow menu (Send an event, Go to a URL path, Show a popup) never appeared under Actions
status: fixed
commit: nodegx-studio dfa84e7
severity: medium
area: nodegx-studio `editor/studio.html` workflow action menu (ACTIONS from `editor/vocabulary.json` steps.menu)
found: STU-090, building Swapshop in Studio (opennoodl-33), 2026-10-29
evidence: the action menu listed 12 of the vocabulary's 15 rows; "Send Event", "Show Popup", "Navigate To Path" showed under "Every other node" by their node names instead
---

`vocabulary.json` names three menu rows by a node's display name and maps them to the node types they place under
`steps.aliases`. Studio never read `aliases`: the menu kept a row only when `libIndex.has(type)`, and `Send Event` is
`Event Sender` in the library, so the three were dropped from Actions (and a step of that kind was headed by its node
name, not the menu's words). Fixed by resolving the aliases where ACTIONS is built. Same pass: the deprecated v1 twins
(Model, Variable, Collection, Cloud Function, Component State) no longer list beside their v2 nodes.
