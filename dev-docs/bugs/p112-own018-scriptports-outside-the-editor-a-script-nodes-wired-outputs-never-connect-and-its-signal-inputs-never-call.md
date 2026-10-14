---
id: P112-OWN018-SCRIPTPORTS
title: "Outside the editor (the preview, a deployed app) a Script node's wired outputs never connect and its signal inputs never call their function — every Script throws \"Cannot read properties of undefined (reading 'type')\" at page load and validates clean"
status: fixed
severity: high
area: runtime / Script (`packages/noodl-viewer-react/src/nodes/std-library/javascript.ts` `registerOutputIfNeeded`, `userInputSetter`, `_onCodeParsed`); the ports a Script's code declares reach the model only through the editor's `sendDynamicPorts` round trip
found: P112 OWN-018 s3, 2026-10-13 (Sonnet's yardstick quiz on the tgz11 kit; reproduced in the packed preview)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §15
regression: packages/noodl-viewer-react/tests/own018-script-outputs-outside-the-editor.test.ts
---

Sonnet built its quiz engine as one `Javascript2` (Script) node: it validated with 0 errors and drove nothing. Its own
minimal test (one output wired to a Text) showed the placeholder, so it concluded *"Javascript2's custom-declared ports
(both signal inputs and value outputs) silently don't propagate in this runtime"* and rebuilt on a Function node —
which works (12/12).

**Reproduced** in the packed preview (`@nodegx/preview` 0.2.0, tgz11) with one page holding five Scripts, each output
wired to a Text, a button wired to each signal: the documented `define({ inputs: { go: 'signal' }, … })` form, the
legacy `Script.Outputs` / `Script.Signals` form, with and without declarations. None delivered a value, before or
after the press, and the page logged `Cannot read properties of undefined (reading 'type')` once per Script.

**Why.** A Script's ports come from its code. `setup` parses the code and announces them with `sendDynamicPorts`, and
only inside the editor (`isRunningLocally()`) does the editor send them back onto the node's model. The preview and a
deployed app have no editor, so `model.outputPorts` / `inputPorts` hold none of them. Then:
- `NodeScope` makes a wire by calling `registerOutputIfNeeded(port)`, which read `this.model.outputPorts[name].type`
  — undefined. The throw is caught and logged (`nodescope.ts`), and the wire is never made: no wired output arrives.
- `userInputSetter` calls a signal's function only when the model says the input is a signal, so a press is stored
  as a value and the function never runs.
- An output the code calls but nothing is wired to (`outputs.done()`) was never registered: `outputs.done` was not a
  function, and the call ended the run.

The Function node reads the same map guarded and pushes its signal outputs onto the model itself
(`simplejavascript.ts`), which is why Sonnet's rebuild worked. The Script spec (`scenarios/Javascript2.json`) never saw
this: it reads outputs from the node, it does not wire them.

**Fix.** After the code is parsed, the Script keeps the ports the code declares (`_internal.codePorts`, from
`parser.getPorts()`). Whether a port is a signal is the model's port where there is one (the editor's), else the
code's (`_isSignalPort`), decided at each use (a wire registers its output before the code is parsed). Signal
outputs the code declares are registered at parse time; value outputs still only by their wire (registering one
would publish it, which the spec's trace forbids and the editor never did).

**Regression:** three cases outside the editor (the define form, the legacy form, a signal output nothing is wired
to), each red on the unfixed file — the first two on the whole fix, the third on the signal registration alone.
The Script spec's 27 rules and control stay green. Not yet seen in a browser: the preview's page runtime is the
viewer's deploy bundle, rebuilt when the kit is next packed.
