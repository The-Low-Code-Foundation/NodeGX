# OWN-011 — One install: a project, the MCP server and the preview from one command

**Opened 2026-10-06** from [DIRECTION.md](../../DIRECTION.md) D1 (ruled by Richard: the install command lives in this
phase). **Depends on R2 (publish at 0.x), OWN-001, OWN-002, OWN-004.**
**Status: 📋 not started.** **R2 ruled 2026-10-10 (s6): publish at 0.x**, after each package declares what it uses (node-spec → `@noodl/backend-contract`; project-contract → `ajv`, `ajv-formats`; the preview's page build → `buffer`, `@nodegx/project-contract`, `@nodegx/module-inject`). **R5 (s6): `@nodegx/canvas-look` ships with the kit, optional. R6 (s6): a package cannot publish while one of its `kit:` bugs is an open blocker; lesser ones are listed as known issues.**
**Model:** **Opus.** Packaging and one install command with a stranger's run as the test; Fable only if the publish order turns into a design question. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **Someone with Claude Code and an empty folder runs one command, and their agent can start building a NodeGX app.
> Nobody opened the editor or cloned this repo. The editor can open the result whenever they want it.**

## 2. Why

DIRECTION.md §4.1 makes the npm install and the person's agent the front door. No command does that today, and no task
owned it until D1.

## 3. What exists, measured 2026-10-05

| # | fact | where |
|---|---|---|
| 1 | `npm view`: `@nodegx/core` 0.1.0 is published. `@noodl/mcp` and `@nodegx/node-spec` are not. `@nodegx/project-contract` is `private`. | npm; each `package.json` |
| 2 | Five packages ship a `bin`: `nodegx` (`@nodegx/export`), `noodl-mcp`, `noodl-preview`, `nodegx-observe`, `nodegx-backend`. None of them creates a project. The `nodegx` CLI's commands include `serve`, `render`, `live` and `deploy`. | `packages/*/package.json`; `packages/nodegx-export/src/cli/main.ts` |
| 3 | The unbound `nodegx` MCP server already has `create_project`, which scopes the app with the person and writes its brief and build plan. | `noodl-mcp`, the unbound tool set |

## 4. What to build

1. **The command.** One `npx` command (name to rule) that makes the project folder, writes the MCP entry the person's
   agent reads, and starts nothing it doesn't need. Project creation goes through the same code path as
   `create_project`, so there is one writer.
2. **The preview from npm.** `noodl-preview` runs from the installed package against the new folder.
3. **The editor as a later step.** The command's output says how to open the project in the editor, in one line.
4. **A stranger's run.** A clean machine account with no checkout runs the command. Its agent builds a two-screen app
   through the MCP, and the editor opens it unchanged. This run is the acceptance test, written down in §6.

## 5. Acceptance criteria

1. On a machine with no OpenNoodl checkout, one command produces a project the MCP server binds to.
2. The project it produces passes `validate_project` and opens in the editor with no change written on open beyond the
   three files opening already writes (memory: *opening a project writes three files into it*).
3. Every package the command installs is a published 0.x version, pinned.
4. OWN-006's suite runs on a project the command made, as one of its fixtures.

## 6. Watch for

- Memory: *a lockfile made on a Mac drops other platforms' prebuilts*. The stranger's run includes one non-Mac machine.
- Memory: *Connect writes the real `~/.claude.json`*. The command writes the project's own MCP entry, never the
  person's global config, unless they ask.
