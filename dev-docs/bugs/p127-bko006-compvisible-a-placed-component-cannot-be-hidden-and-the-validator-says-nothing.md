---
id: P127-BKO006-COMPVISIBLE
title: A component placed on a page has no "visible" input, so a private screen shows under the sign-in card, and the write door passes it
status: fixed
severity: medium
area: "a component instance's inputs (no visible / mounted unless the component declares one); the write validator"
found: P127 BKO-006, 2026-10-27, the shared-expenses brief (REPORT.md item 4)
evidence: "REPORTED by the stranger, not yet re-measured: the first render showed the group screen beneath the sign-in card with nobody signed in; the graph validated, only the runtime log said so; `visible: false` on an element kept its space. The agent wrapped the screen in a Group and gated it with `mounted`."
owner: Beta sweep s17 (2026-10-27)
kit: mcp
regression: packages/noodl-mcp/tests/p127CompVisible.test.ts "the measured write: a wire into the instance’s visible is refused, with the wrapper to use"
commit: 79cbc4674
launch: beta
---

To measure: write a component instance with `visible: false` through the MCP door and read the answer, then render.

## Measured and fixed 2026-10-27 (Beta sweep s17, 79cbc4674)

Re-measured at HEAD through the door. A `visible: false` or `mounted: false` **parameter** on an instance was already
refused (`interfaceless-instance` / `instance-unknown-parameter`, the first with the wrong advice: "connect them to the
Text/Image nodes"). A **wire** into one was refused when the component declared any input, and **accepted clean when
it declared none**: the wire-target rule skipped a component with nothing in that direction, leaving it to
`interfaceless-instance`, which reads parameters only. That is the stranger's write, read from the transcript
(`/private/tmp/bko006/out/expenses/agent.jsonl` line 273, `update_component Pages/Home` `set`, `@nodegx/mcp@0.2.7`):
`hm_user.authenticated -> hm_group.visible`, `hm_group` a `/Group View` with no Component Inputs; the answer was 0
errors, 0 warnings, 0 infos.

Fixed: that wire is reported (`connection-unknown-instance-port`, "It declares no Component Inputs, so it has no inputs
at all."), and every refusal of `visible`/`mounted` on an instance says what to do instead: put it inside a Group and
set or wire the Group's mounted, `mounted: false` to start hidden. Census before the change: 0 such wires in 243 local
projects (9,833 wires into instances) and the two shipped templates; a planted copy of the measured wire is found.
Reaches an agent with the next `@nodegx/mcp` dist.
