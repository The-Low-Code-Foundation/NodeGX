---
id: P112-OWN020-OUTDIRANYWHERE
title: "`render_report` and `drive_page` write their screenshots to any path an agent names — DeepSeek V4.1 Flash sent `out_dir: \"/tmp/opentune-shots\"`, the server wrote a PNG there, outside the project, and the agent's own (folder-sealed) file tool then couldn't open it"
status: fixed
commit: (this session, the Beta sweep s6)
phase: P112
task: OWN-020
severity: medium
area: mcp — `packages/noodl-mcp/src/tools/renderTools.ts` (`out_dir` is `path.resolve(args.out_dir)` for both tools, no containment); every other project-server write stays inside the project
found: P112 OWN-020, 2026-10-19 (UI-2: Cline 3.0.71 + DeepSeek V4.1 Flash, the OpenTune UI fixes sitting, kit tgz35 = 0.2.1)
regression: packages/noodl-mcp/tests/p112Own020OutDir.test.ts "drive_page the same, as in the measured round"
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-020-THREE-HARNESSES.md §12 (UI pass); the round's journal `scratchpad/rounds/UI-2/agent.jsonl` and `seal-audit.txt` (session d48c859a); `/tmp/opentune-shots/nav-360-before.png` was on disk (13:33, 53 KB; removed by Opus after recording)
kit: mcp
---

UI-2's journal: `call_tool({ name: "drive_page", arguments: { backend_port: 8583, out_dir: "/tmp/opentune-shots", steps: [...] } })`
→ "PASSED — 10 of 10 steps … Screenshots are files". The server (stdio, cwd = the person's folder) wrote
`/tmp/opentune-shots/nav-360-before.png`. The agent then called Cline's `read_files` on it and the lab seal refused
(outside the work folder). On a person's machine nothing refuses: the PNGs land wherever the model says, and a page
or step name that matches an existing file there would replace it.

The two harms: (1) a project server with `--allow-writes` writes outside the project, which nothing else in it
does (`ProjectStore` keeps writes in the project); (2) in any client that confines its file tools to the folder
(Cline's workspace, Claude Code's, this lab's seal), the agent can't open what it just asked for, and spends calls
finding that out.

Fix shape: resolve `out_dir` against the project and refuse one outside it (by name, like an unknown argument), or
keep only the default (`.previews/render`, `.previews/drive`) and treat `out_dir` as a subfolder name under it.
Regression: `drive_page` / `render_report` with `out_dir: "/tmp/x"` is refused and writes nothing; a relative
`out_dir` lands inside the project.

**Fixed (the Beta sweep s6, 2026-10-25), the first shape.** `renderTools.ts` `screenshotDir`: `out_dir` is read
against the project (it was the server's cwd) and refused, in words, when it lands outside it — compared by real path,
so `/var/…` and `/private/var/…` agree and a link in the project that leads out is outside. Both tools refuse before
anything runs. Its words: *out_dir "…" is outside this project (…), and screenshots are written only inside it, where
your file tools can open them. Pass a folder in the project (for example ".previews/shots"), or leave out_dir out.*
`export_react`'s `out_dir` (a separate app folder, lane 4) is not this row's and is untouched.

**Graded.** `p112Own020OutDir.test.ts` 4/4 with a stub render CLI (an outside `out_dir` refused for both tools, the CLI
never run and nothing written; a relative one read against the project; `..` and an outward link refused, an absolute
path inside accepted by either spelling): all four red under HEAD's `path.resolve(out_dir)`. FLD-011 and OWN-018
pointed `out_dir` at the OS temp folder; they now name folders in the project. Both also pinned the default argv
without `--image-budget 600000`, red since P125-PUPPY2-RENDER1MB (2d0fe7534, this sweep's session 1); updated. Every
MCP spec reaching the render tools: 25 suites 182/182.
