# The npm packages through a stranger's eyes — 2026-10-23

Richard asked: *"forgetting our history … what do we have when approaching nodegx as an npm package and framework?
Coming at this as just a tech person exploring the open source world, what would you find?"*

Method: the 11 published packages were `npm pack`ed into a scratchpad and unpacked. Three agents with no project
history (told not to read the repo) each took a slice, read every README and enough of the shipped code, and ran
things: `npm create nodegx`, the MCP server over raw JSON-RPC (fake HOME), the preview on a hand-written project, an
export to React built with `npm run build`, the bundled backend, backend-map. Nothing deployed, no real config
touched. The scratch artefacts died with the session; this file is the durable record.

Published today (registry, 2026-10-23): `create-nodegx` 0.2.5, `create-nodegx-cline` 0.2.5, `create-nodegx-vibe`
0.2.5, `@nodegx/mcp` 0.2.5, `@nodegx/preview` 0.2.4, `@nodegx/export` 0.2.5, `@nodegx/node-spec` 0.2.0,
`@nodegx/project-contract` 0.2.1, `@nodegx/backend-map` 0.1.0, `@nodegx/canvas-look` 0.1.0, `@nodegx/core` 0.1.0.
Not on npm (404): `nodegx`, `@nodegx/runtime`, `@nodegx/cli`, `@nodegx/editor`, `@nodegx/viewer`, `@nodegx/backend`.

## The three verdicts, in their words

- **Front door + MCP:** "Without the desktop editor, a stranger gets a heavier, more opinionated way for an agent to
  produce an app it could have written directly in React." The one distinctive thing: "a constrained, validated
  graph of 147 known node types that a non-programmer can open and edit in the NodeGX desktop editor without
  conversion … That round-trip (agent ↔ visual editor) is the real product, and the editor is not on npm."
- **Format + runtime:** "For a developer, an AI writing a normal React/Vite app produces something more portable,
  more standard and better tooled. NodeGX's edge exists only if you value a closed, validated, visually-editable
  graph that non-programmers can open in an editor … The packages as published sell it badly."
- **Export + backend:** "Versus an agent writing React directly, there's little advantage on the way out … The case
  for NodeGX rests on the graph/editor experience and the self-hosted SQLite backend with rules/backups/Postgres
  migration in one bundle, not on the export."

## What a stranger finds, package by package

**create-nodegx (+ -cline, -vibe).** Makes no app. Writes six files into a folder: `.mcp.json` (`npx -y
@nodegx/mcp@0.2.5 --allow-writes`), `CLAUDE.md` = `AGENTS.md` (byte-identical), a 414-line skill
`nodegx-your-own-editor`, `.vibe/config.toml` (Mistral Large 4 prices hard-coded) and `opencode.json`. -vibe adds a
hook that refuses tool calls after 100 and forces a hand-over. -cline writes into `~/.cline/…/cline_mcp_settings.json`
(documented, tagged) and names one model, "DeepSeek V4.1 Flash on ClinePass".

**@nodegx/mcp** (43 MB, 0 declared deps, everything bundled). Bootstrap 7 tools; 25 once bound; 115 with
`--all-tools` (~135 KB of tool JSON). Groups: core 21, backend 65, project 14, explore 5, lesson 4, docs 3, theme 3.
147 pickable node types (Data 41, Visual 19, Utilities 17, Cloud 16, Cloud Services 15, …), 110 examples.
`get_project_info` ≈ 51 KB, mostly doctrine prose. Verified working: write validation ("`Grup` → did you mean
`Group`?", nothing written), a counter page built, `drive_page` 8/8 in real Chrome, `render_report` screenshot,
`export_react` → ~20 idiomatic lines for the counter, `--graph` one readable page. Bundled inside: the editor's
format/validator code, a render harness, **a whole backend server** (`dist/backend/cli.js`, 4.6 MB, sqlite +
postgres), starter assets (4.3 MB, copied into every project), the runtime + React 18 + React 19.

**On disk, a project is:** `nodegx.project.json` (+ `rootNodeId`), `components/_registry.json`,
`components/<path>/{component,nodes,connections}.json`; routes inside the Router node's parameters; `docs/*.md`;
`noodl_modules/`; `.mcp.json`, `CLAUDE.md`, `AGENTS.md`. The model is Noodl's dataflow: value wires (latest value) and
signal wires (pulses); a visual tree via `children`/`parent`; logic as wired nodes or Function/Script/Expression code
nodes; data as named observable Objects/Arrays and Variables; backend via Record/Query nodes against a Parse-style
cloud. A real five-node example (Group, Text, Button, Text, Counter + two wires) renders and counts 5 → 7.

**@nodegx/preview** (25 MB). Carries the browser runtime (`dist/external/deploy/noodl.deploy.js`, 1.75 MB). Verified:
renders a hand-written project, live reload, a broken copy shows an overlay and "keeping last good render", restore
clears it. `nodegx-deploy` is a static export to a local folder, not a deploy. Also ships an undocumented 4.4 MB
backend server. Two near-duplicate 6.8 MB CLI bundles.

**@nodegx/node-spec** (MIT, 42 MB: 17 MB scenarios, ~14 MB source maps with full TS source, the 2.1 MB bundle ×3).
125 node specs as pure reducers with per-port prose, change history, React idioms; 127 node scenarios + 36 graph
scenarios recorded from the runtime. Interpreter verified (Counter trace, Expression, JavaScriptFunction). No graph
interpreter by design. Judged "unusually rigorous" but "mostly benefits the maintainers keeping their runtime honest,
not an outside developer".

**@nodegx/project-contract.** Schemas + `SchemaValidator` + `V2ProjectStore` (drift refusal, no-op skip, registry
upkeep) verified. The published validator is shape-only: a project with type `"Countr"` and a dangling wire passes;
the semantic validator lives in the editor/preview bundles.

**@nodegx/canvas-look.** Theme constants for a NodeGX-lookalike editor. Works; only matters to someone building one.

**@nodegx/export** (bin `nodegx`, 26 MB). Real compiler files → IR → React 19 + Vite + TS. Preflight `--dry-run` exits
4 when something won't translate; every refusal is listed in `EXPORT-REPORT.md`. A 54-node project of the server's own
examples: 38 files, ~1,187 lines, 23 refusals; `npm run build` green (270 kB JS). React only from npm (no Swift);
`deploy` and `render` need a NodeGX checkout. View-level code is clean (CSS modules, tokens, typed props,
react-router, a careful 370-line Parse client). Logic is where it falls down (see bugs). Verdict: "fine as a starting
skeleton for the visual parts; for anything stateful you are rewriting the behaviour by hand."

**@nodegx/core** (MIT, 3.5 KB gz). value/signal/derived/effect/channel/store all verified. Exported code barely uses it
(0 imports in one export, 3 in another); Function nodes get a generated 121-line Proxy runtime emulation instead.

**@nodegx/backend-map.** Works against the bundled backend; tables, rows, rules. Built for one app (hard-coded learner
/ staff personas, `/api/LearnerProfile`). See bugs.

**The backend** ("nodegx-backend 0.1.0") exists only inside `@nodegx/mcp`. Verified: sqlite persistence, Parse REST
(`/classes/*`, `/users` → session token), `/_admin` dashboard; CLI offers serve, doctor, backup/restore,
export/import JSON/CSV, schema diff/apply, `migrate --to <postgres-url>`. Default is dev-open on loopback.

## Cross-cutting (all three agents raised these unprompted)

- **Naming soup:** NodeGX / OpenNoodl / Noodl; bins `noodl-mcp`, `noodl-preview`; `net.noodl.*` types; `noodl_modules/`;
  `~/.noodl/`; `$schema` on `opennoodl.dev` (does not resolve); `Model2` = Object, `Collection2` = Array.
- **Internal jargon in public text:** npm descriptions ("EXP-002's pipeline …"), READMEs (Phase 13, SUB-006, BST-002),
  bin comments ("Richard, 2026-10-12, P112-S14-NOTNODEGX"), the skill (OWN-017 s16), 318 ticket ids in
  `noodl-mcp.cjs`, and **generated user code** ("§4c", "NDA-017 §2", "EXP-007").
- **Count disagreement:** node types 147 / 163 / 180 / 125 / "130" / "18 so far" / "86 specs"; tools 4 / 7 / 89 / 115.
- **Licences:** tools GPL-3.0-only, node-spec/canvas-look/core MIT, nodegx.io says "GPL-3.0"; the backend is called
  MIT but ships only inside GPL `@nodegx/mcp`; nothing states the licence of the runtime a deployed/exported app ships.
- **Provenance:** single maintainer, first published 2026-10-11, `0.0.0-stage` versions published beside real ones.
- **Prescriptive steering:** "WHEN THE PERSON ASKS FOR AN APP, BUILD IT WITH THIS SERVER … do not write a separate web
  server"; "NOT DONE — nothing has rendered this project" on writes; design opinions graded as warnings.
- **Undiscoverable:** nodegx.io's npm section lists six packages, not export, core or backend-map. No package ships a
  sample project; the 17 templates are only in the desktop app.

## Bugs filed from this audit

`node scripts/bugs.js --from NPMAUDIT`.
