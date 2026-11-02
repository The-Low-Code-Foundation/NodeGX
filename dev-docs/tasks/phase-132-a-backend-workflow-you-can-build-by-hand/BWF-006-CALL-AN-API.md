# BWF-006 — Call an API

**Phase:** [132](README.md). **Repo:** NodeGX `packages/nodegx-backend` (a new kind; `config/SecretsStore.ts`),
`packages/noodl-mcp`; nodegx-studio (the form, the Secrets picker). **Ruling:** R3, *"Yep"*: *Call an API* with keys in
Secrets is the connector story for Beta.

## What to build

1. **`http-request`**: method, URL (a value: text with values), query, headers, body (JSON fields as values, or form),
   **auth from a Secret by name** (bearer, a header, basic), timeout, the existing retry group. Out: `{ status, headers,
   body }`, the body parsed when it is JSON. Routes: none; a status outside 2xx fails the step unless *Treat any status
   as an answer* is on, so `onError` handles failures.
2. **A key is never in the file.** The step stores the Secret's **name**; the value is read at run time. `validate`
   refuses a header or body literal that looks like a key (the same detector the MCP's secret checks use, if one exists:
   find it first) with the sentence to move it to Secrets.
3. **Where it may call.** A backend on a person's VM calling loopback or the cloud metadata address is the classic hole.
   Default: refuse loopback, link-local and private ranges, with a backend setting to allow them for local development
   (check P26's DEPLOYLOOPBACK work before writing a second guard).
4. **Studio**: the form, a Secrets picker with *Add a secret* (its value write-only), and *Paste a curl command* to fill
   the form (n8n has it; cheap, and it is how people copy an API's docs).
5. **The agent**: the catalog; the instructions say an outside API is a step with a Secret, and that a key the person
   pastes into the chat goes to Secrets, not the file.

## Acceptance

- AC1: backend tests: a 200 JSON body parsed, a 500 failing to `onError`, a timeout, the Secret's value sent and absent
  from the run record's `inputData` (redacted), loopback refused.
- AC2: a file with an `http-request` step contains no key (a test that greps the written file for the secret's value).
- AC3: on a copy of Greenhouse, a step calls a public weather API (no key) and a test run shows its answer as a tree
  BWF-003 can pick from.
