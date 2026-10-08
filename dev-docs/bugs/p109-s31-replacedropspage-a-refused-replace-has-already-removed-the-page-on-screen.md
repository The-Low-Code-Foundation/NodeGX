---
id: P109-S31-REPLACEDROPSPAGE
title: A Component Stack replace refused after its checks (a component the project does not have) has already removed the page on screen — the stack shows nothing while Top Component Name and Stack Depth still name it
status: open
severity: low
area: runtime / Component Stack (noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx `replaceAsync` — an unanimated replace deletes every page before it builds the new one)
found: P109 ISL-048 s31, 2026-10-08 (writing C107's replace scenario)
evidence: packages/nodegx-node-spec/scenarios/Page Stack.json "row C107 — a replace to a page whose component the project does not have is Failure (not found) — the page it replaced is already gone (Children Count 0); a push after it is Done" — identical on the interpreter and the runtime target
kit: node-spec
---

**What a person sees.** A Component Stack shows Home. A Replace to a page whose component was renamed or deleted answers
Failure (since C107) — but the page on screen has gone: the stack draws nothing, while Top Component Name still says Home and
Stack Depth says 1. A push after it puts the new page above an entry whose page no longer exists (Stack Depth 2).

**Where.** An unanimated replace tears the old pages down first, then builds the new one ("so the two pages are never children
at the same time"). Building the component's node does not add it to the page, so the build can come first.

**Proposed fix.** Build the new page's content before dropping the outgoing pages (the build adds nothing to the page until
`addChild`), so a refused replace leaves the page that was there. Small; a Page Stack spec version.
