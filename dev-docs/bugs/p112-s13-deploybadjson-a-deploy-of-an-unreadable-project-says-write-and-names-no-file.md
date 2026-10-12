---
id: P112-S13-DEPLOYBADJSON
title: "Deploying a project with a malformed nodes.json reports stage `write` and names no file"
status: open
severity: low
area: deploy engine (`packages/noodl-preview/src/deploy-cli.ts` stage classification; the v2 loader's JSON parse error)
kit: preview
found: P112 OWN-016 s13, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-016-SHIP-IT.md §6 (the AC1 control)
---

`nodegx-deploy ./broken ./site2`, where `components/Pages/Home/nodes.json` is `{ "nodes": [ broken`, returns
`{"ok":false,"stage":"write","message":"Unexpected token 'b', \"{ \"nodes\": [ broken\" is not valid JSON"}` and writes
nothing. That's the right outcome, with two wrong details. The engine's own vocabulary says `project` means *"the
project could not be read, validated, or has no root"* and `write` means *"it failed part-way through writing"*. A
caller mapping stages to exit codes will report a disk problem. And the message names no file, so the person has to
search 18 files for the one with `broken` in it.
