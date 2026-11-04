# BWF-012 — Saved API calls (R7)

**Phase:** [132](README.md). **Ruling:** R7 (2026-11-03), before the Beta. **Size:** about 1 session (engine, file,
MCP words, Studio).

## What he asked

> "It'd be nice to save API calls with the 'Call an API' node, like in Bubble, so you can reuse them in other workflows"

## Build

1. **The file:** a saved call is a named entry in the project's files beside the workflows (`nodegx.automations.json`,
   a new `apiCalls` list, `automations/shape.ts`), holding what *Call an API* holds today (address, method, query,
   headers, body, authentication by Secret name: never a value, BWF-006's rule), plus which parts are **blanks** a
   workflow fills (named, each with a type and an example).
2. **The engine:** `http-request` takes `call: "<name>"` and `fill: { <blank>: value }`; the saved call's settings are
   merged under the step's own at run time, so a change to the saved call reaches every workflow using it. Validate:
   an unknown call name or an unfilled blank is an error naming them. Rule 1: written backend first, then the file.
3. **Studio:** *Save this call* on a *Call an API* step's panel (name it, tick which parts are blanks); the step menu's
   Integrations lists each saved call by name; picked, the panel shows only its blanks (each a setting as any other,
   BWF-011's composer), and *Open the saved call* to change it for everyone. A list of saved calls under the workflows.
4. **The agent:** the catalog says saved calls exist and the MCP's backend tools can list them; a brief that names a
   service already saved uses it.

## Acceptance

- AC1: a weather call saved from a *Call an API* step, used by name in a second workflow with only the city filled;
  both tested; the key is in neither file (BWF-006 AC2's check).
- AC2: changing the saved call's address changes what both workflows call, with no edit to either.
- AC3: an agent asked to "use the weather call in a new workflow" writes `call: …`, no copy of its settings.
