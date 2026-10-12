---
id: P107-S85-RESTCOLTYPES
title: The Record family's spec types a column by the Parse table only — a REST `json` column the runtime draws as Object, and a select column it draws as an Enum, the spec draws as `*`
status: open
severity: low
area: packages/nodegx-node-spec/src/nodes/record-base.ts `recordFieldType` (the Parse table, record-ports.ts :63-68); the format's `BackendField` (spec.ts — a `type` and a `relation`, no native-or-not flag, no enum values); the runtime's rule is record-ports.ts :208-218 `recordPortType` → schema-ports.ts :119-195 `getEnhancedFieldType`
found: P107 NSP-020 s85 (L5, `portContextFor` graded on saved projects), 2026-10-11 — the drive's synthetic two-backend project, a Directus collection with a `json` column and a select column
evidence: packages/noodl-runtime/test/node-spec/nsp-020-port-context.test.ts (`twoBackends`, `DRIVE_PINS`); packages/nodegx-project-contract/port-context.ts `enhancedType`
kit: node-spec
---

On a REST backend (Directus, Supabase, PocketBase) a column with no Parse native type is typed by
`getEnhancedFieldType`: a `json` or `array` column is an **Object** port, and a column with a list of choices (a
Directus select) is an **Enum** port with those choices. The Record, Create Record and Update Record specs draw both as
`*`, because `recordFieldType` keeps only the four Parse types (String, Number, Boolean, Date) and calls everything else
`*`, which is the Parse wire's rule (`PARSE_PORT_TYPES`, "anything not in the table has always produced `'*'`").

**Measured (s85):** `portContextFor` hands the spec `{ type: 'object' }` and `{ type: 'enum' }` for the two columns. The
real hooks (DbModel2, NewDbModelProperties) on the same project announce `prop-extra` typed `object` and `prop-status`
typed `enum`, and the spec draws both `*`. Four lines, in the legacy and converged readings; pinned by exact text in the
drive.

**Plain words:** *"On a Directus backend, a record's JSON field and its dropdown field show up as 'anything' ports in an
editor that draws from the spec, where the app's own editor shows an object port and a dropdown with the choices."*

**Why it is the format's, not the builder's:** the spec cannot tell a Parse column from a REST one (a Parse `Object`
column must stay `*`, as the runtime keeps it), and `BackendField` has nowhere to put the choices. The fix is a format
addition — a `native` flag (or the backend type) on `BackendField`, and `enums` — then `recordFieldType` follows
`recordPortType`'s two branches. Not a ruling; a format task for a later NSP-020 session.
