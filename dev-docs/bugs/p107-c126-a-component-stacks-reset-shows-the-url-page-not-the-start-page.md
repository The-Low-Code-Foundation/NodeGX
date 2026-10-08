---
id: P107-C126
title: With Use Routes, a Component Stack's Reset (and a Components edit) rebuilds the page in the URL, not the start page its Reset port promises
status: open
severity: low
area: runtime / Component Stack (navigation-stack.tsx `resetAsync` :523-531 reads `matchPageFromUrl` for every reset; the Reset port :315-326 says 'Empties the stack and rebuilds the start component')
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; recorded on the runtime target (NSP-016 s58 probe traces, each beside a control), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "ROUTES: a push of Detail, then Reset — the reset reads #/detail: Detail is rebuilt as the only page, Done (row C126)"
---

**What a person sees.** A stack with Use Routes shows Detail on top of Home (address `#/detail`). The author fires Reset to go back to
the start. The stack empties and rebuilds Detail as its only page, answers Done, and the address still says `#/detail`. The
same happens on a Components edit. Without Use Routes, Reset rebuilds Home.

**Where.** Every reset reads the URL first. The mount and `popstate` need that. A Reset asked for by the author is the same code path.

**How to reproduce.** Play the `regression:` scenario on the runtime target. Top Component Name stays Detail and Stack Depth goes to
1. Also "ROUTES: placed at #/detail, then Components edited …". The spec copies the behaviour (R3).

**Proposed fix (ruling needed).** Either Reset ignores the URL and pushes the start page's URL, as its description says, or the
description changes to say a Reset with Use Routes re-reads the address, as the Page Router's does.
