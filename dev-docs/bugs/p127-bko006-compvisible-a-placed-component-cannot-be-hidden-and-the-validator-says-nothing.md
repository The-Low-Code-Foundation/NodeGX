---
id: P127-BKO006-COMPVISIBLE
title: A component placed on a page has no "visible" input, so a private screen shows under the sign-in card, and the write door passes it
status: open
severity: medium
area: "a component instance's inputs (no visible / mounted unless the component declares one); the write validator"
found: P127 BKO-006, 2026-10-27, the shared-expenses brief (REPORT.md item 4)
evidence: "REPORTED by the stranger, not yet re-measured: the first render showed the group screen beneath the sign-in card with nobody signed in; the graph validated, only the runtime log said so; `visible: false` on an element kept its space. The agent wrapped the screen in a Group and gated it with `mounted`."
owner: none
---

To measure: write a component instance with `visible: false` through the MCP door and read the answer, then render.
