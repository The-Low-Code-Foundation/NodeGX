---
id: P112-OWN023-NOANCESTOR
title: "After a stranger's settings change (F2), the NodeGX app logs a runtime error on its pages: `[noodl] net.noodl.ParentComponentObject (/Shared/Track Row): No ancestor component has a Component Object node` — written by the agent through validated writes, not caught by them"
status: open
phase: P112
task: OWN-023
severity: low
area: runtime/kit — Parent Component Object in a component placed where no ancestor has a Component Object; the server's validation of the write
found: P112 OWN-023 s1, 2026-10-20 (blind re-grade after F2 on the NodeGX arm, grader 1, line O13)
evidence: grades/regrade-F2/M-1.md O13: "a favicon.ico 404 error on every page load in both profiles, plus `[noodl] net.noodl.ParentComponentObject (/Shared/Track Row): No ancestor component has a Component Object node`". Grader 2 of the same copy did not report it (it may depend on the page visited). Not yet reproduced by the lab; the F2 folder is `OWN-023 apps/followups/B-F2/work/music/openwave`. Whether the as-built app logs it too is unchecked (its graders reported only the favicon).
kit: mcp
---

A console error the person's own Chrome shows, from a graph the kit's validated writes accepted. Reproduce on the F2
copy (and the build) before anything else. Carried in OWN-023 arm B's row (C3).
