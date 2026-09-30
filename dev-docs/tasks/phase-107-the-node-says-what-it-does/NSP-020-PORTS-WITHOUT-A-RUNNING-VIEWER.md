# NSP-020 — Ports without a running viewer

**Opened 2026-09-30 (s1), from Richard's ruling that the editor is a target (README §1, R6).**
**Depends on NSP-004.** Runs alongside the batches (NSP-011 to NSP-017): each batch closes its nodes' rows here.
**Status: 📋 not started.**

## 1. The person sentence

> **An editor — this one, the MCP server, or one that does not exist yet — can draw every port of
> every node from the spec alone, for any parameter values, without a viewer running.**

## 2. Why this is the editor's deepest coupling to the runtime

Measured 2026-09-30 from the catalog's `dynamicPorts.mechanisms` over the 147 picker nodes:

| mechanism | nodes | how the editor learns the ports today |
|---|---|---|
| `runtime-discovered` | **50** | the **running viewer** calls `EditorConnection.sendDynamicPorts(id, ports)` (`noodl-runtime/src/nodedefinition.ts:651`) per instance — no viewer, no ports |
| `declared-port-groups` | 27 | static groups in the registration, shown or hidden by a parameter value |
| `editor-adapter` | 6 | editor-side code that knows the node (`noodl-editor`) |
| `numbered-inputs` | 4 | "`<base> N`" counting from 0 (And, Or, …) |
| `component-ports` | 2 | Component Inputs / Outputs — read from the component being edited |
| `runtime-narrowed` | 2 | the runtime narrows a static list per instance |

So for a third of the picker, a replacement editor cannot even show the node's ports without
embedding this runtime. NSP-001 designed `derived.inputs(params)` as a pure function for exactly this;
this task makes every mechanism above an instance of it.

## 3. What to build

1. In the spec format: `ports(params)` — the complete input and output port list for given parameter
   values (static ports plus derived ones), pure, in the spec package. `derived.inputs` (NSP-001) is
   its dynamic half; generalise so `component-ports` and `runtime-narrowed` can be expressed
   (`ports(params, context)` where `context` is the component's interface, supplied by the caller).
2. A **port-parity drive**: for each specced node and a set of parameter values (the catalog's
   defaults, then each `declaredPortGroups` switch, then the fixtures the existing dynamic-port tests
   use), mount the node in the interpreted runtime, capture what `sendDynamicPorts` announces, and
   compare to `ports(params)`. Both directions; a mismatch is a §6 row (R3 (a)).
3. The Function / Script / Expression case (`runtime-discovered` from **user code**) is NSP-017's:
   `ports(params)` runs the same small parser the runtime runs — specify the parser, cite its lines.

## 4. Acceptance criteria

1. `ports(params)` exists for every specced node; the parity drive runs on every one at the
   catalog's defaults and passes or has a row.
2. Every `runtime-discovered` node in the census has a row here (50), closed by its batch.
3. The MCP server's `get_node_type` answers per-instance ports from `ports(params)` for specced
   nodes (NSP-018 lands the wiring; this task supplies the function).
4. The ledger (NSP-009) reports *ports derivable without a viewer: N of 147* beside spec coverage.

## 5. Watch for

- `sendDynamicPorts` is announced from the **viewer** window and the Logic Builder's port I/O had to
  live in the runtime bundle for that reason (`@nodegx/project-contract` README). Read that before
  moving anything.
- The editor caches announced ports in the project file for instances it has seen. A pure
  `ports(params)` must agree with the **cached** list too, or opening an old project shows a diff.

## 6. Built

*(empty)*
