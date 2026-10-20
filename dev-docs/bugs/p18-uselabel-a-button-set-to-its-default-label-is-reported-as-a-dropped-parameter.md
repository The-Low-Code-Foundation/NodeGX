---
id: P18-USELABEL
title: A Button whose Enable Label is set to its default (true) is reported as a refusal in the React export
status: open
severity: low
area: export / Button (`packages/nodegx-export`: `useLabel` has no style/content mapping for the button role; `structurePorts.ts` lists it only for checkbox, radio and select)
found: docs session (export doc), 2026-10-17, exporting `scripts/export-doc/sample` with `useLabel: true` on two buttons
evidence: `emitApp` notes "Pages/Home: parameter useLabel on addButton has no style/content mapping — dropped, reported"; the catalog default for `net.noodl.controls.button` `useLabel` is `true`
---

A Button with Enable Label set to true, which is its default and changes nothing, exports with a line in
EXPORT-REPORT.md saying the parameter was dropped, and the preflight counts it under "What will not translate". The
P123 Bubble importer writes `useLabel: true` on every button it converts, so an imported app gets one such refusal per
button: report noise that hides the real refusals.

The other half is a real gap: `useLabel: false` (an icon-only button) is also dropped, and the exported button
shows its label anyway.

Fix: in the button's plan, treat `useLabel` equal to the default as nothing to say, and honour `false` by not rendering
the label text (as `structurePorts.ts` already does for checkbox and radio). Size: small.
