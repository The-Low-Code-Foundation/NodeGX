---
id: P123-GH-REFRESHTHING
title: Refresh page data cannot refresh the page's own thing, so a page about one record shows it stale
status: fixed
severity: medium
area: nodegx-studio / Workflow action Refresh page data
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
commit: nodegx-studio b3c6a94 (editor/studio.html, editor/check.mjs)
regression: ../nodegx-studio/editor/check.mjs "Refresh page data offers This page's Note: the click is wired to its Record's Fetch, and the step says what it refreshes"
---

On a page with a Type of content (Plant), "Refresh page data" lists only the page's queries (Waterings), not the
page's own record. After a backend workflow changed the plant (Water now → lastWatered, thirsty), the page kept
showing "Last watered 25 October · Thirsty". Greenhouse wired the refresh's timer to the Record's `fetch` through the
agent (MCP). Fix: list "This page's <Type>" in Refresh page data (a Record `fetch`).

Fix (2026-10-30, nodegx-studio `editor/studio.html` `refreshMenu`): on a page with a Type of content, Refresh page
data lists *This page's <Type>* first ("the Plant this page shows"), and picking it wires the step to the page's Record
`fetch` (the wire Greenhouse's agent made by hand). The menu no longer says "no page data" on a page whose only data is
its thing. The step's card and panel name it ("Refresh page data · This page's Note"); the step walker already counted
a wire into the Record as a refresh, so delete works as for any refresh.

Graded: `check:editor` 237/237 with the new row (New page Note, Interaction → When it is clicked → Add the first
action → Refresh page data → This page's Note: the Text's onClick is wired to the Record's fetch, the card says it).
Mutant (the menu item off): 236/237, that row alone red. The app re-reading on that wire was measured on Greenhouse
(the agent's wire), not in this gate.
