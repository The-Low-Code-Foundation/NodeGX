---
id: NPMAUDIT-EXAMPLEINVALID
title: A shipped example is rejected by the same servers validator
status: open
severity: medium
area: mcp / examples
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

`get_example("agent-store-shared-state")` from `@nodegx/mcp@0.2.5`, written back with `create_component`, is rejected: 'String Format has no output named "result" … available: formatted'. An example the server teaches cannot be built by it. Fix: run every example through the write validator in the examples test.

**Measured 2026-10-23 (opennoodl-d7): wider than one example, and the two gates disagree.** `npm run catalog:examples`
(the editor's semantic validator, strict) says **113/113 clean**. Writing every example back through `create_component`
on a fresh copy of the MCP test fixture, components in reverse order, refused **44 component writes**. The spec is
kept in the session scratchpad, not committed red. Sorted:

- **Real example defects (the server teaches what it refuses):** `agent-store-shared-state` String Format output
  `result` (it is `formatted`, and the input needs a `format` naming it); `net.noodl.Log` `level: "warning"` "is not one
  of this port's options" in five (`auth-sign-in-without-a-password`, `bubble-is-this-date-overdue`,
  `bubble-read-a-feed-into-a-list`, `bubble-read-a-pasted-csv`, `bubble-read-an-xml-response`): the editor's validator
  accepts it, so the enum lists differ between the two; `comp-repeater-set-item-object` checkbox `labelSpacing: "8px"`
  (a unit value is an object). To check: `nav-page-stack-push-pop` PageStackNavigate output `backAction-confirmed`,
  `fn-aggregate-stats-function` `noodl.cloud.aggregate` output `taskCount`, Javascript2 outputs in
  `agent-sse-chat-stream` and `code-http-request-with-error-handling` (derived from the script; maybe context).
- **The spec's context, not the example:** record ports (`DbModel2` `title`, `SetDbModelProperties` `title`,
  `NewDbModelProperties` `file`, `SetUserProperties` `displayName`) need the example's collections in the project;
  module nodes (`nodegx.mediarecorder`, `Web Camera`) need the module; `App` / `Pages/Home` already exist in the
  fixture; a page placing `/Components/…` was written before them (the order the spec chose); the `Cloud
  Functions/…` examples are written as browser components (`wrong-runtime-node`) where an agent would put them under
  `__cloud__`; nine `community-*` examples carry object port types the tool's argument schema refuses outright.

So the fix the bug names (every example through the write validator) needs each example's context: its collections,
its modules, its component order and its runtime. Until then the release still ships examples the server refuses.
