---
id: P18-S129-RUNONCHANGEMARK
title: A text field's stated Run On Value Change box is marked on the exported element as a parameter that "did not survive", though the export honours it
status: open
severity: low
area: export / the parameter marker (`runOnChange-startValue` has no style or content mapping)
found: P18 session 129, 2026-10-19, reading the emitted diff of the Field Desk and rocket-school's Lists Editor
evidence: the emitted `src/components/Editor.tsx` (rocket-school), and the Field Desk's `Home.tsx`: "the authored "runOnChange-startValue" parameter has no style or content mapping in this slice"
---

Every exported text field whose Run On Value Change box is stated in the file carries a marker saying the parameter did
not survive. It did: ticked, the export prints the sync effect that applies the Value as it arrives; unticked, it prints
none, and since P18-S128-FIELDSET the field's Set applies the Value instead. The marker tells a reader the export dropped
something it carried, on every such field (rocket-school's and star-class's Lists Editor, Moon Adopt and New player form,
the marketplace's search box, every Field Desk field).

Fix, small: the parameter is consumed by the sync-effect pass for a text input (and the other `runOnValueChange`
families' boxes the export reads), so it is not reported as unmapped. Moves the markers of every template field that
states it, and the parameter-coverage ledger's row for the port.
