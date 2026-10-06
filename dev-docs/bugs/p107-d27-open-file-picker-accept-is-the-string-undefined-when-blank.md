---
id: P107-D27
title: Open File Picker — with Accepted file types never set, the dialog's accept attribute is the string "undefined"
status: fixed
commit: a664d36b4
phase: P109
task: ISL-030
severity: low
area: viewer / Open File Picker (`openfilepicker.ts` :141 — `input.accept = this._internal.acceptedFileTypes`, unguarded)
found: P107 (the node says what it does) s31, 2026-10-03
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Open File Picker.json "D27: Accepted file types never set — the element has no accept: no filter (v2)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.31–§6.32 (row D27); scenario "D27: Accepted file types never set — the element's accept is the string \"undefined\"" (packages/nodegx-node-spec/scenarios/Open File Picker.json); every Open with the port unset records `accept: "undefined"` on the runtime target
---

On Open the node copies Accepted file types onto the file input without a guard (:141). When the port was never set,
the held value is `undefined`, and `accept` is a reflected string attribute, so the element gets `accept="undefined"`
(WebIDL converts `undefined` to the string `"undefined"`). A wired `null` gives `accept="null"`.

`undefined` is not a valid accept token (not a MIME type, not `.ext`, not `image/*`). The browsers this was written for
ignore tokens they do not recognise, so the dialog still offers every file. That was **not measured on a browser here**:
the world records the attribute, and the dialog's own filtering is the browser's. Hence D (latent), not C. The port's
own description promises "leave blank to offer every file", and the app depends on browsers being lenient for that.

Graded s31 by one scenario (and every generated sequence that opens with the port unset), seeds 20729 and 13 and at
10,000.

**Plain words:** *"When 'Accepted file types' is left blank, the picker tells the browser to accept files of type
'undefined'. Browsers seem to ignore that and show every file, but it's by luck. Tidy it so blank means no filter?"*

**Proposed:** `input.accept = acceptedFileTypes ?? ''` (or remove the attribute when blank). A spec v2. Small, and it
rides with C53's fix to the same three lines.

**Ruling:** R3 (a) — the runtime wins until Richard rules.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Blank means no filter".** A blank setting sends no filter to the browser. A one-line change, shipped with the Capture fix. Nothing visible changes in browsers that already ignore the bad value. The question as asked: *"Should a blank Accepted file types mean no filter at all?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed a664d36b4 (P109 ISL-030, 2026-10-06), as ruled, with C53.** A blank Accepted file types (unset, null or '') removes the accept attribute, so the dialog has no filter. Open File Picker v2.
