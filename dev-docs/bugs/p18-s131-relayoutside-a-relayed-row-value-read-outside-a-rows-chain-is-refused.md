---
id: P18-S131-RELAYOUTSIDE
title: A repeater's relayed row value read anywhere but a chain its rows' signal runs (an Expression, a Function's input, another trigger's chain) is refused; the runtime reads the row that fired last
status: open
severity: low
area: export / `resolveExpr`'s For Each branch (`src/analyze/plan.ts`, EXP-011 §100)
found: P18 session 131, 2026-10-19, building the row read (EXP-011 §100); the Read Desk's Again variant
evidence: packages/nodegx-export/tests/the-row-is-read-where-it-fires.test.ts A8, A9, C3, C8; dev-docs/tasks/phase-18-code-export-v2/s131-rowread/census.ts on the tree
---

The runtime keeps a repeater's relayed values on the repeater itself (`foreach.tsx` `_internal.itemOutputs`), written
only when a row's relayed signal fires: a node outside that row's chain reads whatever the last row to fire left there
(`undefined` before any). Since session 131 a read inside a row's chain is the firing row's own item field; any other
read is refused by name, in two sentences: "as a standing input" (a Function's or an Expression's input, resolved once
for every run, even when the row's signal is what runs it) and "in a chain no row's relayed signal of that repeater
starts in the export".

In the templates (census on the tree): the standing inputs are rocket-school's and star-class's Big things and Care
"Buy what?" Expressions (6 wires), nightbook's `tnUse` (2 inputs) and story-engine's `rdCarry`; the chain is
story-engine's `rdSetAt` (reached through `rdCarry`). On the Read Desk an Again button that also runs the pick's Set
writes Milk's id in the runtime and nothing in the export (pinned, A8 and A9).

A fix: the §99 state row (`relayed<Name>`, written by every relayed row callback) read in render and through a
chain-local snapshot in the handler that writes it; a Function's input fed by a relay read per run as the firing row's
where only row signals run it.
