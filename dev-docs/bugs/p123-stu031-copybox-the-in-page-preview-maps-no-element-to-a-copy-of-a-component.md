---
id: P123-STU031-COPYBOX
title: "kit: the in-page preview's elementsOf() returns nothing for a copy of a component, so an editor built on it cannot box, hit or attribute a reusable"
status: open
severity: medium
area: kit / `@nodegx/preview` in-page (`packages/noodl-preview/src/inPage/index.ts`, `elementsOf`), read by every editor built from the kit (NodeGX Studio, the Orbit prototype)
found: NodeGX Studio STU-031 (phase 123's successor repo, The-Low-Code-Foundation/nodegx-studio), 2026-10-20 — giving the run timeline's screen changes to the page element they happened in
evidence: nodegx-studio editor/timeline-check.mjs (the gate's own witness reads the copy through `getRoots()` because `elementsOf` is empty); its mutant "copies draw nothing" (23/24); docs/SCOPE.md "Done (STU-031)"
---

`preview.elementsOf(nodeId)` is documented as the elements a node draws. It is
`root.nodeScope.getNodesWithIdRecursive(id).map((n) => n.getDOMElement?.())`, and a component instance node has no
`getDOMElement`: it draws through its component's roots (`ComponentInstance.getRoots()`). So for a copy of a reusable
it returns `[]`.

Measured on the todo template's Todo page, in NodeGX Studio's in-page preview: `elementsOf('tdList')` (the
`/Todo/Task list` copy, "Open tasks") is `[]`, while the copy's root Group's element holds the list and its task
(`getNodesWithIdRecursive('tdList')[0].getRoots()[0].getDOMElement()`).

What it costs an editor built from the kit:

- the list's rows being drawn were attributed to the group around the copy ("List view") until Studio walked the roots
  itself (STU-031's `drawnElements`);
- by the code, Studio's Design draws no box for a copy selected in the tree, and a click on a copy selects the group
  around it (its hit test walks up to the nearest element `elementsOf` mapped). Not looked at on screen.

Reproduce: in nodegx-studio, run `npm run check:timeline` with `drawnElements` reduced to `preview.elementsOf(id)`: the
"task list draws its task" line fails, the list's drawing given to "List view".

Proposed fix, small: in `elementsOf`, for a node with no `getDOMElement` and a `getRoots`, return its roots' elements
(recursively for a copy whose root is itself a copy). Studio's `drawnElements` (editor/studio.html) is that fallback
written outside the kit and can then go. Gate: `elementsOf(copyId)` is non-empty for a placed reusable, and its first
element contains what the copy draws.
