---
id: P121-TWO003-LOGINSUCCESS
title: The door's "Log in, show the user, log out" example says Log In fires `success`; it fires `done`
status: open
severity: low
area: mcp / examples (`user-login-flow`, served by `get_example`; its text in `packages/noodl-types/src/node-catalog-enriched.json`)
found: P121 TWO-003 s3, 2026-10-14
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-003-THE-SHOP.md §6.5
---

`get_example user-login-flow` describes Log In as "firing `success` or `failure` (+`error`)". Log In's outputs are
the outcome set (`login.ts` `outcomeOutputs`, reporting `done` on success, :146-147); there is no `success` port.
The example's own wiring is right (it wires only `error`), so it is the sentence an agent copies from: wiring
`success` to the next step is refused by the door ("has no output named "success" → available: completed, done,
error, failure"), measured on Log Out in TWO-003 s3.

Fix: the description says `done`. Small. Owner: NONE.
