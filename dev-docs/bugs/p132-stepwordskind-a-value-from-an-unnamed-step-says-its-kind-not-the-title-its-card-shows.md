---
id: P132-STEPWORDSKIND
title: A value from an unnamed step says its kind ("checked · from Call Function"), not the title its card shows ("Run Cloud Functions/Check thirst")
status: fixed
phase: P132
severity: low
area: nodegx-studio / Backend tab (a value's chip and pill, What it can read)
found: BWF-013's Electron drive on a Greenhouse copy, 2026-11-04 (s17): the piece's Return composed from its unnamed first step
evidence: nodegx-studio editor/automations-check.mjs "an unnamed step's values are \"from Run <its function>\" / \"from Run <its piece>\", as its card is titled" and "and What it can read heads its block the same"
launch: beta
commit: nodegx-studio fc1bc86
---

An unnamed step's card is titled by what it runs ("Run Cloud Functions/Check thirst", since BWF-001), but a value read
from it was said by the step's KIND: `pathWords` used `s.name || kindName(s.kind)` and `readSources` used
`s.name || displayName`, so the chip read "checked · from Call Function" beside a card no person would call that. A
workflow with two unnamed function steps had two blocks both called "Call Function". Every workflow made with *New*
whose first step is a function has such a step (its id is `first`, no name).

Fixed: `automations.mjs stepTitle(s, kindName, workflowName)` (the card's rule: its name, else "Run <function>", else
"Run <piece>" for a Run a workflow step, else the kind's words), used by `pathWords` and `readSources`. Studio passes
the workflows' names for a piece. Red on the old code (the unit lines name both cases).
