---
id: P107-D38
title: Boolean To String's Selector Changed fires on any different Selector value, not only when it flips
status: open
severity: low
area: runtime / Boolean To String (`packages/noodl-runtime/src/nodes/std-library/booleantostring.ts`)
found: P107 NSP-018 s73, 2026-10-09 — writing the spec's rules in words
kit: node-spec
evidence: `packages/nodegx-node-spec/scenarios/Boolean To String.json` "a truthy non-boolean picks String for true — 'yes', 1, {}" plays 'yes' → 1 → {} on both targets; each step pulses Selector Changed while Current Value stays String for true
---

Boolean To String's Selector Changed fires on any different Selector value, not only when it flips.

**Node:** Boolean To String

**What, with the line:** Selector Changed's description says "Fires when Selector flips, after Current Value has been
updated". Selector's setter compares the RAW value (`if (this._internal.currentInput === value) return;`) and then
pulses `inputChanged`. Selector has no conversion (the spec's `coerce: 'none'`), and the string is picked by
truthiness. So `'yes'` → `1` → `{}` pulses Selector Changed three times, and Current Value never moves off String
for true. A wire carrying a count or a text into Selector pulses on every change of it.

**How it was found:** NSP-018 asks each reducer branch to say its case in words. The honest words for the second
branch were "a different value, even one that picks the same string", which is not what the description says.

**Proposed answer (a ruling):** either correct the words ("Fires when Selector changes to a different value, even one
that picks the same string") or compare truthiness in the setter (`!!currentInput === !!value`) so the pulse means a
flip. The second is a behaviour change: a graph that counts Selector Changed would count fewer.
