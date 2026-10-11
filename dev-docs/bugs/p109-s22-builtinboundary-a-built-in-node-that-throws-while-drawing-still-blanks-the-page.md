---
id: P109-S22-BUILTINBOUNDARY
title: A built-in node that throws while it draws still blanks the whole page (kit nodes no longer do)
status: fixed
phase: P109
task: ISL-045
severity: low
area: viewer / react-component-node.ts (no error boundary around a built-in node's component)
found: P109 ISL-026 s22, 2026-10-06, beside the KITTHROWBLANKS fix
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-026-A-VALUE-OF-THE-WRONG-KIND-NEVER-KILLS-A-NODE.md §10
---

`7abed2878` draws each KIT node inside an error boundary (`kit-node-boundary.ts`): a kit node that throws while drawing
shows nothing, raises `kit-node/render-failed`, and the page keeps drawing. A BUILT-IN node gets no boundary, so one that
throws in its render (C65 and C70 were two, fixed where they threw) still takes the whole React root down.

**The question, in plain words:** *"Should every node on the page, built-in ones included, be drawn so that one node
failing shows nothing in its place and the page keeps drawing?"* Recommendation: yes. It is ISL-026's own sentence, one
level up, and the boundary already exists. The cost is one wrapper per visual node, and a built-in node's failure would
become a named error on the bus instead of a blank page.

**Ruled (Richard, P109 s44, 2026-10-11):** Yes, same as kit parts (as recommended): one boundary around every visual node; measure the wrapper's cost on the templates before landing.

**Fixed (P109 s44, 2026-10-11), as ruled.** Every node's element is drawn inside a boundary
(`withNodeBoundary`, `kit-node-boundary.ts`), applied in `NoodlReactComponent.render()`, the one place every
built-in node is drawn. A built-in that throws while drawing shows nothing in its place and raises
`node/render-failed` once on the error bus (the editor's warning on the node, the console, `On App Error`). The rest
of the page keeps drawing. The boundary wraps the element, not the component, so no component changes identity and
the element keeps its `ref`. A kit node's own boundary is the nearer one and keeps its words (`kit-node/render-failed`).

**Graded:** `isl026-a-kit-node-that-throws-stays-inside-itself.test.tsx`. Its first row was "without the kit boundary
the page goes", which is what a built-in did. It now asserts a built-in's containment: an effect throw, a render throw,
and a healthy built-in whose ref still reaches its own component. With the render line put back as it was, exactly
the two throw arms are red. Viewer suite 1845/1845.

**Cost, measured before landing (as ruled):** CPU time in jsdom, median of 7, with the arms interleaved, on a tree of
trivial nodes. Mount went 45 → 51 ms for 1,111 elements and 65 → 83 ms for 1,885, about 5–10 µs per node. A
re-render that changes no node costs nothing extra. The largest first page among five templates drew 409 elements
(planning-demo; todo-list-demo 65, the others 25–31), so the boundary adds about 2–4 ms of CPU to that first paint.

⚠️ It reaches a running app with the next build of the viewer runtime (`npm run build:editor:_viewer`). That bundle is
a shared, gitignored artefact and was not rebuilt here.
