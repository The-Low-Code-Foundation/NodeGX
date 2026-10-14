---
id: P107-S97-MRNULLRETRY
title: A Model Request (Anthropic) whose provider answers 200 with the JSON `null` sends the request three times — each answered, each paid — and then says the request "did not reach the provider"
status: fixed
severity: medium
area: cloud runtime / Model Request (`packages/noodl-viewer-cloud/src/nodes/cloud/modelrequest.ts` `dispatch` :945-1044, `readMessagesAnswer` :253-260)
found: P107 s97, 2026-10-12 — measured before writing the node's spec (NSP-022)
evidence: a probe calling the node's own `dispatch` with `fetch` answering 200 `null` every time → 3 fetches, Failure `model-request/network`, Error "Model Request: the request did not reach the provider. Cannot read properties of null (reading 'usage')", Attempts 3, Status 0
regression: packages/noodl-viewer-cloud/tests/fed-003-model-request.test.ts ("P107-S97 — a 200 that is not a Messages answer fails once"); packages/nodegx-node-spec/scenarios/noodl.cloud.modelrequest.json (the two P107-S97 scenarios), graded on the cloud runtime
kit: node-spec
---

`readMessagesAnswer(null)` reads `payload.usage` and throws. The throw happens inside the response's `.then`. The chain's
`.catch` is there for transport faults (a refused connection), and it takes the `TypeError` for one: it retries while attempts
and time remain, then reports `network` with V8's sentence. Each of the three attempts reached the provider and got a 200, so
each was billed. The Error says the request never arrived, and Status reads 0.

The OpenAI-compatible path guards the same case (`readChatAnswer` checks `payload &&`). It fails once with "…JSON that is not
a chat completion. Check Base URL." The fix belongs with the Model Request spec (s98). A 200 that is not a Messages answer
should fail once, with its status, and never be retried. That is P107-S97-MREMPTYANSWER's rule too.

**Fixed (s98, before the node's spec).** `readMessagesAnswer` returns `undefined` for JSON with no `content` list (`null`
included), the guard `readChatAnswer` already had. The answer fails once: `network`, with its status, and "…JSON that is not a
Messages answer. Check Base URL." The code is the chat path's, so a graph switches on one code for this fault, not two.
Control: with the guard removed, the two fed-003 tests and two scenarios go red (a plant in a copy of the file: 2 scenarios, 2
sequences).
