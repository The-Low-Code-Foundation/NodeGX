---
id: P107-S88-OPTIONSCAST
title: A list cannot be wired into a Dropdown's Items since Items became an `optionslist` — the canvas refuses the wire and the Problems panel and the agent server warn "Type mismatch" on the 30 that exist
status: fixed
commit: 813657773, fecab7823
task: NSP-021
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json "Items wired a list of plain words: each is offered, labelled and valued by itself, and choosing Large moves Value to Large with Changed"; packages/noodl-editor/tests-unit/nsp-021/typecasts.test.ts
severity: medium
area: runtime / node library typecasts (`noodl-runtime/src/nodelibraryexport.ts` :222-298, copied into `noodl-types/src/node-catalog.json` `typecasts`); read by the editor canvas (`nodelibrary.ts` `canCastPortTypes` :382-397, via `NodeGraphModel.getConnectionStatus` :691) and the validator (`validation/CatalogIndex.ts` `isTypeCompatible` :350, rule `typeIncompatibleConnection`)
found: P107 NSP-021 s88 (the typecasts census over Richard's 201 local projects), 2026-10-11
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-021-THE-SECOND-EDITOR.md §6.2
---

`0ce92adc7` (P82, 2026-09-05) moved the Dropdown's **Items** (`net.noodl.controls.options` `items`) from `array` to the
new `optionslist` type so that typing a label is enough to make an option. The type table that says which port types may
connect was not told: `array` still reaches only `collection` and `string`, and nothing reaches `optionslist`. So since
that day:

- **on the canvas**, dragging a Static Data's `Items` (or any `array` output) onto a Dropdown's Items is refused with
  "Type mismatch a source port of type array cannot be connected to a target port with type optionslist" — before it,
  `array → array` connected;
- **in the Problems panel and at every agent write**, the 30 such wires that exist (the site builder's `/Pages/PageEditor`
  in 19 projects, `/Form Fields/Labelled Select` in 11) carry a `type-incompatible-connection` warning.

The runtime takes the list as it is (`options.ts` `optionItems` :349-354): a list of `{ Label, Value }` — what all 30 of
those wires carry — draws its options. P87's handoff (`NEXT-SESSION-PROMPT.md` :146) had already met it as a tip for
agents ("A Static Data array raises `type-incompatible-connection`; a Function's output does not"), and RKT-008 routed
around it; it was never filed.

**Measured (s88):** over 42,466 wires in 201 projects, 31,026 have both ends typed (the spec's drawn ports, else the
catalog, else the node's saved ports). The canvas rule and the validator rule refuse the same 34; 30 are this one. The
other 4 are component ports saved with a type name that is not a type (`image URL`, `text`) or a `string` component
input into a `font` port (nightbook).

**Reproduce:** in the editor, add a Static Data and a Dropdown and drag Static Data `Items` onto the Dropdown — the
connection popup shows Items as refused. (Not yet driven in the running editor: a peer held the debug port in s88; the
reading is the code path above plus the validator's warning, which the agent server reports on a write.)

**Proposed fix (needs-ruling with the question of bare labels, below):** add `optionslist` to what `array` reaches, in
the one table. Open beside it: a wired list of bare labels (`["Small", "Large"]`) reaches the runtime unchanged and
draws empty options — the defect `optionslist` was made to end, reopened by the wire. `readItems` already mints
`{ Label, Value }` from a bare label for stored text; applying it to a wired list too would close it.

Rocket School's on-screen keyboard (`noodl-mcp/tests/tpl007Components.ts` :1729-1732) feeds its Dropdown through a
Function only to step around this; it can go back to a Static Data once the fix lands (the template's owner's call).

**Ruled 2026-10-11 (R21, s88), as recommended: "Allow it, and fix bare labels".** The question as asked: *"Since
5 September, a person can't drag a list (a Static Data's Items, say) onto a Dropdown's Items… Should a list be allowed into
a Dropdown's Items again?"* — a list may be wired in (one row in the table), and a wired list of plain words becomes real
options at run time, as typed text already does.

**Fixed (s88), both halves.** First (`813657773`): the table moved to `@nodegx/project-contract/typecasts` (the runtime imports it) and `array` now
reaches `optionslist`, so the canvas, the Ports tab, the Problems panel and the agent server all let the wire through.
Then (`fecab7823`, Dropdown v8): runtime `options.ts` `optionItems` makes a word in a wired list an option labelled and valued by
it — a list of `{ Label, Value }` rows still keeps its identity, its Value and its Disabled — with the spec, two
scenarios and stranger round 4 to match (runtime planted red on exactly those two). The export draws a stored Items only
and skips a bare item (P18's, not graded for Dropdown). Not yet driven in the running editor (NSP-021 §6.2).
