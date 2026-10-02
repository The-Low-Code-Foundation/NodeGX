---
id: P109-S4-UNROUTEDPAGE
title: A page written through the door into a project with no Router is unreachable, and no tool says so
status: open
severity: medium
area: MCP door (`noodl-mcp/src/project/pageRegistration.ts` `resolveRegistration` returns undefined for a router-less project; `noodl-editor/…/validation/navigation.ts` `checkPageShape` checks only the Page node)
found: P109 s4, 2026-10-02 — ISL-014 AC6's agent run (Claude Code over the real stdio door)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-014-A-MISSING-KIT-READER-IS-NAMED-AS-ONE.md §8 s4
---

An agent asked to "make a home page" in a project whose `App` draws two kit nodes directly (no Router) called
`create_component` with `type: "page"` and a `Page` root. The write succeeded with no `registeredPages` and no warning;
`validate_project` and `apply_plan` said nothing about routing either. Deployed, the site shows App's content; the new page
is reachable from nowhere. The server's own instructions promise *"Writing a page registers it in the project router for
you (reported as `registeredPages`)"* — true only when a router exists.

`pageRegistration.ts:130-137` decides deliberately that a router-less project is not an error ("single-screen apps
exist") and says *"`checkPageShape` is where that gets said"* — but `checkPageShape` only checks for a Page node, so it is
said nowhere.

**Plain words:** *"If an agent adds a page to an app that has no page switcher, the page is saved but nobody can ever open
it, and nothing tells the agent."*

**Proposed:** a warning on the page write when no router lists it and none exists to register it in, naming the fix
(add a Router to App listing it, or place the page's content in App).
