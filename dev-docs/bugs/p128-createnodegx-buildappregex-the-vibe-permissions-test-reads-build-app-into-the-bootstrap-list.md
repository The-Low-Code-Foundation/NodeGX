---
id: P128-CREATENODEGX-BUILDAPPREGEX
title: "create-nodegx's \"allowed tools are exactly what the bootstrap server advertises\" test is red since 48f81d89f: its regex reads `build_app` out of `BOOTSTRAP_TOOLS`' conditional spread (only with `NODEGX_LOCAL_MODEL`), so it expects Vibe to allow a tool the plain bootstrap server never advertises"
status: fixed
severity: low
area: "`packages/create-nodegx/test/create.test.js` (the OWN-018 test that reads `packages/noodl-mcp/src/toolGroups.ts` as text); `toolGroups.ts` `BOOTSTRAP_TOOLS` (`...(process.env.NODEGX_LOCAL_MODEL?.trim() ? ['build_app'] : [])`, 48f81d89f, P112 OWN-031)"
found: overnight high-bug run (P128-S3-NOSTUDIOFORTHEEDITOR's baseline), 2026-11-01
evidence: "MEASURED: `node --test test/create.test.js` at HEAD plus the working tree, before any change of this run: 33/35, this test red with `- 'build_app'` the only difference between expected and `VIBE_ALLOWED_TOOLS`. The product side is a decision, not read here: should a Vibe folder allow `build_app` for a person who sets NODEGX_LOCAL_MODEL? Today Vibe would ask (and `vibe -p` answer no) for it."
launch: none
owner: nobody yet
---

The test turns the source into a list with `/'([a-z_]+)'/g` over the array literal, so a name inside a conditional
spread counts as always advertised. Either the test strips the conditional (and the row closes as a test fix), or
`VIBE_ALLOWED_TOOLS` gains `build_app` (harmless when the server does not advertise it) and the test stays as it is.

Fixed 2026-11-04 in the create-nodegx 0.2.9 cut (OWN-036), both halves: the test reads `BOOTSTRAP_TOOLS` up to its own `]);`, so the conditional spread no longer cuts the list to one name; and `VIBE_ALLOWED_TOOLS` gains `build_app`, inert unless `NODEGX_LOCAL_MODEL` makes the server advertise it. create-nodegx 40/40.
