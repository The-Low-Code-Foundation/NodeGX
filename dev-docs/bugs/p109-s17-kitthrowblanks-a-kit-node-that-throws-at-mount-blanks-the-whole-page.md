---
id: P109-S17-KITTHROWBLANKS
title: A kit node that throws when it mounts blanks the whole page, not just itself
status: scheduled
phase: P109
task: ISL-026
severity: medium
area: runtime / kit React nodes (no error boundary around a kit node's component in noodl-viewer-react)
found: P109 ISL-012, session 17, 2026-10-05 (AC1's red arm)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-012-A-KIT-CAN-SHIP-A-MODERN-LIBRARY.md §8 s17 "Driven"; scripts/devtools/drive-isl012-cube.js on the red site
regression: none yet
---

A one-page app: a Text ("isl012 page drew") and a kit node (`cube-kit.Cube`) side by side in one Group. The kit's
`dependencies` failed to load (three.js's ES-module files, *"Cannot use import statement outside a module"*), so the
node's `useEffect` read `window.THREE` as undefined and threw `TypeError: Cannot read properties of undefined (reading
'WebGLRenderer')`. **The whole page is blank afterwards:** the Text is gone too (`document.body.innerText` lacks it),
there is no `[data-testid="cube"]`, and nothing tells the person which node failed. `grep -rlE
'componentDidCatch|getDerivedStateFromError' packages/noodl-viewer-react/src` finds no error boundary anywhere in the
viewer.

The same root as P107-C65 (a built-in control's render throw takes the React root down), met here from the kit side,
where the author is a stranger and the throw is far more likely (a missing dependency, a browser API absent in a
WebView, a library's own error).

**Proposed fix:** an error boundary around each kit node's component: the node draws an empty box (or, in the editor
preview, a short "This kit node failed: <message>" with the kit's name), logs the error once with the kit and node
names, and the rest of the page renders. A ruling: whether built-in nodes get the same boundary (C65, C70).
