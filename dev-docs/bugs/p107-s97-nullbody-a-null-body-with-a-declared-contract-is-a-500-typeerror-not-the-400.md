---
id: P107-S97-NULLBODY
title: A cloud function that declares a request contract answers a request body of `null` with a TypeError (a 500), where the contract promises a 400 naming the fields
status: fixed
commit: (this session, the Beta sweep s5)
severity: low
area: cloud runtime / the request contract (`packages/noodl-viewer-cloud/src/nodes/cloud/requestContract.ts` `applyRequestContract` :286-321, called from `request.ts` :254-259)
found: P107 s97, 2026-10-12 — measured through the real `CloudRunner.run` before writing the Request node's spec (NSP-022 §6.5)
evidence: a function with `params: total`, `ptype-total: number`, handed body `null` → `CloudRunner.run` rejected with `TypeError: Cannot read properties of null (reading 'total')`; the same function handed `{}` passes, and handed `{"total":"banana"}` rejects with `CloudFunctionBadRequestError` (the 400)
regression: packages/noodl-viewer-cloud/tests/cwf-014-request-contract.test.ts "P107-S97-NULLBODY: a body that is not an object names no fields — the 400 the contract promises, not a TypeError"
kit: node-spec
---

`JSON.parse('null')` is `null`. `request.ts` :216-219 keeps it, because only a parse that throws falls back to `{}`.
`applyRequestContract` then reads `body[spec.name]` off `null` and throws. The backend maps a thrown `TypeError` to a 500, so
the caller gets an internal error for a malformed body. CWF-014's point was a 400 that names the fields.

Not fixed in s97: it does not block anything. The spec records today's behaviour, and nothing can hang on it. The obvious fix is
a `null` (or any non-object) body read as `{}` before the contract runs. That makes a Required field a 400 `missing`. It
changes what a JSON string body does (today `"ab"` arrives as parameters `0` and `1`, `for … in` over the string), so it is a
small decision, not a typo.

**Fixed (Beta sweep s5, 2026-10-25), scoped so the decision the row names does not arise.** `applyRequestContract`
reads a body that is not a JSON object (`null`, a number, a string, an array) as no fields. Only a function whose
parameters declare a contract runs it, so a Required field is the 400 `missing`, and with none Required the function
runs. A function with no contract keeps whatever its body parsed to: the `"ab"` → parameters `0` and `1` spelling is
untouched (its scenario's trace did not move).

**Graded.** CWF-014 59/59 with a new case over `null`, `7`, `"ab"`, `[1,2]`, `true` (the mutant without the guard red);
the spec `noodl.cloud.request` v2 with its `changes` entry (migration none), the null-body scenario renamed to what it
does now and a Required twin added (the golden diff read by hand: the optional one ends in `receive`, the Required one
in the 400 naming `total`; `golden.js --diff` matches by name and said nothing moved); `golden.js --check --type
noodl.cloud.request` fresh, version rule held; runtime conformance `NSP_ONLY=noodl.cloud.request` green on the cloud
target; cloud request specs 135/135, node-spec golden 22/22 and catalog parity 375/375, both tscs clean.
