---
id: P112-S13-SECRETPATH
title: "A Secret node's Error names the server's secrets.json path, and a graph can route it into a public function's response"
status: fixed
severity: low
area: cloud runtime / Secret node (`packages/nodegx-backend/src/service.ts` the function-secret resolver's message, ~:901-915; `packages/noodl-viewer-cloud/src/nodes/cloud/secret.ts` `error`)
found: P112 OWN-015 s13, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §6 (the AC3 arm)
regression: packages/nodegx-backend/tests/cloud-secret-node.test.ts "fails loudly on an unknown name, naming the secret and both places to provision it"
---

With `GOOGLE_TTS_KEY` not yet set, `POST /functions/speak` answered 400 with
*"Secret: "GOOGLE_TTS_KEY" is not provisioned on this machine. Add it under the "functions" section of
/var/folders/…/home/.noodl/backends/backend_…/secrets.json, or set the NODEGX_SECRET_GOOGLE_TTS_KEY environment
variable."* The fixture wired the Secret node's `Error` into the failure Response's `errorMessage`, which is the
obvious way to report it and the way an agent would. So the public response carried the server's home directory
and backend id. On a VM that's `/home/<user>/.noodl/backends/<id>/secrets.json` handed to anyone who calls the function.
No value leaks (the node's own rule holds). The message is right for the person who owns the backend and wrong for
the browser.

**Question for the fix:** keep the full sentence for the backend's own log and run history, and give `Error` only
*"GOOGLE_TTS_KEY is not set on this backend"*? Or keep `Error` as is and say in the node's description that it isn't
for a public Response? The first is the one an agent can't get wrong.

## Fixed (2026-10-24) — the first answer: the Error names nothing of the machine

`Error` now reads *"Secret: "GOOGLE_TTS_KEY" is not provisioned on this backend. Its owner sets it on the backend's
Secrets page, or in the NODEGX_SECRET_GOOGLE_TTS_KEY environment variable. A secret does not travel with a deploy, …"*:
the secret's name and how its owner sets it, no path, no backend id. The file line (the `functions` section of
`<dataDir>/secrets.json`) goes to the backend's own log as `secret.not-provisioned`, once per name per process.
Graded: `cloud-secret-node.test.ts` and `admin-secrets-http.test.ts` 16/16 (the Error contains the env name and
"Secrets page", and neither `secrets.json` nor the data directory); the "no value in any file or log line" test
still passes.

