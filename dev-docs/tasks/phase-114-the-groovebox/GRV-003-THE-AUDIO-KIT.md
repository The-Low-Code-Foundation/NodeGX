# GRV-003 — The audio kit

**Opened 2026-10-06** from R3. **Depends on GRV-001.**
**Status: 📋 not started.**

## 1. The person sentence

> **Someone installs `@nodegx/kit-audio`, places a Clock, a Step Sequencer and a Drum Voice, wires them, and hears a beat.**

## 2. What to build

Nine nodes on Tone.js 15.1.22 (MIT, 79,726 bytes gzipped), each with a spec:

| node | inputs | outputs |
|---|---|---|
| Clock | Tempo, Swing, Start, Stop | Tick (signal, carries Play At), Playing |
| Step Sequencer | Tick, Pattern, Steps | one signal per track (carries Play At), Step |
| Drum Voice | Trigger, Kind (kick, snare, hats), Tune, Decay, Level | Audio |
| Synth Voice | Trigger, Note, Wave, Cutoff, Decay, Level | Audio |
| Filter | Audio, Kind, Cutoff, Resonance | Audio |
| Echo | Audio, Time, Mix, Feedback | Audio |
| Mixer | Audio ×N, Level per input | Audio |
| Speaker | Audio, Volume | — |
| LFO | Rate (synced to the tempo), Depth, Centre, Shape | Value |

GX-16 also has Chance and Random. They are not audio; they belong in the core logic library or a small logic kit, decided here.

## 3. Decisions this task makes, and records here

1. **The audio port type.** A wire whose value is the sound source; the receiving node connects to it. List every
   reader of port types first (editor colour, picker, MCP vocabulary, validator, export).
2. **One audio context per page.** `game-kit`'s `Sound` makes its own (`library/modules/game-kit/src/kit.js:125-131`).
   Decide whether both kits share Tone's context.
3. **Nothing outlives its node.** `game-kit`'s rule: deleting a node stops its sounds and clears its schedule.
4. **Play At.** Signals that carry a time (§3 of the README). Name the convention once, in the spec format, so other
   kits can use it.

## 4. Acceptance criteria

1. Every node's conformance run passes.
2. The kit installs from npm into a project and its nodes appear in the picker and in `list_node_types`.
3. Deleting a playing Drum Voice stops it on the next step, with no error.
