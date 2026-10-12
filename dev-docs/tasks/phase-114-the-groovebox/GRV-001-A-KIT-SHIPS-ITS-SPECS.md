# GRV-001 — A kit ships its specs

**Opened 2026-10-06** from R1. **Depends on nothing outside P107's spec format.**
**Status: 📋 not started.**

## 1. The person sentence

> **Someone who writes a kit gets a spec file for each node by default, fills it in, and the kit's nodes are tested,
> explained and counted like built-in ones.**

## 2. Why

R1 (ruled 2026-10-06): a kit in the library that ships with the editor must have a spec for every node; a personal kit
may skip it, and each unspecced node is counted in the project's honesty number. Today no kit node can have a spec at all.

## 3. What exists, measured 2026-10-06

| # | fact | where |
|---|---|---|
| 1 | `@nodegx/node-spec` keeps a frozen map keyed by core type names; `specFor` looks a type up in it. Nothing adds to it. | `packages/nodegx-node-spec/src/nodes/index.ts:100`, `:207` |
| 2 | No production code in the MCP, the editor or the kit scaffold imports node-spec. Only tests do. | grep, 2026-10-06 |
| 3 | The MCP already runs a project's kits headlessly and merges their nodes into its catalogue. | `packages/noodl-mcp/src/kitOverlay.ts`, `packages/nodegx-kit-catalog` |
| 4 | The kit scaffold writes `index.js` with `reactNodes`. It writes no spec. | `packages/nodegx-kit-scaffold/src/index.js:617-621` |

## 4. What to build

1. **Specs from outside.** node-spec exports a way to register a spec for a type it does not own, keyed by the kit's
   full type name (`kit-audio.Drum Voice`). The frozen core map stays frozen.
2. **The manifest points at them.** A kit's `manifest.json` names its specs file. The runtime ignores it; the MCP, the
   conformance runner and the honesty number read it.
3. **The scaffold writes a starter spec** for each node it makes.
4. **The library gate.** A kit in `library/modules/` with a node that has no spec fails the library's check.
5. **The count.** The honesty number (P111 SEE-001) counts unspecced kit nodes the way it counts Function nodes.

## 5. Acceptance criteria

1. `example-node-kit` in the library ships a spec for each node, and its conformance run passes.
2. A kit with one unspecced node fails the library gate and names the node.
3. A project using a personal kit without specs opens and runs, and its honesty number counts those nodes.
4. `get_node_type` on a kit node returns its spec's description.

## 6. Watch for

- Memory: *a new type owes `noodl-mcp` and the picker their entries*. List every reader of the spec map before
  changing how it is looked up.
