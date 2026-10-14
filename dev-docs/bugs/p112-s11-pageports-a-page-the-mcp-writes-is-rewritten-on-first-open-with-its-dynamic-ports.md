---
id: P112-S11-PAGEPORTS
title: "A Page the agent server writes is rewritten the first time the editor opens it: the editor adds the Page's `dynamicports` cache and saves the component and the registry"
status: open
severity: medium
area: mcp / authoring (Page nodes written without `dynamicports`, e.g. `packages/noodl-mcp/src/tools/createProject.ts`'s skeleton) + editor / dynamic-ports cache marks a component dirty on load (see P107-S79-SILENTCACHE)
kit: mcp
found: P112 OWN-011 s11, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §9
---

**Measured** in the dev editor at `ec116ed5a`, two arms opened through **Open project…**:

- **A — the project as `create_project` (`@nodegx/mcp@0.1.0`) wrote it:** the open rewrote
  `components/Pages/Home/nodes.json` (the Page node gained `dynamicports` for `title` and `urlPath`, and the Text's
  `parent` key moved after `parameters`), `components/Pages/Home/component.json` and `components/_registry.json`
  (`modified` / `lastUpdated`), plus `nodegx.project.json` (P112-S11-OPENWRITES).
- **B — the same, with Home's `nodes.json` replaced by the one the editor wrote in A:** no component file and not the
  registry moved; only `nodegx.project.json`.

So the Page's missing dynamic-ports cache is the whole component-side cause. `App` (a Router, no dynamic ports) was
never touched. Any Page an agent writes later through the server would do the same.

**Two places to fix it, one to choose:** the server writes the cache the editor would (a kit fact the editor then trusts),
or the editor stops treating a cache it derived on load as an edit to save (the cleaner rule, and P107-S79-SILENTCACHE's
territory).

Blocks OWN-011 AC2 (no change written on open beyond the three agent files).

**Re-measured on the released 0.4.0 (2026-10-14, OWN-011 §10), still open, with its trigger narrowed.** A project from
`npm create nodegx@0.2.0` + `create_project` (`@nodegx/mcp@0.2.0`): the **first** open lands on `App` and writes
nothing, even after opening Home from the Components panel (16 / 16 files unchanged at +40 s). The **second** open
restores `/Pages/Home` as the component being edited, and at load it writes Home's `nodes.json` (the Page gains
`dynamicports` `title`, `urlPath`; `parent` moves after `parameters`), `component.json` and `_registry.json`
(`modified` / `lastUpdated`). A third open changes nothing. So it is one write per page, made when the editor *loads*
with that page active.
