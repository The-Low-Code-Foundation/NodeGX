---
id: P107-S85-RESTCOLTYPES
title: The Record family's spec types a column by the Parse table only — a REST `json` column the runtime draws as Object, and a select column it draws as an Enum, the spec draws as `*`
status: fixed
severity: low
area: packages/nodegx-node-spec/src/nodes/record-base.ts `recordFieldType` (the Parse table, record-ports.ts :63-68); the format's `BackendField` (spec.ts — a `type` and a `relation`, no native-or-not flag, no enum values); the runtime's rule is record-ports.ts :208-218 `recordPortType` → schema-ports.ts :119-195 `getEnhancedFieldType`
found: P107 NSP-020 s85 (L5, `portContextFor` graded on saved projects), 2026-10-11 — the drive's synthetic two-backend project, a Directus collection with a `json` column and a select column
evidence: packages/noodl-runtime/test/node-spec/nsp-020-port-context.test.ts (`twoBackends`, `DRIVE_PINS`); packages/nodegx-project-contract/port-context.ts `enhancedType`
regression: packages/noodl-runtime/test/node-spec/nsp-020-port-context.test.ts
kit: node-spec
phase: P107 (NSP-020)
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

**s101 — the same root, two more lines.** Since oracle (a) grades a derived port's enums and labels (R37: the editor draws a
cloud node's settings from the spec), the drive's REST collection shows the rest of it: the runtime's Class picker on that
backend offers its own classes only (`["posts"]`, record-ports.ts :78-81 — "`_User` on a Directus backend would be a class that
does not exist"), where the spec prepends `_User` and `_Role`; and the select column's port carries its choices as enums
(`["draft","live"]`), where the spec has none. Pinned beside the four above. One fix serves all: the format says which kind
of backend a class lives on (and a column's choices), and `classPicker` / `recordFieldType` read it.

**s102 (2026-10-13) — fixed, and the same root reached the User family.** Reach first: 4 of the 721 projects on Richard's
machine have a REST backend, 1 of them has Record-family nodes (VerifyFix4, 2 nodes), and none binds a cloud function to one.
Low, as filed. The format change is a copy of the runtime's two tests: `BackendSchema.backendType` (`isParseWireContext`,
record-ports.ts :147-149, absent = the Parse wire), and on a column `enhanced` (no Parse native type: `recordPortType`
:211-221 types it by `getEnhancedFieldType`) plus `enums` (its choices). `ValueOutputDecl.enums` draws an enum output's
values. `classPicker` offers `_User` / `_Role` only on the Parse wire; `recordFieldType` keeps an enhanced column's type;
`recordFieldPort` carries the choices. The one builder (`port-context.ts` `schemaFor`) hands over the backend's type and
still hands over a REST backend's schema when it has no classes.

The drive's Directus backend got a `directus_users` table and the User family's two write nodes. Before the fix the User node
drew none of its 8 ports there (the spec read `_User` on every backend), and Set User Properties drew none of its 4. The User
family now reads the accounts table by backend type (user-ports.ts :83-102) and the REST ignore lists (:163-215,
RestAuthAdapter.ts :243-261). All 8 pins came out. 8 planted mutants (picker, enhanced, enums, the accounts table, both
ignore lists, the builder's type and its flag) each turn the drive red. The drive also turned up Sign Up, filed as
P107-S102-SIGNUPBACKEND: the runtime's, not this.
