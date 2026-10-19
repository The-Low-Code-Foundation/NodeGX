---
id: PARKED-THREE-S3-NOWEBGL
title: render_report and drive_page ran Chrome with no WebGL, so an agent saw every three.js scene as "No WebGL here"
status: fixed
commit: 303c55224
kit: mcp
regression: packages/noodl-mcp/tests/three-kit-render.test.ts
severity: high
area: mcp / render_report and drive_page — `scripts/devtools/render-report.js` (the Chrome launch, `--disable-gpu`), `scripts/devtools/drive-page.js` (the same); the npm MCP ships them as `dist/render-harness`
found: parked THREE-IN-NODES s3, 2026-10-19
evidence: packages/noodl-mcp/tests/three-kit-render.test.ts (3/3; with the two flags removed, test 1 reads gl false)
---

An agent that built a three.js page (three-kit, garden-3d-kit) and called `render_report` got a blank white page with
"No WebGL here" in the middle, the kit's own fallback. Nothing about the page was wrong: the agent's browser had no
WebGL. Both launchers passed `--disable-gpu` and nothing else, so `canvas.getContext('webgl')` was null. The kit's
drive never saw it because `drive-deployed.js` already took `gpu: true` plus software GL for IG-007.

**Measured 2026-10-19** in `withRenderedPage` on the parked fixture with the kit: default flags `{gl: false, fallback:
true, meshes: null}`; with `--use-angle=swiftshader --enable-unsafe-swiftshader` appended beside `--disable-gpu`
`{gl: true, fallback: false, meshes: "12"}`.

**Fixed** by adding those two flags to both launchers (software GL, no GPU; a page that never asks for WebGL never
touches it). Nine render and drive specs 96/96 after it. Reaches npm users with the next `@nodegx/mcp` cut, which
rebuilds `dist/render-harness` from these files.
