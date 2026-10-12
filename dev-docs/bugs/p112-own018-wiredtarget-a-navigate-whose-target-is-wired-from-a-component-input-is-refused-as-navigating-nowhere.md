---
id: P112-OWN018-WIREDTARGET
title: "An agent can't write a reusable nav item: a RouterNavigate whose target is wired in from a Component Input is refused as \"navigates nowhere: no Target Page is set\" (a blocking warning for authored output)"
status: fixed
severity: medium
area: editor validation / navigation (`packages/noodl-editor/src/editor/src/validation/navigation.ts` `checkNavigation` :198-232, called from `authoredCandidate.ts` `authoredPreconditionDiagnostics` :590 with nodes only; `UnresolvedNavigation` is in `AUTHORED_BLOCKING_WARNINGS`)
found: P112 OWN-018 sitting 2, 2026-10-12 (Mistral Large 4's `Components/NavItem`, replayed against the 0.2.0 tarball's server because Vibe's default harness hid the diagnostic, P112-OWN018-OPAQUEERRORS)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §7
---

Mistral wrote the shape a nav bar wants: `Component Inputs` with `label`, `target` and `active`, wired
`ci.target → RouterNavigate.target` and `button.onClick → RouterNavigate.navigate`. `stage_plan_operation` refused it,
with nothing staged:

> WARN [unresolved-navigation] /Components/NavItem › node navitem_nav › port "target": "Go to page" navigates nowhere:
> no Target Page is set, so pressing it does nothing. → Set "target" to the page name the router lists

`checkNavigation` reads only `parameters.target`; its caller passes the nodes and not the connections, so a target
that arrives on a wire is the same to it as no target. The docblock already reasons this way about `{placeholder}`
paths ("its real value arrives on an input port at runtime, so no static list can say whether it resolves"), but not
about a wired port. Because `UnresolvedNavigation` blocks authored output, the agent's only way through is to drop
the reusable component and put a Navigate in every page. The corpus-level reason the set gives for this warning
("component libraries that navigate to a page their host supplies") is exactly this graph.

**Proposed:** skip the no-target case when the node's `target` port has an incoming connection (pass the candidate's
connections to `checkNavigation`). Spec: the NavItem graph above stages; the same graph with the wire removed is still
refused (control).

**Fixed 2026-10-12 (OWN-018 s1):** `checkNavigation` takes `connectedInputs` (the `nodeId::port` set the other
authored preconditions already read) and skips a `target`/`path` fed by a wire; `authoredPreconditionDiagnostics`
passes it. Spec `packages/noodl-mcp/tests/own018WiredTarget.test.ts` (create_component and stage_plan_operation accept
the NavItem; control without the wire still refused; sabotage turns both accepts red). 136 navigation-related MCP
specs green.
