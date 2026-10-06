---
id: P107-C18
title: Parse XML goes silent — no Result, no Failure — while Always Array holds anything but text
status: fixed
commit: 685ac731a
phase: P109
task: ISL-026
severity: medium
area: runtime / Parse XML
found: P107 NSP-013 s13, 2026-10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.ParseXML.json "a number on Always Array is read as its text ('5'): every parse carries on (C18)"
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Turn it into text".** Parsing carries on, and a list of names wired in works as the person meant. A one-line change. The question as asked: *"Should Parse XML turn a non-text Always Array into text?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s21, ISL-026), as ruled.** Always Array keeps `String(value)`: a list of names reads as `'a,b'`. The spec is v2 (it wrote the silence); a new scenario wires a list. Runtime 200: conforms 14 / 14. Control: both scenarios fail on HEAD's file, with 54 generated divergences.
