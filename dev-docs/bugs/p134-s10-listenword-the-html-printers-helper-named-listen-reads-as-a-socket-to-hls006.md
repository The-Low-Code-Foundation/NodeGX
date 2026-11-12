---
id: P134-S10-LISTENWORD
title: "hls006: the HTML printer's own helper was called `listen`, so `...listen(id, …)` read as a new socket and the listener gate was red"
status: fixed
commit: 7aabd5acf
severity: low
area: `packages/nodegx-export/src/emit/html/printComponent.ts`; the gate `tests/hls006-every-listener.test.ts`
found: P134 session 10, 2026-11-04, the whole nodegx-export suite in band
evidence: hls006 "has no listener that is not enrolled" named `nodegx-export/src/emit/html/printComponent.ts`; HEAD (0a280a140, HTX-006) has six `...listen(` calls, which match the gate's `\.listen\s*\(`
regression: packages/nodegx-export/tests/hls006-every-listener.test.ts
---

The helper prints a DOM event listener into the exported page; it opens nothing. Renamed `listenFor`, so the gate reads
the file as what it is. The gate's other name in the same run, noodl-mcp's studio proxy, is a real socket and is
P134-S10-STUDIOSOCKET.
