---
id: P115-S9-MODELPROMPT
title: A Model Request's prompt and answer are written into the function's run record (step inputData/outputData), which ISL-010 AC5 promised never happens
status: open
severity: high
area: nodegx-backend execution record (WorkflowRunner.ts step sink, the P123-STU-FNRUNVALUES values) / noodl.cloud.modelrequest
found: P115 s9, 2026-11-05 (a whole nodegx-backend run for HST-011's AC2)
evidence: packages/nodegx-backend/tests/isl-010-local-model.test.ts:398 "AC5 — nothing leaks … the success path" and both failure paths (echo400, echoOllama): 3 red
phase: P115
---

A person's app asks a model something in a cloud function. The run's record (`GET /executions`, `/executions/:id`,
what the admin and Studio show) now holds the prompt the person typed and the model's answer, word for word:
`steps[0].inputData.input = "isl010-PROMPT-the-owl-likes-blue-3e9d"`, `outputData.outputs.text = "isl010-ANSWER-…"`,
and the Response node's `pm-text`. ISL-010 AC5 says the record keeps counts and the model id, never the prompt or
the answer.

Most likely cause (not bisected): `ccc14822a` (P123-STU-FNRUNVALUES, 2026-11-01), which records each acting node's
values, redacted by key NAME (`SENSITIVE_KEY_PATTERN`) and by secret VALUE. A prompt is neither a sensitive key name
nor a stored secret, so it passes. The two promises disagree: Studio wants values; ISL-010 wants model text kept off
the record. Needs the owner of both to say which wins for a model node (e.g. record the model node's counts only).

Not HST-011's: that change routes data-dir file writes; the execution history is `executions.sqlite`, untouched.
