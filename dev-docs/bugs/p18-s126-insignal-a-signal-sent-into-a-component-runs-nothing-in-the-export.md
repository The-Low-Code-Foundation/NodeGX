---
id: P18-S126-INSIGNAL
title: A signal a parent sends into a component's input runs nothing in the export (87 template nodes refused)
status: fixed
severity: medium
area: export / a Component Inputs signal port as a trigger (`src/analyze/plan.ts`, the attach pass)
found: P18 session 126, 2026-10-19, reading rocket-school's Feedback banner after its root's Mounted was carried
fixed: P18 session 127, 2026-10-19, branch l6-insignal (commit 5506f3b1b); EXP-011 §94
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

**Session 127 (EXP-011 §94): fixed.** A placed component's signal input is a trigger port: every sender adds one to a count
the parent keeps per port, beside a ref of the count the child has acted on, and the two are the prop
(`{ sent, taken }`); inside, the Component Inputs port's wires run from an effect when `sent` passes `taken`: once per
pulse, never at a mount with nothing sent, and at a mount after a pulse sent with the click that draws the component (14
of the 29 pulsed placements in the templates are drawn under a condition in their parent). Graded against the runtime's
own component instances with real React under StrictMode (`tests/the-signal-arrives-in-the-component.test.ts`, 19 rows, 9
mutant arms). Over the 19 templates: **87 → 0 nodes refused with a Component Inputs trigger, 115 → 0 wires; 101 nodes
gained, 0 lost.**

What is left, not this bug: rocket-school's Feedback banner still never opens, because its `show` is sent by
`/Logic/Grade answer`'s Done, a logic component the export does not run (the wire is dropped and named on the banner's
marker now). A Set Variable's Done is not carried at all (P18-S127-SETDONE); another placed component's value output into
an input is dropped (P18-S127-SIBLINGVALUE), so todo-list's Dialog flow runs its chains on inputs it is not given; a Clear
does not send the empty text on (P18-S127-CLEAROUT).
