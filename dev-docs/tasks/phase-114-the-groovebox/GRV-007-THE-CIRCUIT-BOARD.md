# GRV-007 — The circuit board

**Opened 2026-10-06.** **Depends on OWN-001, OWN-003, GRV-006.**
**Status: 📋 not started.**

## 1. The person sentence

> **Someone lifts the groovebox's lid, sees the traces light on each beat, moves a knob's wire to a different part, adds
> a knob from the parts bin, and hears the difference on the next beat.**

## 2. What to build

The groovebox's own editor, built with P112's kit, the way GX-16 sketches it:

1. The project's graph drawn as a circuit board: chips for nodes, traces for wires, signal, value and audio in the
   NodeGX wire colours (`@nodegx/canvas-look`). A switch shows the same graph in the NodeGX node look.
2. Live: traces pulse when a step fires; value labels follow the knobs (OWN-003's runner, or `nodegx-observe`).
3. Edit: pick up a wire, plug it in elsewhere; add a Knob, Fader or Pad from the bin and it appears on the front panel;
   swap a part for another of the same kind.
4. Save writes the project files. The official editor opens them.

## 3. Acceptance criteria

1. Every edit in §2.3 changes the sound on the next beat.
2. After a session of edits, the official editor opens the project with zero new validator diagnostics.
3. P112's editor suite (OWN-006) passes on it.
4. It can be Richard's own editor for OWN-009 if he picks it there.
