---
id: P107-C125
title: A Component Stack page whose Path is wired null empties the stack at every reset that reaches it
status: fixed
commit: 230565982
phase: P109
task: ISL-048
severity: low
area: runtime / Component Stack (navigation-stack.tsx `matchPageFromUrl` :730 `pagePattern[0]` on null throws; `_findPage` turns it into the text 'null' for the URL it writes)
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; recorded on the runtime target (NSP-016 s58 probe traces, each beside a control), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "row C125 — ROUTES: Detail's Path null, placed at #/detail — the label's path matches: the stack starts at Detail; a push of Settings writes #/settings, and the person's Back to #/detail shows Detail again"
---

**What a person sees.** A page's Path input is driven by a wire that delivers nothing (null). Every reset whose loop reaches that page
(the placing, a Reset, the browser's Back) throws: the stack is empty. A page earlier in the Components list that matches the URL
still shows. Pushing that page writes `#/null`. This is the Page Router's P107-C116, in the Component Stack.

**How to reproduce.** Play the `regression:` scenario on the runtime target, beside "ROUTES: Detail's Path null, placed at #/home …"
(Home matches first and shows). The spec copies the behaviour (R3).

**Proposed fix.** Treat a Path that is not text as unset (the label's default) in `setPagePath`.

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed.** `setPagePath` stores a Path that is not text as unset, so the page takes
its label's path. Page Stack spec v11; one scenario added that reaches the page's pattern. Runtime 150 / 150 at seeds 13 and
20732; control red on exactly the 2 C125 scenarios.
