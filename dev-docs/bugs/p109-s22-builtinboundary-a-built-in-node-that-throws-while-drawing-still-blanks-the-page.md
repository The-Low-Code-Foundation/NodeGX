---
id: P109-S22-BUILTINBOUNDARY
title: A built-in node that throws while it draws still blanks the whole page (kit nodes no longer do)
status: needs-ruling
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
