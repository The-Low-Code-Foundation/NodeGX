---
id: REL044-KITTYPESMIRROR
title: "@nodegx/node-kit-types does not publish the runtime's new `takenOnceWhileSaving` member (ReactOutputPropDefinition, NodeDefinitionOptions)"
status: open
severity: low
area: kit types / `packages/nodegx-node-kit-types` (the published mirror) against the runtime's and viewer's declarations
found: release 0.4.4, PR #54 CI run 43061637414, job "Test (runtime, backend, viewer, mcp, preview)" (not a required check), 2026-11-12
evidence: "`tests/drift.test.js` › exactly mirrored types: ReactOutputPropDefinition (viewer) and NodeDefinitionOptions (types) — the runtime has `takenOnceWhileSaving`, the mirror does not. The ReactOutputPropDefinition red is new since release 0.4.3's run; NodeDefinitionOptions was already red there"
---

What it costs a person: a kit author writing TypeScript against `@nodegx/node-kit-types` cannot declare `takenOnceWhileSaving` without
a type error, though the runtime honours it. Nothing at run time.

Fix: add the member to the mirror (optional, as the runtime has it) and republish the types package with the next kit release.
