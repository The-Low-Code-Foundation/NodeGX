# HLT-022 — verdict, 2026-09-23

**✅ BUILT. AC1–AC5 met on SQLite and PostgreSQL. ✅ AC6 met by the DBT stream, `5a43edb84` (see Left).**

## What changed

- **(b)** `deserializeValue` (`noodl-runtime/src/api/adapters/local-sql/QueryBuilder.ts`) returns a
  `String` column as the string. Object/Array columns still parse. A column with **no declared
  type** keeps the bracket sniff, stated in a comment, because a schemaless backend has nothing
  else to go on. Both adapters call this one function, so one edit covers both.
- **(a)** `Noodl.Records.query(c, where, { plain: true })` and `Records.fetch(id, { className,
  plain: true })` return the row: fields verbatim at any depth, `objectId` on the row, a Date
  column as its ISO string, a Pointer as its id, an included row as a plain row, a Relation left
  out (as the Model read leaves it out), `ACL` left out. It lives in `CloudStore._plainFromJSON`. The
  default read is untouched.
- Code-editor completions for `query` and `fetch` name the option.

## Readings

**AC1: the control, reproduced first** (`drive-head.json`: deployed function, real backend,
real cloud runtime → ParseWireAdapter):

| | SQLite | PostgreSQL |
|---|---|---|
| sections saved `s1`,`s2` → read back | `0dRBgsc6Ek`,`Ec8Mbn4z2j` | `Pq54F9kZFd`,`wBvw6TYOMY` |
| `facts` gained an `id` key | yes | yes |
| `facts.nested.id` `keep-me` → | replaced | replaced |
| `note` (String) `"[1,2]"` → | array `[1,2]`, **even over plain REST** | array, even over REST |
| the `plain` arm (option unknown on HEAD) | identical to the control | identical |

**AC2 and AC4: fixed** (`drive-fixed.json`): with `{ plain: true }`, `query` and `fetch` both
deep-equal what was saved (title, sections with their ids, facts with the nested id, `note` as
the text, `due` as the ISO string) and carry the row's `objectId`, on **both** adapters. REST
reads `note` back as `"[1,2]"` on both adapters.

**AC3: the default is unchanged**: without the option, the same drive still gets a Model with
generated nested ids (`IyyAEAAytK,…`). This is now pinned in `test/nodes/hlt022-plain-records.test.ts`,
so the default cannot drift either way.

**AC4: the wrong fix, shown failing**: deleting the sniff turns red `keeps the sniff for a column
with no declared type` and the existing `auto-parses JSON strings`.

**AC5: conformance** `records/a-string-column-reads-back-as-text-however-bracketed`: PostgreSQL
**63/63**, SQLite green. With the String branch removed it goes red **by name on both adapters**
(PostgreSQL 62 passed, 1 failed).

**Mutants**, each caught by name: no String branch (1 red), sniff deleted (2 red), `plain`
ignored (3 red).

**Suites**: `noodl-runtime` 2,990 passed / 13 skipped; `noodl-core-ui` code-editor 381/381;
`tsc --noEmit` runtime and contract, exit 0. `nodegx-backend` 168 of 170 suites; the 2 red
(`tpl008-theme-drive` §0–§6, `tpl008-todo-drive` D72) are **the same 10 tests with HEAD's three
runtime files swapped back in**. They are not this row's.

## Left

- ✅ **AC6, reported by the DBT stream 2026-09-23, `5a43edb84`** (against a backend built from `b9a44a267`): every function reads with `{ plain: true }`, the workaround is removed whole, both offline fakes refuse a non-plain read by name, and `check-seed` live reads 272 rows, 1610 fields, 0 mismatches. Checked here: the commit is on `cline-dev`, and `STORED_AS_TEXT`, `json:` and `decodeText` no longer appear in the template. What it was asked: remove `STORED_AS_TEXT`, the `json:` prefix, the three `String`
  schema types and each function's `fromText`/`getId()` handling, then run `check-read-functions`
  and `check-seed` live. The deployed backend bundle (`deploy/artifact/`) is gitignored and built at
  deploy, so the template picks this up on its next build.
- Not built: a `plain` option on `save`/`create`/`increment` (they still return Models). The task
  asked for reads only.

Drive: `hlt022.functions.drive.test.ts`, run from `packages/nodegx-backend` with
`HLT022_OUT=<file> npx jest -c <this dir>/jest.functions.config.js`.
