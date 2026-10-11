# `@nodegx/project-contract`

Facts about a NodeGX **project file** that more than one package has to agree on.

Two modules live here, and they are here for the same reason: each was owned by a package that
another package could not depend on, and the exporter needs both.

| module | was | why it moved |
|---|---|---|
| `tokens.ts` | `noodl-editor` `StyleTokensModel/DefaultTokens.ts` | `@nodegx/export` resolves a project's stored tokens against the shipped defaults. Reaching into the editor's source tree by relative path made the exporter unpublishable and coupled it to the editor's file layout (HLS-001 AC2). |
| `logic-builder-io.ts` | `@noodl/runtime` `nodes/std-library/logic-builder-io.ts` | Same reason, from the runtime side. |
| `port-context.ts` | new — P107 NSP-020 L5 | `portContextFor(project, nodeId)`: what an editor knows about one node without a viewer (its wires in and out, the backends, the schema its Backend selects, the Page Stacks and Routers, every component's interface typed from its wires), so `@nodegx/node-spec`'s `drawnPorts` can draw any node's ports from a saved project. A structural copy of the spec's `PortContext`, not an import, as `function-ports.ts` is; graded against the runtime's own port hooks on every committed v2 project (`noodl-runtime/test/node-spec/nsp-020-port-context.test.ts`). |
| `world.ts` (+ `world/`, `schemas/world.schema.json`) | new — P116 ONT-001 | What a person said about their world: the three files under a project's `docs/world/`, the fourteen relation kinds ONT-000 read off real apps (`defineKind`, `describe`), the validator and the write rule (refuse when the files changed since read). The editor, the MCP, the backend manager and a home-made page must all read it the same way, which is this package's reason to exist; NSP-021 and OWN-001 name it the home of the project format, so the ninth schema starts here and the eight join it. Zero dependencies, so it runs in a page; `npm test` grades it, with ajv proving the schema and the validator agree. |

## 🔴 The invariant that made the Logic Builder move delicate, and how it survives

`logic-builder-io.ts`'s original header explains why it lived in `@noodl/runtime`: dynamic ports are
announced from the **viewer** window, which cannot see anything the editor window put on `window`,
so the one piece of code both halves call had to ship inside the runtime bundle.

**That is still true, and it still holds.** `@noodl/runtime`'s `logic-builder-io.ts` is now a
re-export of this module, and webpack inlines it into the runtime bundle exactly as before — the
bundled output is the same code in the same bundle. What changed is only which directory the source
sits in.

Two measured facts make that safe, and both are worth keeping written down:

- **Workspace packages are not `node_modules` to a bundler.** `@noodl/runtime/webpack-ts-rule.js`
  says it in its own comment: webpack resolves the symlink to the real path under `packages/`, so
  an `exclude: /node_modules/` never fires on a workspace package. This package's TypeScript is
  compiled by the consumer's ordinary `.ts` rule.
- **This package is plain ESM TypeScript.** The runtime needs its own ts-loader instance because
  its modules use `export =` under `module: commonjs`. Nothing here does, so nothing here needs a
  bundler rule of its own.

## Shape

Modules sit at the package root rather than under `src/`, deliberately: several tsconfigs in this
repo still use `"moduleResolution": "node"`, which ignores an `exports` map entirely. A flat root
means `@nodegx/project-contract/tokens` resolves under classic node resolution and under bundler
resolution alike, with no `exports` map and no alias in any of the eight webpack, jest and tsconfig
files that would otherwise have needed one.

`private: true` for now: `@nodegx/export` bundles this package's source into its own `dist/` with
esbuild, so the published exporter is self-contained and does not depend on an unpublished package.
If it ever needs publishing in its own right, it is a manifest change and a `build.mjs` copied from
`@nodegx/core` — nothing here has to move again.
