# TBM-005 — An unwired output has a value

**Opened 2026-10-11, from P117-S1-UNWIREDOUT** (`dev-docs/bugs/p117-s1-unwiredout-….md`). **Status: 📋 kit.**
**Model: Opus** for the preview change; the bug file holds the two options.

## 1. The person sentence

> **A part taken from the shelf shows what it is doing the moment it does it, with nothing wired to its outputs.**

## 2. What to build

Option (a) of the bug file: the in-page trace reports an output write that has no wire (`toNode` absent), so `last`
fills for every output and Orbit's cards get it for free. Measure the hook the page bundle reads first
(`packages/noodl-preview/src/inPage/`), and whether the runtime's trace already has the write before it is filtered to wires.

## 3. Acceptance criteria

1. The wall's gate gains back the removed line: a Switch from the shelf, flipped by a wire into it, reads `state = true` with nothing wired out.
2. Orbit's cards show an unwired output's value (its gate: one assertion).
3. The trace's size on Orbit's 37 wires is measured before and after (events per press); a doubling is a finding, not a fail.
