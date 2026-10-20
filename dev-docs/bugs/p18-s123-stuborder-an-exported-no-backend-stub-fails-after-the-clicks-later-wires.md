---
id: P18-S123-STUBORDER
title: With no backend, an exported verb fails after the click's later wires; the running app refuses before them
status: open
severity: low
area: export / api stubs (no backend declared)
found: P18 session 123, 2026-10-17, the drive's first run (s123-failchain, readings-run1-nobackend.json)
evidence: dev-docs/tasks/phase-18-code-export-v2/s123-failchain/README.md "Run 1"; EXP-011 §90.4
---

A project that declares no backend exports its api functions as stubs that throw "… is not connected to a backend yet"
from an `async` function, so the throw arrives as a rejection after the first await: after the click's later wires. The
running app with no backend refuses inside the node's own after-update callback ("This project has no backend
configured"), before a later wire's callback. On fail-desk, Remove then "put the refusal away": the runtime ends with
the refusal hidden, the export with it shown.

With a backend declared, both fail on the network and agree (run 2). Fix: a stub that throws synchronously (a plain
function returning `Promise<…>`), so the catch runs where the runtime's refusal does. Small; it changes every stub's
emitted text (hls001).
