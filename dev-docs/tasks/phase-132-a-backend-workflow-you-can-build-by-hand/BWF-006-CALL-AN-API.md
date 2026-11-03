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

## s7 (2026-11-03): built

**The engine** (NodeGX, `packages/nodegx-backend`): `http-request`, *Call an API*, category *Workflow Integrations*.
`steps/http.ts` (the executor), `steps/httpParams.ts` (settings and their write-time check, pure), `steps/outbound.ts`
(where it may connect). Method, address, query, headers, body (`json` / `form` / `text`), `authType` `none` / `bearer` /
`header` / `query` / `basic` with `authSecret` (a Secret's NAME), `authName`, `authUser`, `timeoutMs` (30 s, at most
300 s), `anyStatus` (*Treat any status as an answer*), and `call-function`'s retry group (the loop is now
`runWithRetryPolicy`, shared; declared default 1 attempt, because the policy is off below 2). Out: `{ status, ok,
headers, body }`, the body parsed when it is JSON. Documented in `docs/runtime/WORKFLOW-NODES.md`.

- **The key never reaches the record.** 🔴 The workflow engine writes a step's input and output **unscrubbed**
  (`BoundedExecutionLogger`'s note: a function's steps go through the value scrubber, a workflow's do not). So the key
  is never a param value: the step holds the Secret's name, and the executor reads the value through `_noodl_get_secret`
  (the Secret node's resolver, so a project's `.env` line counts too) and puts it straight onto the request. An API that
  echoes it has it cut out of the output (`[REDACTED]`) before the engine sees it; errors quote the address without its
  query.
- **A key typed in is refused at write time**, with *"A key belongs in Secrets, not in the workflow file…"*: a header
  or query parameter named like a credential (`Authorization`, `X-API-Key`, `api_key`, `appid`…) with a typed value; a
  literal anywhere in the address, query, headers or body shaped like a known key; a name and password in the
  address. The shapes are the deploy packager's `SECRET_PATTERNS` (`scripts/package-deploy.js`); a test holds the two
  lists equal. There was no detector in the MCP to reuse (the editor's `report/redact.ts` is a third, older list).
- **Where it may call** (item 3): loopback, link-local (169.254.169.254), private, CGNAT, multicast and reserved ranges,
  IPv4 and IPv6 (and IPv4 inside IPv6) are refused **on the connection**: a `lookup` of our own on Node's `http`, not
  `fetch`, so a name that resolves to a private address is caught (rebinding included), and each redirect goes through
  the same door (a key header is dropped when a redirect leaves the origin). `--allow-private-http` /
  `NODEGX_ALLOW_PRIVATE_HTTP=1` allows them, for a service on your own machine. P26's DEPLOYLOOPBACK is about a
  deployed app pointing at a builder's 127.0.0.1, not about outbound calls: there was no guard to reuse.
- AC1 + AC2: `tests/p132-bwf-006-http-request.test.ts`, 17 specs: a 200 parsed and picked by the next step; a
  redirect followed; text kept as text; a 500 to `onError` with its status; *any status* on; a timeout in 300 ms; the
  retry group (3 calls); the key sent as each of the four auth types, the run record holding `WEATHER_KEY` and **no file
  in the data folder but `secrets.json`** holding the value; a missing Secret fails before any call; the written file
  names the Secret; four typed keys refused with nothing written; 127.0.0.1, `localhost`, 169.254.169.254 and
  `[::ffff:127.0.0.1]` refused by a backend started as every backend starts. Two mutants caught (lookup guard off: the
  `localhost` spec; output scrub off: the echo spec). The 41 workflow-layer suites: 645/645.

**The agent** (`packages/noodl-mcp`): `list_backend_step_kinds` and the step `kind` say an outside API is
`http-request` with its key a Secret named in `authSecret`; `set_function_secret` says it serves that step too, and
that a key a person pastes goes there, not in a file. `toolDisclosure` green; `instructions.test.ts` is red on
`P132-BST006GOLDEN` alone (67 vs 68, before this session).

**Studio**: the form from the catalog's `control`: `key-values` (query, headers, a body's fields: a name and a value
box per row, the value typed, picked from the run or a formula), `secret` (the backend's Secrets by name, from `GET
/admin/secrets`, read only when such a step opens; *Add a secret* is Studio's own name and password fields, written
with `PUT /admin/secrets/:name` and never read back). Authentication is a section of its own and shows only what its
kind uses; a GET shows no body. *Paste a curl command* (`automations.mjs` `parseCurl`): address, query, headers,
body, `-u`, `-G`, `--json`, `-F`, `-m`; a key in the line (Bearer, Basic, a key-named header or query parameter) is
lifted out, Studio asks it a Secret's name (`OPENWEATHERMAP_KEY` from the address), saves it, and only then fills the
form. A new step starts at `https://api.example.com/` (reserved for examples, so it calls nobody).

- `check:automations` with `NODEGX_REPO`: **127/127**, BWF-006's 12 lines: the menu has *Call an API* under
  *Integrations*; a curl line with `Authorization: Bearer <key>` asks for a name with the value hidden, writes nothing
  meanwhile, fills address, query and Bearer from `WEATHER_KEY`; the key is in neither the project's file nor the
  backend's workflow (**AC2 in Chrome**); the test sends the key; the next step can pick
  `upstream.<id>.body.current.temperature_2m` (**AC3 in Chrome**). Pure checks 107/107.
- **AC3 green in the Electron app** on a Greenhouse copy ([greenhouse-drive-bwf006.mjs](greenhouse-drive-bwf006.mjs)):
  *Call an API* added after *The watering names its plant*, filled by pasting Open-Meteo's curl line (no key), tested on
  the Watering of 28 October: all three steps ran, the API answered in 397 ms with Paris at 10.1 °C, the answer opens
  as a tree (`body` → `current` → `temperature_2m`), and *Mark the plant watered* offers
  `upstream.http-request.body.current.temperature_2m` to pick. [look/bwf006-filled-from-curl.png](look/bwf006-filled-from-curl.png),
  [look/bwf006-tested-open-meteo.png](look/bwf006-tested-open-meteo.png).

🔴 **A syntax error in `studio.html` reads as "title stayed NodeGX Studio"** two minutes into a drive (s7: one extra
`)`). Extract the `<script type="module">` and `node --check` it first: one second.

**Still open after s7:** a query row puts its name above its value rather than beside it; an enum left at its default
reads "(default)", not "none" (Studio's enum control, every kind); no agent round was run for BWF-006 (none is in its
ACs; item 5's wording is in, ungraded by an agent); Studio from the kit has no Call an API until a release.
