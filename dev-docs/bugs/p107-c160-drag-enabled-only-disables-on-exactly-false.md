---
id: P107-C160
title: Drag — Enabled disables dragging only on exactly `false`: a wired `0` or the text "false" leaves the element draggable, while the description reads as "off"
status: needs-ruling
severity: low
area: runtime / Drag (noodl-viewer-react/src/components/visual/Drag/Drag.tsx :262; the node's `inputProps.enabled`, noodl-viewer-react/src/nodes/visual/drag.ts :162-168)
found: P107 NSP-018 s77, 2026-10-10 — writing the node's rules in words
kit: node-spec
evidence: read on the runtime 2026-10-10 — Drag.tsx :262 `disabled={props.enabled === false}`; drag.ts :162-168 declares `enabled` as an `inputProps` boolean with no `set`, so the generated setter (react-component-node.ts `defineRegularInputProp`, the final `else` branch: `props[name] = value`) writes the wire's value as it came; nothing coerces it. The spec records it (packages/nodegx-node-spec/src/nodes/drag.ts :215 `enabled: { type: 'boolean', coerce: 'none', … examples: [true, false, 0, 'false'] }`; :506 `… || s.shown.enabled === false) return …` — only the exact `false` refuses the press)
---

Drag's Enabled port is a boolean, default true, described as "Lets the user drag this element; when off it still renders and
still responds to the Snap actions" (drag.ts :165). The viewer hands the component whatever arrived (the generated
`inputProps` setter writes the raw value; the port declares no coercion) and the component disables the library only on
the exact value `false` (Drag.tsx :262 `disabled={props.enabled === false}`). So `0`, the text `"false"`, an empty string,
`null` from an Expression that has not answered — every falsy value other than `false` — leaves dragging **on**. An author
who wires Enabled from a number port (a 0/1 flag, a count) or from a text switch gets an element that drags when they meant
it not to.

**Why no test saw it:** the spec says exactly what the runtime does — `s.shown.enabled === false` (drag.ts :506) — and its
examples `[true, false, 0, 'false']` (:215) are played on both targets, where both leave the element draggable for `0` and
`'false'`; conformance agrees by construction. Row C138 (a Start Drag X arriving as text) was the same port family's
"no coercion" defect, and it was ruled and fixed; this port was not in its reach.

**Why it matters now:** NSP-018's rule for Enabled has to say "exactly false turns it off; 0 and 'false' do not", which an
agent reading the description ("when off…") would not guess. Most of the node library reads a boolean port through
`coerce` (the spec's other boolean ports on visual nodes) or `!!value` (the WebSocket's Auto Connect setter, websocket.ts
:232), so Drag is the odd one.

**Ruling needed (R1):** (a) coerce — Drag.tsx reads `disabled={!props.enabled}` (or the port gains a `set` that writes
`!!value`), the spec's :506 becomes `!s.shown.enabled`, `version` up with a `changes` entry naming this row, and the
examples `0` / `'false'` now disable — the smaller change and the one the description already promises; or (b) keep the
behaviour and say it: the port description (drag.ts :165 and the spec's :215) reads "…off only on exactly false; 0 or the
text 'false' leave it on". The lane's words for s77 name the precondition until ruled. Regression when fixed (a):
`packages/nodegx-node-spec/scenarios/Drag.json` "Enabled wired 0 or the text 'false' disables dragging like false (row C160)".
