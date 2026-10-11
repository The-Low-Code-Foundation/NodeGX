# OWN-011 — One install: a project, the MCP server and the preview from one command

**Opened 2026-10-06** from [DIRECTION.md](../../DIRECTION.md) D1 (ruled by Richard: the install command lives in this
phase). **Depends on R2 (publish at 0.x), OWN-001, OWN-002, OWN-004.**
**Status: 🟡 s9 (2026-10-11): built and driven from packed tarballs (§7); AC1 and AC2's first half measured; the publish (AC3), the editor-open half of AC2, AC4 and the stranger's run on a real account are owed.** **R2 ruled 2026-10-10 (s6): publish at 0.x**, after each package declares what it uses (node-spec → `@noodl/backend-contract`; project-contract → `ajv`, `ajv-formats`; the preview's page build → `buffer`, `@nodegx/project-contract`, `@nodegx/module-inject`). **R5 (s6): `@nodegx/canvas-look` ships with the kit, optional. R6 (s6): a package cannot publish while one of its `kit:` bugs is an open blocker; lesser ones are listed as known issues.**
**Rulings s9 (2026-10-11, one round, all four as recommended):** **R8** the npm names are `@nodegx/mcp` and `@nodegx/preview`, in the repo and on npm (the `@noodl` scope belongs to the original Noodl team; the bins keep their names) — done, `749bd0a38`. **R9** the command sets the folder up and the agent makes the app: it writes ONE file, the folder's `.mcp.json`, and `create_project` stays the one writer of projects, so the scoping conversation is never skipped. AC1 therefore reads *the command plus the agent's first `create_project`*. **R10** people type `npm create nodegx` (package `create-nodegx`). **R11** Richard runs `npm login` (this Mac's token answers 401); a later session publishes, after asking him once more just before it goes out.
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

## 7. Session 9 (2026-10-11, Opus): from tarballs, in an empty folder

**Method.** Each package `npm pack`ed, installed or run with `npx --package=<tarball>` in a folder under the session's
scratchpad (no `node_modules` above it, so nothing in the checkout can rescue a missing dependency), `HOME` pointed at an
empty folder (so nothing global is read or written; it ends holding only npx's cache), the MCP driven over stdio by a
probe that speaks the protocol, the page read over CDP from a headless Chrome on its own port.

**Found, in order, each fixed and filed:**

| bug | what a stranger hit | fix |
|---|---|---|
| P112-S9-NPXDEPS (blocker, mcp) | `npm install` → 404 on `@nodegx/kit-catalog`: three private workspace packages under `dependencies`, all inlined in the bundle | → `devDependencies`; `scripts/own/publishable.js` gates it |
| P112-S9-NPXREG (high, mcp) | a project made under `npx` registered `~/.npm/_npx/<hash>/…` and an nvm path as its server | the pinned npx command, from the package's own name and version |
| P112-S9-NORUNTIME (blocker, preview) | `noodl-preview` refused every project: the viewer runtime lives in the editor's build output | `prepack` builds a production runtime into `dist/external` (EXP-017's classifier refuses a development one); `EXTERNAL_DIR` reads the checkout first, `dist/external` second |
| P112-S9-DAYTWO (high, mcp) | the day after, `list_projects` said "no projects … `create_project` is the way forward" with the app in the folder | `list_projects` also reads the folder its server started in |
| P112-S9-FRESHFONT (low, open) | a fresh project's first `validate_project` warns that the default `--font-sans` names Inter, which nothing ships | not this task's; filed |

**The run that passes (`efcb43788`, `749bd0a38`, `abcefd10c`):**

1. `npx create-nodegx my-apps` → `my-apps/.mcp.json` and nothing else: `nodegx` → `npx -y @nodegx/mcp@0.1.0 --allow-writes`.
2. The server started as that file says (the tarball standing in for the registry): six bootstrap tools; `list_projects`
   empty; `create_project` into `my-apps/reading-list` → skeleton, brief, plan, `CLAUDE.md`, and the project's own
   `.mcp.json`: `npx -y @nodegx/mcp@0.1.0 <project> --allow-writes`.
3. Day two, a new server in `my-apps`: `list_projects` reports "Reading List".
4. The project's own server: `validate_project` 0 errors, 1 warning (FRESHFONT).
5. `npx @nodegx/preview my-apps/reading-list` (from its tarball): 163 node types, rendered in 6 ms; Chrome draws
   "Reading List — nothing built yet. Review the plan in docs/ and start when you are ready." in 272 ms, no page errors.

**Gates for the publish:** `node scripts/own/publishable.js` (3 packages, 0 problems); `node scripts/bugs.js gate mcp` /
`gate preview` (R6: exit 1 on an unresolved blocker; `mcp` is a kit value now — before, `--kit mcp` listed 0 because
no bug could carry it); each package's `prepack` rebuilds from source, so a tarball cannot carry a stale bundle.
Tarballs: `@nodegx/mcp` 3.4 MB (19 MB unpacked), `@nodegx/preview` 4.3 MB (20.9 MB), `create-nodegx` a few KB.

**Owed, in order:**

1. **The publish (R11), after asking Richard once more:** `@nodegx/mcp`, `@nodegx/preview`, `create-nodegx` at 0.1.0.
   🔴 **Licence first:** the MCP and preview bundles inline the editor's code, which is **GPL-3.0-only**, so those two
   must be published GPL-3.0 with the licence text in the tarball (neither has a `license` field today); the runtime is
   MIT and the apps people build are not affected. `create-nodegx` is new code, MIT. Also not yet settled: whether
   `@nodegx/node-spec`, `@nodegx/project-contract` and `@nodegx/canvas-look` (R5) go in the same release — the one install
   does not need them (the bundles inline them); a stranger building their own editor (OWN-007) does, and
   project-contract and canvas-look have no build yet (`main` is `.ts`).
2. **AC2's second half:** the made project opens in the editor with nothing written beyond the three files opening
   writes (run-editor skill, on a copy).
3. **AC4:** the created project as an OWN-006 suite fixture.
4. **§4.4, the stranger's run** on a clean account, in a real Claude Code, plus one non-Mac machine. Watch: where the
   agent puts the app (`create_project`'s `directory` asks for an absolute path; nothing says "inside this folder", and
   the day-two fix reads only the folder the server started in), and the client's first-run trust prompt for a
   project `.mcp.json`.
5. The server reports itself as `noodl-mcp 0.3.0` while the package is `0.1.0` — deliberate (`server.ts:55` explains
   the server version), but a stranger reading both will ask.
