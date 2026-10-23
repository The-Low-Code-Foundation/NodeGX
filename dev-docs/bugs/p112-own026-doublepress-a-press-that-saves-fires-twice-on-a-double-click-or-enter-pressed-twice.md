---
id: P112-OWN026-DOUBLEPRESS
title: A Button's Click or a Text Input's On Enter that starts a save fires again on a double-click or Enter pressed twice, so one press saves twice
status: fixed
commit: PENDING
regression: packages/noodl-runtime/test/nodes/own026-fix03-add-to-and-press-guard.test.ts (FIX-03 B rows); packages/noodl-viewer-react/tests/own026-fix03-a-press-that-saves-is-taken-once.test.ts
severity: high
area: runtime / viewer controls (`packages/noodl-runtime/src/pressguard.ts`, `nodecontext.ts` `updateDirtyNodes`, `api/cloudstore.js`; `noodl-viewer-react/src/react-component-node.ts`, `nodes/controls/utils.ts`)
found: P112 OWN-026 t1-nodegx-3 (T3), 2026-10-23; FIX-03 B
evidence: /Users/Shared/nodegx-lab/own026-grades/t1-nodegx-3/grade.json T3: Enter twice quickly, fuel 4 → 6; a double-click on Check, 6 → 8
---

Every press fired. The guard was advice ("disable the control until that save's Done or Failure") that needs a busy
flag and a wire per control. The model read it and argued it away ("double presses are a minor risk … the Check
button is hidden"), and the keyboard path (Enter in the field) had no guard at all.

Fixed in the runtime, on by default: a press noted by a guarded control (Button `onClick`, Text Input `onEnter`) makes
the next update its cause, and any backend write that starts during that update (the six `cloudstore.js` write
methods, so every Record node and a `Noodl.Records` call made before its first `await`) holds the press's keys until
the backend answers, and for at least 500 ms after the press. A press on a held key is ignored. The keys are the
nodes the press is wired to, so a Button and a field's Enter wired to the same node share one guard. A press that
starts no write holds nothing once its update has run. `Repeat While Saving` turns it off per control. A write that
never answers releases after 15 s. Not attributed: a write a script starts after its first `await`.
