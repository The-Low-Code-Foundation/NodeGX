---
id: P107-D14
title: Date To String: a timestamp or null is "Invalid Date" without a Timezone but renders with one
status: needs-ruling
severity: low
area: runtime / Date To String
found: P107 (the node says what it does) s11, 2026-09-30/10-01
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
