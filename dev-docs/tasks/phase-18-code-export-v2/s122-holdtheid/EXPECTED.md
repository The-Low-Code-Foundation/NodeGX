# What each arm should read: written before either ran (session 122, 2026-10-17)

`fixtures/held-desk`, Texts in tree order: Headline, Loaded, *loaded*, Saying, *saying*, Removed, *removed*. Only the
three values are listed. Steps: load, Remove, Pick b, Remove, Pick nothing, Remove.

## The runtime (the runtime's own Function, Variable, Set Variable)

The Variable's `a` arrives at creation and runs Hold the id (ticked); Did Mount runs it again. Each run sends ready,
which writes the held id to `loaded`. The second Function reads Hold the id's last delivered `id` at its own Run.
"Pick nothing" runs Hold the id, which returns before writing, so its output keeps `b`.

| step | loaded | saying | removed |
|---|---|---|---|
| load | a | | |
| Remove | a | removing a | a |
| Pick b | b | removing a | a |
| Remove | b | removing b | b |
| Pick nothing | b | removing b | b |
| Remove | b | removing b | b |

Variants, where they differ from the table:

- **Hold the id's box unticked**: Did Mount alone runs it, so Pick b changes nothing. `loaded` stays `a`; every Remove
  reads `a`.
- **No Did Mount**: the same table (the arrival at creation runs it).
- **No seed**: nothing arrives at load; Did Mount runs it over `undefined`, it returns. load: all empty. Remove:
  `removing nothing`, removed empty. Pick b: loaded `b`. Remove: `removing b`, `b`. Then as the table.
- **No ready** (Hold the id sends nothing, so its run is not pulsed): `loaded` is empty throughout; `saying` and
  `removed` as the table. The last Remove reads `b` (the node kept it). **The export's non-pulsed row is a fresh
  record each run** (`setRow(fn(args))`, P18-S121-FRESHOUTPUTS), so I predict the fixed export reads
  `removing nothing` at the last step, and removed stays `b`. If so, that is a divergence this session must fix.
- **The second Function's box ticked**: each new id Hold the id delivers runs it. load: `removing a`, `a`. Remove: the
  same. Pick b: `removing b`, `b`. Pick nothing: unchanged (Hold the id wrote nothing, so nothing is delivered).

## The fixed export

The same as the runtime in every variant, except where the "No ready" prediction above says otherwise.

## HEAD's export (the control)

Hold the id is refused ("consumed outside the Run chain by an unrendered sink"), so nothing runs at load and `loaded`
stays empty; the second Function is refused ("JS-node chains are not translated"), so Remove does nothing. Every
value empty in every step.
