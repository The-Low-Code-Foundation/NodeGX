---
id: P107-S97-NULLBODY
title: A cloud function that declares a request contract answers a request body of `null` with a TypeError (a 500), where the contract promises a 400 naming the fields
status: open
severity: low
area: cloud runtime / the request contract (`packages/noodl-viewer-cloud/src/nodes/cloud/requestContract.ts` `applyRequestContract` :286-321, called from `request.ts` :254-259)
found: P107 s97, 2026-10-12 — measured through the real `CloudRunner.run` before writing the Request node's spec (NSP-022 §6.5)
evidence: a function with `params: total`, `ptype-total: number`, handed body `null` → `CloudRunner.run` rejected with `TypeError: Cannot read properties of null (reading 'total')`; the same function handed `{}` passes, and handed `{"total":"banana"}` rejects with `CloudFunctionBadRequestError` (the 400)
regression: packages/nodegx-node-spec/scenarios/noodl.cloud.request.json ("a JSON null body with a contract declared") pins today's behaviour; it moves when this is fixed
kit: node-spec
---

`JSON.parse('null')` is `null`. `request.ts` :216-219 keeps it, because only a parse that throws falls back to `{}`.
`applyRequestContract` then reads `body[spec.name]` off `null` and throws. The backend maps a thrown `TypeError` to a 500, so
the caller gets an internal error for a malformed body. CWF-014's point was a 400 that names the fields.

Not fixed in s97: it does not block anything. The spec records today's behaviour, and nothing can hang on it. The obvious fix is
a `null` (or any non-object) body read as `{}` before the contract runs. That makes a Required field a 400 `missing`. It
changes what a JSON string body does (today `"ab"` arrives as parameters `0` and `1`, `for … in` over the string), so it is a
small decision, not a typo.
