---
id: BETA-S8-PORTTYPEOBJECT
title: A component the editor saved, read with get_component and written back with create_component, is refused by the tool's argument schema — its ports are typed { "name": "*" } and the schema takes only a string
status: fixed
commit: PENDING
severity: medium
area: mcp / `packages/noodl-mcp/src/vocabulary.ts` `portSchema` (`type: z.string()` from `AUTHORED_PORT_FIELDS`); `src/tools/read.ts` `get_component` (hands node `ports` back as saved)
kit: mcp
regression: packages/noodl-mcp/tests/betaS8PortTypeObject.test.ts "what get_component returned, name-only types and all, is written as a copy"
found: the Beta sweep s8, 2026-10-25, fixing NPMAUDIT-EXAMPLEINVALID (58 such ports in eight community examples)
evidence: probe (not committed): create a component with a Component Inputs port, rewrite its saved `type` to `{ "name": "*" }` as the editor saves it, `get_component`, then `create_component` a copy from what it returned — "MCP error -32602: Input validation error: Invalid arguments for tool create_component: … nodes.1.ports.0.type Expected string, received object"
---

The editor saves a component port's type as an object (`{ "name": "*" }`, `{ "name": "string" }`); `get_component` returns
it that way; `create_component` (and the plan tools) refuse it before any validator runs, with a raw MCP input error that
names a JSON path and no NodeGX words. An agent copying a component a person made in Studio — "make another one like
this" — hits it on the first try.

Fix, small, either: `portSchema.type` takes a string or `{ name, … }` and the write normalises it; or `get_component` hands
port types back as the string the write takes. Either changes the advertised tool schema, so read the MCP surface budget
gates (`mcp-tool-surface` tests) before and after.

**Plain words:** *"Asking Claude to copy a component you made in Studio fails with a technical error."*

**Fixed for the name-only type (the Beta sweep s8, 2026-10-25).** `get_component` hands a port type that is only
`{ name }` back as the string (`writablePorts` in `src/tools/read.ts`, on node ports and the component's own
inputs/outputs): a result field, so the resident surface is unchanged (8,277 of 8,280). Widening the write schema instead
would have touched the vocabulary the editor shares (`AUTHORED_PORT_FIELDS`, held by `vocabularyParity.test.ts`) and
spent the surface's three free tokens. **Left:** a type carrying more than its name (an enum's options, a number's
units) comes back whole and the write still refuses it; all 58 such ports in the shipped examples were name-only.
Graded: `tests/betaS8PortTypeObject.test.ts` red 2/2 on HEAD's `read.ts` → 2/2; the 18 files that call get_component
190/191 (SEE-001 AC2 timed out under load, filed BETA-S8-SEE001TIMEOUT); mcp tsc clean.
