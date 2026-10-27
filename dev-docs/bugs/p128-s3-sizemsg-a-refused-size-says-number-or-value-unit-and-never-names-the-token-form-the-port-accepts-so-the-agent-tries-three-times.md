---
id: P128-S3-SIZEMSG
title: "A refused size parameter says it \"expects a number or { \"value\", \"unit\" } object\" and suggests 16px, never naming the `var(--token)` form the same check accepts, so an agent asked for a bigger number tried a calc, then vw, then found the token on its own"
status: fixed
commit: 13b51ddb0
regression: packages/noodl-editor/tests-unit/p128/sizeRefusalNamesTheToken.test.ts
severity: low
area: "`packages/noodl-editor/src/editor/src/validation/parameterValues.ts` (accepts `isTokenReference` at :199; the message at :235 and the fixed `{ value: 16, unit }` suggestion at :236 and :207)"
found: P128 S3 follow-up, 2026-10-27, CCN-006 AC8 run step 4 (Richard, Claude Desktop, "Make the number bigger" on the Tap Counter)
evidence: "The agent's two refused writes, verbatim: `fontSize: \"calc(var(--display-lg) * 1.8)\"` → \"parameter \\\"fontSize\\\" (number) expects a number or { \\\"value\\\", \\\"unit\\\" } object … did you mean `{\\\"value\\\":16,\\\"unit\\\":\\\"px\\\"}`?\"; then `{ value: 20, unit: \"vw\" }` → \"unit \\\"vw\\\" is not one of this port's units … available: \\\"px\\\"\". The third write added a token `--display-xl: clamp(7rem, 24vw, 18rem)` and set `fontSize: \"var(--display-xl)\"` (read back from `Tap Counter/components/Pages/Home/nodes.json`). Richard read the two red Error blocks in the chat as \"a couple of tool failures\"."
launch: none
owner: P128 Beta round, Track B (2026-10-27)
---

The write door did its job: nothing bad was written, and the agent got there. But the refusal sent it the wrong way
twice. The port takes three forms (a number, `{ value, unit }`, a `var(--token)`), the message names two, and the
suggestion is a stock 16px when the agent was asked to make the text bigger. The authoring doctrine says tokens
first ("set colour/spacing params as var(--token)"); the refusal should say the same.

Each refusal shows the person a red "Error" block with the JSON in it. In a conversation a non-coder is watching,
two of those read as the tool failing, though nothing failed.

**Proposed.** At :235, "expects a number, a { \"value\", \"unit\" } object or a var(--token) reference"; when the
refused string contains `var(--x)`, suggest `var(--x)` (or a new token) instead of 16px. Whether a refused write should
reach the host as `isError` at all is a separate question, for Richard: it is honest for the agent and alarming for
the person.

## 2026-10-27 night, P128 Beta round Track B: fixed (13b51ddb0), the agent's half of S3b step 10

Grepped first: no spec, fixture or doc pins the old text (only the built `index.bundle.js` files carry it). The
refusal now reads "expects a number, a { "value", "unit" } object or a var(--token) reference. Got …", and when the
refused string holds a `var(--x)`, adds "This port takes a token alone, not inside an expression: use var(--x), or add
a token that holds the size you want" with the suggestion `"var(--x)"`; without one, the stock `{"value":16,"unit":"px"}`
as before. Measured through the server, the agent's own value (`fontSize: "calc(var(--display-lg) * 1.8)"` on a Text,
`create_component` on a todo-list copy): the 0.2.9 tarball answers the old sentence and `did you mean
{"value":16,"unit":"px"}`; HEAD's dist (rebuilt 22:13) names the token form and `did you mean "var(--display-lg)"`.
Gates: the spec 3/3 inside editor jest `tests-unit/p128 aib-001 vib-007` 170/170; noodl-mcp `cn004` +
`npmauditExampleInvalid` 130/130. Reaches a stranger with the next `@nodegx/mcp`.

**Not touched, still Richard's (S3b step 10, R):** whether a refused write reaches the host as `isError` at all (honest
for the agent; a red "Error" block for the person watching).

