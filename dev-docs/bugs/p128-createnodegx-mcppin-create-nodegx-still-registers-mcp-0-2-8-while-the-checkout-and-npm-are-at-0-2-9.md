---
id: P128-CREATENODEGX-MCPPIN
title: "create-nodegx's pinned server is 0.2.8 while `packages/noodl-mcp` (and npm, since 9cbf7383a on 2026-10-27) is 0.2.9, so its own \"the pinned server is the version the checkout would publish\" test is red, and `npm create nodegx` registers a server without the two Claude Desktop fixes"
status: open
severity: low
area: "`packages/create-nodegx/bin/create-nodegx.js` `MCP_VERSION`; release practice: 9cbf7383a cut `@nodegx/mcp` 0.2.9 alone (Richard: \"mcp only\")"
found: overnight high-bug run (P128-S3-NOSTUDIOFORTHEEDITOR's baseline), 2026-11-01
evidence: "MEASURED: `node --test test/create.test.js` at HEAD plus the working tree: test 1 red, `'0.2.8' !== '0.2.9'`. `npm view @nodegx/mcp version` 0.2.9, `npm view create-nodegx version` 0.2.8."
launch: none
owner: "the next release (the one that also does P128-S3-NOSTUDIOFORTHEEDITOR's release flip)"
---

Expected after an mcp-only cut, and the test says so on purpose: the next create-nodegx release moves `MCP_VERSION`
to whatever `@nodegx/mcp` it ships beside (which for the Studio flip must carry e0801764e, so 0.2.10 or later).
Recorded so the red is not read as a regression in the meantime.
