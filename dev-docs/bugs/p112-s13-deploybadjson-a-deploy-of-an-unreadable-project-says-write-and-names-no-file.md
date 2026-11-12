---
id: P112-S13-DEPLOYBADJSON
title: "Deploying a project with a malformed nodes.json reports stage `write` and names no file"
status: fixed
commit: (this session, the Beta sweep s6)
severity: low
area: deploy engine (`packages/noodl-preview/src/deploy-cli.ts` stage classification; the v2 loader's JSON parse error)
kit: preview
found: P112 OWN-016 s13, 2026-10-12
regression: packages/noodl-preview/tests/p112-s13-deploy-bad-json.test.ts "stage is project, the message names the file, and nothing is written"
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-016-SHIP-IT.md §6 (the AC1 control)
---

`nodegx-deploy ./broken ./site2`, where `components/Pages/Home/nodes.json` is `{ "nodes": [ broken`, returns
`{"ok":false,"stage":"write","message":"Unexpected token 'b', \"{ \"nodes\": [ broken\" is not valid JSON"}` and writes
nothing. That's the right outcome, with two wrong details. The engine's own vocabulary says `project` means *"the
project could not be read, validated, or has no root"* and `write` means *"it failed part-way through writing"*. A
caller mapping stages to exit codes will report a disk problem. And the message names no file, so the person has to
search 18 files for the one with `broken` in it.

**Fixed (the Beta sweep s6, 2026-10-25).** `readProject.ts` `readJson`: a file that does not parse throws
`<file>: <the parser's sentence>` ("…/components/__page__/Home/nodes.json: Unexpected token 'b', … is not valid JSON";
an empty file "the file is empty, so it is not valid JSON"), marked `projectFile` (a property: `instanceof` on an Error
subclass fails under ES5). `deploy-cli.ts` classifies that mark as `project`. The preview and `validate_project` read
the same module, so they name the file too.

**Graded.** `tests/p112-s13-deploy-bad-json.test.ts` 2/2 on the rebuilt `dist/nodegx-deploy.cjs` (red 2/2 before:
`stage: write`); nothing written either way. Preview 18 suites 106/106, preview and noodl-mcp tsc clean. The agent
server's project-reading specs: 6 of 8 green; the other two (CMP-004) are red with HEAD's reader too, filed as
**BETA-S6-CMP004RED**.
