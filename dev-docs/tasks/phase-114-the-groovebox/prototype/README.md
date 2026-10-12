# GX-16 — the prototype

Built 2026-10-06 in the scoping conversation. One page, `gx-16.html`, with no build step. Open it in a browser and
press Play (sound needs a press first). It loads Tone.js 15.1.22 from cdnjs.

**What it does.** A 16-step groovebox with four drum and bass tracks, a lead synth with an 8-note grid (C minor
pentatonic, one note per step), and five knobs. "Under the lid" draws the graph as a circuit board or as NodeGX nodes.
Traces pulse on each step. Parts drag; clicking one opens an inspector with its description and a slider for each
setting that nothing is plugged into. A wire from a knob, a sequencer track or an added part can be picked up and
plugged in elsewhere. The parts bin adds a Knob (it appears on the front panel), a Wobble (an LFO locked to the
tempo), a Chance (passes each signal with a set probability) and a Random (a new value every few steps). Added parts
can be removed; built-in ones can only move.

**How it keeps time.** Tone's transport calls the sequencer each sixteenth note with the audio-clock time of that step;
the step travels the graph's wires as a signal carrying that time, and each voice schedules its sound at it.

**What it is not.** The graph is a small format written for this page (`nodes`, `wires`), run by a 20-line loop
(`fire`, `seqTick`). The NodeGX editor cannot open it. GRV-000 lists every faked part and the task that replaces it.

**Driven** 2026-10-06, headless Chrome over CDP, twice. Version 1: Tone loads, the context runs, the playhead moves,
the three "Try this" rewires pass. Version 2 (lead, parts bin, inspector): the context runs, a tune cell toggles, all
four "Try this" tasks pass, a part drags with real mouse events, a click selects it and fills the inspector, an
inspector slider moves the value on the board, a part is removed, no console errors, no horizontal scroll at 390 px.
Nobody has listened to either version yet.
