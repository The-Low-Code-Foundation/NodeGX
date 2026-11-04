---
id: P134-S10-STUDIOSOCKET
title: "hls006: noodl-mcp's studio proxy opens a listener that no ENROLLED row decides, so 'every socket this repository opens' reads red"
status: open
severity: medium
area: `packages/noodl-mcp/src/studio/studioProxy.ts`; the gate `packages/nodegx-export/tests/hls006-every-listener.test.ts`
found: P134 session 10, 2026-11-04, the whole nodegx-export suite in band
evidence: hls006 "has no listener that is not enrolled" — unenrolled ["noodl-mcp/src/studio/studioProxy.ts"]; the file's last commit is 71dca72c7 (P125 CCN-008, 2026-10-25)
---

The gate's own instruction: decide what the socket binds (loopback unless there is a reason), then add a row to
ENROLLED saying what and why (see `serve/access.ts`). Session 10 did not decide it: it is P125's socket, and binding is
a security choice for its owner.

The same run also named `nodegx-export/src/emit/html/printComponent.ts`; that one was the HTML printer's helper called
`listen` (P134-S10-LISTENWORD, fixed).
