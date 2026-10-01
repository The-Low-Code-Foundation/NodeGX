---
id: P107-C18
title: Parse XML goes silent — no Result, no Failure — while Always Array holds anything but text
status: needs-ruling
severity: medium
area: runtime / Parse XML
found: P107 NSP-013 s13, 2026-10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.2
---

Wire a number, `true` or an array into Parse XML's **Always Array** and every parse after it sends nothing:
no Result, no Changed, and — against the Failure Contract — no Failure and no Error. It starts working again
when text arrives on Always Array.

Where: `packages/noodl-runtime/src/nodes/std-library/data/parsexml.ts` :108 stores `value || ''`; :202
`.split(',')` throws inside the frame-end callback (the scheduler logs a `TypeError`). `scheduled` was cleared
at :191 first, so the node is not dead — just silent for as long as the value stands.

Reproduce: `packages/nodegx-node-spec/scenarios/net.noodl.ParseXML.json`, the C18 scenario (the spec writes
the silence; the runtime conforms to it).

Proposed: `String(value)` in the setter (one line), or refuse it through the Failure contract with an `xml/…` code.
