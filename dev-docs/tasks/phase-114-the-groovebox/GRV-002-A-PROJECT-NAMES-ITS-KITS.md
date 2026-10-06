# GRV-002 — A project names its kits

**Opened 2026-10-06** from R2. **Depends on nothing outside P69.**
**Status: 📋 not started.**

## 1. The person sentence

> **Someone opens a project that uses a kit they have not installed, and is told which kit to install, by name.**

## 2. Why

R2 (ruled 2026-10-06): kits are npm packages, and a project lists the ones it needs as dependencies. Today
`shareAsTemplate.ts:124-126` says *"nothing in the product detects a missing module"*. A missing kit's nodes open as
unknown, and nothing says why.

## 3. What exists, measured 2026-10-06

| # | fact | where |
|---|---|---|
| 1 | A kit is installed when its folder exists under `noodl_modules/`. | `packages/nodegx-module-inject/src/index.js`, `projectmodules.ts:1-70` |
| 2 | `noodl_modules/kit-provenance.json` records how each kit arrived (local, imported, installed). It sits inside the folder it describes. | `projectmodules.ts:610` |
| 3 | The v2 nodes file keeps `visualRoots`, so a kit node still draws as visual before its kit loads. No field names the kit. | `ProjectExporter.ts:374`, `CanvasPainter.ts:104` |

## 4. What to build

1. **The list.** The project records the kits it needs, each with its npm name and a version range, in the project's
   own files, outside `noodl_modules/`. Where it lives is OWN-001's call (the format leaves the editor); this task
   writes to wherever that lands.
2. **The install.** Installing a kit from npm puts it where the loader already looks, or the loader also reads it
   from `node_modules`. Pick one and say why.
3. **The message.** The editor, the preview, `validate_project` and the MCP's open each name the missing kit and the
   command that installs it.
4. **The writers.** Adding a kit through the editor, the MCP shelf (`install_prefab`) or the scaffold adds it to the list.

## 5. Acceptance criteria

1. Delete `noodl_modules/game-kit` from a project that uses it: the editor, the preview and `validate_project` each
   name `game-kit` and how to install it.
2. A fresh install of the project's dependencies brings the kit back, and the project opens with zero unknown nodes.
3. Every path that adds a kit updates the list. Each is named in this file with a test.
