---
id: P115-HST013-SCRIPTFILES
title: "A Function node in a cloud function that uses the project's script files (`Scripts.x`) would compile them from strings, which a Cloudflare Worker refuses"
status: open
severity: low
area: "cloud runtime / project script files (`packages/noodl-runtime/src/scriptfiles.ts` :204, `new Function` per file), Workers deploy target only"
found: P115 HST-013, 2026-11-05, reading the compile sites while printing the code nodes
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-013-CODE-NODES-PRINTED-AT-DEPLOY.md §5.5
---

HST-013 printed every code node's own text, so a Function, Expression, Logic Builder, REST or Map Collection in a cloud
function runs on a Worker. A project's script files (the `scripts/` a Function reads as `Scripts.x`) are compiled by
`ScriptFiles` with their own `new Function`, which `printedcode.ts` does not reach, so on a Worker such a Function's
`Scripts.x` would fail with *This code was not printed when the app was deployed* (the host installs the table with
`refuseOthers`).

**Reach not measured.** Nothing found in this session puts script files into a cloud function's bundle: neither
`noodl-viewer-cloud/src` nor `nodegx-backend/src` mentions `setScripts`/`scriptFiles`. Measure that first (does the
editor's or the MCP's cloud bundle carry `scripts`?); if it can, print each file through the same seam
(`compileCode(PARAMS, source + sourceURL)`) and add it to `printcode.ts`.
