---
id: P107-C26
title: Push Component To Stack's Back Results and Back Actions never connect — the TS port dropped `registerOutputIfNeeded`
status: fixed
commit: d57c0e053
phase: P109
task: ISL-028
severity: high
area: runtime / Push Component To Stack (viewer)
found: P107 NSP-015 s18, 2026-10-01
regression: packages/noodl-viewer-react/tests/isl-028-push-back-results-and-actions.test.ts "ISL-028 C26 — Push Component To Stack: wires from Back Results and Back Actions connect and deliver"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md §6.1d, §6.2
---

Push a component onto a Component Stack with Push Component To Stack, and in that component close it
with a Pop Component Stack that hands back Results or fires a Back Action. The editor draws the
matching outputs on the Push node (`Back Results` → one per result name, `Back Actions` → one signal per
action), and an author wires them. In the running app none of those wires exist: the connection is
refused when the component is built, so the page that pushed never hears the result or the action. The
pop itself works.

Where: `packages/noodl-viewer-react/src/nodes/navigation/navigate.ts`. The node registers no
`backResult-…` / `backAction-…` outputs: `registerOutputIfNeeded` is the base no-op (node.ts :520), so
`NodeScope.addConnection` → `getOutput` throws "doesn't have a port named …" and the scope logs it and
drops the wire (nodescope.ts :148-155). The `backCallback` still runs and guards its own writes
(`hasOutput('backResult-' + key)` is false, so nothing is sent; `sendSignalOnOutput(action)` logs
"doesn't have a output named …"). The JavaScript original had the method; PLAT-003 slice 8
(`efc19ebbb`, 2026-07-24, the navigation nodes' port to TypeScript) removed it and kept `getBackResult`,
which nothing calls now.

Measured 2026-10-01 (a throwaway runtime probe through `ComponentModel.createFromExportData` and
`createComponentInstanceNode`, the loaded-app path): `push.hasOutput('backResult-x')` false,
`backAction-Save` → Counter refused "Node PageStackNavigate doesn't have a port named backAction-Save".
Control in the same component: Show Popup's `closeAction-Save` → Counter connects
(`registerOutputIfNeeded` at showpopup.ts :313-328), `closeResult-x` registers.

Proposed: put the method back as it was (`backResult-<name>` with the getter `getBackResult(name)`,
`backAction-<name>` with an empty getter) — the Show Popup shape. Ships alone; the spec's scenarios for
it lose their `row` mark in the same commit.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Put the method back".** Wires from Back Results and Back Actions work again, the way Show Popup's close results already do. One method restored in one file, and it touches nothing else. The question as asked: *"Should the method that creates the Back Results and Back Actions outputs be put back as it was?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed d57c0e053 (P109 ISL-028, 2026-10-06), as ruled.**
