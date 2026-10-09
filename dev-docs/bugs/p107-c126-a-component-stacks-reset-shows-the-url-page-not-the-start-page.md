---
id: P107-C126
title: With Use Routes, a Component Stack's Reset (and a Components edit) rebuilds the page in the URL, not the start page its Reset port promises
status: fixed
commit: 08d62276b
phase: P109
task: ISL-048
severity: low
area: runtime / Component Stack (navigation-stack.tsx `resetAsync` :523-531 reads `matchPageFromUrl` for every reset; the Reset port :315-326 says 'Empties the stack and rebuilds the start component')
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; recorded on the runtime target (NSP-016 s58 probe traces, each beside a control), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "ROUTES: a push of Detail, then Reset — the Start Page, Home, is rebuilt as the only page and #/home is pushed; a push of Home is then Unchanged (row C126)"
---

**What a person sees.** A stack with Use Routes shows Detail on top of Home (address `#/detail`). The author fires Reset to go back to
the start. The stack empties and rebuilds Detail as its only page, answers Done, and the address still says `#/detail`. The
same happens on a Components edit. Without Use Routes, Reset rebuilds Home.

**Where.** Every reset reads the URL first. The mount and `popstate` need that. A Reset asked for by the author is the same code path.

**How to reproduce.** Play the `regression:` scenario on the runtime target. Top Component Name stays Detail and Stack Depth goes to
1. Also "ROUTES: placed at #/detail, then Components edited …". The spec copies the behaviour (R3).

**Proposed fix (ruling needed).** Either Reset ignores the URL and pushes the start page's URL, as its description says, or the
description changes to say a Reset with Use Routes re-reads the address, as the Page Router's does.

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as leaned: "Reset goes to the start page and writes its address".** As the Reset input's description says. Loading the page and the browser's Back still read the address.

**Fixed 2026-10-09 (P109 ISL-048 s36, `08d62276b`, Page Stack spec v18), as ruled.** A Reset press or a Components edit builds the Start Page, and pushes its URL when the address names another page (nothing is written when it already names the start page). The mount and the browser's Back or Forward still read the address. When the person's Back and a Reset land in one frame, the one reset goes to the Start Page. Five scenarios that used a Reset to read a written URL back (rows C121 to C124) now read it with the person's Back and Forward.
