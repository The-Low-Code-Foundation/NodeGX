# GRV-005 — The controls kit

**Opened 2026-10-06.** **Depends on GRV-001.**
**Status: 📋 not started.**

## 1. The person sentence

> **Someone building any app (a groovebox, a lighting desk, a game) places a Knob or a Pad Grid like any other control.**

## 2. What to build

`@nodegx/kit-controls`: Knob, Pad, Pad Grid (rows × steps, its value is the pattern), Fader, LED. Each specced on the
model of P107's Slider spec (`packages/nodegx-node-spec/src/nodes/slider.ts`), which conforms at 10,000 on both targets.
Every visual decision is a port with a design-token default (P69's P2). Keyboard and touch both work: a knob turns with
arrow keys and with a vertical drag.

## 3. Acceptance criteria

1. Every node's conformance run passes.
2. Each control works by keyboard alone and on a touch screen.
3. The kit is useful without the audio kit: one non-music example uses it.
