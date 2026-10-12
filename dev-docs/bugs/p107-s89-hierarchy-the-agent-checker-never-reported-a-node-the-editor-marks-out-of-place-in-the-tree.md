---
id: P107-S89-HIERARCHY
title: The agent's checker never reported a node the editor marks out of place in the visual tree — 60 nodes in 208 projects open red in the editor and passed every agent check
status: fixed
commit: 9da5979f9
task: NSP-021
kit: project-contract
regression: packages/nodegx-project-contract/tests/hierarchy.test.ts
severity: medium
area: editor / validator (the Problems panel and the agent server share it) — `NodeGraphNode.evaluateHealth` :986-1060 raised `node-not-child`, `node-invalid-child`, `node-no-children`, `node-child-cat`; no validator rule asked any of them
found: P107 NSP-021 s89 (the allowAsChild census), 2026-10-12
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-021-THE-SECOND-EDITOR.md §6.3
---

The editor marks four placements as errors on the node: a node that may not be a child (a logic node, or a component
with no visual root) placed inside another; a child its parent does not hold; children under a node that holds none; and
visual roots of different categories. The validator the agent server writes through had no rule for any of them, so an
agent could build a page the editor opens in red and be told it passed.

Measured over Richard's 123 local projects and the 85 committed ones (34,361 nodes): **60 nodes**. 52 in the nightbook
template (P107-S89-NIGHTBOOK), 6 in `NodeGX test projects/phase55-s6-haiku` (an agent put its product cards and a link
column inside three For Each nodes), 2 in `nodegx-export/tests/fixtures/slot-desk` (built to have them). Read in the
running editor (`WarningsModel`, copies of each project): nightbook 26 + 26, phase55-s6-haiku 3 + 3, and the control —
SBR-006 Admin Drive, whose `/Admin/Shell` instances hold a Group through a `Component Children` slot — 0.

A rule built on the catalog as it was would have matched all 60 and wrongly flagged 70 more: the catalog's hand mirror
of the runtime export (`build-catalog.js` :239-253) never carried `haveComponentChildren`, so every component with a
`Component Children` slot read as holding nothing.

**Fixed (R23, "Yes, as errors").** One rule body, `@nodegx/project-contract/hierarchy`; the editor's node warnings and
`ComponentModel` call it, and the validator's new `invalid-hierarchy` rule reports the same placements at `error` (one
diagnostic per node). Only new errors block an agent write, so nightbook's existing 26 are reported, not blocking. The
catalog now takes its child/parent fields from the runtime's export (browser, then cloud) rather than mirroring them;
the catalog moved by exactly `Component Children`'s `haveComponentChildren`. Two published examples taught rows inside a
For Each and now use a template component (`bubble-read-a-feed-into-a-list`, `bubble-read-an-xml-response`).
