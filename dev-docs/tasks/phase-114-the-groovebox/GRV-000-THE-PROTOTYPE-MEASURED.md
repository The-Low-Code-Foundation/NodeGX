# GRV-000 — The prototype, measured

**Opened 2026-10-06.** **Depends on nothing.**
**Status: 📋 not started.**

## 1. The person sentence

> **A session picking up this phase can see, part by part, what GX-16 faked and which task makes it real.**

## 2. Why

GX-16 sounds and looks like the finished thing. It is a hand-written graph in one page. P112's lesson
(*correct and usable were never the same criterion*) applies: a prototype that looks finished hides what it skipped.

## 3. What to do

1. A table in `prototype/README.md`: one row per part GX-16 wrote by hand, with the file line and the task that
   replaces it. Known rows: its own graph format (`nodes`, `wires`); its own runner (`fire`, `seqTick`); the knob; the
   pad grid; the eight audio nodes as plain Tone.js calls; the wiring rules (`canTake`); the value ranges per port; the
   two looks (board, NodeGX).
2. Each row names one task (GRV-001…007, or a P112 task). A row with no task becomes a task or a line in §9 of the README.

## 4. Acceptance criteria

1. Every function in `gx-16.html`'s script appears in a row or is named as page plumbing.
2. No row is without an owner.
