---
id: P107-D14
title: Date To String: a timestamp or null is "Invalid Date" without a Timezone but renders with one
status: fixed
commit: 844f8569b
phase: P109
task: ISL-032
severity: low
area: runtime / Date To String
found: P107 (the node says what it does) s11, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Date To String.json "with a zone: the same numeric timestamp renders (2024-02-29) and null is Invalid Date, as with none (v2; …)" (and "with no zone: …")
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.2 (row D14) — the row names how it is reproduced and pinned
---

Date To String: a timestamp or null is "Invalid Date" without a Timezone but renders with one.

**Where:** Date To String (datetostring.ts :264-273, :39-71)

**What the wire shows:** with NO Timezone, `null` and a numeric timestamp on `Date` render blank with `Invalid Date` (getDate throws); WITH a Timezone the same timestamp RENDERS and `null` renders the epoch (`formatToParts` accepts anything `Number()` accepts) — one port, two validity rules

**Plain words:** *"Whether a timestamp or a null on Date is 'invalid' depends on whether a Timezone is set."* Two scenarios record both arms

**Proposed:** one rule: read through `toDate` as the rest of the family does (a timestamp renders in both; null is invalid in both)

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "One rule, like the other date nodes".** A timestamp renders in both cases and an empty Date is invalid in both. A small change. Apps that showed 1970 for an empty date with a Timezone now show 'Invalid Date' instead. The question as asked: *"Should Date To String read its Date the same way whether or not a Timezone is set?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 844f8569b (P109 ISL-032, 2026-10-06), as ruled.** The Date is read through `toDate`, as the rest of the date family reads it. Date To String v2.
