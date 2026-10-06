# GRV-004 — The beat lands on the grid

**Opened 2026-10-06.** **Depends on GRV-003.**
**Status: 📋 not started.**

## 1. The person sentence

> **The beat stays tight however busy the app is, and a number says so.**

## 2. Why

README §3's time rule works in GX-16's page. NodeGX delivers signals through its own runtime, which may hold one until
its next update. If that delay exceeds the lookahead, a step is late and the ear hears it.

## 3. What to do

1. Build a 16-step pattern on all four tracks through the real runtime.
2. Render 8 bars offline (an `OfflineAudioContext`, faster than real time) and find every onset.
3. Compare each onset with its grid position, in samples.
4. Repeat with the page busy: a repeater of 500 rows updating each step, and a knob turning every frame.
5. If any onset is late, measure the runtime's signal delay and set the lookahead from it.

## 4. Acceptance criteria

1. Every onset within one sample of its grid position, idle and busy, or each exception named with its cause.
2. The measurement is a test that runs in CI, so a runtime change that breaks timing fails a gate.
