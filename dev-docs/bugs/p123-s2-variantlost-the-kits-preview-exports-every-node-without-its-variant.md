---
id: P123-S2-VARIANTLOST
title: The kit's preview and headless render export every node without its variant, so a Look is never drawn there
status: fixed
commit: (this session, P123 s2)
phase: P123
task: s2 (global styles)
severity: high
area: editor exporter (`packages/noodl-editor/src/editor/src/utils/exporter/util.ts` exportNode) as the kit's `@nodegx/preview` and the MCP's `render_report` use it
found: P123 s2, 2026-10-16, by the Open Bubble gate (a button wearing a style painted the runtime's default black while the variant sat in the graph model)
evidence: dev-docs/tasks/phase-123-open-bubble/README.md §5; the probe in that session (variant in `graphModel.getVariants()`, the node's computed background `rgb(0, 0, 0)`)
regression: packages/noodl-preview/tests/p123-s2-variant-exported.test.ts "a node wearing a variant from nodegx.styles.json is exported with its name"
---

`exportNode` wrote `variant: node.variant ? node.variant.name : undefined`. `node.variant` is not a field: it is a
getter that asks `NodeLibrary.instance.findVariant(variantName, type)`, which asks the library's registered modules,
and a project becomes a module only by becoming `ProjectModel.instance`. The kit's in-page preview
(`exportInPage.ts`) and the headless render (`render_report`) build a project model that is never the instance
(`wireHealth.ts` says why: making it the instance arms the editor's autosave), so `findVariant` returns nothing and
every node exports `variant: undefined`. The project's variants themselves export fine (`json.variants`, from the
model), so the runtime holds the Looks and no node wears one.

**Reach.** 18 projects on this machine have a node wearing a variant (`"variant": "…"` in a `nodes.json`). Every
preview of them from the kit, and every `render_report` screenshot, drew those nodes without their Look. The official
editor's own deploy is unaffected (its project is the instance). A kit-built editor (P112 lane 2, P123) cannot show a
Look at all without this.

**Fix.** The exporter falls back to the name the node carries: `node.variant ? node.variant.name : node.variantName
|| undefined`. The runtime looks a variant up by name (`nodescope.ts:158`), so a name it cannot find is ignored, as
before. Graded by the Open Bubble gate (the Sign in button keeps `rgb(138, 169, 242)` after wearing the style it was
saved as; the Create account button that picks the style goes from transparent to the same) and by the regression
test named above, which fetches the served export and reads the node's `variant`.

**Not released yet (NodeGX Studio s13, 2026-10-20).** npm's `@nodegx/preview` 0.2.2 and `@nodegx/mcp` 0.2.2 were
published on 2026-10-15, the day before this fix, and are the latest there: their in-page bundle reads
`.variant?this.variant.name:void 0` with no fallback to `variantName`. Measured: NodeGX Studio on the npm 0.2.2
in-page bundle fails its style check (`check:editor` 169/170: the Sign in button goes from `rgb(138, 169, 242)` to
`rgb(0, 0, 0)` once it wears its style). So anyone on the published packages (`npx @nodegx/preview`, `nodegx-deploy`,
the MCP's `render_report`) still draws every node without its Look. Studio builds the in-page bundle from a commit
until a release carries it (`nodegx-studio/scripts/vendor.mjs`, `PREVIEW_FIXED_IN`).
