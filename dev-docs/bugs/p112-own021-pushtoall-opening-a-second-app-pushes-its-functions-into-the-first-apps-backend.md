---
id: P112-OWN021-PUSHTOALL
title: Opening a second app while the first app's backend runs pushes the second app's functions into the first app's backend
status: open
severity: high
area: editor / Backend Services (CloudFunctionDeployer)
found: P112 OWN-021 S8, 2026-10-20, on the released 0.4.2 (arm64 DMG)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-021-THE-0.4.2-CUT.md §12
---

A builder who has both P121 templates opens the marketplace, starts its backend, goes back to the projects and opens
the community app. The community app has no backend yet. Its first save still pushes its 15 cloud functions to the
marketplace's backend, and a red toast says:

> Could not deploy cloud functions: Error invoking remote method 'backend:update-workflow': Error: Duplicate component
> name /#__cloud__/whoAmI

The push failed only because both apps happen to have a function called `whoAmI`. Two apps with no shared function
name would have mixed silently: the first app's backend would serve the second app's functions too, and the toast would
not appear.

**Where.** `packages/noodl-editor/src/editor/src/services/CloudFunctionDeployer.ts`, `pushToAllRunning` (on every
save) loops over `backend:list` and pushes to every backend whose status is running. Its docblock says so: "the
project's backends is, today, every running local backend". The project does know its own backend: the card says
"This project uses this backend" (`activeBackendId`, `views/panels/BackendServicesPanel/backendVisibility.ts`).

**Reproduce (driven, 0.4.2).** Isolated profile, both templates unzipped from the `v0.4.2` tree. Open the marketplace →
Backend Services → + → Built-in → Run one on this computer → name → Create → Start backend (log: `21 added, 0 already
there`, 20 functions pushed). Back to projects → open the community app → the toast above within seconds; the app log
has `Error occurred in handler for 'backend:update-workflow': Error: Duplicate component name /#__cloud__/whoAmI`. The
Backend Services panel at that moment reads "No backend attached · 30 others, 1 running".

**Proposed fix (small).** Push on save only to the project's own backend (`activeBackendId`, or the backends the project
lists), not every running one; keep `onBackendStarted` as it is. Spec: two projects, two running backends, a save in
project B pushes nothing to A's (a mutant that restores the loop must fail it). Product-side, so it reaches a builder
in 0.4.3 at the earliest.

**Until then (the builder's words, in the marketplace's setup page):** stop one app's backend before opening the other
app.
