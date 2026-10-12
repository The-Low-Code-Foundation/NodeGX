# Phase 114 — The groovebox

**Scoped:** 2026-10-06, at HEAD `0ea207e52`, from a conversation with Richard about which app should prove that NodeGX
builds apps from the npm kit alone, with the editor as an option. It ended with three rulings and a working prototype,
**GX-16**, kept in [`prototype/`](prototype/README.md).
**Status: 📋 SCOPED — 0 of 9 built. Six rulings made (R1–R6, §8), none open.** **Prefix: `GRV`.**
Task files: [GRV-000](GRV-000-THE-PROTOTYPE-MEASURED.md) … [GRV-008](GRV-008-THE-PLAY-TEST.md). The board is §6.

> "A sort of DJ EDM music board thing. You know those things with like the square white buttons, knobs and sliders and
> switches … then see the node editor specifically for that app, where you can kind of go into the electronics of your
> device and tweak all sorts of bits to suit your exact DJ style, add new buttons or knobs, change the way it works"
> — Richard, 2026-10-06

> "We're not going to ship the core NodeGX editor with audio nodes all of a sudden … They should be optional installs."
> — Richard, 2026-10-06

## 0. The idea in one paragraph

A groovebox is a box of pads, knobs and faders that makes beats: tap the squares to place a kick or a snare on one of 16
steps, turn a knob to change the sound, chain patterns into a song. Inside, it is a circuit: a clock, a sequencer, voices,
a mixer, effects, a speaker, and the wires between them. That is a NodeGX graph already, so the app's own editor can be
**the circuit board under the lid**: a person opens it, sees the traces light up on each beat, moves a knob's wire to a
different part, adds a knob, and the front panel changes. The groovebox is built from the published npm kit and two
optional kits, an audio kit and a controls kit, and the official NodeGX editor opens the same project whenever someone
wants it. It replaces nothing in P112: the three strangers still test on the todo template (R4).

## 1. What was measured before scoping

Read on 2026-10-06 at `0ea207e52`.

| # | reading | consequence |
|---|---|---|
| 1 | **The core plays no sound.** No file under `packages/noodl-runtime/src` or `packages/noodl-viewer-react/src` mentions `AudioContext`. | Audio comes from a kit (R1), not from the core. |
| 2 | **A library kit already plays sound.** `game-kit`'s `Sound` node (`library/modules/game-kit/src/kit.js:102-210`) synthesises eight sound effects with one shared `AudioContext` per page, made on the first Play because browsers refuse one before a gesture. Its rule *"nothing outlives its node"* clears every timer it schedules. | The audio kit has a working precedent in the same mechanism. Two kits each making an `AudioContext` on one page is a question for GRV-003. |
| 3 | **Kits work end to end.** Phase 69 closed 20/20. A kit is `noodl_modules/<name>/` with `manifest.json` and `index.js` calling `Noodl.defineModule`; the runtime registers it (`packages/noodl-runtime/noodl-runtime.ts:538`); the picker lists it under "External libraries" (`createnodeindex.ts:115-130`); the MCP runs it headlessly and merges its nodes into `list_node_types` and `get_node_type` (`packages/noodl-mcp/src/kitOverlay.ts`). | No new mechanism is needed to ship audio nodes. |
| 4 | **A kit's node cannot carry a spec.** `@nodegx/node-spec` keeps a frozen map keyed by core type names (`packages/nodegx-node-spec/src/nodes/index.ts:100`, `specFor` at `:207`). Nothing registers a spec from outside. | R1 needs GRV-001 first. |
| 5 | **A project does not record which kits it needs.** `shareAsTemplate.ts:124-126`: *"nothing in the product detects a missing module"*. `kit-provenance.json` lives inside the folder it describes. A missing kit's nodes open as unknown. | R2 needs GRV-002. "Install the app" must mean "install what it needs". |
| 6 | **Controls can be specced.** `@nodegx/node-spec` has specs for Slider, Button, Checkbox, Switch, Text Input, Dropdown and Radio Button; the Slider v2 conforms at 10,000 on both targets (`0ea207e52`). | A Knob, Pad and Fader spec has a model to copy. Visual nodes without one (NSP-016) do not block the controls kit. |
| 7 | **Tone.js 15.1.22**: MIT, 345,500 bytes minified, 79,726 gzipped (cdnjs, measured 2026-10-06). It has a transport with tempo and swing, step sequences, drum synths (`MembraneSynth`, `NoiseSynth`, `MetalSynth`), `MonoSynth`, filters, `FeedbackDelay`, and `Draw` for syncing visuals to the audio clock. | R3: the audio kit wraps it. Strudel was ruled out because it is AGPL. |
| 8 | **The prototype runs.** GX-16 (`prototype/gx-16.html`) was driven headless over CDP on 2026-10-06, in two versions. The second has a lead synth with a note grid, draggable parts, an inspector, and a parts bin (Knob, Wobble, Chance, Random); its four "Try this" tasks pass with no console errors and no horizontal scroll at 390 px. Nobody has listened to it yet. | §4's design has been tried once in a page. It has not been tried inside the NodeGX runtime. |

## 2. The person sentences

- **Someone who wants a beat machine** installs the kit, asks their agent for a groovebox, and makes a three-minute track
  without opening an editor.
- **Someone who wants to change how it works** lifts the lid, moves a knob's wire from the filter to the bass, adds a
  fifth knob, and hears the difference on the next beat.
- **Someone who wants the full editor** opens the same project in NodeGX and sees the same graph, with no migration.

## 3. The time rule

The graph decides **what** plays; the audio clock decides **when**. JavaScript timers drift by tens of milliseconds,
which the ear hears. The browser's audio clock is accurate to the sample, and Tone.js schedules each sound on it a short
time ahead.

So a step travels as a signal that **arrives early and carries the time it must sound at**. The sequencer fires its
`Kick` signal about 100 ms ahead with a `Play At` value; the Drum Voice schedules its sound at that time. The person
still wires *Sequencer → Kick* like a patch cable, and the beat still lands on the sample. Pad lights and trace pulses
use `Draw`, so they appear when the sound does. GX-16 does exactly this in a page. GRV-004 measures whether it holds
through the real NodeGX runtime's signal delivery.

## 4. The design, in brief

| part | what it is | built from |
|---|---|---|
| `@nodegx/kit-audio` | Clock, Step Sequencer, Drum Voice (kick, snare, hats), Synth Voice, Filter, Echo, Mixer, Speaker, LFO (GX-16's Wobble). Each node specced. Audio connections are a port type whose value is the sound source; wiring it connects the sources. | Tone.js 15.1.22, P69's kit mechanism, GRV-001 |
| `@nodegx/kit-controls` | Knob, Pad, Pad Grid, Fader, LED. Behaviour specced like the Slider. | P69, P107's Slider spec |
| the groovebox | 4 tracks (drums, bass, synth, FX), 16 steps each, a song as a chain of patterns ("A ×8, then B ×4"), knobs per track, songs saved to the NodeGX backend. | the published kit, one install (OWN-011), the two kits |
| the circuit board | The groovebox's own editor: the graph drawn as a board, traces that pulse on each beat, wires that move, a parts bin. Optional NodeGX look. Saves the project files the official editor opens. | P112's kit (OWN-001 format, OWN-003 runner, OWN-005 look) |

## 5. Depends on

| from | what | state |
|---|---|---|
| P69 | kits: the folder, the manifest, the loader, the picker, the MCP overlay | ✅ closed 20/20 |
| P107 | the spec format, the Slider spec as a model for Knob and Fader | 🟡 in progress |
| P112 OWN-001 | the project format outside the editor | 📋 |
| P112 OWN-003 | one way to run a graph in a page (the circuit board's live values) | 🟡 step 1 measured |
| P112 OWN-011 | one install command from npm | 📋 |

## 6. Tasks

| task | what | kind | depends on |
|---|---|---|---|
| [GRV-000](GRV-000-THE-PROTOTYPE-MEASURED.md) | **The prototype, measured.** Every part GX-16 invented by hand (its graph, its runner, its knob, its wiring rules) as a row naming the task that replaces it. | tooling | — |
| [GRV-001](GRV-001-A-KIT-SHIPS-ITS-SPECS.md) | **A kit ships its specs.** `@nodegx/node-spec` accepts specs from outside; a kit's manifest points at them; the scaffold writes a starter spec; library kits must have one; personal kits are counted without one. | spec + kits | R1 |
| [GRV-002](GRV-002-A-PROJECT-NAMES-ITS-KITS.md) | **A project names its kits.** Kits are npm packages; a project lists the ones it needs; opening, previewing or validating without one names the missing kit instead of showing unknown nodes. | format + kits | R2 |
| [GRV-003](GRV-003-THE-AUDIO-KIT.md) | **The audio kit.** `@nodegx/kit-audio` on Tone.js: eight nodes, each specced, the audio port type, one audio context per page. | kit | GRV-001, R3 |
| [GRV-004](GRV-004-THE-BEAT-LANDS-ON-THE-GRID.md) | **The beat lands on the grid.** Render a pattern offline through the real runtime and measure every onset against the grid. | measurement | GRV-003 |
| [GRV-005](GRV-005-THE-CONTROLS-KIT.md) | **The controls kit.** `@nodegx/kit-controls`: Knob, Pad, Pad Grid, Fader, LED, specced like the Slider. | kit | GRV-001 |
| [GRV-006](GRV-006-THE-GROOVEBOX.md) | **The groovebox.** The app, built by an agent from the one install and the two kits, never opening the editor. | template | OWN-011, GRV-002…005 |
| [GRV-007](GRV-007-THE-CIRCUIT-BOARD.md) | **The circuit board.** The groovebox's own editor, built with P112's kit; the official editor opens what it saves. | home-made editor | OWN-001, OWN-003, GRV-006 |
| [GRV-008](GRV-008-THE-PLAY-TEST.md) | **The play-test.** Richard, and anyone he invites, make a track and change the box. | proof | GRV-007 |

**Order:** GRV-000 → GRV-001 and GRV-002 in parallel (neither waits for P112) → GRV-003 and GRV-005 → GRV-004 →
GRV-006 (after OWN-011) → GRV-007 → GRV-008.

## 7. Acceptance criteria for the phase

1. An agent with only the published packages builds the groovebox, and nobody opens the NodeGX editor to do it.
2. Every node in both kits has a spec that passes its conformance run.
3. GRV-004's measurement puts every onset within one sample of its grid position through the real runtime, or names
   each one that is not and why.
4. Opening the groovebox without the audio kit installed names `@nodegx/kit-audio` as missing.
5. A wire moved on the circuit board changes the sound on the next beat, and the official editor opens the saved project
   with zero new validator diagnostics.
6. Richard's verdict from GRV-008 is quoted in this file's status line.

## 8. Rulings

### Made, 2026-10-06

| # | question | ruling |
|---|---|---|
| R1 | Must a kit's nodes have specs? | **A kit in the library that ships with the editor must have a spec for every node. A personal kit may skip it, and each unspecced node is counted in the project's honesty number.** The scaffold writes a starter spec by default. |
| R2 | How does a project get its kits? | **Kits are npm packages, and a project lists the ones it needs as dependencies.** |
| R3 | What makes the sound? | **The audio kit wraps Tone.js.** |

### Made, 2026-10-06 (second round)

| # | question | ruling |
|---|---|---|
| R4 | Should the groovebox replace the todo app as the outside agents' test project (P112 OWN-008)? | **No. The strangers keep the todo app; the groovebox is the showcase and a candidate for Richard's own editor (OWN-009).** |
| R5 | What is the app called? | **GX-16.** |
| R6 | Should a finished song export as a WAV file? | **Yes, as GRV-006's last step.** |

## 9. Not this phase

- **DJ decks** that mix existing songs. That needs music files and a different instrument.
- **MIDI hardware** (a real keyboard or pad controller). Web MIDI works in Chrome; it is a later kit.
- **Recording a microphone**, a sample library, or a piano roll.
- **A full music workstation**: automation lanes, plug-ins, multitrack audio editing.

## 10. Risks

- **The runtime delays signals.** If NodeGX delivers a signal on its next update rather than at once, the `Play At` time
  still holds as long as the delay is under the lookahead. GRV-004 measures it; the lookahead can grow if it must.
- **An audio port type is new.** Memory: a new port type owes the MCP vocabulary and the picker their entries.
  GRV-003 lists every reader of the port type before adding one.
- **Two audio contexts on one page.** `game-kit` makes its own. GRV-003 decides whether the kits share one.
- **The prototype looks finished.** It is a stand-in graph in a page, not a NodeGX project. GRV-000 names every part it
  faked, so nobody mistakes it for the real thing.
