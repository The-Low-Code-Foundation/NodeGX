---
id: P107-S97-USERSMEHANG
title: A cloud function whose caller lookup (/users/me) answers something that is not JSON, or JSON null, never answers — it waits for its timeout (a 504) and leaves an unhandled rejection in the backend process
status: fixed
severity: medium
area: cloud runtime / the cloud user service (`packages/noodl-viewer-cloud/src/services/userservice.js` `_makeRequest`), reached by every Request node given a session token
found: P107 s97, 2026-10-12 — measured through the real `CloudRunner.run` before writing the Request node's spec (NSP-022 §6.5)
evidence: a scratch test through `CloudRunner.run` (`timeoutMs: 1500`) with `fetch` answering `/users/me` — 200 `not json`, 500 `<html>bad gateway</html>`, 200 `null` — each settled as `CloudFunctionTimeoutError`, with Allow Unauthenticated on or off, and jest reported the unhandled rejections (`SyntaxError: Unexpected token`, `TypeError: Cannot convert undefined or null to object` at userservice.js `delete user.ACL`, `Cannot read properties of null (reading 'error')`)
regression: packages/nodegx-node-spec/scenarios/noodl.cloud.request.json ("/users/me answers something that is not JSON", "/users/me answers JSON null with a 200"), graded on the cloud runtime by packages/noodl-runtime/test/node-spec/conformance.test.ts
kit: node-spec
---

`_makeRequest` called `res.json()` inside its `.then` and did not return it. A body that did not parse (a proxy's HTML error
page, an empty 204), and a JSON `null` (which then threw in the success or error callback), rejected a promise nothing
listened to. Neither callback ran. The Request node's `await this.fetchCurrentUser(…)` never settled, so the function never
answered. The runner abandoned it at its timeout as a 504, which says nothing about the caller lookup. The process also got an
unhandled rejection. Node's default for one is to exit; that was not measured on nodegx-backend, which installs no
`unhandledRejection` handler (`grep` over `packages/nodegx-backend/src`).

**Fixed (s97).** The body is now read inside the chain. An answer that does not parse, or is `null`, reaches `options.error`, the
way a request that never reached the server always did. The Request node then refuses the request (`Unauthenticated requests not
accepted.`) or runs it unauthenticated when Allow Unauthenticated is on. A success or error callback that throws is still
outside the rejection handler, as before. The same path also serves the cloud JS API's `Users.logIn` and `fetchUser`
(`api/users.js`), which now reject instead of hanging.

**Control:** with the old chain restored for one run, the Request node's runtime conformance went red: 2 of 25 scenarios, 5 of
200 generated sequences, and the suite failed on the unhandled rejections. The fix was restored after the run.
