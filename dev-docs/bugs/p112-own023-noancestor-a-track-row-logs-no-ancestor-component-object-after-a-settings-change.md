---
id: P112-OWN023-NOANCESTOR
title: "After a stranger's settings change (F2), the NodeGX app logs a runtime error on its pages: `[noodl] net.noodl.ParentComponentObject (/Shared/Track Row): No ancestor component has a Component Object node` — written by the agent through validated writes, not caught by them"
status: fixed
phase: P112
task: OWN-023
severity: low
area: runtime/kit — Parent Component Object in a component placed where no ancestor has a Component Object; the server's validation of the write
found: P112 OWN-023 s1, 2026-10-20 (blind re-grade after F2 on the NodeGX arm, grader 1, line O13)
evidence: grades/regrade-F2/M-1.md O13: "a favicon.ico 404 error on every page load in both profiles, plus `[noodl] net.noodl.ParentComponentObject (/Shared/Track Row): No ancestor component has a Component Object node`". Grader 2 of the same copy did not report it (it may depend on the page visited). Not yet reproduced by the lab; the F2 folder is `OWN-023 apps/followups/B-F2/work/music/openwave`. Whether the as-built app logs it too is unchecked (its graders reported only the favicon).
kit: core
regression: packages/noodl-viewer-react/tests/corpus/p112-own023-noancestor-a-removed-row-does-not-look-for-its-parent.test.ts
owner: Beta sweep s15
commit: 6f056818f
---

**Fixed (Beta sweep s15, 2026-10-27).** Reproduced on a copy of the F2 app, with its backend and data
(`dev-docs/reviews/beta-bug-sweep-2026-10-24-assets/noancestor-f2-drive.mjs`, 390 px headless Chrome, signed out).
The Search genre filter changed every 2.5 s logged nothing, on HEAD's viewer and on 0.2.2, and the filter worked
(14 → 0 → 2 → 2 → 3 → 14 songs). Changed every 15–75 ms, it logged the line on HEAD's viewer in 3 of 3 runs (2, 3, 2
lines) and on 0.2.2 in 1 of 1. So it is not the settings change and not a graph the validator should refuse. It is
a runtime race: Parent Component Object resolves its ancestor in a callback queued when its row is built
(`nodeScopeDidInitialize` → `scheduleAfterUpdate`). A row the Repeater deleted before that callback ran still ran
it, and its walk climbed past the list and raised.

The fix: the callback skips a deleted node. With it, 0 of 3 rapid runs logged the line. The corpus harness clears a
deleted row's roots, so its walk finds the list there with or without the fix. The spec therefore grades the
mechanism (the deleted node never goes loud; red with HEAD's file), and the Chrome A/B is the evidence for what a
person sees. Viewer jest 169 suites, tsc clean.


A console error the person's own Chrome shows, from a graph the kit's validated writes accepted. Reproduce on the F2
copy (and the build) before anything else. Carried in OWN-023 arm B's row (C3).
