---
id: PARKED-THREE-S2-MESHOUTSIDE
title: A three-kit Mesh placed outside a Scene validates clean and draws nothing; a kit React node cannot say which parent it needs
status: open
severity: low
area: node kits / the hierarchy rule (`packages/noodl-viewer-react/src/react-component-node.ts` :1267 forces `category: 'Visual'` and forwards `allowChildren` only; `packages/noodl-editor/src/editor/src/validation/rules/invalidHierarchy.ts` is category-only)
found: parked THREE-IN-NODES s2, 2026-10-19
evidence: packages/noodl-mcp/tests/three-kit-catalog.test.ts ("the catalog cannot say only inside a Scene"): the overlay reads Scene and 3D Group `holds: ['Visual']`, Mesh and Light `asChild: true`
---

A Mesh, a Light or a 3D Group only draws inside a Scene: it speaks to the Scene through a React context, and with no
Scene above it there is no one to speak to. Nothing tells the person or the agent. The MCP validates a page with a Mesh
under a plain Group (or a Page) with no diagnostic, the editor accepts the drop, and the preview shows nothing where
the mesh should be. The other way round is open too: a Scene accepts a Text or a Button as a child, which the Scene
renders into its context provider and the page never lays out as the person expects.

**Why the existing mechanism cannot say it:** the hierarchy rule works by category (`allowChildrenWithCategory`), and
the React bridge registers every kit React node as `'Visual'` and does not forward `allowChildrenWithCategory`
(`ReactNodeDefinition` documents `category` as "accepted and ignored"). So a kit cannot declare "my children are
3D nodes" or "I belong under a Scene".

**How to reproduce:** in `dev-docs/parked/three-in-nodes/fixture`, move `ball` from `scene`'s children to `layout`'s;
`validate_project` reports nothing; the deploy draws no ball.

**Fix options (a ruling, when the kit leaves the parked page):** (a) forward `allowChildrenWithCategory` and a declared
category from `ReactNodeDefinition` (a runtime and catalog change, every kit React node's category stays `'Visual'`
unless it declares one); (b) the kit says it at run time: a Mesh with no Scene above it logs one console warning naming
itself (whether `render_report` shows a console warning to the agent is NOT measured; check before relying on it). (b) is the kit's own, small, and needs no format change.
