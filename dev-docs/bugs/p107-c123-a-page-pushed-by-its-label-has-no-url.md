---
id: P107-C123
title: With Use Routes, a page pushed (or started) by its label rather than its id gets no URL: the address becomes #, and a reload or Back shows the start page
status: fixed
commit: 52367365b
phase: P109
task: ISL-048
severity: low
area: runtime / Component Stack (navigation-stack.tsx `getRelativeURL` :583-588 finds the page's row by `p.id == top.pageId`; an entry made by a label carries the label as its page id)
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; recorded on the runtime target (NSP-016 s58 probe traces, each beside a control), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "row C123 — ROUTES: a push by the page's label, Detail — the URL is #/detail, and a Reset reads Detail back from it"
---

**What a person sees.** A Push Component To Stack whose target is wired as the page's name (`Detail`) rather than its id shows Detail,
and the address becomes `#`. A Start Page set by name behaves the same once it is back on top after a Pop. Reloading shows the start
page. This happens only when the page's Path was never written, which is the usual case: the editor's default Path is not saved.

**Where.** `_findPage` accepts an id or a label, and the stack entry keeps what was asked for as `pageId`. `getRelativeURL` falls back to
the label only through a lookup by id.

**How to reproduce.** Play the `regression:` scenario on the runtime target (history `#`). Also "ROUTES: Start Page given by its label,
Home …". The spec copies the behaviour (R3).

**Proposed fix.** Store the found page's id in the entry (`pageInfo.id`), or derive the path from `top.pageInfo.label`.

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed (the second reading).** `getRelativeURL` finds the page's row by the id
`_findPage` found (`top.pageInfo.id`), not by the entry's page id, which an entry made by a label carries. Page Stack spec v12.
Runtime 150 / 150 at seeds 13 and 20732; control red on exactly the 2 C123 scenarios.
