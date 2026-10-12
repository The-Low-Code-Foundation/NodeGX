---
id: P78-D83
title: With its kit reader unbuilt, the MCP door refuses every kit node as "ensure the module is installed"
status: fixed
commit: aab96a056
phase: P109
task: ISL-014
severity: medium
area: mcp / unknown-node-type (kit overlay)
found: P78 TPL-011-DESKTOP §12, 2026-09-26 (ubuntu-latest run 36250389583); met in every worktree lane of P105, P106, P108 (audit P109 F18)
evidence: dev-docs/tasks/phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md §D83; dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F18
---

On a fresh clone, in CI or in a worktree, an agent writing a kit node through the door is told *"Unknown node type
"nightbook-kit.Page" — not found in the node catalog. If this is a module-provided node, ensure the module is
installed"* — with the module installed. The real cause is that `packages/noodl-mcp/dist/kit-extract.cjs` (gitignored
build output) is missing, so the kit overlay came back empty. On a machine that has built `@noodl/mcp` once, the same
write passes, so it looks like "works on my machine".

**Where:** the sentence is `packages/noodl-editor/src/editor/src/validation/rules/unknownNodeType.ts:51-55`; the
server already holds the reason (`packages/noodl-mcp/src/kitOverlay.ts:32` `currentKitOverlay()`: kits, warnings,
failures; `src/kitExtract/extract.ts:132` `resolveKitExtractEntry`) but it never reaches the refusal. Re-read at HEAD
`d2b2f0101`; no later commit touches either.

The same sentence is predicted (from source, not measured) for a kit whose `main` throws in the reader, e.g. one that
reads a dependency's global (`THREE`) at definition: it lands in the overlay's `failures`, and the write is refused as
"not installed" (ISL-012 §2, audit F16).

**Workaround:** `NODEGX_KIT_EXTRACT` env var; `make-worktree.sh` links `dist` (`33f6c4cb4`); TPL-011's spike refuses to
start without the reader.

**Proposed:** when a type is unknown AND the overlay is unavailable (no reader) or that kit failed, say so and name
`npm run build --workspace @noodl/mcp` (or the kit's failure) instead of "ensure the module is installed". Small.

**Fixed 2026-10-01, `aab96a056` (P109 ISL-014 s1), on the recommended route (a): say so.** The door's validator
(`packages/noodl-mcp/src/kitRefusal.ts`) rewrites an `unknown-node-type` refusal when the kit overlay is `unavailable`
or a kit failed: the true reason, "the module may well be installed", the build command, and re-bind/restart (kits are
read once per bind). Measured by `packages/noodl-mcp/tests/isl014KitRefusal.test.ts`: 4 red at HEAD (the module
sentence; `Texts` pointed at `Text`), 5 green after. Not yet done: route (b) build-on-demand (ISL-014 AC5, needs
Richard's ruling), the end-to-end page (AC6), and a rebuild of `noodl-mcp/dist` so the installed server carries it.
