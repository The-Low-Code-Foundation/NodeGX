# ISL-010 — A running app can ask a local model

**Status:** ⬜ not started — scoped 2026-10-01 at `27d891bf3`
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
