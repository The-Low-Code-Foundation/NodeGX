---
id: P128-S2-OPTSETSHAPE
title: "An option set has no agreed row shape: Studio writes and shows only the attributes in `metadata.optionSet` (default `display`), a Dropdown reads `Label` and `Value` off each row, and the agent's write has no way to set the metadata, so an agent's option set shows blank columns in Studio and Studio's own blank labels in a Dropdown"
status: open
severity: medium
area: "nodegx-studio `editor/studio.html` (`optionSet` 1490–1497, the Option sets grid 5457–5476, `newoptset` 5428–5441); `noodl-viewer-react` `src/nodes/controls/options.ts` `optionItems` 372 and `components/controls/Select/Select.tsx` 148–210 (`Label`/`Value`); noodl-mcp `create_component` / `update_component` (no component `metadata` argument; `set_component_info` takes description, displayName, category, tags)"
found: P128 S2 (OWN-027), 2026-10-27, writing `get_example('option-set')`
evidence: "READ, not driven in Studio. Studio: `optionSet()` returns `attributes: c.component.metadata?.optionSet?.attributes || [{ name: 'display', type: 'text' }]` and the grid draws one column per attribute and `o[a.name]` per cell; New option writes `{ [attrs[0].name]: text }`, so a Studio-made set's rows are `{display: …}`. Runtime: `optionItems` passes object rows through untouched and `Select` draws `items[i].Label`, its value `Value`. MEASURED for the runtime half: the example's rows `{Label, Value}` render and drive (`dev-docs/tasks/phase-128-the-canon-everywhere/s2/ac.mjs`: the options read `English|Français`, a pick stores `fr`). So: Studio's `{display}` rows wired into a Dropdown would draw empty options (not driven), and the example's `{Label, Value}` rows would show in Studio's grid as one `display` column of blanks (not driven)."
owner: none
task: P128 S4 (Studio's option-set controls) or STU-084's vocabulary export (S6)
regression: none yet
---

The example (`docs/node-catalog/examples/option-set.json`) uses `Label`/`Value`, because that is what the runtime's
Dropdown reads and the AC is that it renders and works. Studio's option sets use `display`, and only Studio can write
the `metadata.optionSet.attributes` that names the columns.

Two ways to close it, neither taken in S2 (it does not block S2's ACs): Studio reads the columns from the rows when the
metadata is absent (the keys of the first row, typed by value) and its Dropdown binding maps `display` to `Label`; or
the server stamps `metadata.optionSet.attributes` from the Static Data's keys on a write under `Option sets/`. Decide
the row shape once (Richard: Studio's word stays "Option sets", ruled 2026-10-27) and have the example follow it.
