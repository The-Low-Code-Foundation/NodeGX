---
id: P123-STU-REUSABLENAV
title: "NodeGX Studio: editing a reusable replaces the page's element list with the reusable's, and the only way back is the page picker"
status: open
severity: medium
area: nodegx-studio `editor/studio.html` (`openComponent`, `renderTree`, `previewFiles`' reusable canvas, STU-015)
found: P125, Richard's puppy run in Claude Desktop, 2026-10-23
evidence: "Richard's report; by the code: openComponent(key) sets pageKey to the reusable, previewFiles() then starts the app on an in-memory canvas page holding one copy, and renderTree() lists only that component's nodes. The crumbs' ← (treeRoot) only leave a group opened inside the same component."
---

Richard: *"When inside and editing a reusable component, the way 'back up' is not obvious … you have to go to the top
bar where the page name is and click on the dropdown … in the NodeGX full editor we had the concept of 'the left menu
shows what's visible on the page' and you just have the reusable you're editing highlighted on the left … the full
page of components still shows, just your reusable is now 'unfolded' and the other reusables remain folded."*

STU-015 opened a reusable the way Bubble does: on its own canvas. Richard now wants the NodeGX way: the page stays on
the canvas and in the list; the reusable being edited is unfolded in place and marked; the other copies stay folded;
clicking anything outside it is back on the page.

Fix: editing a reusable *from a page* keeps that page as the host: the app keeps showing the page, the element list
is the page's tree with the copy unfolded into the reusable's elements, and a click outside the copy goes back to
editing the page. Opening a reusable from the picker (no page in view) keeps STU-015's canvas.
