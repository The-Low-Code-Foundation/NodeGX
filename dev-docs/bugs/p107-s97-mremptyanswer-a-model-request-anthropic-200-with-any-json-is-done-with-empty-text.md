---
id: P107-S97-MREMPTYANSWER
title: A Model Request (Anthropic) whose provider answers 200 with JSON that is not a Messages answer (`{}`, `5`) reports Done with an empty Text and an empty Stop Reason
status: open
severity: medium
area: cloud runtime / Model Request (`packages/noodl-viewer-cloud/src/nodes/cloud/modelrequest.ts` `readMessagesAnswer` :253-260, `dispatch` :957-966)
found: P107 s97, 2026-10-12 — measured before writing the node's spec (NSP-022)
evidence: a probe calling the node's own `dispatch` with `fetch` answering 200 `{}` → 1 fetch, Done, Text `''`, Stop Reason `''`, Status 200; 200 `5` the same; the same `{}` with Provider OpenAI-compatible → Failure `model-request/network`, "the provider answered 200 with JSON that is not a chat completion. Check Base URL."
kit: node-spec
---

The module says why this matters, at `readChatAnswer` (:262-264): "a wrong Base URL answering 200 with some other JSON must not
reach the graph as an empty answer." That guard exists only on the OpenAI-compatible path. On the Anthropic path, a Base URL
pointed at the wrong server (a proxy's health check, a gateway's own JSON) gives the graph an empty answer as a success. A
feed graph then stores nothing and carries on.

The fix belongs with the Model Request spec (s98): no `content` array means it is not a Messages answer. That fails once with
the status, as the chat path's does. A small ruling sits inside it: whether that code is `network` (as the chat path says) or
`http_error`.
