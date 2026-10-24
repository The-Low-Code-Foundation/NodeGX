# PLY-009 — A model says what you can change (the 3D Studio)

**Phase:** [126](README.md). **Depends on:** PLY-003 (extraction is when parts get named and settings declared);
PLY-008 for the version inside Claude Desktop.

> "That's fucking cool and it kind of fits into the nodegx 'your own editor' concept, such that even 3D games built using
> nodegx always expose settings in 3D models on purpose, that are then read by the NodeGX 3D Studio and exposed to the
> user while viewing the models to allow them appropriate changes they can do visually. This would be an amazing idea"
> — Richard, 2026-10-24

## The principle

A NodeGX node declares its ports, and the editor builds its property panel from them. **A NodeGX model does the same:
it declares its parts and its settings on purpose, and the 3D Studio builds its controls from that declaration.** The
person changes what the model's author chose to make changeable. It's never CAD: nobody drags vertices. The code stays
the truth, and a person's change is a setting value in the project files, which the agent reads like any other change
(`what_changed_since`).

This is the first pillar (an editor for this app is a view over its files) applied to 3D, and it is the strongest
NodeGX claim in the phase. It is a property of how the models are built, not of how fast the LLM builds them.

## Measured on day one (2026-10-24)

Our generators don't meet this yet. `frigate()` in Threadspace's `ships.mjs` takes two settings (`paint`, `engine`); its
shape is constants inside the function (`HULL` sections). `ships.mjs` and `people.mjs` set no part names at all
(`.name =` count: 0 and 0). So PLY-003's extraction does both jobs: name every part, and lift the shape constants that
matter into settings with ranges.

## The declaration (a first shape, to be tested by the sketch)

```js
export const model = {
  name: 'Frigate',
  parts: ['hull', 'bridge', 'wing', 'engine', 'turret'],
  settings: {
    paint:       { type: 'color',  default: '#9aa3ad', parts: ['hull', 'bridge'] },
    engineGlow:  { type: 'color',  default: '#58b0ff', parts: ['engine'] },
    length:      { type: 'number', default: 96, min: 60, max: 140, unit: 'm', parts: ['hull'] },
    wingSpan:    { type: 'number', default: 18, min: 0,  max: 40,  unit: 'm', parts: ['wing'],
                   handle: { part: 'wing', at: 'tip', axis: 'x' } },
    engines:     { type: 'int',    default: 2,  min: 1,  max: 4,   parts: ['engine'] },
  },
};
export function build(values) { /* returns a THREE.Group whose parts are named as declared */ }
```

- A **handle** is a setting made physical: dragging the wing tip writes `wingSpan`, clamped to its range.
- A **file model** (glTF) gets a declaration generated from its named nodes and materials: recolour, hide, swap a part,
  scale the whole. Nothing more.
- The agent reads the same declaration (an MCP read), so "make the wings longer" and the slider change the same value.

## The 3D Studio

- **The stage:** one model alone, the render card's light, a turntable the person drags (no automatic motion, CANON §5),
  a floor grid, a blocky person beside it for scale.
- **Point:** clicking a part selects it, outlines it, and tells the agent through the panel ("the person is pointing at
  Frigate › wing"). The part's panel lists the settings that shape it and leads to the whole model, which is the
  three-in-nodes s5 rule: what a person points at is what they think they picked.
- **Nudge:** swatches, sliders and steppers built from the declaration; handles on the stage. Every change re-runs
  `build()` live, without reloading the page.
- **Lineup:** the agent proposes up to three variants side by side (values, or a new generator). The person picks one or
  says what to change. Nothing goes into the game until they pick (show before apply).
- **The same view for the LLM:** the stage renders the card's fixed angles to images the agent reads.

## Gates (no declaration that lies)

- A shelf generator with no `model` declaration is refused.
- **Every declared setting must visibly change the render:** a card at `min` and at `max` differ by pixels on the
  declared parts. A setting that changes nothing is refused (an inert setting teaches the person a lie).
- Every declared part is pickable: a centre click on it in the card view returns that part's name.
- A handle drag of N pixels changes its setting in the declared direction, clamped to the range.

## Step 0: a playable sketch for Richard

One Artifact page: Threadspace's frigate extracted with named parts and the five settings above, the stage, point,
nudge, one handle and a lineup of three. Richard judges in one click whether pointing and nudging feels right or
whether looking alone is enough. His words go here verbatim; the declaration's shape is fixed only after that.

## Acceptance

- **AC1.** The sketch, published, and Richard's verdict written here.
- **AC2.** PLY-003's five shelf entries carry declarations that pass the gates above.
- **AC3.** In a NodeGX game (PLY-005), a model instance's setting values live in the project files; a change made on
  the 3D Studio's stage shows in the game on the next play, and `what_changed_since` reports it to the agent.
- **AC4.** Inside Claude Desktop (after PLY-008's probe): the person points at a part and says one sentence, and the
  agent changes exactly that part.
