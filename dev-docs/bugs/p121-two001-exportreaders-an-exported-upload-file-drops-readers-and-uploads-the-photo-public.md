---
id: P121-TWO001-EXPORTREADERS
title: An exported Upload File drops Readers, so a photo meant for a community's members is uploaded public, and nothing says so
status: open
severity: high
area: export / Upload File (`packages/nodegx-export/src/analyze/plan.ts` `compileFileUpload`; `src/emit/emitApp.ts` `uploadFile` in `src/api/files.ts`)
found: P121 TWO-005 s12, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-005-THE-COMMUNITY-APP.md §7
---

P121 s12 gave Upload File a **Readers** input (`readers`, P121-TWO001-MEMBERSPHOTO): roles that may read the file as
well as whoever uploaded it, such as `role:member`. It is sent as the `X-NodeGX-File-Readers` header, and setting it
makes the file private. The community template uploads every photo with it: nothing a member posts may be public
(its world's rule W1, for children).

The code export does not know the input. `compileFileUpload` reads `file` and `private` and refuses by name a named
Backend and the File Location inputs; it never looks at `readers`. An exported app sends no header, so the photo is
stored **public**: anyone holding its URL reads it, with no account. In the editor the same graph stores it private.

Measured 2026-10-15: `tests/fixtures/photo-desk` exported as it is and with `readers: 'role:member'` set on its one
Upload File (`parseProject` → `emitApp`, a scratch spec, deleted): 20 files both times, identical byte for byte, and
neither `readers` nor `role:member` anywhere in the second.

Why it is high and not medium like its sibling (P121-TWO003-EXPORTSHRINK, the dropped Shrink To): a dropped Shrink To
costs bytes; a dropped Readers publishes what the author marked members-only.

Fix, proposed: the export's `uploadFile(file, { private })` grows `readers` and sends the header when it is set
(authored or wired); until then, defer by name when `readers` is set or wired, the way the File Location inputs are.
The ledger row for Upload File (`coverage-ledger.json`) names its refusals and would gain this one. Small either way.
Owner: P18 (code export).
