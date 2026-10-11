# Tchac-Boum — the prototype, on the real app

A chain-reaction machine on a wall, which is a NodeGX graph seen from the front. Built 2026-10-11 (s1, Fable) in one
morning on P112's kit; the page is [`tchac-boum.html`](tchac-boum.html), the project is [`tchac/`](tchac/) (v2 files,
one component, 18 nodes, 15 wires), and [`check.mjs`](check.mjs) is the gate.

**It is evidence, not a product.** [The phase README](../README.md) §1 says what was measured first and §4 what it proves.

## What it does

- **Le mur.** Sixteen parts in costume (a red button, a turnstile with a drum, a ramp a marble rolls down, a balloon, two
  sleeping cats, chalkboards, signs, screens), strings between them, marbles rolling along the strings when the running
  app's trace reports a signal on that wire, a glow when it reports a value. Press the button's costume and the real
  button in the app is pressed.
- **Le circuit.** One press turns every part over in place: the editor's card (type, wired ports, live values, the
  canvas colours from `@nodegx/canvas-look`), the wires in the editor's signal / data colours. Same elements, same files.
- **L'étagère.** Eight parts with a costume and one French sentence; the runtime's whole library (118 types) behind a
  search. A part lands at the centre of the view, written into the files; a Switch comes as an *ampoule* with
  `metadata.tchac.skin` set, and the part panel lets a kid make it a *ballon* or a *chat* — written too.
- **Editing.** Drag a part (position written, app not rebuilt); drag a string from a part's yellow arrow to another part
  → the connect popup, nicknamed ports first (*clic !*, *une bille entre*, *lâcher la bille*, *si vrai →*), *Toutes les
  prises* one press away; the part panel (name, costume, dials from the spec's unwired value inputs, live outputs, each
  string with ✂, *Retirer la pièce*). Every change is `V2ProjectStore.writeComponent` with `ifRevision`, then the app is
  rebuilt from the files by `@noodl/preview` in the page.
- **Missions.** *Le ballon n'éclate qu'à la 3e bille* (an Expression `n >= 3`), *Pair à gauche, impair à droite*
  (`n % 2 === 0` with its two signal outputs), *La machine tourne toute seule* (a Repeat). Each **Vérifier** plays the
  graph as it stands on a COPY of the files in a second real app (shown small while it plays) and reads the screen by the
  part each node draws; each **Montre-moi** builds the answer step by step through the store, then verifies. A fourth
  mission, *La machine se souvient*, is shown locked (TBM-001 / TBM-002).

```sh
./build.sh                          # bundles look.js (@nodegx/canvas-look) and specs.js (@nodegx/node-spec), both gitignored
node serve.mjs 47911                # then open http://127.0.0.1:47911/tchac-boum.html
                                    #   ?face=mur|circuit   ?demo (presses the button, plays the three missions, flips)   ?set=node.param=value
node check.mjs [--shot <dir>]       # the gate (below); exits 0 PASS, 1 FAIL, 2 when the runtime, the bundle or Chrome is missing
```

Needs the deploy runtime (`npm run build:editor:_viewer`) and the preview's page bundle (`npm --prefix packages/noodl-preview
run build`); `serve.mjs` says which is missing.

## The gate (`check.mjs`), headless Chrome 1440×900 over CDP, real input

| block | what it asserts |
|---|---|
| the wall on the real app | `ready nodes=18 wires=15 parts=16`; the app shows 🎈 and *0 bille*; a mouse press on the button's costume pops the balloon in the real app; every wire of the chain (button → turnstile → ramp → balloon → sign → screen, and the counter's two) is seen in the trace |
| editing with real input | the shelf adds a Switch to the files and selects it, with `metadata.tchac.skin = ampoule`; a string dragged from the button's handle onto it opens the connect popup with *clic !* pre-picked; picking *basculer* writes the wire; a press then shows the wire carrying a signal in the trace; a dial (*allumé au départ*) ticked in the panel is written; the string is cut from the panel; the part is dragged and its position written without a rebuild; *Retirer la pièce* removes it and its wires |
| the flip | *Le circuit* turns the wall; the same part elements, none re-made; the turnstile's back says *Counter* |
| the missions | each Vérifier fails on the starting graph for its own reason (the checks have teeth); each Montre-moi, pressed with the mouse, builds through the store and its Vérifier passes (7.6 s, 9.1 s, 10.4 s); all three still pass together; the finished machine is 21 nodes, 24 wires; no console errors |

Runs on 2026-10-11: run 1 FAIL 5 (the popup pre-picked nothing: the Button's spec has many signal outputs → the "few
connectors" rule was built; the gate pressed while the app was still rebuilding → the page exposes `pending`, the gate
waits), run 2 FAIL 3 (same race on the move; a trace read once; an assertion the trace cannot answer, §Limits), then
**PASS, PASS, PASS** (29 checks each).

## Limits, measured

- **An output nobody is wired to has no live value.** The in-page preview's trace is wire events; a Switch from the
  shelf stays dark until something is wired to *allumé ?*. Filed as P117-S1-UNWIREDOUT (kit: preview); TBM-005.
- **The wall draws only this component**, and hides Groups: the screen's boxes are the board, not parts. The structure
  (parent / children) is not editable here; Orbit does that.
- **Positions are the files' editor pixels, 1:1.** The official editor opens the project with the parts where the wall
  left them; a part added by the wall lands at the view's centre, which is a sensible canvas position too.
- **No sound, no 3D.** By design (Surface Pro, 2017).
