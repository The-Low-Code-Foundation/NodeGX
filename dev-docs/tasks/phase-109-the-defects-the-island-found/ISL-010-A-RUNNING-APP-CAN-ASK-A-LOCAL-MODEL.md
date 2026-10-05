# ISL-010 — A running app can ask a local model

**Status:** 🟡 built s16 (2026-10-05) — AC1–AC3, AC5–AC7 met; AC4 half met (Ollama measured; llama.cpp's server is not installed here, Richard's call). Ruled s15: "From the app's backend", "Only for other computers"; rulings 3–4 as recommended. Scoped 2026-10-01 at `27d891bf3`
**Source:** [audit F13](AUDIT-2026-10-01.md) · [TPL-012](../phase-78-the-templates/TPL-012-THE-CODING-GARDEN.md) line 217 ("Either implement it, or this template proves the loopback route and files the gap") · [tpl-012 research briefing](../phase-78-the-templates/tpl-012-research-briefing.md) lines 221-225 · [P96 FED-003](../phase-96-the-backend-carries-a-feed/FED-003-A-FUNCTION-CALLS-A-MODEL.md) R2 and AC7
**Side:** product (the cloud `Model Request` node; possibly a browser-side request; the desktop shell's model service, which is P91's)

Olive the owl is a small language model (Qwen3.5-0.8B) running on the family's own computer. The game asks her things.
NodeGX has a `Model Request` node, but it lives in cloud functions only, it speaks only Anthropic's API, and it needs a key. Its
`openai-compatible` choice, the API shape that local model servers speak, answers `not_implemented` by design. So the island
calls its own shell from a Function with `fetch` and a `setTimeout` race, and the safety rules live in that script and in the shell.

## 1. The person sentence

**An author points a request node at a model running on the same computer, gives it a fixed question with blanks the
child's choices fill, and gets back an answer in the shape they asked for (one word, a list of three, yes or no). If the model
is missing or slow, the app says so on a wire and carries on.**

## 2. What was measured

HEAD `27d891bf3`, 2026-10-01. Every row was re-read by this task's author at HEAD unless it says otherwise.

| reading | where |
|---|---|
| `Model Request`'s `provider` enum is `anthropic` and `openai-compatible`, labelled *"OpenAI-compatible (not yet implemented)"*. `doSend` refuses any non-Anthropic provider with `not_implemented` **before the secret is read**. Re-read at HEAD | [`modelrequest.ts:67, 207-225, 521-531`](../../../packages/noodl-viewer-cloud/src/nodes/cloud/modelrequest.ts) |
| It is **cloud-only by design**: registered in `noodl-viewer-cloud`, never the browser runtime, because it reads a credential (*"in a browser bundle it would be a credential in a browser bundle"*). Re-read at HEAD | `modelrequest.ts:12-17`; `noodl-viewer-cloud/src/nodes/index.ts:28` |
| A key is **always required**: no `_noodl_get_secret` gives `unavailable` (*"not usable in the browser viewer"*), and a missing or empty secret gives `secret_missing`. A keyless local server cannot be reached through it even once a provider exists. Re-read at HEAD | `modelrequest.ts:535-571` |
| The request is built for Anthropic: `${baseUrl}/v1/messages`, the `anthropic-version` header, `output_config.format = { type: 'json_schema', schema }` for structured answers, retries on 429/5xx, one deadline across retries, counts-only execution record. `baseUrl` is free text (*"a proxy, a gateway, or a test double"*). Re-read at HEAD | `modelrequest.ts:86-110, 251-260, 650-670` |
| FED-003's ruling R2: one node with a provider dropdown from day one, so *"no graph built now is ever rewired"*. AC7 pins the `not_implemented` refusal. Re-read at HEAD | FED-003 lines 33, 101, 108 |
| **An existing client to copy from:** the editor's AI assistant has `openai.ts` (`toChatCompletionsUrl(baseUrl)`, injectable `fetchImpl`) and `ollama.ts` (*"local models, no API key, no cost"*, native `/api/chat`). These are Electron and editor code, not reusable in the backend bundle as they are (FED-003 §2 says the same of the Anthropic client), but the request shapes are a reference. Re-read at HEAD | [`providers/openai.ts:112-125, 214`](../../../packages/noodl-editor/src/editor/src/models/AiAssistant/client/providers/openai.ts); `providers/ollama.ts:1-14` |
| The island's workaround: `OLIVE_SCRIPT` in a Function `fetch`es `POST /__garden/olive` with a custom header (`x-garden: 1`), races it against a `setTimeout`, and maps every failure to `{ ok:false, fallback:true, reason }` (`no-shell`, `http-<n>`, `bad-json`, `timeout`). The page sends a **rung id and slot values, never prompt text**. Re-read at HEAD | [`cg005Olive.ts:540-575`](../../../packages/noodl-mcp/tests/cg005Olive.ts) |
| The shell's side: `/__garden/olive` validates the slots (`checkSlots`), **composes the prompt server-side** from `olive-templates.json`, asks the owl and checks the output (`checkOutput`). It answers no CORS preflight, so the custom header keeps other sites out. The owl is **node-llama-cpp in the Electron main process** (one request at a time, `maxTokens` ≤ 64, 12 s timeout, a JSON-schema grammar per shape). It is **not** an HTTP OpenAI-compatible server. Re-read at HEAD | `phase-105…/garden-desktop/shell/olive-route.js:1-60`; `shell/owl.js:1-25` |
| TPL-012 §2.6 (*"safety by construction"*): a 0.8B model *"cannot … stay inside a fence"*, so containment is built, not prompted. The child never types free text; every Olive block is a fixed template with slots from a word list (one ≤40-character slot in band 10–12, blocklisted); every output passes a grammar, a token cap and a FR/EN blocklist. Re-read at HEAD | [TPL-012 lines 137-180](../phase-78-the-templates/TPL-012-THE-CODING-GARDEN.md) |
| A running app *can* reach a loopback server today with `REST2`, `net.noodl.HTTP` or `SSE` (briefing line 224). TPL-012 line 217 planned `REST`, and the template used a Function instead. Why it moved was not found in this scoping | briefing lines 221-225; TPL-012 line 217 |

## 3. Where it bites a person

- Classroom and offline apps: a school tablet, a family laptop, a kiosk. A local model is the only kind with no key, no cost and
  no child's words leaving the house.
- Today each such app hand-builds the request, the timeout, the fallback and the fence in a script, and the fence is only as good
  as the author's discipline.
- The node that exists is the wrong side of the network for an app with no backend, and the wrong API for every local server.

## 4. Related work and collisions

- **P96 [FED-003](../phase-96-the-backend-carries-a-feed/FED-003-A-FUNCTION-CALLS-A-MODEL.md)** (built): the node, its R2, its key
  rules and its AC7. Implementing the provider **replaces** AC7's refusal. Update FED-003's spec (`fed-003-model-request.test.ts`)
  in the same change, never leave it red.
- **[P91](../phase-91-the-app-in-your-dock/README.md)** (the desktop app, DSK-008…013): who runs the model on a desktop, and on which
  port. The shell here is a per-template fork under `dev-docs/` (audit F38). If the ruling needs the shell to serve an
  OpenAI-compatible endpoint, that is P91's work and this task names it.
- **P45 streaming:** a function cannot emit a stream (FED-003 §2). This task is single-shot (`maxTokens` ≤ 64 in the island), so
  streaming is out of scope here.
- **The safety design** is TPL-012 §2.6's, and lives in `olive-check.js`. Any product version must keep "the page sends slots, the
  server composes the prompt".
- Owner grep: `grep -rln -i "openai-compatible\|openai compatible\|local model" dev-docs/tasks --include='*.md'` → FED-003 (the
  refusal), TPL-012 and its briefing (the need), P57 BLD-004 and release-0.2.0 notes (the editor assistant, a different
  surface). No owner for the provider.

## 5. Design — 🔒 rulings first

1. 🔒 **Which side of the network makes the call?**
   (a) **The backend:** implement `openai-compatible` in the cloud `Model Request` node. The app calls a cloud function, which
   composes the prompt and calls the model. A desktop app needs its local backend (P91 R1 already says the page talks to a backend
   on 127.0.0.1).
   (b) **The browser:** a new browser node that calls an OpenAI-compatible server directly. It needs the server to allow the page's
   origin (CORS), and a key could not be held safely, so it would be loopback-only and keyless.
   (c) **Both,** (a) first.
   *Recommendation: (a).* It keeps the key rule, it keeps "the server composes the prompt" (the fence), and it reuses the retries,
   deadline and cost record FED-003 built. (b) moves the prompt into the page, where TPL-012 §2.6 says it must not be.
2. 🔒 **Is a key optional?**
   (a) always required (today); (b) optional only when Base URL's host is loopback (`127.0.0.1`, `::1`, `localhost`);
   (c) optional always.
   *Recommendation: (b).* A local server has no key, and a remote one without a key is almost always a mistake worth a refusal.
3. 🔒 **Does the node carry the fence, or does the graph?**
   (a) **The graph:** the node stays general (instructions + input → answer), and a template builds the fixed-question-with-slots
   pattern from nodes in the cloud function.
   (b) **The node:** a *template* mode with named slots, a per-slot word list or length cap, and an output blocklist.
   *Recommendation: (a) plus a documented pattern and a library prefab of it.* The fence is policy, and policy varies by app.
   Structured output (grammar / JSON schema) **is** in the node, because a shape is how a small model stays usable.
4. 🔒 **Who serves the model on a desktop?** The island's owl is in-process node-llama-cpp, with no HTTP API. (a) the shell (P91)
   exposes an OpenAI-compatible loopback endpoint; (b) the author runs Ollama or a llama.cpp server themselves; (c) both.
   *Recommendation: (b) for this task's acceptance, (a) handed to P91 as a DSK requirement.*

Constraints: no prompt or answer in the execution record (FED-003 rule 3 holds). Timeout, retries and failure codes reuse the node's
existing vocabulary (`timeout`, `network`, `http_error`, `bad_json`, `refusal`). Structured output maps to the server's own JSON-schema
or grammar option. Which servers accept which form is **not measured**; AC4 measures it.

## 6. Acceptance criteria (apply after the rulings are recorded in §8)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** FED-003's spec harness: `provider: 'openai-compatible'`, Base URL a local recording double on `127.0.0.1`. Record `not_implemented` and **zero** requests reaching the double. Known-firing control: `provider: 'anthropic'` against an Anthropic-shaped double reaches it once. |
| AC2 | **The person sentence, end to end.** A project with a cloud function (`Model Request`, `openai-compatible`, loopback Base URL, no key, a JSON schema `{ word: enum[…] }`) called from a page button. With a real local model server running, the page shows a word from the enum. With the server stopped, the page shows the ruled fallback and the function's `Failure` carries `network`. Drive both in a browser. |
| AC3 | **The key rule** (ruling 2). A non-loopback Base URL with no secret refuses with `secret_missing` and makes **zero** requests. A loopback one makes the call. **Sabotage arm:** treat `127.0.0.1.evil.example` as loopback, and the spec goes red. Grade by host parsing, not by string prefix. |
| AC4 | **Shape, measured per server.** For each server tried (at least Ollama and llama.cpp's server, versions recorded), whether the JSON-schema form is honoured, and what the node does when it is not (`bad_json`, never a half-parsed object). |
| AC5 | **Nothing leaks.** The execution record and the cost channel carry counts and the model id only, never the prompt or the answer (FED-003's AC3 re-run on the new provider). |
| AC6 | **The fence pattern.** A documented pattern or prefab (ruling 3): a cloud function that takes a rung id and slot values, checks the slots against a list, composes the prompt and checks the output. The island's `/__garden/olive` call can be expressed with it. Record whether the island moves (in P108/ISL-025) or stays, and why. |
| AC7 | **FED-003 updated.** Its AC7 is rewritten to the new behaviour, `fed-003-model-request.test.ts` is green, the node's description loses *"not yet implemented"*, and the catalog and docs page are regenerated (`catalog:check` green). `Model Request`'s export row is checked, and an exported app calling it is translated or refused by name. |

## 7. Traps

- **A local double proves the request, not the model.** AC2 needs a real server once. AC1 and AC3 use the double.
- **"localhost" is a name, not an address.** Resolve and check, or a DNS trick turns the keyless rule into a hole (AC3's arm).
- **Do not log the error body blindly.** A local server's error can echo the prompt. FED-003's "nothing here logs" rule applies.
- **A 0.8B model on a cold start can take seconds.** A deadline that suits a warm Mac fails on a tablet (TPL-012 expects 2–8 s
  a call). Grade the timeout path, not only the happy one.
- **The shell's owl is not an HTTP server.** A drive against the island's shell grades the template's route, not this node.

## 8. Session log

None yet.

### Session 15 (2026-10-04/05) — measured, then ruled 1 and 2

**Measured (read-only, HEAD `c70dde72f`):** `noodl-viewer-cloud/src/nodes/cloud/modelrequest.ts` (829 lines) — providers
`anthropic` + `openai-compatible` "(not yet implemented)" (:207-225), refused with `not_implemented` before the secret is read
(:522-533); cloud-only (`nodes/index.ts:28`); the key always required (`unavailable` :537-547, `secret_missing` :549-571);
Anthropic-shaped (`/v1/messages` :659, `x-api-key` :686-690); ≤3 attempts, backoff from 500 ms, one 120 s deadline (:93,
:103, :655-657). 🔴 §5's failure-code summary is off: `bad_json` is only an Output-Schema miss (:775); a non-JSON 2xx is
`network` (:731-736); 429/5xx after retries is `rate_limited` (:720); the set is `not_implemented, secret_missing, refusal,
bad_json, http_error, rate_limited, timeout, network, unavailable` (:66-80). 🔴 **A leak the header denies:** `http_error`'s
message embeds up to 400 characters of the provider's error body (:722) and reaches `raiseRuntimeError` and the failure
outcome (:487-495) — a local server's error can echo the prompt (§7 trap 3); the no-leak AC must cover that line.
Users: no template uses the node (one catalog example, one backend fixture); the island's four Olive Functions fetch
`/__garden/olive` **same-origin** (the shell serves page and route on one origin — why CORS never arose). The owl is
node-llama-cpp in Electron main (`owl.js`), no HTTP endpoint; the garden shell already runs `nodegx-backend serve` on
127.0.0.1 with the app's functions (`main.js:141-161`), so ruling 1 (a) has a backend to run in. Nothing listens on
11434/8080/8000 here: AC2 needs a model server installed first. CORS: not measured.

**Ruled (README §8 round 4, verbatim there):** ruling 1 **"From the app's backend"** (a), ruling 2 **"Only for other
computers"** (b). Rulings 3 (the fence lives in the graph, plus a documented pattern and prefab) and 4 (the author runs
Ollama / llama.cpp for acceptance; a loopback endpoint in the shell handed to P91) taken as recommended.

### Session 16 (2026-10-05) — built; AC1–AC3 and AC5–AC7 met, AC4 half met

**Built** (`noodl-viewer-cloud/src/nodes/cloud/modelrequest.ts`): `openai-compatible` posts to
`<base>/v1/chat/completions` (a base ending in `/v1` or the full URL is taken as given), Instructions and Per-Call
Instructions as ONE system message, `max_tokens`, the Output Schema as `response_format: { type: 'json_schema',
json_schema: { name: 'answer', strict: true, schema } }`. Answers are read onto the ports' existing vocabulary:
`finish_reason` stop/length/tool_calls → `end_turn`/`max_tokens`/`tool_use`; `message.refusal` or `content_filter` →
Failure `refusal` (the model's refusal WORDS are not put in the recorded sentence); `prompt_tokens` minus
`cached_tokens` → Input Tokens, so the number means the same uncached count on either provider; a 200 with no
`choices` → `network` "not a chat completion. Check Base URL." An unknown provider value still refuses
`not_implemented` before the secret is read. Retries, deadline and codes are the node's own.

- **Ruling 2, read from the parsed host** (`isThisComputer`): `127.0.0.1`, `[::1]`, `localhost` after the URL parser
  (which folds `127.1`, `[0:0::1]`, `LOCALHOST`). Not resolved through DNS: `localhost` is reserved (RFC 6761), and
  the rule only decides whether a MISSING key is a mistake — with no key nothing secret is sent. A provisioned key is
  sent as `Authorization: Bearer`, on this computer as anywhere. The rule is **OpenAI-compatible only**: an
  Anthropic-shaped Base URL on this computer is a proxy or a test double, and FED-003's AC4 refusal is graded
  against exactly such a double, so it keeps needing its key.
- **The leak §8 s15 found is closed for both providers.** A failed call's recorded sentence carries the status and
  the error's `type`/`code` only when each is an identifier (`[A-Za-z0-9_.:-]{1,64}`); the provider's own words
  (≤400 characters) go on the `Error` PORT only (`setError`'s `portDetail`). The port is the author's graph, like
  Text; the runtime error and the outcome are the record.
- **Effort gained `None (no thinking)`**, measured into being (AC4 below): on OpenAI-compatible only `none` is sent,
  as `reasoning_effort: 'none'`; every other value is not sent. On Anthropic `none` is sent as `low`, the lowest that
  API takes. Not asked as a ruling: it is the existing port's own meaning, and nothing changes for any graph that
  does not pick it. Richard can overrule it.

**AC1 ✅** — red at HEAD `39bd1c534`: `nodegx-backend/tests/fed-003-model-request.test.ts` 20/20 green with
`openai-compatible` → `not_implemented` and `seen.length` unchanged (zero requests), beside the Anthropic control that
reached the double. After: `isl-010-local-model.test.ts` drives the real service against an OpenAI-shaped double on
127.0.0.1 — the request (URL, no authorization header, one system message, no `output_config`), the schema form,
`reasoning_effort` only for None, bad_json on prose, refusal, truncation, not-a-chat-completion, a closed port
(`network`, 3 attempts) and a 300 ms budget against a 1.5 s server (`timeout`, < 1.5 s). 14/14.

**AC2 ✅** — `nodegx-backend/tests/isl010-ask-the-owl-drive.test.ts`, the project
[`isl010-ask-the-owl`](isl010-ask-the-owl/) (a page whose button calls `askOlive` with a CHOICE; the function's
Function checks it against a list, writes the question and hands Model Request an enum schema; Base URL
`http://127.0.0.1:11434`, no key, Effort None). The function bundle is built from the project's own files
(`bundleAuthoredComponents`), served by an in-process `BackendService`, the page rendered by `withRenderedPage` in
headless Chrome, the button pressed where `elementFromPoint` finds it. Arm A against **Ollama 0.34.4 with the island's
own owl** `hf.co/unsloth/Qwen3.5-0.8B-GGUF:Q4_K_M`: the page read **"Olive says: blue"**, the record a success with
exactly one `modelCalls` entry by model id (Ollama's log: one `POST /v1/chat/completions`, 200, 2.8 s). Arm B against
a closed loopback port: "Olive is asleep, so the game carries on (network)", the record names
`model-request/network`. Arm B taken literally too, with Ollama stopped (`ISL010_STOPPED_URL=http://127.0.0.1:11434`):
2 passed, arm A **skipped** (a skip, not a pass: the describe is chosen at collection by a synchronous probe;
`ISL010_REQUIRE_MODEL=1` makes a missing server red). 🔴 s15's "nothing listens on 11434" was right and incomplete:
Ollama has been installed since 2026-09-27 with `qwen3:0.6b`, `qwen3:1.7b`, `llama3.2` and the owl pulled. It was
not running; this session started `ollama serve` for the readings and stopped it after.

**AC3 ✅** — `noodl-viewer-cloud/tests/fed-003-model-request.test.ts` "ISL-010": 12 hosts by parsed host, a keyless
call to this computer with no authorization header, a look-alike (`127.0.0.1.evil.example`) refused `secret_missing`
with **zero** fetch calls (the stub records a call to any host, so zero is a measurement), another computer refused,
a provisioned key sent as bearer, Anthropic on loopback still needing its key, the two URL forms. 26/26. **Reverted
arm:** `isThisComputer` replaced by a prefix test → **5 red** (`127.1`, the three look-alikes, the zero-requests
clause); restored by `cp`, byte-compared.

**AC4 🟡 Ollama measured, llama.cpp not** (no `llama-server` on this machine; installing it is Richard's call). Ollama
0.34.4, `/v1/chat/completions`, `max_tokens: 64`, an enum schema `{word: red|blue|green}`:

| model | schema honoured | without `reasoning_effort` | `reasoning_effort` |
|---|---|---|---|
| `llama3.2` (3.2B) | ✅ `{"word" : "blue"}` (26.7 s cold, 0.1 s warm without a schema) | answers | `none` ✅ accepted; **`high` → 400 "does not support thinking"** |
| `qwen3:0.6b` | ✅ with `none` | **empty content, `finish: length`** — 64 tokens of hidden reasoning | `none` ✅; `low` still thinks (empty) |
| the owl, Qwen3.5-0.8B Q4_K_M | ✅ with `none` (`{"word": "blue"}`) | **empty content, `finish: length`** | `none` ✅; `low`, `high` empty |

`think: false` and a `/no_think` prompt suffix do **not** switch thinking off through this endpoint;
`reasoning: {effort: none}` worked on one Qwen and ran out of tokens on the other. Ollama's error body is
OpenAI-shaped (`{"error":{"message","type":"not_found_error","code":null}}`), so the record keeps `not_found_error`.
What the node does when a server ignores the schema: prose → `bad_json` with the prose on Text (spec'd); JSON that
parses but names a word outside the schema → passes as Json, **not re-checked by the node** (no validator in a
dependency-free bundle) — which is why the prefab checks the answer again.

**AC5 ✅** — `isl-010-local-model.test.ts` AC5: the success path (the double received the prompt, the page received
the answer, the record carries `modelCalls` and the model id) and two failure shapes whose body QUOTES the prompt
(OpenAI's `{error:{message,type}}` 400, a bare-sentence 404). The Error port carries the echo; the execution list,
the detail and the log carry neither prompt nor answer. **Reverted arm:** HEAD's line (400 characters of the body in
the recorded sentence) → **2 red**, both failure shapes; restored by `cp`. 🔴 **A record property found on the way:**
the execution record keeps the function's REQUEST BODY (`triggerData.body`). A prompt the page sends is on the record
whatever this node does — the first version of the spec sent the prompt from the page and went red for that reason.
The fence shape (the page sends a choice, the function writes the question) is also what keeps prompts off the record.
The spec now composes the prompt inside the function (`localFenced`). Stated in the prefab README and the node's
catalog pattern, not filed: it is the record working as designed.

**AC6 ✅** — ruling 3 as recommended: the fence lives in the graph, documented, and shipped as the library prefab
[`library/prefabs/ask-a-local-model`](../../../library/prefabs/ask-a-local-model/) (`/#__cloud__/Local Model/Ask`:
Choice, Choices, Question with `{choice}`, Answers, Instructions, Base URL, Model, Do → Answer, Done, Failure, Error
Code). It refuses `not_on_the_list` before asking, `not_configured`, and `answer_not_allowed` AFTER a JSON answer
outside Answers. `isl010-local-model-prefab.test.ts` loads the prefab's own `project.json` into a function an app
writes: 4/4 (the asked question and enum; a choice off the list asks nothing; an off-list answer refused; a closed
port → `network`). `library:check`: the entry passes (the run's only red is a peer's untracked `library/modules/
nightbook-kit`, no `library.json`). 🔴 **First run 1/4:** the fence Function ran when the instance's parameters
arrived at creation (a Function runs on input change by default), refused an empty choice, answered the request, and
the real answer then hit "already answered". Every `runOnChange-in-*` is now `false`, as SendGrid's prefab does it; the
AC2 project's fence got the same, and arm A now asserts exactly ONE model call. **Does the island move?** Not yet, and
not onto the prefab whole: the owl is node-llama-cpp inside the Electron main process with no HTTP endpoint (ruling 4
hands an OpenAI-compatible loopback endpoint in the shell to **P91** as a DSK requirement — owed, P91's README is
peer-dirty this session, so it is written in the P109 handoff instead), and the island's rungs include a "list of
three" shape the prefab's one-word Answers does not cover (one-word and yes/no it does). The island's rebuild
(P108 IW-010, "Native nodes first") can express each rung as Model Request + its own fence Function, as the AC2
project does.

**AC7 ✅** — FED-003's AC7 is rewritten in its task file and its spec (`askOtherProvider` now `gemini`; FED-003 backend
spec 20/20); the provider label lost "(not yet implemented)"; `catalog:generate`, `catalog:merge`,
`cloud-library:generate` and `docs:nodes` re-run AFTER the last port change (the first pass ran before Effort gained
None, and `library:check` caught it: the validator reads the generated enum) — all four `--check`s exit 0. The
enrichment says what the provider is, the key rule, and the fence pattern. `docs:nodes` also rewrote 27 visual-node
pages that were stale against HEAD's own committed catalog (ISL-009's `dataAttributes` and Scroll Into View from s6
among them, plus dynamic-port sections); they are what `docs:nodes:check` asks for, so they are kept.
Export: `coverage-ledger.json` keeps `backend-only` — the exported page calls the function and the backend runs the
node, so there is nothing to translate or refuse in the frontend.

**Gates:** `noodl-mcp` `fld013ExportReach`, `nodeDocBudget`, `toolDisclosure`, `tools` — 66/67; the one red is
FLD-013 reading `Parse CSV` as `translated`, from P18's uncommitted `coverage-ledger.json` (dirty since 2026-09-26),
not this change. The listing ratchet (66,000 wire bytes) is green. `tsc --noEmit` clean on `noodl-viewer-cloud` and on
the four backend specs.

- **s17 (2026-10-05):** the `ask-a-local-model` prefab publishes `Failure`, so CMP-001's shelf count moved 54 → 55 and its gate went red (unread in s16). Counted, then the interface doctrine an agent reads (`prompts/interfaces.ts` §8) and the gate both say **Fifty-five**. CMP-001's other red, the corpus publish rate (39 for a pinned 33), is older than this phase: 37 at `35e9e4ae6` (09-17), 39 from `c6c72aed6` (09-22).
