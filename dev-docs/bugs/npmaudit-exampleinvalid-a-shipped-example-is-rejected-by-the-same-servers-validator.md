---
id: NPMAUDIT-EXAMPLEINVALID
title: A shipped example is rejected by the same servers validator
status: fixed
commit: 6f17999c1
severity: medium
area: mcp / examples
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
kit: mcp
regression: packages/noodl-mcp/tests/npmauditExampleInvalid.test.ts "agent-store-shared-state"
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

**Fixed (the Beta sweep s8, 2026-10-25).** `packages/noodl-mcp/tests/npmauditExampleInvalid.test.ts` writes every example
through `create_component` on a fresh fixture, components another one places or names first (a dependency sort; push-pop
and the Tiptap pair given their order): 102 accepted, red 25 on HEAD's enriched catalog. Twelve stay refused for context,
each named with its reason in the file (the fixture's own `/App` and `/Pages/Home`; record and account ports that need the
example's collections; module node types). The example defects, fixed in `docs/node-catalog/examples` (enriched catalog
regenerated, `catalog:examples` 114/114, `catalog:merge:check` up to date, `docs:bubble:check` up to date):
- `agent-store-shared-state`: String Format `format: "Signed in as {user}"`, wired `user` and `formatted`; the description
  no longer claims a `previousValue` transition or an Initial State it does not build.
- Log `level: "warning"` → `"warn"` in the five.
- `comp-repeater-set-item-object`: `labelSpacing` `"8px"` → `var(--space-2)`.
- `code-http-request-with-error-handling`: the Script set `script.inputs = …` on the `script` function, so it declared no
  ports and never ran; now `Script.Inputs/Outputs` with a `response` setter.
- `agent-sse-chat-stream`: the Script node had no code (now builds `body`/`headers` on Run, then `send`); String Mapper
  wired `input`/`output` (it is `inputString`/`mappedString`) with no mapping (now the stream's four states).
- `fn-aggregate-stats-function`: Aggregate Records has no count and its outputs are `agg-<name>`; now `totalHours`, a sum
  of `hours`, and the description says where a count comes from (Query Records, Fetch total count).
- `comp-create-object-on-event`: Object `title` → `prop-title`. `community-tiptap-text-editor`: Set Object Properties
  `stored` → `done` (P107-S86-STOREDWIRE), and its For Each row was a component from the community project it came from
  (`/#Experiments/…`): now the companion example's `/Tiptap text editor r`, said in the description.
- Eight cloud functions named `/Cloud Functions/…` (the door builds a browser component) → `/#__cloud__/Cloud Functions/…`,
  as the other cloud examples are.
- 58 Component Inputs/Outputs ports typed `{ "name": "*" }` in eight community examples → `"*"`: the tool's argument
  schema refuses the object outright. That refusal also meets a component the editor saved: filed
  **BETA-S8-PORTTYPEOBJECT**.
Not closed here: why `catalog:examples` passed all of these (the editor's validator does not check an enum value, a unit
string or a Script's declared ports the way the write door does); the new test is the gate that does.
