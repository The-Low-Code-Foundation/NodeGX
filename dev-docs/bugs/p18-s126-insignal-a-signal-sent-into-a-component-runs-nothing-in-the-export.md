---
id: P18-S126-INSIGNAL
title: A signal a parent sends into a component's input runs nothing in the export (87 template nodes refused)
status: open
severity: medium
area: export / a Component Inputs signal port as a trigger (`src/analyze/plan.ts`, the attach pass)
found: P18 session 126, 2026-10-19, reading rocket-school's Feedback banner after its root's Mounted was carried
evidence: EXP-011 §93.6; the count below, over the 19 shipped templates at the session's tree
---

A component can take a signal as an input (a Component Inputs port of type signal): the parent wires a button's click or
a chain's Done into it, and inside the component it runs a chain. The export refuses every node such a signal runs:
"trigger fbIn.show is not a rendered element event or a receiver", and drops the wire.

Measured over the 19 templates: **87 nodes refused for this trigger, 115 wires dropped**: todo-list 26 and its demo 26,
rocket-school 14, star-class 14, bot-garden 6, nightbook 1. rocket-school's Feedback banner is the visible case: its root
is mounted by a States value (carried since session 126), and the banner opens on `show`, a signal into the component,
so the exported banner still never opens; its Next and Show me buttons are drawn only once it does. bot-garden's Form
resets on `reset` the same way.

Fix, its size: a signal input is a prop the parent calls, the way a Component Outputs signal is a callback the child
calls: the child exposes a handle (a counter prop the parent bumps, and an effect keyed on it, or an imperative ref),
and the parent's chain calls it. Medium; grade it against the runtime's own component instance as session 126's spec does.
