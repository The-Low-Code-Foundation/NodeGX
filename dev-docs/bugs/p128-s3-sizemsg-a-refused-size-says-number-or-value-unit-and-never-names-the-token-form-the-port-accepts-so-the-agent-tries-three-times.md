---
id: P128-S3-SIZEMSG
title: "A refused size parameter says it \"expects a number or { \"value\", \"unit\" } object\" and suggests 16px, never naming the `var(--token)` form the same check accepts, so an agent asked for a bigger number tried a calc, then vw, then found the token on its own"
status: open
severity: low
area: "`packages/noodl-editor/src/editor/src/validation/parameterValues.ts` (accepts `isTokenReference` at :199; the message at :235 and the fixed `{ value: 16, unit }` suggestion at :236 and :207)"
found: P128 S3 follow-up, 2026-10-27, CCN-006 AC8 run step 4 (Richard, Claude Desktop, "Make the number bigger" on the Tap Counter)
evidence: "The agent's two refused writes, verbatim: `fontSize: \"calc(var(--display-lg) * 1.8)\"` → \"parameter \\\"fontSize\\\" (number) expects a number or { \\\"value\\\", \\\"unit\\\" } object … did you mean `{\\\"value\\\":16,\\\"unit\\\":\\\"px\\\"}`?\"; then `{ value: 20, unit: \"vw\" }` → \"unit \\\"vw\\\" is not one of this port's units … available: \\\"px\\\"\". The third write added a token `--display-xl: clamp(7rem, 24vw, 18rem)` and set `fontSize: \"var(--display-xl)\"` (read back from `Tap Counter/components/Pages/Home/nodes.json`). Richard read the two red Error blocks in the chat as \"a couple of tool failures\"."
launch: none
owner: none
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
